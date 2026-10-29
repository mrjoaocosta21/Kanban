import { canAccessTask, TASK_ACTIONS } from '../domain/access.js';
import { conflict, forbidden, notFound, badRequest } from '../http/HttpError.js';
import {
  normalizeTags,
  optionalString,
  rejectUnknownFields,
  requireObject,
  requirePriority,
  requireStatus,
  requireString,
} from '../http/validation.js';

function readExpectedVersion(value) {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest('A versão da tarefa precisa ser um número inteiro positivo.');
  }

  return value;
}

export class TaskService {
  constructor(repository) {
    this.repository = repository;
  }

  async getMembership(workspaceId, userId) {
    const membership = await this.repository.findMembership(workspaceId, userId);
    if (!membership) {
      throw forbidden('Você não participa deste workspace.');
    }
    return membership;
  }

  async listTasks(workspaceId, userId) {
    const membership = await this.getMembership(workspaceId, userId);
    return this.repository.listTasks(workspaceId, membership);
  }

  async listMembers(workspaceId, userId) {
    await this.getMembership(workspaceId, userId);
    return this.repository.listMembers(workspaceId);
  }

  async createTask(workspaceId, userId, body) {
    const membership = await this.getMembership(workspaceId, userId);
    if (!canAccessTask({ membership, action: TASK_ACTIONS.CREATE })) {
      throw forbidden();
    }

    const value = requireObject(body);
    rejectUnknownFields(value, ['id', 'title', 'status', 'priority', 'assigneeId', 'date', 'tags']);
    const task = {
      id: requireString(value.id, 'id', { max: 100 }),
      title: requireString(value.title, 'title'),
      status: requireStatus(value.status),
      priority: requirePriority(value.priority),
      assigneeId: requireString(value.assigneeId, 'assigneeId', { max: 100 }),
      date: optionalString(value.date, 'date', { max: 80 }) || 'Sem data',
      tags: normalizeTags(value.tags) ?? [],
    };

    const members = await this.repository.listMembers(workspaceId);
    if (!members.some((member) => member.id === task.assigneeId)) {
      throw badRequest('O responsável selecionado não participa deste workspace.');
    }

    await this.repository.createTask({ workspaceId, actorId: userId, task });
    return this.snapshot(workspaceId, membership);
  }

  async updateTask(workspaceId, userId, taskId, body) {
    const membership = await this.getMembership(workspaceId, userId);
    const currentTask = await this.repository.findTask(workspaceId, taskId);
    if (!currentTask) {
      throw notFound('Tarefa não encontrada.');
    }

    if (!canAccessTask({ membership, action: TASK_ACTIONS.UPDATE, task: currentTask })) {
      throw forbidden();
    }

    const value = requireObject(body);
    rejectUnknownFields(value, [
      'title', 'status', 'priority', 'assigneeId', 'date', 'tags', 'expectedVersion',
    ]);

    const changes = {};
    if (value.title !== undefined) changes.title = requireString(value.title, 'title');
    if (value.status !== undefined) changes.status = requireStatus(value.status);
    if (value.priority !== undefined) changes.priority = requirePriority(value.priority);
    if (value.assigneeId !== undefined) {
      changes.assigneeId = requireString(value.assigneeId, 'assigneeId', { max: 100 });
      const members = await this.repository.listMembers(workspaceId);
      if (!members.some((member) => member.id === changes.assigneeId)) {
        throw badRequest('O responsável selecionado não participa deste workspace.');
      }
    }
    if (value.date !== undefined) changes.date = optionalString(value.date, 'date', { max: 80 }) || 'Sem data';
    if (value.tags !== undefined) changes.tags = normalizeTags(value.tags);

    if (Object.keys(changes).length === 0) {
      throw badRequest('Informe ao menos uma alteração para a tarefa.');
    }

    const statusChanged = changes.status && changes.status !== currentTask.status;
    const result = await this.repository.updateTask({
      workspaceId,
      taskId,
      actorId: userId,
      expectedVersion: readExpectedVersion(value.expectedVersion),
      changes,
      event: {
        type: statusChanged ? 'status_changed' : 'updated',
        payload: statusChanged
          ? { fromStatus: currentTask.status, toStatus: changes.status }
          : {},
      },
    });

    this.assertMutationOutcome(result);
    return this.snapshot(workspaceId, membership);
  }

  async moveTask(workspaceId, userId, taskId, body) {
    const membership = await this.getMembership(workspaceId, userId);
    const task = await this.repository.findTask(workspaceId, taskId);
    if (!task) {
      throw notFound('Tarefa não encontrada.');
    }

    const value = requireObject(body);
    rejectUnknownFields(value, ['status', 'targetTaskId', 'expectedVersion']);
    const status = requireStatus(value.status);
    const action = status === task.status ? TASK_ACTIONS.REORDER : TASK_ACTIONS.MOVE;

    if (!canAccessTask({ membership, action, task })) {
      throw forbidden();
    }

    const requestedTargetTaskId = value.targetTaskId === null || value.targetTaskId === undefined
      ? null
      : requireString(value.targetTaskId, 'targetTaskId', { max: 100 });
    const targetTaskId = membership.role === 'manager' ? requestedTargetTaskId : null;
    const result = await this.repository.reorderTask({
      workspaceId,
      taskId,
      actorId: userId,
      status,
      targetTaskId,
      expectedVersion: readExpectedVersion(value.expectedVersion),
    });

    this.assertMutationOutcome(result);
    return this.snapshot(workspaceId, membership);
  }

  async deleteTask(workspaceId, userId, taskId, expectedVersion) {
    const membership = await this.getMembership(workspaceId, userId);
    const task = await this.repository.findTask(workspaceId, taskId);
    if (!task) {
      throw notFound('Tarefa não encontrada.');
    }

    if (!canAccessTask({ membership, action: TASK_ACTIONS.DELETE, task })) {
      throw forbidden();
    }

    const result = await this.repository.deleteTask({
      workspaceId,
      taskId,
      actorId: userId,
      expectedVersion: readExpectedVersion(expectedVersion),
    });

    this.assertMutationOutcome(result);
    return this.snapshot(workspaceId, membership);
  }

  async snapshot(workspaceId, membership) {
    return {
      tasks: await this.repository.listTasks(workspaceId, membership),
    };
  }

  assertMutationOutcome(result) {
    if (result.outcome === 'not_found') {
      throw notFound('Tarefa não encontrada.');
    }
    if (result.outcome === 'conflict') {
      throw conflict('A tarefa foi alterada por outra pessoa. Recarregue o quadro e tente novamente.');
    }
    if (result.outcome === 'invalid_target') {
      throw badRequest('A posição de destino não é válida.');
    }
  }
}
