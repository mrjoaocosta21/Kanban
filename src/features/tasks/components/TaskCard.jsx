import { useState } from 'react';
import { getAssigneeById, TASK_COLUMNS } from '../taskData.js';
import AssigneeAvatar from './AssigneeAvatar.jsx';
import TaskActivity from './TaskActivity.jsx';

function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
  onDropTask,
  onDragStart,
  canEdit = false,
  canDelete = false,
  canMove = false,
  canReorder = false,
  members = [],
}) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const assignee = members.find((member) => member.id === task.assigneeId)
    ?? getAssigneeById(task.assigneeId);

  function handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/task-id', task.id);
    event.dataTransfer.setData('text/task-status', task.status);
    onDragStart?.(task.id);
  }

  function handleDragOver(event) {
    const draggedTaskId = event.dataTransfer.getData('text/task-id');
    const sourceStatus = event.dataTransfer.getData('text/task-status');
    const canDrop = sourceStatus === task.status ? canReorder : canMove;

    if (canDrop) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
    }

    setIsDropTarget(Boolean(canDrop && draggedTaskId && draggedTaskId !== task.id));
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDropTarget(false);
    }
  }

  function handleDrop(event) {
    const draggedTaskId = event.dataTransfer.getData('text/task-id');
    const sourceStatus = event.dataTransfer.getData('text/task-status');
    const canDrop = sourceStatus === task.status ? canReorder : canMove;

    if (canDrop && draggedTaskId && draggedTaskId !== task.id) {
      event.preventDefault();
      event.stopPropagation();
      setIsDropTarget(false);
      onDropTask(draggedTaskId, task.status, task.id);
    }
  }

  return (
    <article
      className={`task-card${isDropTarget ? ' task-card--drop-target' : ''}`}
      draggable={canMove || canReorder}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDropTarget(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`Tarefa: ${task.title}`}
    >
      <header className="task-card__header">
        <h3>{task.title}</h3>
        {(canEdit || canDelete) && (
          <div className="task-actions">
            {canEdit && (
              <button className="icon-button" type="button" onClick={() => onEdit(task)} aria-label={`Editar ${task.title}`}>
                ✎
              </button>
            )}
            {canDelete && (
              <button className="icon-button icon-button--danger" type="button" onClick={() => onDelete(task.id)} aria-label={`Excluir ${task.title}`}>
                ×
              </button>
            )}
          </div>
        )}
      </header>

      <div className="tags" aria-label="Tags da tarefa">
        <span className={`priority-badge priority-badge--${task.priority ?? 'medium'}`}>
          {task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baixa' : 'Média'}
        </span>
        {task.tags.map((tag) => (
          <span className="tag" style={{ '--tag-color': tag.color }} key={tag.id}>
            {tag.name}
          </span>
        ))}
        {task.tags.length === 0 && <span className="task-card__muted">Sem tags</span>}
      </div>

      <footer className="task-card__footer">
        <div className="task-assignee" title={`Responsável: ${assignee.name}`}>
          <AssigneeAvatar assignee={assignee} />
          <span>{assignee.name}</span>
        </div>
        <time>{task.date}</time>
        {canMove && (
          <label className="task-move">
            <span className="sr-only">Mover tarefa</span>
            <select value={task.status} onChange={(event) => onMove(task.id, event.target.value)}>
              {TASK_COLUMNS.map((column) => (
                <option value={column.id} key={column.id}>{column.title}</option>
              ))}
            </select>
          </label>
        )}
      </footer>

      <TaskActivity activity={task.activity} members={members} />
    </article>
  );
}

export default TaskCard;
