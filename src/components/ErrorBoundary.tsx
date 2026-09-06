import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";
import { btn } from "../ui/buttons";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Bu component App'in (ve dolayısıyla LanguageProvider'ın) DIŞINDA render
// ediliyor (bkz. main.tsx) — App henüz hiç mount olmadan bile bir hata
// yakalayabilmesi gerektiği için AppConfig.language'a bağımlı olamaz.
// Bunun yerine tarayıcının/OS'in kendi dil tercihini (navigator.language)
// best-effort bir ipucu olarak kullanıyor — kalıcı bir tercih değil, sadece
// bu tek, nadir görülen çökme ekranı için.
const isTurkish = typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("tr");

const STRINGS = isTurkish
  ? { title: "Beklenmeyen bir hata oluştu", reload: "Uygulamayı Yeniden Yükle" }
  : { title: "An unexpected error occurred", reload: "Reload App" };

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
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-app px-8 text-center text-slate-300">
        <AlertOctagon size={40} className="text-[var(--status-danger-text)]" />
        <h1 className="text-lg font-semibold text-white">{STRINGS.title}</h1>
        <p className="max-w-md break-words text-xs text-slate-500">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className={btn("primary", "lg", "mt-2")}
        >
          {STRINGS.reload}
        </button>
      </div>
    );
  }
}
