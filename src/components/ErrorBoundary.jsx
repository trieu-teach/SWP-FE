import { Component } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught:', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    if (typeof window !== 'undefined') window.location.reload()
  }

  handleHome = () => {
    this.setState({ error: null })
    if (typeof window !== 'undefined') window.location.href = '/'
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-xl font-semibold">Đã xảy ra lỗi</h1>
          <p className="text-sm text-muted-foreground">
            Trang gặp sự cố khi hiển thị. Bạn có thể thử tải lại hoặc quay về trang chủ.
          </p>
          {import.meta.env?.DEV && this.state.error?.message ? (
            <pre className="mt-3 max-h-40 overflow-auto rounded border bg-muted p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.handleHome}>Về trang chủ</Button>
          <Button onClick={this.handleReload}>Tải lại</Button>
        </div>
      </div>
    )
  }
}