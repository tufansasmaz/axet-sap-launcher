// Tur 7: Akış kartındaki "Tarayıcıda aç" — ekibin Tarayıcı görünümünde açar.
// Uzak adresler yalnız bu düğmeyle açılıyor (otomatik değil).
import { Globe } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { readBrowserUrl } from "../../app-electron/shared/browserLogic";
import { requestBrowserOpen } from "./browserAutoOpen";

export default function OpenInBrowserButton({ workspaceId, url }: { workspaceId: string; url: string }) {
  const t = useT();
  const { commands } = useTerminalStore();
  if (!readBrowserUrl(url)) return null;
  return (
    <button
      type="button"
      data-open-in-browser=""
      onClick={() => {
        if (requestBrowserOpen(workspaceId, url, { auto: false, badge: false })) commands.setWorkspaceView(workspaceId, "browser");
      }}
      className="inline-flex cursor-pointer items-center gap-1 text-2xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
    >
      <Globe size={11} aria-hidden />
      {t("flow.openInBrowser")}
    </button>
  );
}
