import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendTaskActivity,
  createTaskActivity,
  TASK_ACTIVITY_TYPES,
} from '../src/features/tasks/taskActivity.js';

test('cria atividade com ator, horário e detalhes da mudança', () => {
  const activity = createTaskActivity(
    TASK_ACTIVITY_TYPES.STATUS_CHANGED,
    'marina-alves',
    { fromStatus: 'todo', toStatus: 'done' },
    '2026-10-29T12:00:00.000Z',
  );

  assert.equal(activity.actorId, 'marina-alves');
  assert.equal(activity.at, '2026-10-29T12:00:00.000Z');
  assert.equal(activity.fromStatus, 'todo');
  assert.equal(activity.toStatus, 'done');
});

test('adiciona atividade sem alterar o histórico anterior', () => {
  const originalActivity = [{ id: 'activity-1', type: 'created' }];
  const task = { activity: originalActivity };
  const nextActivity = { id: 'activity-2', type: 'updated' };
  const result = appendTaskActivity(task, nextActivity);

  assert.deepEqual(result, [...originalActivity, nextActivity]);
  assert.equal(task.activity, originalActivity);
});
