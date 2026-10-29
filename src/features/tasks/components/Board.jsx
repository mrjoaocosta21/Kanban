import { useCallback, useMemo, useRef, useState } from 'react';
import {
  TASK_ASSIGNEES,
  TASK_COLUMNS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../taskData.js';
import {
  createTaskBackup,
  MAX_BACKUP_FILE_SIZE,
  parseTaskBackup,
} from '../taskBackup.js';
import {
  assertTaskAccess,
  canAccessTask,
  isManager,
  TASK_ACTIONS,
  TaskPermissionError,
} from '../taskAccess.js';
import { useTaskBoard } from '../hooks/useTaskBoard.js';
import { useWorkspaceSession } from '../hooks/useWorkspaceSession.js';
import UserMenu from '../../auth/components/UserMenu.jsx';
import BoardProgress from './BoardProgress.jsx';
import Column from './Column.jsx';
import SessionSwitcher from './SessionSwitcher.jsx';
import TaskForm from './TaskForm.jsx';
import Toast from './Toast.jsx';

function getMemberById(members, memberId) {
  return members.find((member) => member.id === memberId) ?? TASK_ASSIGNEES[0];
}

function Board({
  repository,
  currentMember: authenticatedMember = null,
  members = TASK_ASSIGNEES,
  workspaceName = 'React Kanban',
  isLoggingOut = false,
  onLogout,
}) {
  const demoSession = useWorkspaceSession();
  const currentMember = authenticatedMember ?? demoSession.currentMember;
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
    replaceTasks,
    isLoading,
    isSaving,
    isOnline,
    error,
    warning,
    clearError,
    dismissWarning,
    reloadTasks,
  } = useTaskBoard(repository);
  const [dialog, setDialog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [backupError, setBackupError] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const feedbackId = useRef(0);
  const importInputRef = useRef(null);
  const managerView = isManager(currentMember);
  const authenticatedSession = Boolean(authenticatedMember);
  const canImportBackup = managerView && repository?.supportsImport !== false;

  const showFeedback = useCallback((message) => {
    feedbackId.current += 1;
    setFeedback({ id: feedbackId.current, message });
  }, []);

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  function handleActionError(actionError) {
    if (actionError instanceof TaskPermissionError) {
      setPermissionError(actionError.message);
    }
  }

  function openCreateDialog(status = TASK_STATUSES.TODO) {
    try {
      assertTaskAccess({ member: currentMember, action: TASK_ACTIONS.CREATE });
      setPermissionError(null);
      setDialog({ status });
    } catch (actionError) {
      handleActionError(actionError);
    }
  }

  function openEditDialog(task) {
    try {
      assertTaskAccess({ member: currentMember, action: TASK_ACTIONS.UPDATE, task });
      setPermissionError(null);
      setDialog({ task });
    } catch (actionError) {
      handleActionError(actionError);
    }
  }

  function closeDialog() {
    setDialog(null);
  }

  async function handleFormSubmit(values) {
    try {
      if (dialog?.task) {
        await updateTask(dialog.task.id, values, currentMember);
        showFeedback('Tarefa atualizada e salva');
      } else {
        await addTask(values, currentMember);
        showFeedback('Tarefa adicionada e salva');
      }
      setPermissionError(null);
      closeDialog();
    } catch (actionError) {
      handleActionError(actionError);
      // O hook apresenta o erro e restaura o último estado persistido.
    }
  }

  async function handleDeleteTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);

    if (task && window.confirm(`Excluir a tarefa “${task.title}”?`)) {
      try {
        await deleteTask(taskId, currentMember);
        setPermissionError(null);
        showFeedback('Tarefa excluída e alteração salva');
      } catch (actionError) {
        handleActionError(actionError);
        // O hook apresenta o erro e restaura o último estado persistido.
      }
    }
  }

  async function handleMoveTask(taskId, status) {
    try {
      const changed = await moveTask(taskId, status, currentMember);
      if (changed) {
        setPermissionError(null);
        showFeedback('Tarefa atualizada e salva');
      }
    } catch (actionError) {
      handleActionError(actionError);
      // O hook apresenta o erro e restaura o último estado persistido.
    }
  }

  async function handleReorderTask(taskId, status, targetTaskId) {
    try {
      const changed = await reorderTask(taskId, status, targetTaskId, currentMember);
      if (changed) {
        setPermissionError(null);
        showFeedback('Tarefa atualizada e salva');
      }
    } catch (actionError) {
      handleActionError(actionError);
      // O hook apresenta o erro e restaura o último estado persistido.
    }
  }

  function handleExportBackup() {
    try {
      assertTaskAccess({ member: currentMember, action: TASK_ACTIONS.EXPORT });
      const backup = createTaskBackup(tasks);
      const blob = new Blob([backup], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);

      downloadLink.href = downloadUrl;
      downloadLink.download = `kanban-backup-${date}.json`;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setBackupError(null);
      setPermissionError(null);
      showFeedback('Backup exportado');
    } catch (exportError) {
      if (exportError instanceof TaskPermissionError) {
        handleActionError(exportError);
        return;
      }
      setBackupError(exportError instanceof Error
        ? exportError.message
        : 'Não foi possível exportar o backup.');
    }
  }

  async function handleImportBackup(event) {
    const [file] = event.target.files ?? [];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      if (file.size > MAX_BACKUP_FILE_SIZE) {
        throw new Error('O backup excede o limite de 1 MB.');
      }

      const importedTasks = parseTaskBackup(await file.text());
      await replaceTasks(importedTasks, currentMember);
      setBackupError(null);
      setPermissionError(null);
      showFeedback('Backup importado e salvo');
    } catch (importError) {
      if (importError instanceof TaskPermissionError) {
        handleActionError(importError);
        return;
      }
      setBackupError(importError instanceof Error
        ? importError.message
        : 'Não foi possível importar o backup.');
    }
  }

  const accessibleTasks = useMemo(
    () => tasks.filter((task) => canAccessTask({
      member: currentMember,
      action: TASK_ACTIONS.VIEW,
      task,
    })),
    [currentMember, tasks],
  );

  const availableTags = useMemo(
    () => [...new Set(accessibleTasks.flatMap((task) => task.tags.map((tag) => tag.name)))].sort((a, b) => a.localeCompare(b)),
    [accessibleTasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return accessibleTasks.filter((task) => {
      const matchesSearch = !normalizedSearch || [
        task.title,
        task.date,
        getMemberById(members, task.assigneeId).name,
        ...task.tags.map((tag) => tag.name),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesTag = !tagFilter || task.tags.some((tag) => tag.name === tagFilter);
      const matchesPriority = !priorityFilter || (task.priority ?? TASK_PRIORITIES.MEDIUM) === priorityFilter;
      const matchesAssignee = !assigneeFilter || task.assigneeId === assigneeFilter;

      return matchesSearch && matchesTag && matchesPriority && matchesAssignee;
    });
  }, [accessibleTasks, assigneeFilter, members, priorityFilter, searchTerm, tagFilter]);

  const filtersActive = Boolean(searchTerm || tagFilter || priorityFilter || assigneeFilter);
  const completedTasks = accessibleTasks.filter((task) => task.status === TASK_STATUSES.DONE).length;
  const syncState = error
    ? 'error'
    : isLoading
      ? 'loading'
      : isSaving
        ? 'saving'
        : isOnline
          ? 'saved'
          : 'offline';
  const syncLabel = {
    error: 'Erro de persistência',
    loading: 'Carregando dados',
    saving: 'Salvando alterações',
    saved: authenticatedSession ? 'Sincronizado com o servidor' : 'Salvo neste dispositivo',
    offline: authenticatedSession ? 'Offline · conexão necessária' : 'Offline · dados locais',
  }[syncState];

  return (
    <main className="app-shell">
      <section className="board-shell" aria-labelledby="app-title">
        <header className="board-header">
          <div className="board-heading">
            <div className="app-mark" aria-hidden="true">✓</div>
            <div>
              <p className="app-eyebrow">Workspace · {workspaceName}</p>
              <h1 id="app-title">Lista de afazeres</h1>
              <p className="board-description">Organize prioridades, responsáveis e entregas em um só lugar.</p>
            </div>
          </div>
          <div className="board-header__actions">
            {authenticatedSession ? (
              <UserMenu
                member={currentMember}
                isSubmitting={isLoggingOut}
                onLogout={onLogout}
              />
            ) : (
              <SessionSwitcher
                currentMember={currentMember}
                onChange={(memberId) => {
                  demoSession.switchMember(memberId);
                  setAssigneeFilter('');
                  setPermissionError(null);
                  closeDialog();
                }}
              />
            )}
            <span className={`sync-status sync-status--${syncState}`} role="status" aria-live="polite">
              <span aria-hidden="true" />
              {syncLabel}
            </span>
            {managerView && (
              <>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isLoading || tasks.length === 0}
                >
                  Exportar
                </button>
                {canImportBackup && (
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    disabled={isLoading || isSaving}
                  >
                    Importar
                  </button>
                )}
              </>
            )}
            <input
              ref={importInputRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={handleImportBackup}
              tabIndex={-1}
            />
            {managerView && (
              <button
                className="button button--primary"
                type="button"
                onClick={() => openCreateDialog()}
                disabled={isLoading || isSaving}
              >
                <span aria-hidden="true">+</span>
                Nova tarefa
              </button>
            )}
          </div>
        </header>

        <div className="board-workspace">
          {warning && (
            <section className="board-alert board-alert--warning" role="status">
              <div>
                <strong>Dados recuperados com ressalvas</strong>
                <span>{warning}</span>
              </div>
              <button type="button" onClick={dismissWarning}>Dispensar</button>
            </section>
          )}

          {(error || backupError || permissionError) && (
            <section className="board-alert board-alert--error" role="alert">
              <div>
                <strong>{permissionError ? 'Ação não permitida para este perfil' : 'Não foi possível concluir a operação'}</strong>
                <span>{permissionError ?? backupError ?? error}</span>
              </div>
              <div className="board-alert__actions">
                {error && <button type="button" onClick={reloadTasks}>Recarregar dados</button>}
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setBackupError(null);
                    setPermissionError(null);
                  }}
                >
                  Fechar
                </button>
              </div>
            </section>
          )}

          {isLoading ? (
            <div className="board-loading" role="status" aria-live="polite">
              <span className="loading-spinner" aria-hidden="true" />
              <strong>Carregando seu quadro</strong>
              <span>Validando e recuperando as tarefas salvas.</span>
            </div>
          ) : (
            <>
              <section className={`role-context${managerView ? '' : ' role-context--collaborator'}`} aria-label="Permissões da sessão atual">
                <span className="role-context__icon" aria-hidden="true">{managerView ? '◆' : '✓'}</span>
                <div>
                  <strong>{managerView ? 'Visão de gestão' : 'Minhas tarefas'}</strong>
                  <span>
                    {managerView
                      ? 'Você pode criar, atribuir, editar e organizar todas as tarefas.'
                      : 'Você visualiza somente suas atribuições e pode atualizar o status delas.'}
                  </span>
                </div>
                <span className="role-badge">{managerView ? 'Gestor' : 'Colaborador'}</span>
              </section>

              <section className="board-filters" aria-label="Filtros do quadro">
                <div className="filter-search">
                  <label className="sr-only" htmlFor="task-search">Buscar tarefas</label>
                  <span aria-hidden="true">⌕</span>
                  <input
                    id="task-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar tarefas..."
                  />
                </div>

                <label className="sr-only" htmlFor="tag-filter">Filtrar por tag</label>
                <select id="tag-filter" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                  <option value="">Todas as tags</option>
                  {availableTags.map((tag) => <option value={tag} key={tag}>{tag}</option>)}
                </select>

                <label className="sr-only" htmlFor="priority-filter">Filtrar por prioridade</label>
                <select id="priority-filter" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                  <option value="">Todas as prioridades</option>
                  <option value={TASK_PRIORITIES.HIGH}>Prioridade alta</option>
                  <option value={TASK_PRIORITIES.MEDIUM}>Prioridade média</option>
                  <option value={TASK_PRIORITIES.LOW}>Prioridade baixa</option>
                </select>

                {managerView && (
                  <>
                    <label className="sr-only" htmlFor="assignee-filter">Filtrar por responsável</label>
                    <select id="assignee-filter" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
                      <option value="">Todos os responsáveis</option>
                      {members.map((assignee) => (
                        <option value={assignee.id} key={assignee.id}>{assignee.name}</option>
                      ))}
                    </select>
                  </>
                )}

                {filtersActive && (
                  <button
                    className="clear-filters"
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setTagFilter('');
                      setPriorityFilter('');
                      setAssigneeFilter('');
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </section>

              <div className="filter-results" role="status" aria-live="polite">
                <strong>{filteredTasks.length}</strong>
                {' '}{filteredTasks.length === 1 ? 'tarefa exibida' : 'tarefas exibidas'}
                {filtersActive && ` de ${accessibleTasks.length}`}
              </div>

              <div className="board-overview">
                <BoardProgress
                  completedTasks={completedTasks}
                  totalTasks={accessibleTasks.length}
                  personal={!managerView}
                />
                <div className="board-tip">
                  <span className="board-tip__icon" aria-hidden="true">↔</span>
                  <div>
                    <strong>{managerView ? 'Atualize o fluxo rapidamente' : 'Registre o andamento'}</strong>
                    <span>{managerView ? 'Arraste os cartões ou use o seletor de coluna.' : 'Mova suas tarefas conforme o trabalho avançar.'}</span>
                  </div>
                </div>
              </div>

              <div className="kanban-board">
                {TASK_COLUMNS.map((column) => (
                  <Column
                    key={column.id}
                    column={column}
                    tasks={filteredTasks.filter((task) => task.status === column.id)}
                    isFiltered={filtersActive}
                    onAddTask={openCreateDialog}
                    onEditTask={openEditDialog}
                    onDeleteTask={handleDeleteTask}
                    onMoveTask={handleMoveTask}
                    onDropTask={handleReorderTask}
                    canAddTask={managerView && !isSaving}
                    canManageTasks={managerView && !isSaving}
                    canMoveTasks={!isSaving}
                    canReorderTasks={managerView && !isSaving}
                    members={members}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {dialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
            <TaskForm
              task={dialog.task}
              initialStatus={dialog.status}
              isSubmitting={isSaving}
              assignees={members}
              onCancel={closeDialog}
              onSubmit={handleFormSubmit}
            />
          </div>
        </div>
      )}

      {feedback && (
        <Toast
          key={feedback.id}
          message={feedback.message}
          onDismiss={dismissFeedback}
        />
      )}
    </main>
  );
}

export default Board;
