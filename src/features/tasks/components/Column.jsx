import TaskCard from './TaskCard.jsx';

function Column({ column, tasks, isFiltered, onAddTask, onEditTask, onDeleteTask, onMoveTask, onDropTask }) {
  function handleDrop(event) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/task-id');

    if (taskId) {
      onDropTask(taskId, column.id);
    }
  }

  return (
    <section className="kanban-column" aria-labelledby={`column-${column.id}`}>
      <header className="column-header">
        <div>
          <h2 id={`column-${column.id}`}>{column.title}</h2>
          <span className="column-count">{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
        </div>
        <button className="add-task-button" type="button" onClick={() => onAddTask(column.id)} aria-label={`Adicionar tarefa em ${column.title}`}>
          +
        </button>
      </header>

      <div
        className="column-tasks"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        aria-label={`Tarefas em ${column.title}`}
      >
        {tasks.length === 0 ? (
          <button className="empty-column" type="button" onClick={() => onAddTask(column.id)}>
            <span>+</span>
            <strong>{isFiltered ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa'}</strong>
            <small>{isFiltered ? 'Ajuste os filtros' : 'Adicione uma tarefa aqui'}</small>
          </button>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onMove={onMoveTask}
              onDropTask={onDropTask}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default Column;
