import {
  cloneInitialTasks,
  normalizeTasks,
  TASK_RECOVERY_KEY,
  TASK_STORAGE_KEY,
} from '../taskStorage.js';
import { TaskRepository, TaskRepositoryError } from './TaskRepository.js';

function resolveBrowserStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createWarning(discardedCount) {
  if (discardedCount === 0) {
    return null;
  }

  return `${discardedCount} ${discardedCount === 1 ? 'tarefa inválida foi isolada' : 'tarefas inválidas foram isoladas'}. Uma cópia de recuperação foi preservada.`;
}

export class LocalStorageTaskRepository extends TaskRepository {
  constructor({
    storage = resolveBrowserStorage(),
    storageKey = TASK_STORAGE_KEY,
    recoveryKey = TASK_RECOVERY_KEY,
  } = {}) {
    super();
    this.storage = storage;
    this.storageKey = storageKey;
    this.recoveryKey = recoveryKey;
    this.isBrowser = typeof window !== 'undefined';
  }

  async load() {
    if (!this.storage) {
      if (this.isBrowser) {
        throw new TaskRepositoryError('O armazenamento local está bloqueado neste navegador.', {
          code: 'STORAGE_UNAVAILABLE',
        });
      }

      return { tasks: cloneInitialTasks(), warning: null };
    }

    let storedTasks;

    try {
      storedTasks = this.storage.getItem(this.storageKey);
    } catch (error) {
      throw new TaskRepositoryError('Não foi possível acessar os dados deste navegador.', {
        cause: error,
        code: 'STORAGE_READ_FAILED',
      });
    }

    if (!storedTasks) {
      const tasks = cloneInitialTasks();

      try {
        this.storage.setItem(this.storageKey, JSON.stringify(tasks));
      } catch (error) {
        throw new TaskRepositoryError('Não foi possível inicializar os dados neste dispositivo.', {
          cause: error,
          code: 'STORAGE_WRITE_FAILED',
        });
      }

      return { tasks, warning: null };
    }

    try {
      const parsedTasks = JSON.parse(storedTasks);
      const { tasks, discardedCount } = normalizeTasks(parsedTasks, { allowPartial: true });

      if (discardedCount > 0) {
        this.preserveRecoveryCopy(storedTasks);
      }

      const normalizedValue = JSON.stringify(tasks);
      let warning = createWarning(discardedCount);

      if (normalizedValue !== storedTasks) {
        try {
          this.storage.setItem(this.storageKey, normalizedValue);
        } catch {
          warning = [
            warning,
            'Os dados foram carregados, mas o formato atualizado ainda não pôde ser salvo.',
          ].filter(Boolean).join(' ');
        }
      }

      return { tasks, warning };
    } catch (error) {
      this.preserveRecoveryCopy(storedTasks);

      if (error instanceof SyntaxError) {
        return {
          tasks: cloneInitialTasks(),
          warning: 'Os dados locais estavam corrompidos. Uma cópia de recuperação foi preservada.',
        };
      }

      if (error instanceof TaskRepositoryError) {
        throw error;
      }

      return {
        tasks: cloneInitialTasks(),
        warning: 'Os dados locais não puderam ser recuperados. Uma cópia de segurança foi preservada.',
      };
    }
  }

  async save(tasks) {
    const { tasks: normalizedTasks } = normalizeTasks(tasks);

    if (!this.storage) {
      if (this.isBrowser) {
        throw new TaskRepositoryError('O armazenamento local está bloqueado neste navegador.', {
          code: 'STORAGE_UNAVAILABLE',
        });
      }

      return;
    }

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(normalizedTasks));
    } catch (error) {
      throw new TaskRepositoryError('Não foi possível salvar as tarefas neste dispositivo.', {
        cause: error,
        code: 'STORAGE_WRITE_FAILED',
      });
    }
  }

  preserveRecoveryCopy(rawValue) {
    if (!this.storage || !rawValue) {
      return;
    }

    try {
      this.storage.setItem(this.recoveryKey, rawValue);
    } catch {
      // A recuperação é uma proteção adicional; a leitura principal continua disponível.
    }
  }
}

export const localStorageTaskRepository = new LocalStorageTaskRepository();
