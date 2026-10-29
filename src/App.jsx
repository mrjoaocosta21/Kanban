import { useMemo } from 'react';
import './App.css';
import AuthLoading from './features/auth/components/AuthLoading.jsx';
import LoginScreen from './features/auth/components/LoginScreen.jsx';
import { useAuthSession } from './features/auth/hooks/useAuthSession.js';
import Board from './features/tasks/components/Board.jsx';
import { ApiTaskRepository } from './features/tasks/repositories/ApiTaskRepository.js';
import ErrorBoundary from './shared/components/ErrorBoundary.jsx';

function RemoteApplication() {
  const auth = useAuthSession();
  const taskRepository = useMemo(
    () => auth.currentWorkspace
      ? new ApiTaskRepository(auth.currentWorkspace.workspaceId)
      : null,
    [auth.currentWorkspace],
  );

  if (auth.isLoading) {
    return <AuthLoading />;
  }

  if (!auth.user) {
    return (
      <LoginScreen
        isSubmitting={auth.isSubmitting}
        error={auth.error}
        showDemoCredentials={import.meta.env.DEV}
        onSubmit={auth.login}
        onClearError={auth.clearError}
      />
    );
  }

  if (!auth.currentWorkspace || !auth.currentMember || !taskRepository) {
    return (
      <main className="fatal-error">
        <div>
          <span aria-hidden="true">!</span>
          <p className="app-eyebrow">Acesso incompleto</p>
          <h1>Nenhum workspace disponível</h1>
          <p>Seu usuário está autenticado, mas ainda não participa de um workspace.</p>
          <button className="button button--primary" type="button" onClick={auth.logout}>
            Sair
          </button>
        </div>
      </main>
    );
  }

  return (
    <Board
      repository={taskRepository}
      currentMember={auth.currentMember}
      members={auth.members}
      workspaceName={auth.currentWorkspace.workspaceName}
      isLoggingOut={auth.isSubmitting}
      onLogout={auth.logout}
    />
  );
}

function App() {
  const remoteMode = import.meta.env.VITE_DATA_MODE === 'api';

  return (
    <ErrorBoundary>
      {remoteMode ? <RemoteApplication /> : <Board />}
    </ErrorBoundary>
  );
}

export default App;
