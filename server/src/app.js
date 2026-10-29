import express from 'express';
import { randomUUID } from 'node:crypto';
import { PostgresAuthRepository } from './repositories/PostgresAuthRepository.js';
import { PostgresTaskRepository } from './repositories/PostgresTaskRepository.js';
import { AuthService } from './services/AuthService.js';
import { TaskService } from './services/TaskService.js';
import { HttpError, badRequest, conflict, unauthorized } from './http/HttpError.js';
import { requireObject, requireString, rejectUnknownFields } from './http/validation.js';
import { LoginRateLimiter } from './security/LoginRateLimiter.js';
import { parseCookies } from './security/sessionToken.js';

function serializePrincipal(principal) {
  return {
    user: principal.user,
    memberships: principal.memberships,
  };
}

function parseLoginBody(body) {
  const value = requireObject(body);
  rejectUnknownFields(value, ['email', 'password']);
  const email = requireString(value.email, 'email', { max: 254 }).toLowerCase();

  if (typeof value.password !== 'string' || value.password.length < 1 || value.password.length > 128) {
    throw badRequest('A senha informada é inválida.');
  }

  return { email, password: value.password };
}

function sessionCookieOptions(config, expiresAt) {
  return {
    httpOnly: true,
    secure: config.cookieSecure ?? config.isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };
}

export function createApp({
  pool,
  config,
  logger = console,
  authService: providedAuthService,
  taskService: providedTaskService,
}) {
  const app = express();
  const authRepository = providedAuthService ? null : new PostgresAuthRepository(pool);
  const taskRepository = providedTaskService ? null : new PostgresTaskRepository(pool);
  const authService = providedAuthService
    ?? new AuthService(authRepository, { sessionTtlDays: config.sessionTtlDays });
  const taskService = providedTaskService ?? new TaskService(taskRepository);
  const loginRateLimiter = new LoginRateLimiter();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use((request, response, next) => {
    request.id = request.get('x-request-id') || randomUUID();
    response.set('x-request-id', request.id);
    response.set('x-content-type-options', 'nosniff');
    response.set('referrer-policy', 'no-referrer');
    response.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
    next();
  });
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use((request, _response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      next();
      return;
    }

    const origin = request.get('origin');
    if (origin && origin !== config.appOrigin) {
      next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origem da requisição não permitida.'));
      return;
    }

    next();
  });

  const requireAuthentication = async (request, _response, next) => {
    try {
      const cookies = parseCookies(request.get('cookie'));
      const token = cookies[config.sessionCookieName];
      const principal = await authService.authenticate(token);

      if (!principal) {
        throw unauthorized();
      }

      request.sessionToken = token;
      request.principal = principal;
      next();
    } catch (error) {
      next(error);
    }
  };

  app.get('/api/health', async (_request, response) => {
    await pool.query('SELECT 1');
    response.json({ status: 'ok' });
  });

  app.post('/api/auth/login', async (request, response) => {
    const rateLimitKey = `${request.ip}:${String(request.body?.email ?? '').toLowerCase()}`;
    const rateLimit = loginRateLimiter.consume(rateLimitKey);
    if (!rateLimit.allowed) {
      response.set('retry-after', `${rateLimit.retryAfterSeconds}`);
      throw new HttpError(429, 'RATE_LIMITED', 'Muitas tentativas de login. Tente novamente mais tarde.');
    }

    const { email, password } = parseLoginBody(request.body);
    const result = await authService.login(email, password);
    loginRateLimiter.reset(rateLimitKey);
    response.cookie(
      config.sessionCookieName,
      result.token,
      sessionCookieOptions(config, result.expiresAt),
    );
    response.json(serializePrincipal(result.principal));
  });

  app.post('/api/auth/logout', requireAuthentication, async (request, response) => {
    await authService.logout(request.sessionToken);
    response.clearCookie(config.sessionCookieName, {
      httpOnly: true,
      secure: config.cookieSecure ?? config.isProduction,
      sameSite: 'lax',
      path: '/',
    });
    response.status(204).end();
  });

  app.get('/api/auth/session', requireAuthentication, async (request, response) => {
    response.json(serializePrincipal(request.principal));
  });

  app.get('/api/workspaces/:workspaceId/members', requireAuthentication, async (request, response) => {
    const members = await taskService.listMembers(request.params.workspaceId, request.principal.user.id);
    response.json({ members });
  });

  app.get('/api/workspaces/:workspaceId/tasks', requireAuthentication, async (request, response) => {
    const tasks = await taskService.listTasks(request.params.workspaceId, request.principal.user.id);
    response.json({ tasks });
  });

  app.post('/api/workspaces/:workspaceId/tasks', requireAuthentication, async (request, response) => {
    const result = await taskService.createTask(
      request.params.workspaceId,
      request.principal.user.id,
      request.body,
    );
    response.status(201).json(result);
  });

  app.patch('/api/workspaces/:workspaceId/tasks/:taskId', requireAuthentication, async (request, response) => {
    const result = await taskService.updateTask(
      request.params.workspaceId,
      request.principal.user.id,
      request.params.taskId,
      request.body,
    );
    response.json(result);
  });

  app.post('/api/workspaces/:workspaceId/tasks/:taskId/move', requireAuthentication, async (request, response) => {
    const result = await taskService.moveTask(
      request.params.workspaceId,
      request.principal.user.id,
      request.params.taskId,
      request.body,
    );
    response.json(result);
  });

  app.delete('/api/workspaces/:workspaceId/tasks/:taskId', requireAuthentication, async (request, response) => {
    const expectedVersion = request.query.expectedVersion === undefined
      ? undefined
      : Number(request.query.expectedVersion);
    const result = await taskService.deleteTask(
      request.params.workspaceId,
      request.principal.user.id,
      request.params.taskId,
      expectedVersion,
    );
    response.json(result);
  });

  app.use('/api', (_request, _response, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'Endpoint não encontrado.'));
  });

  app.use((error, request, response, _next) => {
    const isInvalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
    const httpError = isInvalidJson
      ? badRequest('O corpo da requisição contém JSON inválido.')
      : error?.code === '23505'
        ? conflict('Já existe um registro com estes dados.')
        : ['23503', '23514', '22P02'].includes(error?.code)
          ? badRequest('Os dados informados violam uma regra do domínio.')
          : error;

    if (!(httpError instanceof HttpError)) {
      logger.error?.('Erro não tratado na API', {
        requestId: request.id,
        method: request.method,
        path: request.path,
        error: httpError,
      });
    }

    const status = httpError instanceof HttpError ? httpError.status : 500;
    response.status(status).json({
      error: {
        code: httpError instanceof HttpError ? httpError.code : 'INTERNAL_ERROR',
        message: httpError instanceof HttpError
          ? httpError.message
          : 'Ocorreu um erro interno. Tente novamente.',
        ...(httpError instanceof HttpError && httpError.details
          ? { details: httpError.details }
          : {}),
        requestId: request.id,
      },
    });
  });

  return app;
}
