export const WORKSPACE_ROLES = {
  MANAGER: 'manager',
  COLLABORATOR: 'collaborator',
};

export const TASK_ACTIONS = {
  VIEW: 'task:view',
  CREATE: 'task:create',
  UPDATE: 'task:update',
  DELETE: 'task:delete',
  MOVE: 'task:move',
  REORDER: 'task:reorder',
  IMPORT: 'task:import',
  EXPORT: 'task:export',
};

const VALID_TASK_ACTIONS = new Set(Object.values(TASK_ACTIONS));

export class TaskPermissionError extends Error {
  constructor(message = 'Você não tem permissão para realizar esta ação.') {
    super(message);
    this.name = 'TaskPermissionError';
    this.code = 'TASK_PERMISSION_DENIED';
  }
}

export function isManager(member) {
  return member?.workspaceRole === WORKSPACE_ROLES.MANAGER;
}

export function canAccessTask({ member, action, task = null }) {
  if (!member || !VALID_TASK_ACTIONS.has(action)) {
    return false;
  }

  if (isManager(member)) {
    return true;
  }

  if (member.workspaceRole !== WORKSPACE_ROLES.COLLABORATOR) {
    return false;
  }

  const isAssignedTask = task?.assigneeId === member.id;

  switch (action) {
    case TASK_ACTIONS.VIEW:
    case TASK_ACTIONS.MOVE:
      return isAssignedTask;

    case TASK_ACTIONS.CREATE:
    case TASK_ACTIONS.UPDATE:
    case TASK_ACTIONS.DELETE:
    case TASK_ACTIONS.REORDER:
    case TASK_ACTIONS.IMPORT:
    case TASK_ACTIONS.EXPORT:
    default:
      return false;
  }
}

export function assertTaskAccess(context) {
  if (!canAccessTask(context)) {
    throw new TaskPermissionError();
  }
}
