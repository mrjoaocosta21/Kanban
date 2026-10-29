import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStorageTaskRepository } from '../src/features/tasks/repositories/LocalStorageTaskRepository.js';
import { TaskRepositoryError } from '../src/features/tasks/repositories/TaskRepository.js';

class MemoryStorage {
  constructor(initialValues = {}) {
    this.values = new Map(Object.entries(initialValues));
    this.failWrites = false;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.failWrites) {
      throw new Error('Storage indisponível');
    }

    this.values.set(key, value);
  }
}

function createTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Tarefa válida',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'joao-costa',
    date: 'Hoje',
    tags: [],
    ...overrides,
  };
}

test('retorna as tarefas iniciais quando não há dados persistidos', async () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageTaskRepository({ storage });
  const result = await repository.load();

  assert.ok(result.tasks.length > 0);
  assert.equal(result.warning, null);
  assert.ok(storage.getItem(repository.storageKey));
});

test('recupera JSON corrompido sem apagar a cópia original', async () => {
  const storageKey = 'tasks';
  const recoveryKey = 'tasks:recovery';
  const corruptedValue = '{not-json';
  const storage = new MemoryStorage({ [storageKey]: corruptedValue });
  const repository = new LocalStorageTaskRepository({ storage, storageKey, recoveryKey });

  const result = await repository.load();

  assert.ok(result.tasks.length > 0);
  assert.match(result.warning, /corrompidos/);
  assert.equal(storage.getItem(recoveryKey), corruptedValue);
});

test('isola registros inválidos e preserva uma cópia de recuperação', async () => {
  const storageKey = 'tasks';
  const recoveryKey = 'tasks:recovery';
  const originalValue = JSON.stringify([
    createTask(),
    createTask({ id: 'task-2', title: '' }),
  ]);
  const storage = new MemoryStorage({ [storageKey]: originalValue });
  const repository = new LocalStorageTaskRepository({ storage, storageKey, recoveryKey });

  const result = await repository.load();

  assert.equal(result.tasks.length, 1);
  assert.match(result.warning, /1 tarefa inválida/);
  assert.equal(storage.getItem(recoveryKey), originalValue);
});

test('propaga uma falha de gravação com erro de repositório', async () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageTaskRepository({ storage });
  storage.failWrites = true;

  await assert.rejects(
    repository.save([createTask()]),
    (error) => error instanceof TaskRepositoryError && error.code === 'STORAGE_WRITE_FAILED',
  );
});
