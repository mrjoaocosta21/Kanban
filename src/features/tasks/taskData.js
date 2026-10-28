export const TASK_STATUSES = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
};

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const TASK_COLUMNS = [
  { id: TASK_STATUSES.TODO, title: 'To do' },
  { id: TASK_STATUSES.DOING, title: 'Doing' },
  { id: TASK_STATUSES.DONE, title: 'Done' },
];

export const TAG_COLORS = ['#a278e6', '#4be0bb', '#ffa94d', '#56a5ff', '#ff5e94'];

export const initialTasks = [
  {
    id: 'task-ui-updates',
    title: 'UI Updates',
    status: TASK_STATUSES.TODO,
    priority: TASK_PRIORITIES.HIGH,
    date: 'Hoje, 28 out',
    avatarUrl: 'https://i.pravatar.cc/100?img=12',
    tags: [
      { id: 'tag-frontend', name: 'Frontend', color: '#a278e6' },
      { id: 'tag-design', name: 'Design', color: '#ffa94d' },
    ],
  },
  {
    id: 'task-api-integration',
    title: 'API Integration',
    status: TASK_STATUSES.DOING,
    priority: TASK_PRIORITIES.MEDIUM,
    date: 'Hoje, 28 out',
    avatarUrl: 'https://i.pravatar.cc/100?img=5',
    tags: [{ id: 'tag-backend', name: 'Backend', color: '#4be0bb' }],
  },
];
