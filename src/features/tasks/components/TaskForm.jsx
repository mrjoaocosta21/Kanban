import { useEffect, useState } from 'react';
import {
  DEFAULT_ASSIGNEE_ID,
  TAG_COLORS,
  TASK_ASSIGNEES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../taskData.js';

function tagsToText(tags = []) {
  return tags.map((tag) => tag.name).join(', ');
}

function textToTags(value, currentTags = []) {
  const currentColors = new Map(currentTags.map((tag) => [tag.name.toLowerCase(), tag.color]));

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, allTags) => allTags.indexOf(tag) === index)
    .map((name, index) => ({
      name,
      color: currentColors.get(name.toLowerCase()) ?? TAG_COLORS[index % TAG_COLORS.length],
    }));
}

function TaskForm({ task, initialStatus, isSubmitting = false, onCancel, onSubmit }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [date, setDate] = useState(task?.date ?? '');
  const [status, setStatus] = useState(task?.status ?? initialStatus ?? TASK_STATUSES.TODO);
  const [priority, setPriority] = useState(task?.priority ?? TASK_PRIORITIES.MEDIUM);
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? DEFAULT_ASSIGNEE_ID);
  const [tags, setTags] = useState(tagsToText(task?.tags));
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(task?.title ?? '');
    setDate(task?.date ?? '');
    setStatus(task?.status ?? initialStatus ?? TASK_STATUSES.TODO);
    setPriority(task?.priority ?? TASK_PRIORITIES.MEDIUM);
    setAssigneeId(task?.assigneeId ?? DEFAULT_ASSIGNEE_ID);
    setTags(tagsToText(task?.tags));
    setError('');
  }, [task, initialStatus]);

  function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setError('Informe um título para a tarefa.');
      return;
    }

    onSubmit({
      title: normalizedTitle,
      date: date.trim() || 'Sem data',
      status,
      priority,
      assigneeId,
      tags: textToTags(tags, task?.tags),
    });
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="dialog-header">
        <div>
          <p className="app-eyebrow">{task ? 'Editar tarefa' : 'Nova tarefa'}</p>
          <h2 id="task-form-title">{task ? 'Atualizar tarefa' : 'Adicionar tarefa'}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Fechar formulário" disabled={isSubmitting}>
          ×
        </button>
      </div>

      <div className="form-field">
        <label htmlFor="task-title">Título</label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Criar tela de login"
          autoFocus
          disabled={isSubmitting}
        />
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="task-date">Data</label>
          <input
            id="task-date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder="Ex.: Hoje, 28 out"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-field">
          <label htmlFor="task-assignee">Responsável</label>
          <select id="task-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} disabled={isSubmitting}>
            {TASK_ASSIGNEES.map((assignee) => (
              <option value={assignee.id} key={assignee.id}>
                {assignee.name} · {assignee.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="task-status">Coluna</label>
          <select id="task-status" value={status} onChange={(event) => setStatus(event.target.value)} disabled={isSubmitting}>
            <option value={TASK_STATUSES.TODO}>To do</option>
            <option value={TASK_STATUSES.INPROGRESS}>In progress</option>
            <option value={TASK_STATUSES.DONE}>Done</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="task-priority">Prioridade</label>
          <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value)} disabled={isSubmitting}>
            <option value={TASK_PRIORITIES.LOW}>Baixa</option>
            <option value={TASK_PRIORITIES.MEDIUM}>Média</option>
            <option value={TASK_PRIORITIES.HIGH}>Alta</option>
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="task-tags">Tags</label>
        <input
          id="task-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Ex.: Frontend, Design"
          disabled={isSubmitting}
        />
        <small>Separe as tags usando vírgulas.</small>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="button button--secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : task ? 'Salvar alterações' : 'Adicionar tarefa'}
        </button>
      </div>
    </form>
  );
}

export default TaskForm;
