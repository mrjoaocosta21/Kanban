import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiTaskRepository } from '../src/features/tasks/repositories/ApiTaskRepository.js';

class FakeApiClient {
  constructor() {
    this.calls = [];
  }

  async request(path, options = {}) {
    this.calls.push({ path, options });
    return { tasks: [{ id: 'task-1' }] };
  }
}

const task = {
  id: 'task-1', title: 'Tarefa', status: 'todo', priority: 'medium',
  assigneeId: 'marina-alves', date: 'Hoje', tags: [], version: 3,
};

test('carrega tarefas do workspace autenticado', async () => {
  const client = new FakeApiClient();
  const repository = new ApiTaskRepository('workspace/one', client);
  const result = await repository.load();

  assert.equal(client.calls[0].path, '/workspaces/workspace%2Fone/tasks');
  assert.deepEqual(result.tasks, [{ id: 'task-1' }]);
});

test('traduz comandos de criação, atualização, movimento e exclusão para a API', async () => {
  const client = new FakeApiClient();
  const repository = new ApiTaskRepository('workspace', client);

  await repository.apply({ type: 'task/create', task });
  await repository.apply({ type: 'task/update', task, changes: { title: 'Atualizada' } });
  await repository.apply({ type: 'task/move', task, status: 'done', targetTaskId: null });
  await repository.apply({ type: 'task/delete', task });

  assert.equal(client.calls[0].options.method, 'POST');
  assert.equal(client.calls[1].options.method, 'PATCH');
  assert.equal(client.calls[1].options.body.expectedVersion, 3);
  assert.equal(client.calls[2].path, '/workspaces/workspace/tasks/task-1/move');
  assert.equal(client.calls[2].options.body.status, 'done');
  assert.match(client.calls[3].path, /expectedVersion=3/);
  assert.equal(client.calls[3].options.method, 'DELETE');
});
