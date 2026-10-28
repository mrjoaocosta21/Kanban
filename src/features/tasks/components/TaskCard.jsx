import { useState } from 'react';
import { TASK_COLUMNS } from '../taskData.js';

function TaskCard({ task, onEdit, onDelete, onMove, onDropTask, onDragStart }) {
  const [isDropTarget, setIsDropTarget] = useState(false);

  function handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/task-id', task.id);
    onDragStart?.(task.id);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const draggedTaskId = event.dataTransfer.getData('text/task-id');
    setIsDropTarget(Boolean(draggedTaskId && draggedTaskId !== task.id));
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDropTarget(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDropTarget(false);

    const draggedTaskId = event.dataTransfer.getData('text/task-id');
    if (draggedTaskId && draggedTaskId !== task.id) {
      onDropTask(draggedTaskId, task.status, task.id);
    }
  }

  return (
    <article
      className={`task-card${isDropTarget ? ' task-card--drop-target' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDropTarget(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`Tarefa: ${task.title}`}
    >
      <header className="task-card__header">
        <h3>{task.title}</h3>
        <div className="task-actions">
          <button className="icon-button" type="button" onClick={() => onEdit(task)} aria-label={`Editar ${task.title}`}>
            ✎
          </button>
          <button className="icon-button icon-button--danger" type="button" onClick={() => onDelete(task.id)} aria-label={`Excluir ${task.title}`}>
            ×
          </button>
        </div>
      </header>

      <div className="tags" aria-label="Tags da tarefa">
        <span className={`priority-badge priority-badge--${task.priority ?? 'medium'}`}>
          {task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baixa' : 'Média'}
        </span>
        {task.tags.map((tag) => (
          <span className="tag" style={{ backgroundColor: tag.color }} key={tag.id}>
            {tag.name}
          </span>
        ))}
        {task.tags.length === 0 && <span className="task-card__muted">Sem tags</span>}
      </div>

      <footer className="task-card__footer">
        <div className="profile" aria-hidden="true">
          <img src={task.avatarUrl} alt="" />
        </div>
        <time>{task.date}</time>
        <label className="task-move">
          <span className="sr-only">Mover tarefa</span>
          <select value={task.status} onChange={(event) => onMove(task.id, event.target.value)}>
            {TASK_COLUMNS.map((column) => (
              <option value={column.id} key={column.id}>{column.title}</option>
            ))}
          </select>
        </label>
      </footer>
    </article>
  );
}

export default TaskCard;
