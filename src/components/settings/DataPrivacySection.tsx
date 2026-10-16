// Veri ve gizlilik bölümü — Ayarlar penceresinin "dataPrivacy" paneli.
//
// Dört satır: sohbet geçmişi, uygulama günlüğü, SAP yazma günlükleri,
// axet-code oturumları. Temizleme yalnızca ilk ikisinde var.
// Yol renderer'a gönderilmiyor; "Klasörü aç" main sürece yetki veriyor.

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import { useT } from "../../i18n";
import { Button } from "../../ui/Button";
import ConfirmDialog from "../ConfirmDialog";
import { formatBytes } from "../../lib/formatBytes";
import { ChatStoreContext } from "../../stores/chatStore";

// ─────────────────────────────────────────────────────────────
// Özet tipi (preload ile eşleşiyor)
// ─────────────────────────────────────────────────────────────

interface DataSummary {
  chat: { count: number; bytes: number };
  log: { bytes: number };
  sapWrite: { projects: number; bytes: number };
  axetDb: { count: number; bytes: number };
}

// Props'ta artık geri çağrı olmayacak; chat store doğrudan erişilecek.

// ─────────────────────────────────────────────────────────────
// Bileşen
// ─────────────────────────────────────────────────────────────

export default function DataPrivacySection() {
  const t = useT();
  // ChatStoreProvider dışında da kullanılabilmesi için null-safe erişim
  // (ör. bileşen testleri SettingsModal'ı sağlayıcısız render ediyor).
  const chatCtx = useContext(ChatStoreContext);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [confirmKind, setConfirmKind] = useState<"chat" | "log" | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const s = await window.api.dataPrivacySummary();
      if (mountedRef.current) setSummary(s);
    } catch {
      // Erişilemezse boş bırak.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleConfirm = useCallback(async () => {
    if (!confirmKind) return;
    setClearing(true);
    setClearError(null);
    try {
      const result = await window.api.dataPrivacyClear(confirmKind);
      if (!result.ok) {
        setClearError(t("dataPrivacy.clearError", { error: result.error ?? "?" }));
      } else if (confirmKind === "chat") {
        // Renderer store'u da temizle: ekran anında boşalsın.
        chatCtx?.setSessions([]);
        chatCtx?.setActiveId(null);
      }
      // Her iki durumda da özeti yenile.
      await loadSummary();
    } catch (err) {
      setClearError(t("dataPrivacy.clearError", { error: (err as Error).message }));
    } finally {
      if (mountedRef.current) {
        setClearing(false);
        setConfirmKind(null);
      }
    }
  }, [confirmKind, loadSummary, chatCtx, t]);

  const handleReveal = useCallback(async (kind: "chat" | "log" | "sapWrite") => {
    try {
      await window.api.dataPrivacyReveal(kind);
    } catch {
      // shell.openPath hatası sessizce geçer.
    }
  }, []);

  const summaryText = loading ? t("dataPrivacy.loading") : null;

  // ─── Satır şablonu ───────────────────────────────────────────────
  const CARD = "space-y-3 rounded-xl border border-line bg-card p-5";
  const ROW = "flex items-start justify-between gap-4";
  const META = "flex flex-col gap-0.5";
  const ACTIONS = "flex shrink-0 items-center gap-2";

  return (
    <>
      {/* ─── Sohbet geçmişi ─────────────────────────────────────── */}
      <div className={CARD}>
        <div className={ROW}>
          <div className={META}>
            <span className="text-sm font-medium text-slate-200">
              {t("dataPrivacy.chatHistory.name")}
            </span>
            <span className="text-xs text-slate-500">
              {t("dataPrivacy.chatHistory.desc")}
            </span>
            {summary && (
              <span className="text-xs text-slate-400">
                {t("dataPrivacy.sessions", { count: summary.chat.count })}
                {" · "}
                {formatBytes(summary.chat.bytes)}
              </span>
            )}
            {summaryText && (
              <span className="text-xs text-slate-500">{summaryText}</span>
            )}
          </div>
          <div className={ACTIONS}>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => handleReveal("chat")}
              title={t("dataPrivacy.revealBtn")}
            >
              <FolderOpen size={14} />
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={clearing}
              onClick={() => setConfirmKind("chat")}
            >
              <Trash2 size={14} />
              {t("dataPrivacy.chatHistory.clearBtn")}
            </Button>
          </div>
        </div>
        {clearError && confirmKind === null && (
          <p className="text-xs text-[var(--status-danger-text)]">{clearError}</p>
        )}
      </div>

      {/* ─── Uygulama günlüğü ─────────────────────────────────── */}
      <div className={CARD}>
        <div className={ROW}>
          <div className={META}>
            <span className="text-sm font-medium text-slate-200">
              {t("dataPrivacy.appLog.name")}
            </span>
            <span className="text-xs text-slate-500">
              {t("dataPrivacy.appLog.desc")}
            </span>
            {summary && (
              <span className="text-xs text-slate-400">
                {formatBytes(summary.log.bytes)}
              </span>
            )}
            {summaryText && (
              <span className="text-xs text-slate-500">{summaryText}</span>
            )}
          </div>
          <div className={ACTIONS}>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => handleReveal("log")}
              title={t("dataPrivacy.revealBtn")}
            >
              <FolderOpen size={14} />
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={clearing}
              onClick={() => setConfirmKind("log")}
            >
              <Trash2 size={14} />
              {t("dataPrivacy.appLog.clearBtn")}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── SAP yazma günlükleri (yalnız görüntüleme) ─────────── */}
      <div className={CARD}>
        <div className={ROW}>
          <div className={META}>
            <span className="text-sm font-medium text-slate-200">
              {t("dataPrivacy.sapWrite.name")}
            </span>
            <span className="text-xs text-slate-500">
              {t("dataPrivacy.sapWrite.desc")}
            </span>
            {summary && (
              <span className="text-xs text-slate-400">
                {t("dataPrivacy.projects", { count: summary.sapWrite.projects })}
                {" · "}
                {formatBytes(summary.sapWrite.bytes)}
              </span>
            )}
            {summaryText && (
              <span className="text-xs text-slate-500">{summaryText}</span>
            )}
          </div>
          <div className={ACTIONS}>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => handleReveal("sapWrite")}
            >
              <FolderOpen size={14} />
              {t("dataPrivacy.sapWrite.openBtn")}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── axet-code oturumları (yalnız görüntüleme) ────────── */}
      <div className={CARD}>
        <div className={ROW}>
          <div className={META}>
            <span className="text-sm font-medium text-slate-200">
              {t("dataPrivacy.axetDb.name")}
            </span>
            <span className="text-xs text-slate-500">
              {t("dataPrivacy.axetDb.desc")}
            </span>
            {summary && (
              <span className="text-xs text-slate-400">
                {t("dataPrivacy.databases", { count: summary.axetDb.count })}
                {" · "}
                {formatBytes(summary.axetDb.bytes)}
              </span>
            )}
            {summaryText && (
              <span className="text-xs text-slate-500">{summaryText}</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Onay diyaloğu ─────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmKind === "chat"}
        title={t("dataPrivacy.chatHistory.confirmTitle")}
        message={t("dataPrivacy.chatHistory.confirmMsg")}
        confirmLabel={t("dataPrivacy.chatHistory.clearBtn")}
        danger
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmKind(null); setClearError(null); }}
      />
      <ConfirmDialog
        open={confirmKind === "log"}
        title={t("dataPrivacy.appLog.confirmTitle")}
        message={t("dataPrivacy.appLog.confirmMsg")}
        confirmLabel={t("dataPrivacy.appLog.clearBtn")}
        danger
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmKind(null); setClearError(null); }}
      />
    </>
  );
}
