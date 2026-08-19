import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Renderer crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-base-950 px-8 text-center text-slate-300">
        <AlertOctagon size={40} className="text-rose-400" />
        <h1 className="text-lg font-semibold text-white">Beklenmeyen bir hata oluştu</h1>
        <p className="max-w-md break-words text-xs text-slate-500">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 cursor-pointer rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-400"
        >
          Uygulamayı Yeniden Yükle
        </button>
      </div>
    );
  }
}
