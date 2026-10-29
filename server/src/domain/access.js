export const WORKSPACE_ROLES = Object.freeze({
  MANAGER: 'manager',
  COLLABORATOR: 'collaborator',
});

export const TASK_ACTIONS = Object.freeze({
  VIEW: 'task:view',
  CREATE: 'task:create',
  UPDATE: 'task:update',
  DELETE: 'task:delete',
  MOVE: 'task:move',
  REORDER: 'task:reorder',
});

const VALID_ACTIONS = new Set(Object.values(TASK_ACTIONS));

export function canAccessTask({ membership, action, task = null }) {
  if (!membership || !VALID_ACTIONS.has(action)) {
    return false;
  }

  if (membership.role === WORKSPACE_ROLES.MANAGER) {
    return true;
  }

  if (membership.role !== WORKSPACE_ROLES.COLLABORATOR) {
    return false;
  }

  const ownsTask = task?.assigneeId === membership.userId;
  return ownsTask && (action === TASK_ACTIONS.VIEW || action === TASK_ACTIONS.MOVE);
}
