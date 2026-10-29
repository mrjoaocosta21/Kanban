import { WORKSPACE_ROLES } from './taskAccess.js';

export const TASK_STATUSES = {
  TODO: 'todo',
  INPROGRESS: 'inprogress',
  DONE: 'done',
};

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const TASK_ASSIGNEES = [
  {
    id: 'joao-costa',
    name: 'João Costa',
    role: 'Produto',
    workspaceRole: WORKSPACE_ROLES.MANAGER,
    initials: 'JC',
    avatarUrl: 'https://i.pravatar.cc/100?img=12',
  },
  {
    id: 'marina-alves',
    name: 'Marina Alves',
    role: 'Design',
    workspaceRole: WORKSPACE_ROLES.COLLABORATOR,
    initials: 'MA',
    avatarUrl: 'https://i.pravatar.cc/100?img=47',
  },
  {
    id: 'lucas-rocha',
    name: 'Lucas Rocha',
    role: 'Engenharia',
    workspaceRole: WORKSPACE_ROLES.COLLABORATOR,
    initials: 'LR',
    avatarUrl: 'https://i.pravatar.cc/100?img=5',
  },
];

export const DEFAULT_ASSIGNEE_ID = TASK_ASSIGNEES[0].id;

export function getAssigneeById(assigneeId) {
  return TASK_ASSIGNEES.find((assignee) => assignee.id === assigneeId) ?? TASK_ASSIGNEES[0];
}

export const TASK_COLUMNS = [
  { id: TASK_STATUSES.TODO, title: 'To do' },
  { id: TASK_STATUSES.INPROGRESS, title: 'In Progress' },
  { id: TASK_STATUSES.DONE, title: 'Done' },
];

export const TAG_COLORS = ['#a278e6', '#4be0bb', '#ffa94d', '#56a5ff', '#ff5e94'];

export const initialTasks = [
  {
    id: 'task-ui-updates',
    title: 'UI Updates',
    status: TASK_STATUSES.TODO,
    priority: TASK_PRIORITIES.HIGH,
    assigneeId: 'marina-alves',
    createdById: 'joao-costa',
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedById: 'joao-costa',
    updatedAt: '2026-10-28T12:00:00.000Z',
    date: 'Hoje, 28 out',
    tags: [
      { id: 'tag-frontend', name: 'Frontend', color: '#a278e6' },
      { id: 'tag-design', name: 'Design', color: '#ffa94d' },
    ],
    activity: [
      {
        id: 'activity-task-ui-updates-created',
        type: 'created',
        actorId: 'joao-costa',
        at: '2026-10-28T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'task-api-integration',
    title: 'API Integration',
    status: TASK_STATUSES.INPROGRESS,
    priority: TASK_PRIORITIES.MEDIUM,
    assigneeId: 'lucas-rocha',
    createdById: 'joao-costa',
    createdAt: '2026-10-28T12:10:00.000Z',
    updatedById: 'lucas-rocha',
    updatedAt: '2026-10-28T13:20:00.000Z',
    date: 'Hoje, 28 out',
    tags: [{ id: 'tag-backend', name: 'Backend', color: '#4be0bb' }],
    activity: [
      {
        id: 'activity-task-api-integration-created',
        type: 'created',
        actorId: 'joao-costa',
        at: '2026-10-28T12:10:00.000Z',
      },
      {
        id: 'activity-task-api-integration-status',
        type: 'status_changed',
        actorId: 'lucas-rocha',
        at: '2026-10-28T13:20:00.000Z',
        fromStatus: TASK_STATUSES.TODO,
        toStatus: TASK_STATUSES.INPROGRESS,
      },
    ],
  },
];
