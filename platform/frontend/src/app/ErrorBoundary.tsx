import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Falha inesperada na interface", error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main role="alert" className="page">
          <h1>Algo deu errado</h1>
          <p>Seu estado confirmado não foi alterado. Recarregue a página para tentar novamente.</p>
          <button type="button" onClick={() => window.location.reload()}>Recarregar</button>
        </main>
      );
    }
    return this.props.children;
  }
}
