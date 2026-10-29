function updateTask(tasks, taskId, updater) {
  return tasks.map((task) => (task.id === taskId ? updater(task) : task));
}

function insertAtEndOfStatus(tasks, task) {
  let lastStatusIndex = -1;

  tasks.forEach((currentTask, index) => {
    if (currentTask.status === task.status) {
      lastStatusIndex = index;
    }
  });

  if (lastStatusIndex === -1) {
    return [...tasks, task];
  }

  return [
    ...tasks.slice(0, lastStatusIndex + 1),
    task,
    ...tasks.slice(lastStatusIndex + 1),
  ];
}

function moveTaskToStatus(tasks, taskId, status, changes = {}) {
  const task = tasks.find((currentTask) => currentTask.id === taskId);

  if (!task || task.status === status) {
    return tasks;
  }

  const remainingTasks = tasks.filter((currentTask) => currentTask.id !== taskId);
  return insertAtEndOfStatus(remainingTasks, { ...task, ...changes, status });
}

function reorderTask(tasks, taskId, status, targetTaskId, changes = {}) {
  const task = tasks.find((currentTask) => currentTask.id === taskId);

  if (!task || task.id === targetTaskId) {
    return tasks;
  }

  const remainingTasks = tasks.filter((currentTask) => currentTask.id !== taskId);
  const taskToInsert = { ...task, ...changes, status };

  if (!targetTaskId) {
    return insertAtEndOfStatus(remainingTasks, taskToInsert);
  }

  const targetIndex = remainingTasks.findIndex((currentTask) => currentTask.id === targetTaskId);

  if (targetIndex === -1) {
    return tasks;
  }

  return [
    ...remainingTasks.slice(0, targetIndex),
    taskToInsert,
    ...remainingTasks.slice(targetIndex),
  ];
}

export function taskReducer(tasks, action) {
  switch (action.type) {
    case 'tasks/replaced':
      return action.tasks;

    case 'task/added':
      return [...tasks, action.task];

    case 'task/updated':
      return updateTask(tasks, action.taskId, (task) => ({
        ...task,
        ...action.changes,
      }));

    case 'task/deleted':
      return tasks.filter((task) => task.id !== action.taskId);

    case 'task/moved':
      return moveTaskToStatus(tasks, action.taskId, action.status, action.changes);

    case 'task/reordered':
      return reorderTask(tasks, action.taskId, action.status, action.targetTaskId, action.changes);

    default:
      return tasks;
  }
}
