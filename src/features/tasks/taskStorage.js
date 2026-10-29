import {
  DEFAULT_ASSIGNEE_ID,
  initialTasks,
  TASK_ASSIGNEES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from './taskData.js';
import { TASK_ACTIVITY_TYPES } from './taskActivity.js';

export const TASK_STORAGE_KEY = 'lista-de-afazeres:tasks:v1';
export const TASK_RECOVERY_KEY = `${TASK_STORAGE_KEY}:recovery`;

const VALID_STATUSES = new Set(Object.values(TASK_STATUSES));
const VALID_PRIORITIES = new Set(Object.values(TASK_PRIORITIES));
const VALID_ASSIGNEE_IDS = new Set(TASK_ASSIGNEES.map((assignee) => assignee.id));
const VALID_ACTIVITY_TYPES = new Set(Object.values(TASK_ACTIVITY_TYPES));
const LEGACY_ASSIGNEES_BY_AVATAR = new Map(
  TASK_ASSIGNEES.map((assignee) => [assignee.avatarUrl, assignee.id]),
);
const LEGACY_STATUS_MIGRATIONS = new Map([
  ['doing', TASK_STATUSES.INPROGRESS],
]);

export class TaskValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

export function cloneInitialTasks() {
  return initialTasks.map((task) => ({
    ...task,
    tags: task.tags.map((tag) => ({ ...tag })),
    activity: task.activity.map((item) => ({ ...item })),
  }));
}

function migrateTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    return task;
  }

  const legacyAssigneeId = LEGACY_ASSIGNEES_BY_AVATAR.get(task.avatarUrl);
  const assigneeId = VALID_ASSIGNEE_IDS.has(task.assigneeId)
    ? task.assigneeId
    : legacyAssigneeId ?? DEFAULT_ASSIGNEE_ID;
  const createdById = VALID_ASSIGNEE_IDS.has(task.createdById)
    ? task.createdById
    : DEFAULT_ASSIGNEE_ID;
  const createdAt = typeof task.createdAt === 'string' && task.createdAt
    ? task.createdAt
    : new Date().toISOString();
  const updatedById = VALID_ASSIGNEE_IDS.has(task.updatedById)
    ? task.updatedById
    : createdById;
  const updatedAt = typeof task.updatedAt === 'string' && task.updatedAt
    ? task.updatedAt
    : createdAt;
  const activity = Array.isArray(task.activity)
    ? task.activity
    : [{
      id: `activity-migrated-${task.id ?? 'task'}`,
      type: TASK_ACTIVITY_TYPES.CREATED,
      actorId: createdById,
      at: createdAt,
    }];

  return {
    ...task,
    status: LEGACY_STATUS_MIGRATIONS.get(task.status) ?? task.status,
    priority: task.priority ?? TASK_PRIORITIES.MEDIUM,
    assigneeId,
    createdById,
    createdAt,
    updatedById,
    updatedAt,
    activity,
  };
}

function isValidActivity(activity) {
  return (
    activity &&
    typeof activity === 'object' &&
    !Array.isArray(activity) &&
    typeof activity.id === 'string' &&
    activity.id.trim().length > 0 &&
    VALID_ACTIVITY_TYPES.has(activity.type) &&
    VALID_ASSIGNEE_IDS.has(activity.actorId) &&
    isValidTimestamp(activity.at) &&
    (activity.fromStatus === undefined || VALID_STATUSES.has(activity.fromStatus)) &&
    (activity.toStatus === undefined || VALID_STATUSES.has(activity.toStatus))
  );
}

function isValidTimestamp(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isValidTag(tag) {
  return (
    tag &&
    typeof tag === 'object' &&
    !Array.isArray(tag) &&
    typeof tag.id === 'string' &&
    tag.id.trim().length > 0 &&
    typeof tag.name === 'string' &&
    tag.name.trim().length > 0 &&
    typeof tag.color === 'string' &&
    tag.color.trim().length > 0
  );
}

function isValidTask(task) {
  return (
    task &&
    typeof task === 'object' &&
    !Array.isArray(task) &&
    typeof task.id === 'string' &&
    task.id.trim().length > 0 &&
    typeof task.title === 'string' &&
    task.title.trim().length > 0 &&
    VALID_STATUSES.has(task.status) &&
    typeof task.date === 'string' &&
    VALID_PRIORITIES.has(task.priority) &&
    VALID_ASSIGNEE_IDS.has(task.assigneeId) &&
    VALID_ASSIGNEE_IDS.has(task.createdById) &&
    isValidTimestamp(task.createdAt) &&
    VALID_ASSIGNEE_IDS.has(task.updatedById) &&
    isValidTimestamp(task.updatedAt) &&
    Array.isArray(task.tags) &&
    task.tags.every(isValidTag) &&
    Array.isArray(task.activity) &&
    task.activity.every(isValidActivity)
  );
}

export function normalizeTasks(value, { allowPartial = false } = {}) {
  if (!Array.isArray(value)) {
    throw new TaskValidationError('O arquivo de tarefas não contém uma lista válida.');
  }

  const seenTaskIds = new Set();
  const normalizedTasks = [];
  let discardedCount = 0;

  value.forEach((valueTask) => {
    const task = migrateTask(valueTask);
    const isDuplicate = isValidTask(task) && seenTaskIds.has(task.id);

    if (!isValidTask(task) || isDuplicate) {
      discardedCount += 1;
      return;
    }

    seenTaskIds.add(task.id);
    normalizedTasks.push(task);
  });

  if (discardedCount > 0 && !allowPartial) {
    throw new TaskValidationError(
      `${discardedCount} ${discardedCount === 1 ? 'tarefa é inválida' : 'tarefas são inválidas'}.`,
    );
  }

  return { tasks: normalizedTasks, discardedCount };
}
