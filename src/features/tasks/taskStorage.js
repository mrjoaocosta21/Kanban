import { initialTasks, TASK_PRIORITIES, TASK_STATUSES } from './taskData.js';

const STORAGE_KEY = 'lista-de-afazeres:tasks:v1';
const VALID_STATUSES = new Set(Object.values(TASK_STATUSES));
const VALID_PRIORITIES = new Set(Object.values(TASK_PRIORITIES));

function isValidTag(tag) {
  return (
    tag &&
    typeof tag === 'object' &&
    typeof tag.id === 'string' &&
    typeof tag.name === 'string' &&
    typeof tag.color === 'string'
  );
}

function isValidTask(task) {
  return (
    task &&
    typeof task === 'object' &&
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    task.title.trim().length > 0 &&
    VALID_STATUSES.has(task.status) &&
    typeof task.date === 'string' &&
    typeof task.avatarUrl === 'string' &&
    (task.priority === undefined || VALID_PRIORITIES.has(task.priority)) &&
    Array.isArray(task.tags) &&
    task.tags.every(isValidTag)
  );
}

export function loadTasks() {
  if (typeof window === 'undefined') {
    return initialTasks;
  }

  try {
    const storedTasks = window.localStorage.getItem(STORAGE_KEY);

    if (!storedTasks) {
      return initialTasks;
    }

    const parsedTasks = JSON.parse(storedTasks);
    return Array.isArray(parsedTasks) && parsedTasks.every(isValidTask)
      ? parsedTasks.map((task) => ({
        ...task,
        priority: task.priority ?? TASK_PRIORITIES.MEDIUM,
      }))
      : initialTasks;
  } catch {
    return initialTasks;
  }
}

export function saveTasks(tasks) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // A aplicação continua funcionando mesmo quando o navegador bloqueia o storage.
  }
}
