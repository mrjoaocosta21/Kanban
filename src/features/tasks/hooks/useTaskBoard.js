import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useOnlineStatus } from '../../../shared/hooks/useOnlineStatus.js';
import { DEFAULT_ASSIGNEE_ID, TASK_PRIORITIES } from '../taskData.js';
import { localStorageTaskRepository } from '../repositories/LocalStorageTaskRepository.js';
import { appendTaskActivity, createTaskActivity, TASK_ACTIVITY_TYPES } from '../taskActivity.js';
import { assertTaskAccess, TASK_ACTIONS } from '../taskAccess.js';
import { taskReducer } from '../taskReducer.js';

function createId(prefix) {
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${id}`;
}

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}

export function useTaskBoard(repository = localStorageTaskRepository) {
  const [tasks, dispatch] = useReducer(taskReducer, []);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const isOnline = useOnlineStatus();
  const tasksRef = useRef([]);
  const persistedTasksRef = useRef([]);
  const persistenceQueueRef = useRef(Promise.resolve());
  const latestOperationIdRef = useRef(0);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    repository.load()
      .then(({ tasks: loadedTasks, warning: loadWarning }) => {
        if (!isActive) {
          return;
        }

        tasksRef.current = loadedTasks;
        persistedTasksRef.current = loadedTasks;
        dispatch({ type: 'tasks/replaced', tasks: loadedTasks });
        setWarning(loadWarning);
      })
      .catch((loadError) => {
        if (isActive) {
          setError(getErrorMessage(loadError, 'Não foi possível carregar as tarefas.'));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [reloadToken, repository]);

  const commit = useCallback((action) => {
    const currentTasks = tasksRef.current;
    const nextTasks = taskReducer(currentTasks, action);

    if (nextTasks === currentTasks) {
      return Promise.resolve(false);
    }

    latestOperationIdRef.current += 1;
    const operationId = latestOperationIdRef.current;

    tasksRef.current = nextTasks;
    dispatch({ type: 'tasks/replaced', tasks: nextTasks });
    setPendingOperations((count) => count + 1);
    setError(null);

    const persistenceOperation = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() => repository.save(nextTasks))
      .then(() => {
        persistedTasksRef.current = nextTasks;

        if (isMountedRef.current && latestOperationIdRef.current === operationId) {
          setError(null);
        }

        return true;
      })
      .catch((saveError) => {
        if (isMountedRef.current) {
          if (latestOperationIdRef.current === operationId) {
            const persistedTasks = persistedTasksRef.current;
            tasksRef.current = persistedTasks;
            dispatch({ type: 'tasks/replaced', tasks: persistedTasks });
          }

          setError(getErrorMessage(saveError, 'Não foi possível salvar as alterações.'));
        }

        throw saveError;
      })
      .finally(() => {
        if (isMountedRef.current) {
          setPendingOperations((count) => Math.max(0, count - 1));
        }
      });

    persistenceQueueRef.current = persistenceOperation.catch(() => undefined);
    return persistenceOperation;
  }, [repository]);

  const addTask = useCallback(({
    title,
    date,
    tags = [],
    status,
    priority = TASK_PRIORITIES.MEDIUM,
    assigneeId = DEFAULT_ASSIGNEE_ID,
  }, member) => {
    assertTaskAccess({ member, action: TASK_ACTIONS.CREATE });
    const timestamp = new Date().toISOString();
    const activity = createTaskActivity(TASK_ACTIVITY_TYPES.CREATED, member.id, {}, timestamp);

    return commit({
      type: 'task/added',
      task: {
        id: createId('task'),
        title,
        date,
        status,
        priority,
        assigneeId,
        createdById: member.id,
        createdAt: timestamp,
        updatedById: member.id,
        updatedAt: timestamp,
        tags: tags.map((tag) => ({ ...tag, id: createId('tag') })),
        activity: [activity],
      },
    });
  }, [commit]);

  const updateTask = useCallback(
    (taskId, changes, member) => {
      const task = tasksRef.current.find((item) => item.id === taskId);
      assertTaskAccess({ member, action: TASK_ACTIONS.UPDATE, task });

      if (!task) {
        return Promise.resolve(false);
      }

      const timestamp = new Date().toISOString();
      const statusChanged = changes.status && changes.status !== task.status;
      const activity = createTaskActivity(
        statusChanged ? TASK_ACTIVITY_TYPES.STATUS_CHANGED : TASK_ACTIVITY_TYPES.UPDATED,
        member.id,
        statusChanged ? { fromStatus: task.status, toStatus: changes.status } : {},
        timestamp,
      );

      return commit({
        type: 'task/updated',
        taskId,
        changes: {
          ...changes,
          updatedById: member.id,
          updatedAt: timestamp,
          activity: appendTaskActivity(task, activity),
        },
      });
    },
    [commit],
  );

  const deleteTask = useCallback(
    (taskId, member) => {
      const task = tasksRef.current.find((item) => item.id === taskId);
      assertTaskAccess({ member, action: TASK_ACTIONS.DELETE, task });
      return commit({ type: 'task/deleted', taskId });
    },
    [commit],
  );

  const moveTask = useCallback(
    (taskId, status, member) => {
      const task = tasksRef.current.find((item) => item.id === taskId);
      assertTaskAccess({ member, action: TASK_ACTIONS.MOVE, task });

      if (!task || task.status === status) {
        return Promise.resolve(false);
      }

      const timestamp = new Date().toISOString();
      const activity = createTaskActivity(TASK_ACTIVITY_TYPES.STATUS_CHANGED, member.id, {
        fromStatus: task.status,
        toStatus: status,
      }, timestamp);

      return commit({
        type: 'task/moved',
        taskId,
        status,
        changes: {
          updatedById: member.id,
          updatedAt: timestamp,
          activity: appendTaskActivity(task, activity),
        },
      });
    },
    [commit],
  );

  const reorderTask = useCallback(
    (taskId, status, targetTaskId = null, member) => {
      const task = tasksRef.current.find((item) => item.id === taskId);
      const isStatusChange = task?.status !== status;
      assertTaskAccess({
        member,
        action: isStatusChange ? TASK_ACTIONS.MOVE : TASK_ACTIONS.REORDER,
        task,
      });

      if (!task) {
        return Promise.resolve(false);
      }

      const timestamp = new Date().toISOString();
      const activity = createTaskActivity(
        isStatusChange ? TASK_ACTIVITY_TYPES.STATUS_CHANGED : TASK_ACTIVITY_TYPES.REORDERED,
        member.id,
        isStatusChange ? { fromStatus: task.status, toStatus: status } : {},
        timestamp,
      );

      return commit({
        type: 'task/reordered',
        taskId,
        status,
        targetTaskId,
        changes: {
          updatedById: member.id,
          updatedAt: timestamp,
          activity: appendTaskActivity(task, activity),
        },
      });
    },
    [commit],
  );

  const replaceTasks = useCallback(
    (nextTasks, member) => {
      assertTaskAccess({ member, action: TASK_ACTIONS.IMPORT });
      return commit({ type: 'tasks/replaced', tasks: nextTasks });
    },
    [commit],
  );

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
    replaceTasks,
    isLoading,
    isSaving: pendingOperations > 0,
    isOnline,
    error,
    warning,
    clearError: () => setError(null),
    dismissWarning: () => setWarning(null),
    reloadTasks: () => setReloadToken((token) => token + 1),
  };
}
