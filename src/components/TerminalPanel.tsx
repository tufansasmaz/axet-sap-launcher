import { TerminalSquare, X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import EmbeddedTerminal from "./EmbeddedTerminal";

export interface TerminalSessionInfo {
  id: string;
  title: string;
}

interface Props {
  sessions: TerminalSessionInfo[];
  activeId: string | null;
  open: boolean;
  height: number;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onToggleOpen: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onNewTerminal: () => void;
}

export default function TerminalPanel({
  sessions,
  activeId,
  open,
  height,
  onSelect,
  onClose,
  onToggleOpen,
  onResizeStart,
  onNewTerminal
}: Props) {
  // Panel kapalıyken (open=false) body'yi koşullu JSX ile (örn. `{open && ...}`)
  // hiç render ETMİYORUZ artık — bunun yerine dış container'ın yüksekliği
  // 36px'e (sadece sekme çubuğu) düşüyor, body flex-1 olduğu için doğal
  // olarak 0 yükseklikte kalıyor ama DOM'dan/React ağacından hiç kalkmıyor.
  // Önceki tasarımda panel her açılıp kapandığında TÜM EmbeddedTerminal
  // component'leri unmount/mount oluyordu — bu da her toggle'da xterm
  // instance'ını yok edip main process'ten tüm geçmiş buffer'ı yeniden
  // çekmeye (ve olası "dispose sonrası write" yarışına) yol açıyordu,
  // özellikle birden fazla terminal açıkken gözle görülür bir "sapıtma"
  // (flicker/duplicate/hata) sebebiydi. Artık her session bir kez mount
  // olur ve panel kapansa da açılsa da hep aynı xterm instance'ı yaşar.
  return (
    <div
      className="flex w-full min-w-0 shrink-0 flex-col overflow-hidden border-t border-base-700 bg-base-950"
      style={{ height: open ? height : 36 }}
    >
      <div
        onMouseDown={open ? onResizeStart : undefined}
        title={open ? "Boyutu değiştir" : undefined}
        className={`h-1 w-full shrink-0 ${open ? "cursor-row-resize hover:bg-accent-500/50" : ""}`}
      />
      <div className="flex h-9 w-full min-w-0 shrink-0 items-center gap-1 border-b border-base-700 bg-base-900 px-2">
        <button
          onClick={onToggleOpen}
          title={open ? "Terminal panelini kapat" : "Terminal panelini aç"}
          className="shrink-0 cursor-pointer rounded p-1 text-slate-400 hover:bg-base-700 hover:text-white"
        >
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                onSelect(s.id);
                if (!open) onToggleOpen();
              }}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-1.5 text-xs ${
                activeId === s.id && open ? "bg-base-800 text-white" : "text-slate-400 hover:bg-base-800/60"
              }`}
            >
              <TerminalSquare size={12} />
              {s.title}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(s.id);
                }}
                title="Terminali kapat"
                className="cursor-pointer rounded p-0.5 hover:bg-base-700"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <span className="px-2 text-xs text-slate-500">Henüz terminal yok</span>
          )}
        </div>
        <button
          onClick={onNewTerminal}
          title="Yeni terminal ekle"
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded p-1.5 text-slate-400 hover:bg-base-700 hover:text-white"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="relative w-full min-w-0 flex-1 overflow-hidden p-1">
        {sessions.map((s) => (
          <div key={s.id} className="absolute inset-1 overflow-hidden" style={{ display: activeId === s.id ? "block" : "none" }}>
            <EmbeddedTerminal sessionId={s.id} active={activeId === s.id && open} />
          </div>
        ))}
        {sessions.length === 0 && open && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Sağ üstteki + ile yeni bir terminal ekleyebilirsin.
          </div>
        )}
      </div>
    </div>
  );
}
