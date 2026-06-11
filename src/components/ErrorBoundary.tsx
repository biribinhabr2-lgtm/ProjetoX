import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return { hasError: true, message }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#FAF9F7',
            fontFamily: 'Nunito, Helvetica, Arial, sans-serif',
          }}
        >
          {/* Logo mark */}
          <svg width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true" style={{ marginBottom: 20 }}>
            <circle cx="14" cy="14" r="14" fill="#E8462A" />
            <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" />
            <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14" cy="17.5" r="1" fill="white" />
          </svg>

          <h1
            style={{
              margin: '0 0 8px',
              fontSize: 22,
              fontWeight: 800,
              color: '#16131F',
              fontFamily: 'Sora, Helvetica, Arial, sans-serif',
              textAlign: 'center',
            }}
          >
            Algo deu errado
          </h1>

          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 360 }}>
            Ocorreu um erro inesperado. Tente recarregar a página. Se o problema persistir, entre em contato com o suporte.
          </p>

          {import.meta.env.DEV && this.state.message && (
            <pre
              style={{
                margin: '0 0 24px',
                padding: '12px 16px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                fontSize: 12,
                color: '#DC2626',
                maxWidth: 480,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.message}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              background: '#E8462A',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Nunito, Helvetica, Arial, sans-serif',
            }}
          >
            Recarregar página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
