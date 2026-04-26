import * as React from "react"

export interface ErrorBoundaryProps {
  children: React.ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * Catches render errors in child tree so a failed VoiceInputScreen (or other UI)
 * does not leave the nurse on a blank page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught:", error, info)
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
          <p className="text-lg font-semibold text-[#0A3D40] dark:text-foreground mb-2">
            Something went wrong.
          </p>
          <p className="text-[#5A7070] dark:text-muted-foreground mb-4">
            Your progress has been saved.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: undefined })
              this.props.onReset?.()
            }}
            className="rounded-xl bg-[#0D7377] px-6 py-3 text-white hover:opacity-95"
          >
            Tap here to restart
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
