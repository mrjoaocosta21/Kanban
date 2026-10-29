export class TaskRepositoryError extends Error {
  constructor(message, { cause, code = 'TASK_REPOSITORY_ERROR' } = {}) {
    super(message, { cause });
    this.name = 'TaskRepositoryError';
    this.code = code;
  }
}

export class TaskRepository {
  async load() {
    throw new TaskRepositoryError('O método load precisa ser implementado.');
  }

  async save() {
    throw new TaskRepositoryError('O método save precisa ser implementado.');
  }
}
