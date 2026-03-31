import React, { Component } from 'react';
import type { ErrorInfo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { useAppStore } from './store/useAppStore';
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Responsyva CRM Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-4xl text-white mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.15em' }}>
              RESPONSYVA
            </h1>
            <p className="text-red-400 mb-4">Algo deu errado.</p>
            <p className="text-gray-500 text-sm mb-6">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ThemedApp: React.FC = () => {
  const { theme } = useAppStore();
  useSupabaseBootstrap();

  return (
    <div className={theme === 'dark' ? 'dark' : ''} style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemedApp />
    </ErrorBoundary>
  );
}

export default App;
