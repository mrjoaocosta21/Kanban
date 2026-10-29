import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTaskBackup,
  parseTaskBackup,
  TaskBackupError,
} from '../src/features/tasks/taskBackup.js';

const task = {
  id: 'task-backup',
  title: 'Validar backup',
  status: 'done',
  priority: 'high',
  assigneeId: 'marina-alves',
  date: 'Hoje',
  tags: [{ id: 'tag-backup', name: 'Backup', color: '#56a5ff' }],
  createdById: 'joao-costa',
  createdAt: '2026-10-28T12:00:00.000Z',
  updatedById: 'joao-costa',
  updatedAt: '2026-10-28T12:00:00.000Z',
  activity: [{
    id: 'activity-backup-created',
    type: 'created',
    actorId: 'joao-costa',
    at: '2026-10-28T12:00:00.000Z',
  }],
};

test('exporta e importa um backup versionado', () => {
  const backup = createTaskBackup([task]);
  const importedTasks = parseTaskBackup(backup);

  assert.deepEqual(importedTasks, [task]);
});

test('aceita o formato legado composto apenas pelo array de tarefas', () => {
  assert.deepEqual(parseTaskBackup(JSON.stringify([task])), [task]);
});

test('migra autoria e histórico em backups antigos', () => {
  const legacyTask = { ...task };
  delete legacyTask.createdById;
  delete legacyTask.createdAt;
  delete legacyTask.updatedById;
  delete legacyTask.updatedAt;
  delete legacyTask.activity;

  const [migratedTask] = parseTaskBackup(JSON.stringify([legacyTask]));

  assert.equal(migratedTask.createdById, 'joao-costa');
  assert.equal(migratedTask.updatedById, 'joao-costa');
  assert.equal(migratedTask.activity[0].type, 'created');
});

test('rejeita versões incompatíveis', () => {
  assert.throws(
    () => parseTaskBackup(JSON.stringify({ version: 999, tasks: [task] })),
    TaskBackupError,
  );
});
