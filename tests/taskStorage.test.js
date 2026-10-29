import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cloneInitialTasks,
  normalizeTasks,
  TaskValidationError,
} from '../src/features/tasks/taskStorage.js';

function createLegacyTask(overrides = {}) {
  return {
    id: 'legacy-task',
    title: 'Tarefa preservada',
    status: 'doing',
    date: 'Hoje',
    avatarUrl: 'https://i.pravatar.cc/100?img=5',
    tags: [{ id: 'tag-1', name: 'Legado', color: '#123456' }],
    ...overrides,
  };
}

test('migra status, prioridade e responsável legados', () => {
  const { tasks, discardedCount } = normalizeTasks([createLegacyTask()]);

  assert.equal(discardedCount, 0);
  assert.equal(tasks[0].status, 'inprogress');
  assert.equal(tasks[0].priority, 'medium');
  assert.equal(tasks[0].assigneeId, 'lucas-rocha');
  assert.equal(tasks[0].title, 'Tarefa preservada');
  assert.equal(tasks[0].createdById, 'joao-costa');
  assert.equal(tasks[0].activity[0].type, 'created');
});

test('recupera somente registros válidos quando o modo parcial está ativo', () => {
  const { tasks, discardedCount } = normalizeTasks([
    createLegacyTask(),
    createLegacyTask({ title: '' }),
    createLegacyTask({ title: 'ID duplicado' }),
  ], { allowPartial: true });

  assert.equal(tasks.length, 1);
  assert.equal(discardedCount, 2);
});

test('rejeita registros inválidos em operações de gravação', () => {
  assert.throws(
    () => normalizeTasks([createLegacyTask({ title: '' })]),
    TaskValidationError,
  );
});

test('clona as tarefas iniciais sem compartilhar as tags', () => {
  const firstClone = cloneInitialTasks();
  const secondClone = cloneInitialTasks();

  firstClone[0].tags[0].name = 'Alterada';
  firstClone[0].activity[0].actorId = 'marina-alves';
  assert.notEqual(firstClone[0].tags[0].name, secondClone[0].tags[0].name);
  assert.notEqual(firstClone[0].activity[0].actorId, secondClone[0].activity[0].actorId);
});
