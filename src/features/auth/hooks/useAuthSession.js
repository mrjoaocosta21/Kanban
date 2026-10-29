import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/apiClient.js';
import { authRepository } from '../repositories/AuthRepository.js';

function getMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useAuthSession(repository = authRepository) {
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const hydrateSession = useCallback(async (nextSession, signal) => {
    const membership = nextSession.memberships?.[0] ?? null;
    const memberResult = membership
      ? await repository.listMembers(membership.workspaceId, signal)
      : { members: [] };

    setSession(nextSession);
    setMembers(memberResult.members ?? []);
    return nextSession;
  }, [repository]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    repository.getSession(controller.signal)
      .then((nextSession) => hydrateSession(nextSession, controller.signal))
      .catch((sessionError) => {
        if (sessionError instanceof ApiError && sessionError.status === 401) {
          setSession(null);
          setMembers([]);
          return;
        }

        if (sessionError?.name !== 'AbortError') {
          setError(getMessage(sessionError, 'Não foi possível validar sua sessão.'));
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [hydrateSession, repository]);

  const login = useCallback(async (credentials) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const nextSession = await repository.login(credentials);
      await hydrateSession(nextSession);
      return true;
    } catch (loginError) {
      setError(getMessage(loginError, 'Não foi possível entrar.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [hydrateSession, repository]);

  const logout = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await repository.logout();
      setSession(null);
      setMembers([]);
    } catch (logoutError) {
      setError(getMessage(logoutError, 'Não foi possível encerrar a sessão.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [repository]);

  const currentWorkspace = session?.memberships?.[0] ?? null;
  const currentMember = useMemo(() => {
    if (!session?.user || !currentWorkspace) {
      return null;
    }

    const member = members.find((item) => item.id === session.user.id);
    return member ?? {
      ...session.user,
      workspaceRole: currentWorkspace.role,
    };
  }, [currentWorkspace, members, session]);

  return {
    user: session?.user ?? null,
    currentMember,
    currentWorkspace,
    members,
    isLoading,
    isSubmitting,
    error,
    clearError: () => setError(null),
    login,
    logout,
  };
}
