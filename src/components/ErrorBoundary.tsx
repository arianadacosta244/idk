import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="mb-2 font-display text-xl font-semibold text-bad">Ocorreu um erro</p>
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.clear()
              window.location.reload()
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Limpar dados guardados e recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
