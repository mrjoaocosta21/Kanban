import { getAssigneeById, TASK_COLUMNS } from '../taskData.js';
import { TASK_ACTIVITY_TYPES } from '../taskActivity.js';

const STATUS_LABELS = new Map(TASK_COLUMNS.map((column) => [column.id, column.title]));

function formatActivityDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'data não informada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function getActivityLabel(activity) {
  switch (activity.type) {
    case TASK_ACTIVITY_TYPES.CREATED:
      return 'criou a tarefa';
    case TASK_ACTIVITY_TYPES.STATUS_CHANGED:
      return `moveu de ${STATUS_LABELS.get(activity.fromStatus) ?? 'outra etapa'} para ${STATUS_LABELS.get(activity.toStatus) ?? 'outra etapa'}`;
    case TASK_ACTIVITY_TYPES.REORDERED:
      return 'reordenou a tarefa';
    case TASK_ACTIVITY_TYPES.UPDATED:
    default:
      return 'atualizou a tarefa';
  }
}

function TaskActivity({ activity = [] }) {
  if (activity.length === 0) {
    return null;
  }

  const latestFirst = [...activity].reverse();

  return (
    <details className="task-activity">
      <summary>Atividade ({activity.length})</summary>
      <ol>
        {latestFirst.map((item) => (
          <li key={item.id}>
            <span><strong>{getAssigneeById(item.actorId).name}</strong> {getActivityLabel(item)}</span>
            <time dateTime={item.at}>{formatActivityDate(item.at)}</time>
          </li>
        ))}
      </ol>
    </details>
  );
}

export default TaskActivity;
