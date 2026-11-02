import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Qué mostrar si algo falla. Recibe el error y una función para reintentar. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Al cambiar este valor se limpia el error (p. ej. al cambiar de ruta o de mensaje). */
  resetKey?: unknown
}

/** Evita que un error de render deje toda la app en blanco: muestra un aviso y permite reintentar. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }
  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }
  reset = () => this.setState({ error: null })
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <div className="note warn" role="alert">
        <b>Algo falló al mostrar esta parte.</b> Tus datos están a salvo.
        <div className="muted small">{error.message}</div>
        <button className="btn" onClick={this.reset}>Reintentar</button>
      </div>
    )
  }
}
