import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Error inesperado en la consola.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Montana Cloud UI ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#12141A] border border-zinc-800 rounded-xl p-8 space-y-5">
            <h1 className="font-display text-2xl font-bold text-[#D4AF37]">
              Interrupción de Consola
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Ocurrió un fallo de permisos o sincronización en la sesión. Revisa tu conexión o recarga el panel ejecutivo.
            </p>
            <pre className="text-xs font-mono text-red-400 bg-[#09090B] border border-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap"
            >
              Recargar Consola
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
