import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/react";

type Props = {
  children: ReactNode;
  /** Optional custom fallback. Receives the captured error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Friendly title shown in the default fallback. */
  title?: string;
  /** Friendly description shown in the default fallback. */
  description?: string;
};

type State = { error: Error | null };

/**
 * App-level error boundary. Catches render/runtime errors thrown by descendants
 * (including provider initialization issues like the React "useState of null"
 * crash) and shows a friendly recovery UI instead of a blank screen.
 *
 * Note: Error boundaries do NOT catch errors inside event handlers, async code,
 * server-side rendering, or errors thrown in the boundary itself.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to console for devtools / log aggregators
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Caught error:", error, info.componentStack);
    try {
      Sentry.captureException(error, {
        tags: { source: "react.error_boundary" },
        contexts: { react: { componentStack: info.componentStack ?? null } },
      });
    } catch {
      // never let reporting break recovery UI
    }
  }

  reset = () => this.setState({ error: null });

  reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    const title = this.props.title ?? "Something went wrong";
    const description =
      this.props.description ??
      "The app hit an unexpected error while loading. Try reloading the page — if it keeps happening, your session cache may be stale.";

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-screen w-full flex items-center justify-center bg-background px-4"
      >
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 sm:p-8 text-center shadow-sm">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            aria-hidden="true"
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>

          {import.meta.env.DEV && error?.message && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" onClick={this.reload} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reload page
            </Button>
            <Button size="sm" variant="outline" onClick={this.reset}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
