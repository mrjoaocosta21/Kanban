import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { createDatabasePool } from '../src/database.js';
import { runMigrations } from '../src/migrate.js';
import { hashPassword } from '../src/security/password.js';

const databaseUrl = process.env.TEST_DATABASE_URL;

function getCookie(response) {
  return response.headers.get('set-cookie')?.split(';')[0];
}

async function request(baseUrl, path, { method = 'GET', cookie, body } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('PostgreSQL integra autenticação, RBAC e auditoria append-only', {
  skip: !databaseUrl && 'Defina TEST_DATABASE_URL para executar a integração real.',
}, async (context) => {
  const pool = createDatabasePool(databaseUrl);
  context.after(() => pool.end());
  await runMigrations(pool);

  const suffix = randomUUID();
  const workspaceId = `workspace-${suffix}`;
  const managerId = `manager-${suffix}`;
  const collaboratorId = `collaborator-${suffix}`;
  const password = 'Integration-password!';
  const passwordHash = await hashPassword(password);

  await pool.query(`
    INSERT INTO users (id, email, name, job_title, initials, password_hash)
    VALUES
      ($1, $2, 'Manager', 'Produto', 'MG', $5),
      ($3, $4, 'Collaborator', 'Design', 'CO', $5)
  `, [managerId, `${managerId}@example.com`, collaboratorId, `${collaboratorId}@example.com`, passwordHash]);
  await pool.query(
    'INSERT INTO workspaces (id, name, slug) VALUES ($1, $2, $3)',
    [workspaceId, 'Integration workspace', workspaceId],
  );
  await pool.query(`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES ($1, $2, 'manager'), ($1, $3, 'collaborator')
  `, [workspaceId, managerId, collaboratorId]);

  const config = {
    appOrigin: 'http://localhost:5173', isProduction: false,
    sessionCookieName: 'kanban_session', sessionTtlDays: 7, trustProxy: false,
  };
  const app = createApp({ pool, config, logger: { error() {} } });
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const managerLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { email: `${managerId}@example.com`, password },
  });
  assert.equal(managerLogin.status, 200);
  const managerCookie = getCookie(managerLogin);

  const taskId = `task-${suffix}`;
  const createResponse = await request(baseUrl, `/api/workspaces/${workspaceId}/tasks`, {
    method: 'POST', cookie: managerCookie,
    body: {
      id: taskId, title: 'Integration task', status: 'todo', priority: 'high',
      assigneeId: collaboratorId, date: 'Hoje', tags: [],
    },
  });
  assert.equal(createResponse.status, 201);

  const collaboratorLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { email: `${collaboratorId}@example.com`, password },
  });
  const collaboratorCookie = getCookie(collaboratorLogin);
  assert.equal(collaboratorLogin.status, 200);

  const editResponse = await request(baseUrl, `/api/workspaces/${workspaceId}/tasks/${taskId}`, {
    method: 'PATCH', cookie: collaboratorCookie, body: { title: 'Forbidden edit' },
  });
  assert.equal(editResponse.status, 403);

  const moveResponse = await request(baseUrl, `/api/workspaces/${workspaceId}/tasks/${taskId}/move`, {
    method: 'POST', cookie: collaboratorCookie,
    body: { status: 'done', expectedVersion: 1 },
  });
  assert.equal(moveResponse.status, 200);
  const movedTask = (await moveResponse.json()).tasks[0];
  assert.equal(movedTask.status, 'done');
  assert.deepEqual(movedTask.activity.map((event) => event.type), ['created', 'status_changed']);

  const deleteResponse = await request(baseUrl, `/api/workspaces/${workspaceId}/tasks/${taskId}`, {
    method: 'DELETE', cookie: managerCookie,
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal((await deleteResponse.json()).tasks.length, 0);

  const { rows: eventRows } = await pool.query(
    'SELECT id, event_type FROM task_events WHERE task_id = $1 ORDER BY created_at',
    [taskId],
  );
  assert.deepEqual(eventRows.map((row) => row.event_type), ['created', 'status_changed', 'deleted']);
  await assert.rejects(
    () => pool.query('UPDATE task_events SET event_type = event_type WHERE id = $1', [eventRows[0].id]),
    /append-only/,
  );
});
