import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskService } from '../src/services/TaskService.js';
import { HttpError } from '../src/http/HttpError.js';

function createRepository(role = 'collaborator') {
  const calls = [];
  const task = {
    id: 'task-1', title: 'Tarefa', status: 'todo', priority: 'medium',
    assigneeId: 'user-1', date: 'Hoje', tags: [], version: 1,
  };

  return {
    calls,
    async findMembership() {
      return { workspaceId: 'workspace-1', userId: 'user-1', role };
    },
    async findTask() {
      return task;
    },
    async listTasks() {
      return [task];
    },
    async listMembers() {
      return [{ id: 'user-1' }];
    },
    async reorderTask(input) {
      calls.push(input);
      return { outcome: 'updated' };
    },
    async updateTask(input) {
      calls.push(input);
      return { outcome: 'updated' };
    },
    async createTask(input) {
      calls.push(input);
      return task;
    },
    async deleteTask(input) {
      calls.push(input);
      return { outcome: 'deleted' };
    },
  };
}

test('colaborador move a própria tarefa para outra etapa', async () => {
  const repository = createRepository('collaborator');
  const service = new TaskService(repository);

  const result = await service.moveTask('workspace-1', 'user-1', 'task-1', {
    status: 'done',
    expectedVersion: 1,
    targetTaskId: 'another-task',
  });

  assert.equal(repository.calls.length, 1);
  assert.equal(repository.calls[0].status, 'done');
  assert.equal(repository.calls[0].targetTaskId, null);
  assert.equal(result.tasks.length, 1);
});

test('colaborador não edita nem reordena a própria tarefa', async () => {
  const repository = createRepository('collaborator');
  const service = new TaskService(repository);

  await assert.rejects(
    () => service.updateTask('workspace-1', 'user-1', 'task-1', { title: 'Alterada' }),
    (error) => error instanceof HttpError && error.status === 403,
  );
  await assert.rejects(
    () => service.moveTask('workspace-1', 'user-1', 'task-1', { status: 'todo' }),
    (error) => error instanceof HttpError && error.status === 403,
  );
});

test('gestor cria, edita e exclui tarefas', async () => {
  const repository = createRepository('manager');
  const service = new TaskService(repository);

  await service.createTask('workspace-1', 'user-1', {
    id: 'new-task', title: 'Nova', status: 'todo', priority: 'high',
    assigneeId: 'user-1', date: 'Hoje', tags: [],
  });
  await service.updateTask('workspace-1', 'user-1', 'task-1', {
    title: 'Atualizada', expectedVersion: 1,
  });
  await service.deleteTask('workspace-1', 'user-1', 'task-1', 1);

  assert.equal(repository.calls.length, 3);
});

test('rejeita atualizações vazias mesmo para o gestor', async () => {
  const service = new TaskService(createRepository('manager'));

  await assert.rejects(
    () => service.updateTask('workspace-1', 'user-1', 'task-1', { expectedVersion: 1 }),
    (error) => error instanceof HttpError && error.status === 400,
  );
});
