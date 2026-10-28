import { useMemo, useState } from 'react';
import { TASK_COLUMNS, TASK_PRIORITIES, TASK_STATUSES } from '../taskData.js';
import { useTaskBoard } from '../hooks/useTaskBoard.js';
import Column from './Column.jsx';
import TaskForm from './TaskForm.jsx';

function Board() {
  const { tasks, addTask, updateTask, deleteTask, moveTask, reorderTask } = useTaskBoard();
  const [dialog, setDialog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  function openCreateDialog(status = TASK_STATUSES.TODO) {
    setDialog({ status });
  }

  function openEditDialog(task) {
    setDialog({ task });
  }

  function closeDialog() {
    setDialog(null);
  }

  function handleFormSubmit(values) {
    if (dialog?.task) {
      updateTask(dialog.task.id, values);
    } else {
      addTask(values);
    }
    closeDialog();
  }

  function handleDeleteTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || window.confirm(`Excluir a tarefa “${task.title}”?`)) {
      deleteTask(taskId);
    }
  }

  const availableTags = useMemo(
    () => [...new Set(tasks.flatMap((task) => task.tags.map((tag) => tag.name)))].sort((a, b) => a.localeCompare(b)),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch = !normalizedSearch || [
        task.title,
        task.date,
        ...task.tags.map((tag) => tag.name),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesTag = !tagFilter || task.tags.some((tag) => tag.name === tagFilter);
      const matchesPriority = !priorityFilter || (task.priority ?? TASK_PRIORITIES.MEDIUM) === priorityFilter;

      return matchesSearch && matchesTag && matchesPriority;
    });
  }, [priorityFilter, searchTerm, tagFilter, tasks]);

  const filtersActive = Boolean(searchTerm || tagFilter || priorityFilter);
  const completedTasks = filteredTasks.filter((task) => task.status === TASK_STATUSES.DONE).length;

  return (
    <main className="app-shell">
      <section className="board-shell" aria-labelledby="app-title">
        <header className="board-header">
          <div>
            <p className="app-eyebrow">React Kanban</p>
            <h1 id="app-title">Lista de afazeres</h1>
            <p className="board-description">Organize suas tarefas por status e acompanhe seu progresso.</p>
          </div>
          <button className="button button--primary" type="button" onClick={() => openCreateDialog()}>
            + Nova tarefa
          </button>
        </header>

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

          {filtersActive && (
            <button
              className="clear-filters"
              type="button"
              onClick={() => {
                setSearchTerm('');
                setTagFilter('');
                setPriorityFilter('');
              }}
            >
              Limpar filtros
            </button>
          )}
        </section>

        <div className="board-summary" aria-label="Resumo do quadro">
          <span><strong>{filteredTasks.length}</strong> de <strong>{tasks.length}</strong> {tasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
          <span><strong>{completedTasks}</strong> concluídas</span>
          <span className="board-summary__hint">Arraste os cartões para mover de coluna</span>
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
              onMoveTask={moveTask}
              onDropTask={reorderTask}
            />
          ))}
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
              onCancel={closeDialog}
              onSubmit={handleFormSubmit}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default Board;
