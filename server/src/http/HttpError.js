export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new HttpError(400, 'BAD_REQUEST', message, details);
}

export function unauthorized(message = 'Autenticação necessária.') {
  return new HttpError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Você não tem permissão para realizar esta ação.') {
  return new HttpError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Recurso não encontrado.') {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function conflict(message = 'O recurso foi alterado por outra operação.') {
  return new HttpError(409, 'CONFLICT', message);
}
