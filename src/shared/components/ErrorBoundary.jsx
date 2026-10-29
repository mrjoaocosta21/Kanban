import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Falha inesperada na aplicação.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error" role="alert">
          <div>
            <span aria-hidden="true">!</span>
            <p className="app-eyebrow">Erro inesperado</p>
            <h1>Não foi possível exibir o quadro</h1>
            <p>Recarregue a aplicação. Seus dados salvos neste dispositivo não serão apagados.</p>
            <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
              Recarregar aplicação
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
