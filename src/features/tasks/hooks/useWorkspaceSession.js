import { useCallback, useState } from 'react';
import { DEFAULT_ASSIGNEE_ID, getAssigneeById, TASK_ASSIGNEES } from '../taskData.js';

export const SESSION_STORAGE_KEY = 'lista-de-afazeres:demo-session:v1';

function readStoredMemberId() {
  try {
    const storedMemberId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return TASK_ASSIGNEES.some((member) => member.id === storedMemberId)
      ? storedMemberId
      : DEFAULT_ASSIGNEE_ID;
  } catch {
    return DEFAULT_ASSIGNEE_ID;
  }
}

export function useWorkspaceSession() {
  const [currentMemberId, setCurrentMemberId] = useState(readStoredMemberId);

  const switchMember = useCallback((memberId) => {
    if (!TASK_ASSIGNEES.some((member) => member.id === memberId)) {
      return false;
    }

    setCurrentMemberId(memberId);

    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, memberId);
    } catch {
      // A sessão demonstrativa continua funcional durante a aba atual.
    }

    return true;
  }, []);

  return {
    currentMember: getAssigneeById(currentMemberId),
    switchMember,
  };
}
