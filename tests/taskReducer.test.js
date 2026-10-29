import test from 'node:test';
import assert from 'node:assert/strict';
import { taskReducer } from '../src/features/tasks/taskReducer.js';

const tasks = [
  { id: 'one', status: 'todo', title: 'Um' },
  { id: 'two', status: 'inprogress', title: 'Dois' },
];

test('move uma tarefa para o final da coluna de destino', () => {
  const result = taskReducer(tasks, {
    type: 'task/moved',
    taskId: 'one',
    status: 'inprogress',
  });

  assert.deepEqual(result.map(({ id, status }) => ({ id, status })), [
    { id: 'two', status: 'inprogress' },
    { id: 'one', status: 'inprogress' },
  ]);
});

test('substitui todo o conjunto durante hidratação ou importação', () => {
  const replacement = [{ id: 'replacement', status: 'done' }];
  assert.equal(taskReducer(tasks, { type: 'tasks/replaced', tasks: replacement }), replacement);
});

test('preserva os metadados de auditoria ao mover uma tarefa', () => {
  const activity = [{ id: 'activity-status', type: 'status_changed' }];
  const result = taskReducer(tasks, {
    type: 'task/moved',
    taskId: 'one',
    status: 'done',
    changes: {
      updatedById: 'marina-alves',
      updatedAt: '2026-10-29T12:00:00.000Z',
      activity,
    },
  });
  const movedTask = result.find((task) => task.id === 'one');

  assert.equal(movedTask.status, 'done');
  assert.equal(movedTask.updatedById, 'marina-alves');
  assert.equal(movedTask.activity, activity);
});
