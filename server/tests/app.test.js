import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

const principal = {
  user: { id: 'manager', name: 'Manager' },
  memberships: [{ workspaceId: 'workspace', userId: 'manager', role: 'manager' }],
};
const runHttpTests = process.env.RUN_HTTP_TESTS === 'true';

async function startTestServer() {
  const authService = {
    async login() {
      return {
        token: 'session-token',
        expiresAt: new Date(Date.now() + 60_000),
        principal,
      };
    },
    async authenticate(token) {
      return token === 'session-token' ? principal : null;
    },
    async logout() {},
  };
  const taskService = {
    async listTasks() { return []; },
    async listMembers() { return []; },
    async createTask() { return { tasks: [] }; },
    async updateTask() { return { tasks: [] }; },
    async moveTask() { return { tasks: [] }; },
    async deleteTask() { return { tasks: [] }; },
  };
  const pool = { async query() { return { rows: [{ ok: 1 }] }; } };
  const config = {
    appOrigin: 'http://localhost:5173',
    isProduction: false,
    sessionCookieName: 'kanban_session',
    sessionTtlDays: 7,
    trustProxy: false,
  };
  const app = createApp({
    pool,
    config,
    authService,
    taskService,
    logger: { error() {} },
  });
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('API cria cookie HttpOnly e protege endpoints autenticados', {
  skip: !runHttpTests && 'Defina RUN_HTTP_TESTS=true para abrir uma porta HTTP local.',
}, async (context) => {
  const server = await startTestServer();
  context.after(server.close);

  const unauthorizedResponse = await fetch(`${server.baseUrl}/api/auth/session`);
  assert.equal(unauthorizedResponse.status, 401);

  const loginResponse = await fetch(`${server.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'manager@example.com', password: 'password-value' }),
  });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get('set-cookie');
  assert.match(cookie, /kanban_session=session-token/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);

  const sessionResponse = await fetch(`${server.baseUrl}/api/auth/session`, {
    headers: { cookie },
  });
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).user.id, 'manager');
});

test('API rejeita mutações vindas de outra origem', {
  skip: !runHttpTests && 'Defina RUN_HTTP_TESTS=true para abrir uma porta HTTP local.',
}, async (context) => {
  const server = await startTestServer();
  context.after(server.close);

  const response = await fetch(`${server.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://malicious.example',
    },
    body: JSON.stringify({ email: 'manager@example.com', password: 'password-value' }),
  });

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'ORIGIN_NOT_ALLOWED');
});
