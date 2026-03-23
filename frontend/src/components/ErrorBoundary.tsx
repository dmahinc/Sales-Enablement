import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 max-w-md border border-slate-200 dark:border-slate-700">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 font-mono break-all">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#006dc7] hover:bg-[#005294] text-white font-medium text-sm"
            >
              <RefreshCw className="w-5 h-5" />
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
