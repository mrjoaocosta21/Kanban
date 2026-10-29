function AuthLoading({ message = 'Validando sua sessão' }) {
  return (
    <main className="auth-shell">
      <div className="auth-loading" role="status" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <strong>{message}</strong>
        <span>Conectando ao workspace com segurança.</span>
      </div>
    </main>
  );
}

export default AuthLoading;
