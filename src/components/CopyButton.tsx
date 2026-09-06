import { useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { useT } from "../i18n";

export default function CopyButton({ value, title }: { value: string; title?: string }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // İKİ YOL, sırayla. Tarayıcının Async Clipboard API'si Electron'da
    // güvenilir değil: `clipboard-sanitized-write` izni ana süreçteki
    // `setPermissionCheckHandler` listesinde yoksa promise sessizce
    // reddediliyor (2026-09-05'te tam olarak bu oldu — düğme hiçbir şey
    // yapmıyordu), paketlenmiş yapıda sayfa `file://` üzerinden yüklendiği
    // için `navigator.clipboard` hiç tanımlı olmayabiliyor. İzin listesine
    // eklendi AMA yedek yol duruyor: ana süreçteki `clipboard.writeText`
    // izinden de protokolden de bağımsız.
    const ok = await copyText(value);
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={state === "failed" ? t("copyButton.failed") : title ?? t("copyButton.copy")}
      className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-active hover:text-slate-200"
    >
      {state === "copied" ? (
        <Check size={13} className="text-[var(--status-success-text)]" />
      ) : state === "failed" ? (
        // Başarısızlık artık GÖRÜNÜYOR. Eskiden `catch` sessizce yutuyordu ve
        // bozuk bir kopyalama, "bastım ama bir şey olmadı"dan ayırt edilemiyordu.
        <X size={13} className="text-[var(--status-danger-text)]" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // İzin/protokol engeli — aşağıdaki IPC yolu deneniyor.
  }
  try {
    const result = await window.api.writeClipboard(value);
    return result.ok;
  } catch {
    return false;
  }
}
