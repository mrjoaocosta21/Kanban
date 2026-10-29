import { apiClient } from '../../../shared/api/apiClient.js';
import { TaskRepository, TaskRepositoryError } from './TaskRepository.js';

function encode(value) {
  return encodeURIComponent(value);
}

function taskInput(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    date: task.date,
    tags: task.tags,
  };
}

function taskChanges(task, changes) {
  return {
    ...(changes.title !== undefined ? { title: changes.title } : {}),
    ...(changes.status !== undefined ? { status: changes.status } : {}),
    ...(changes.priority !== undefined ? { priority: changes.priority } : {}),
    ...(changes.assigneeId !== undefined ? { assigneeId: changes.assigneeId } : {}),
    ...(changes.date !== undefined ? { date: changes.date } : {}),
    ...(changes.tags !== undefined ? { tags: changes.tags } : {}),
    ...(task?.version ? { expectedVersion: task.version } : {}),
  };
}

export class ApiTaskRepository extends TaskRepository {
  constructor(workspaceId, client = apiClient) {
    super();
    this.workspaceId = workspaceId;
    this.client = client;
    this.supportsImport = false;
  }

  get taskPath() {
    return `/workspaces/${encode(this.workspaceId)}/tasks`;
  }

  async load() {
    const result = await this.client.request(this.taskPath);
    return { tasks: result.tasks, warning: null };
  }

  async apply(command) {
    try {
      switch (command.type) {
        case 'task/create':
          return this.client.request(this.taskPath, {
            method: 'POST',
            body: taskInput(command.task),
          });
        case 'task/update':
          return this.client.request(`${this.taskPath}/${encode(command.task.id)}`, {
            method: 'PATCH',
            body: taskChanges(command.task, command.changes),
          });
        case 'task/move':
          return this.client.request(`${this.taskPath}/${encode(command.task.id)}/move`, {
            method: 'POST',
            body: {
              status: command.status,
              targetTaskId: command.targetTaskId ?? null,
              ...(command.task.version ? { expectedVersion: command.task.version } : {}),
            },
          });
        case 'task/delete': {
          const versionQuery = command.task.version
            ? `?expectedVersion=${command.task.version}`
            : '';
          return this.client.request(`${this.taskPath}/${encode(command.task.id)}${versionQuery}`, {
            method: 'DELETE',
          });
        }
        default:
          throw new TaskRepositoryError('Esta operação não é suportada pelo repositório remoto.', {
            code: 'REMOTE_OPERATION_UNSUPPORTED',
          });
      }
    } catch (error) {
      if (error instanceof TaskRepositoryError) {
        throw error;
      }

      throw new TaskRepositoryError(error instanceof Error ? error.message : 'Falha na API de tarefas.', {
        cause: error,
        code: error?.code ?? 'REMOTE_TASK_ERROR',
      });
    }
  }
}
