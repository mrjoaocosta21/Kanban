import { useEffect, useState } from 'react';
import { TAG_COLORS, TASK_PRIORITIES, TASK_STATUSES } from '../taskData.js';

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

function TaskForm({ task, initialStatus, onCancel, onSubmit }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [date, setDate] = useState(task?.date ?? '');
  const [status, setStatus] = useState(task?.status ?? initialStatus ?? TASK_STATUSES.TODO);
  const [priority, setPriority] = useState(task?.priority ?? TASK_PRIORITIES.MEDIUM);
  const [tags, setTags] = useState(tagsToText(task?.tags));
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(task?.title ?? '');
    setDate(task?.date ?? '');
    setStatus(task?.status ?? initialStatus ?? TASK_STATUSES.TODO);
    setPriority(task?.priority ?? TASK_PRIORITIES.MEDIUM);
    setTags(tagsToText(task?.tags));
    setError('');
  }, [task, initialStatus]);

  function handleSubmit(event) {
    event.preventDefault();
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
      tags: textToTags(tags, task?.tags),
    });
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="dialog-header">
        <div>
          <p className="app-eyebrow">{task ? 'Editar tarefa' : 'Nova tarefa'}</p>
          <h2 id="task-form-title">{task ? 'Atualizar tarefa' : 'Adicionar tarefa'}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Fechar formulário">
          ×
        </button>
      </div>

      <label htmlFor="task-title">Título</label>
      <input
        id="task-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Ex.: Criar tela de login"
        autoFocus
      />

      <label htmlFor="task-date">Data</label>
      <input
        id="task-date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        placeholder="Ex.: Hoje, 28 out"
      />

      <label htmlFor="task-status">Coluna</label>
      <select id="task-status" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value={TASK_STATUSES.TODO}>To do</option>
        <option value={TASK_STATUSES.DOING}>Doing</option>
        <option value={TASK_STATUSES.DONE}>Done</option>
      </select>

      <label htmlFor="task-priority">Prioridade</label>
      <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
        <option value={TASK_PRIORITIES.LOW}>Baixa</option>
        <option value={TASK_PRIORITIES.MEDIUM}>Média</option>
        <option value={TASK_PRIORITIES.HIGH}>Alta</option>
      </select>

      <label htmlFor="task-tags">Tags</label>
      <input
        id="task-tags"
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        placeholder="Ex.: Frontend, Design"
      />
      <small>Separe as tags usando vírgulas.</small>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="button button--secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button button--primary" type="submit">
          {task ? 'Salvar alterações' : 'Adicionar tarefa'}
        </button>
      </div>
    </form>
  );
}

export default TaskForm;
