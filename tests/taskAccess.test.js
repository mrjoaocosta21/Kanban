import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTaskAccess,
  canAccessTask,
  TASK_ACTIONS,
  TaskPermissionError,
  WORKSPACE_ROLES,
} from '../src/features/tasks/taskAccess.js';

const manager = { id: 'joao-costa', workspaceRole: WORKSPACE_ROLES.MANAGER };
const collaborator = { id: 'marina-alves', workspaceRole: WORKSPACE_ROLES.COLLABORATOR };
const assignedTask = { id: 'assigned', assigneeId: collaborator.id };
const anotherTask = { id: 'another', assigneeId: 'lucas-rocha' };

test('gestor pode administrar qualquer tarefa do workspace', () => {
  Object.values(TASK_ACTIONS).forEach((action) => {
    assert.equal(canAccessTask({ member: manager, action, task: anotherTask }), true);
  });
});

test('colaborador visualiza e move somente tarefas atribuídas a ele', () => {
  assert.equal(canAccessTask({ member: collaborator, action: TASK_ACTIONS.VIEW, task: assignedTask }), true);
  assert.equal(canAccessTask({ member: collaborator, action: TASK_ACTIONS.MOVE, task: assignedTask }), true);
  assert.equal(canAccessTask({ member: collaborator, action: TASK_ACTIONS.VIEW, task: anotherTask }), false);
  assert.equal(canAccessTask({ member: collaborator, action: TASK_ACTIONS.MOVE, task: anotherTask }), false);
});

test('colaborador não cria, edita, exclui, reordena ou importa tarefas', () => {
  const forbiddenActions = [
    TASK_ACTIONS.CREATE,
    TASK_ACTIONS.UPDATE,
    TASK_ACTIONS.DELETE,
    TASK_ACTIONS.REORDER,
    TASK_ACTIONS.IMPORT,
    TASK_ACTIONS.EXPORT,
  ];

  forbiddenActions.forEach((action) => {
    assert.equal(canAccessTask({ member: collaborator, action, task: assignedTask }), false);
  });

  assert.throws(
    () => assertTaskAccess({ member: collaborator, action: TASK_ACTIONS.DELETE, task: assignedTask }),
    TaskPermissionError,
  );
});

test('nega por padrão ações desconhecidas e membros sem papel válido', () => {
  assert.equal(canAccessTask({ member: manager, action: 'task:unknown', task: assignedTask }), false);
  assert.equal(canAccessTask({ member: { id: 'marina-alves' }, action: TASK_ACTIONS.VIEW, task: assignedTask }), false);
});
