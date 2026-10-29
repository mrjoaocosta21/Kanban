export const TASK_ACTIVITY_TYPES = {
  CREATED: 'created',
  UPDATED: 'updated',
  STATUS_CHANGED: 'status_changed',
  REORDERED: 'reordered',
};

function createId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTaskActivity(type, actorId, details = {}, at = new Date().toISOString()) {
  return {
    id: `activity-${createId()}`,
    type,
    actorId,
    at,
    ...details,
  };
}

export function appendTaskActivity(task, activity) {
  return [...(task.activity ?? []), activity];
}
