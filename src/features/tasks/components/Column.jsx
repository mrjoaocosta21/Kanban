import TaskCard from './TaskCard.jsx';

function Column({
  column,
  tasks,
  isFiltered,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onDropTask,
  canAddTask = false,
  canManageTasks = false,
  canMoveTasks = false,
  canReorderTasks = false,
  members = [],
}) {
  function handleDrop(event) {
    const taskId = event.dataTransfer.getData('text/task-id');
    const sourceStatus = event.dataTransfer.getData('text/task-status');
    const canDrop = sourceStatus === column.id ? canReorderTasks : canMoveTasks;

    if (taskId && canDrop) {
      event.preventDefault();
      onDropTask(taskId, column.id);
    }
  }

  return (
    <section className={`kanban-column kanban-column--${column.id}`} aria-labelledby={`column-${column.id}`}>
      <header className="column-header">
        <div className="column-title">
          <span className="column-status-dot" aria-hidden="true" />
          <h2 id={`column-${column.id}`}>{column.title}</h2>
        </div>
        <span className="column-count" aria-label={`${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}`}>
          {tasks.length}
        </span>
      </header>

      <div
        className="column-tasks"
        onDragOver={(event) => {
          const sourceStatus = event.dataTransfer.getData('text/task-status');
          if (sourceStatus === column.id ? canReorderTasks : canMoveTasks) {
            event.preventDefault();
          }
        }}
        onDrop={handleDrop}
        aria-label={`Tarefas em ${column.title}`}
      >
        {tasks.length === 0 ? (
          <div className="empty-column" role="status">
            <span aria-hidden="true">{isFiltered ? '⌕' : '+'}</span>
            <strong>{isFiltered ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa'}</strong>
            <small>{isFiltered ? 'Ajuste os filtros' : canAddTask ? 'Adicione uma tarefa aqui' : 'Nenhuma atribuição nesta etapa'}</small>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onMove={onMoveTask}
              onDropTask={onDropTask}
              canEdit={canManageTasks}
              canDelete={canManageTasks}
              canMove={canMoveTasks}
              canReorder={canReorderTasks}
              members={members}
            />
          ))
        )}
      </div>

      {canAddTask && (
        <footer className="column-footer">
          <button className="column-add-button" type="button" onClick={() => onAddTask(column.id)}>
            <span aria-hidden="true">+</span>
            Adicionar tarefa
          </button>
        </footer>
      )}
    </section>
  );
}

export default Column;
