import { badRequest } from './HttpError.js';

const VALID_STATUSES = new Set(['todo', 'inprogress', 'done']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

export function requireObject(value, message = 'O corpo da requisição precisa ser um objeto.') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest(message);
  }

  return value;
}

export function requireString(value, field, { min = 1, max = 160 } = {}) {
  if (typeof value !== 'string') {
    throw badRequest(`O campo ${field} precisa ser um texto.`);
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length < min || normalizedValue.length > max) {
    throw badRequest(`O campo ${field} precisa ter entre ${min} e ${max} caracteres.`);
  }

  return normalizedValue;
}

export function optionalString(value, field, { max = 160 } = {}) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length > max) {
    throw badRequest(`O campo ${field} precisa ser um texto de até ${max} caracteres.`);
  }

  return value.trim();
}

export function requireStatus(value) {
  if (!VALID_STATUSES.has(value)) {
    throw badRequest('Status de tarefa inválido.');
  }

  return value;
}

export function requirePriority(value) {
  if (!VALID_PRIORITIES.has(value)) {
    throw badRequest('Prioridade de tarefa inválida.');
  }

  return value;
}

export function normalizeTags(value) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.length > 20) {
    throw badRequest('Tags precisam ser uma lista com no máximo 20 itens.');
  }

  return value.map((tag) => {
    requireObject(tag, 'Cada tag precisa ser um objeto.');
    return {
      id: requireString(tag.id, 'tag.id', { max: 100 }),
      name: requireString(tag.name, 'tag.name', { max: 40 }),
      color: requireString(tag.color, 'tag.color', { max: 30 }),
    };
  });
}

export function rejectUnknownFields(object, allowedFields) {
  const unknownFields = Object.keys(object).filter((field) => !allowedFields.includes(field));

  if (unknownFields.length > 0) {
    throw badRequest('A requisição contém campos não permitidos.', { unknownFields });
  }
}
