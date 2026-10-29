import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessTask,
  TASK_ACTIONS,
  WORKSPACE_ROLES,
} from '../src/domain/access.js';

const manager = { userId: 'manager', role: WORKSPACE_ROLES.MANAGER };
const collaborator = { userId: 'collaborator', role: WORKSPACE_ROLES.COLLABORATOR };
const assignedTask = { assigneeId: 'collaborator' };

test('RBAC do servidor concede administração completa somente ao gestor', () => {
  Object.values(TASK_ACTIONS).forEach((action) => {
    assert.equal(canAccessTask({ membership: manager, action, task: assignedTask }), true);
  });

  assert.equal(canAccessTask({ membership: collaborator, action: TASK_ACTIONS.UPDATE, task: assignedTask }), false);
  assert.equal(canAccessTask({ membership: collaborator, action: TASK_ACTIONS.MOVE, task: assignedTask }), true);
  assert.equal(canAccessTask({ membership: collaborator, action: TASK_ACTIONS.MOVE, task: { assigneeId: 'other' } }), false);
});

test('RBAC do servidor nega por padrão papéis e ações desconhecidos', () => {
  assert.equal(canAccessTask({ membership: { userId: 'x', role: 'unknown' }, action: TASK_ACTIONS.VIEW, task: { assigneeId: 'x' } }), false);
  assert.equal(canAccessTask({ membership: manager, action: 'unknown', task: assignedTask }), false);
});
