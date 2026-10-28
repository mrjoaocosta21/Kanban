import { useEffect, useReducer } from 'react';
import { taskReducer } from '../taskReducer.js';
import { loadTasks, saveTasks } from '../taskStorage.js';
import { TASK_PRIORITIES } from '../taskData.js';

function createTaskId() {
  return `task-${crypto.randomUUID()}`;
}

function createTagId() {
  return `tag-${crypto.randomUUID()}`;
}

export function useTaskBoard() {
  const [tasks, dispatch] = useReducer(taskReducer, undefined, loadTasks);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function addTask({ title, date, tags = [], status, priority = TASK_PRIORITIES.MEDIUM }) {
    dispatch({
      type: 'task/added',
      task: {
        id: createTaskId(),
        title,
        date,
        status,
        priority,
        avatarUrl: 'https://i.pravatar.cc/100?img=12',
        tags: tags.map((tag) => ({ ...tag, id: createTagId() })),
      },
    });
  }

  function updateTask(taskId, changes) {
    dispatch({ type: 'task/updated', taskId, changes });
  }

  function deleteTask(taskId) {
    dispatch({ type: 'task/deleted', taskId });
  }

  function moveTask(taskId, status) {
    dispatch({ type: 'task/moved', taskId, status });
  }

  function reorderTask(taskId, status, targetTaskId = null) {
    dispatch({ type: 'task/reordered', taskId, status, targetTaskId });
  }

  return { tasks, addTask, updateTask, deleteTask, moveTask, reorderTask };
}
