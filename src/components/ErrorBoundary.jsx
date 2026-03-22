import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm font-semibold text-rose-800">Something went wrong rendering this section.</p>
          <p className="max-w-md text-xs text-rose-600">{this.state.error?.message || 'Unknown error'}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
