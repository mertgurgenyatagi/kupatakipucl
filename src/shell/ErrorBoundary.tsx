import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Last-resort net for the whole app — without this, any render error
 *  anywhere in the tree unmounts everything and leaves a blank white page
 *  with no explanation. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Uncaught render error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh w-full cursor-default flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <p className="font-display text-xl text-color_text">Bir şeyler ters gitti.</p>
          <p className="max-w-sm text-sm text-color_textsecondary">
            Sayfa beklenmedik bir hatayla karşılaştı. Sayfayı yenilemeyi dene.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-full bg-color_text px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
          >
            Sayfayı yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
