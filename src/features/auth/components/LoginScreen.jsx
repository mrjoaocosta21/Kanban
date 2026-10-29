import { useState } from 'react';

function LoginScreen({ isSubmitting, error, showDemoCredentials = false, onSubmit, onClearError }) {
  const [email, setEmail] = useState(showDemoCredentials ? 'joao@kanban.local' : '');
  const [password, setPassword] = useState(showDemoCredentials ? 'Manager123!' : '');

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({ email: email.trim(), password });
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="app-eyebrow">React Kanban</p>
            <h1 id="login-title">Acesse seu workspace</h1>
            <p>Entre para visualizar e atualizar as tarefas permitidas ao seu perfil.</p>
          </div>
        </div>

        {error && (
          <div className="auth-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={onClearError}>Fechar</button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className="form-field">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="form-field">
            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {showDemoCredentials && (
          <div className="demo-credentials">
            <strong>Ambiente de desenvolvimento</strong>
            <span>Gestor: joao@kanban.local · Manager123!</span>
            <span>Colaborador: marina@kanban.local · Collaborator123!</span>
          </div>
        )}
      </section>
    </main>
  );
}

export default LoginScreen;
