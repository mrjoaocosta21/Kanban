import { normalizeTasks } from './taskStorage.js';

export const TASK_BACKUP_VERSION = 1;
export const MAX_BACKUP_FILE_SIZE = 1_000_000;

export class TaskBackupError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'TaskBackupError';
  }
}

export function createTaskBackup(tasks) {
  const { tasks: normalizedTasks } = normalizeTasks(tasks);

  return JSON.stringify({
    application: 'lista-de-afazeres-react',
    version: TASK_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: normalizedTasks,
  }, null, 2);
}

export function parseTaskBackup(content) {
  let parsedBackup;

  try {
    parsedBackup = JSON.parse(content);
  } catch (error) {
    throw new TaskBackupError('O arquivo selecionado não contém um JSON válido.', { cause: error });
  }

  const isLegacyArray = Array.isArray(parsedBackup);
  const backupVersion = isLegacyArray ? 1 : parsedBackup?.version;
  const backupTasks = isLegacyArray ? parsedBackup : parsedBackup?.tasks;

  if (!isLegacyArray && backupVersion !== TASK_BACKUP_VERSION) {
    throw new TaskBackupError('A versão deste backup não é compatível com a aplicação.');
  }

  try {
    return normalizeTasks(backupTasks).tasks;
  } catch (error) {
    throw new TaskBackupError('O backup contém tarefas inválidas e não foi importado.', { cause: error });
  }
}
