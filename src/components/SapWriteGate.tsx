import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, FolderCode, PenLine, ShieldAlert } from "lucide-react";
import type { ApprovalView, Choice, FactObject, SapWriteState, SessionView, WorkMode } from "../../app-electron/shared/sapWriteTypes";
import { useT, type TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { btn, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";
import { useModalStack } from "../ui/Modal";
import TierBadge from "./TierBadge";

// Cevap gönderildikten sonra sıradaki istek aynı yerde açılıyor; çift tıklamanın
// ikinci kliği görülmemiş bir isteği onaylamasın diye onay düğmeleri kısa süre kapalı.
export const ARM_DELAY_MS = 600;

interface Props {
  state: SapWriteState;
  onSetMode: (sessionId: string, mode: WorkMode) => Promise<boolean>;
  onRespond: (id: string, choice: Choice) => Promise<{ ok: boolean; error?: string }>;
  armDelayMs?: number;
}

/**
 * SAP DEV yazma onayı — NTT Studio tarafı (bkz. main/sapWrite, spec §5.2, §7).
 *
 * İki pencere, ikisi de kapatılamıyor (Escape ve arka plan tıklaması bir şey
 * yapmıyor):
 *
 *   - **Mod seçimi.** DEV'e bağlanınca bir kez sorulur, oturum boyunca geçerli.
 *     Seçilmeden her yazma `mod_secilmedi` ile reddediliyor; iki seçenek de
 *     güvenli (her yazma yine onaya geliyor), o yüzden "şimdi değil" yok.
 *     Hiçbiri ÖNCEDEN seçili gelmiyor.
 *   - **Onay.** Bekleyen istekler sırayla, en eskisi önce, tek tek. Varsayılan
 *     odak Reddet'te: yanlışlıkla basılan Enter bir yazmayı onaylamasın.
 *
 * Renderer karar VERMİYOR, yalnızca kullanıcının seçimini main'e taşıyor;
 * "oturum izni verilebilir mi" gibi her şey `ApprovalView.canSession` ile
 * main'den geliyor.
 */
export default function SapWriteGate({ state, onSetMode, onRespond, armDelayMs = ARM_DELAY_MS }: Props) {
  const modeSession = state.sessions.find((s) => s.mode === null);
  if (modeSession) return <ModeChooser key={modeSession.id} session={modeSession} onSetMode={onSetMode} />;
  const head = state.pending[0];
  if (head) return <ApprovalDialog key={head.id} item={head} total={state.pending.length} onRespond={onRespond} armDelayMs={armDelayMs} />;
  return null;
}

// Pencere yığınında en üst katmanda (`critical`): başka bir pencerenin
// (ör. Ayarlar) üstünde açılınca klavye onun. Escape yutuluyor ama hiçbir şey
// yapmıyor — arkadaki pencereyi de kapatmıyor; Tab odağı içeride döndürüyor.
// `body`'ye taşınıyor ki uygulamadaki bir istif bağlamı onu alta itmesin.
function Shell({ children }: { children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useModalStack(panelRef, "critical", ignoreEscape);

  // Açılışta odak pencereye: arkadaki pencerede kalırsa Enter oraya gider.
  // İçeride zaten odaklanan bir öğe varsa (onayda Reddet) ona dokunulmuyor;
  // yoksa panelin kendisi alıyor — bir seçeneğe odaklanmak onu seçilmiş
  // gibi gösterirdi.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
  }, []);

  return createPortal(
    <div className="animate-backdrop-fade-in fixed inset-0 z-critical flex items-center justify-center bg-[var(--overlay-scrim)] backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="animate-modal-pop-in flex max-h-[88vh] w-[640px] flex-col rounded-2xl border border-line/60 bg-card shadow-2xl shadow-black/50 outline-none"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function ignoreEscape(): void {}

function IdentityLine({ sid, client, user }: { sid: string; client: string; user: string }) {
  return (
    <span className="flex items-center gap-2 text-xs text-slate-400">
      <TierBadge tier="DEV" />
      <span className="font-mono">
        {sid}/{client}
      </span>
      <span>·</span>
      <span className="font-mono">{user}</span>
    </span>
  );
}

// --- Mod seçimi ---------------------------------------------------------------

const MODES: WorkMode[] = ["dogrudan", "yerel"];

function ModeChooser({ session, onSetMode }: { session: SessionView; onSetMode: Props["onSetMode"] }) {
  const t = useT();
  const [mode, setMode] = useState<WorkMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    if (!mode) return;
    setBusy(true);
    setFailed(false);
    const ok = await onSetMode(session.id, mode).catch(() => false);
    setBusy(false);
    if (!ok) setFailed(true);
  }

  return (
    <Shell>
      <div className="border-b border-line/50 px-6 py-4">
        <h3 className="text-base font-semibold text-white">{t("sapWrite.mode.title")}</h3>
        <div className="mt-1.5">
          <IdentityLine sid={session.sid} client={session.client} user={session.user} />
        </div>
      </div>
      <div className="space-y-2 px-6 py-4">
        {MODES.map((id) => {
          const selected = mode === id;
          const Icon = id === "dogrudan" ? PenLine : FolderCode;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                selected
                  ? "border-accent-400/60 bg-accent-400/10"
                  : "border-line/60 bg-control/40 hover:border-line hover:bg-control/70"
              }`}
            >
              <Icon size={15} className={`mt-0.5 shrink-0 ${selected ? "text-accent-400" : "text-slate-400"}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{t(`sapWrite.mode.option.${id}`)}</span>
                  {selected && <Check size={13} className="text-accent-400" />}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{t(`sapWrite.mode.desc.${id}`)}</span>
              </span>
            </button>
          );
        })}
        <p className="pt-1 text-xs text-slate-500">{t("sapWrite.mode.once")}</p>
        {failed && <p className="text-xs text-[var(--status-danger-text)]">{t("sapWrite.mode.failed")}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line/50 px-6 py-4">
        <button
          type="button"
          disabled={mode === null || busy}
          onClick={() => void confirm()}
          className={`${DIALOG_CONFIRM_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {t("sapWrite.mode.confirm")}
        </button>
      </div>
    </Shell>
  );
}

// --- Onay ---------------------------------------------------------------------

// Aracın Türkçe adı. `adt_create_*` ailesi tek başlık altında: hangi nesnenin
// oluşturulduğunu nesne satırı zaten söylüyor. Listede olmayan araç (motor
// güncellenip yeni bir yazma aracı gelirse) genel başlıkla gösterilir; araç
// adı her durumda küçük yazıyla altta duruyor.
const OPERATION: Record<string, TranslationKey> = {
  adt_push: "sapWrite.op.push",
  adt_activate: "sapWrite.op.activate",
  adt_write_function_module: "sapWrite.op.writeFunctionModule",
  adt_set_transport: "sapWrite.op.setTransport",
  adt_delete_object: "sapWrite.op.deleteObject",
  adt_delete_transport: "sapWrite.op.deleteTransport",
  adt_create_transport: "sapWrite.op.createTransport",
  adt_create_package: "sapWrite.op.createPackage",
  adt_clear_lock: "sapWrite.op.clearLock",
  adt_remove_from_transport: "sapWrite.op.removeFromTransport",
  adt_publish_service_binding: "sapWrite.op.publishBinding",
  adt_unpublish_service_binding: "sapWrite.op.unpublishBinding",
  adt_generate_screen: "sapWrite.op.generateScreen",
  adt_generate_adobe: "sapWrite.op.generateAdobe",
  adt_message_class: "sapWrite.op.messageClass",
  axet_teslim: "sapWrite.op.teslim",
  axet_abapgit_onay: "sapWrite.op.abapgit",
};

// Modlu araçlarda asıl işi `islem` söylüyor: aynı adt_generate_adobe bir form
// yazabilir de silebilir de. Silme başlığı ancak buradan gelebilir; tanınmayan
// işlem aracın genel başlığına düşer, işlem adı yine alttaki küçük yazıda.
const OPERATION_BY_MODE: Record<string, Record<string, TranslationKey>> = {
  adt_generate_screen: {
    WRITE: "sapWrite.op.screenWrite",
    DELETE: "sapWrite.op.screenDelete",
    JENERATOR_KUR: "sapWrite.op.installGenerator",
  },
  adt_generate_adobe: {
    WRITE: "sapWrite.op.adobeWrite",
    DELETE: "sapWrite.op.adobeDelete",
    SET_LAYOUT: "sapWrite.op.adobeSetLayout",
    SET_PARAMS: "sapWrite.op.adobeSetParams",
    SYNC_CONTEXT: "sapWrite.op.adobeSyncContext",
    JENERATOR_KUR: "sapWrite.op.installGenerator",
  },
  adt_message_class: {
    create: "sapWrite.op.messageClassCreate",
    write: "sapWrite.op.messageClassWrite",
  },
};

// Yıkıcı bayrakların uyarı metni; listede olmayan bayrak genel metinle, adıyla gösterilir.
const FLAG: Record<string, TranslationKey> = {
  recreate: "sapWrite.flag.recreate",
  replace: "sapWrite.flag.replace",
  recursive: "sapWrite.flag.recursive",
  remove_locked_objects: "sapWrite.flag.removeLockedObjects",
};

function operationKey(arac: string, islem?: string): TranslationKey {
  const byMode = islem ? OPERATION_BY_MODE[arac]?.[islem] : undefined;
  return byMode ?? OPERATION[arac] ?? (arac.startsWith("adt_create") ? "sapWrite.op.create" : "sapWrite.op.other");
}

function ApprovalDialog({ item, total, onRespond, armDelayMs = ARM_DELAY_MS }: { item: ApprovalView; total: number; onRespond: Props["onRespond"]; armDelayMs?: number }) {
  const t = useT();
  const { fact } = item;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(armDelayMs <= 0);

  useEffect(() => {
    if (armDelayMs <= 0) return;
    setArmed(false);
    const timer = setTimeout(() => setArmed(true), armDelayMs);
    return () => clearTimeout(timer);
  }, [item.id, armDelayMs]);

  async function answer(choice: Choice) {
    setBusy(true);
    setError(null);
    const r = await onRespond(item.id, choice).catch((e: unknown) => ({ ok: false, error: String(e) }));
    setBusy(false);
    if (!r.ok) setError(r.error ?? "?");
  }

  const packageOnly = fact.nesneler.length === 0 ? (fact.paket ?? fact.abapgit?.paket ?? "") : "";

  return (
    <Shell>
      <div className="border-b border-line/50 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">{t("sapWrite.approval.title")}</h3>
          {total > 1 && <span className="text-xs text-slate-500">{t("sapWrite.approval.queue", { count: total })}</span>}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <IdentityLine sid={item.sid} client={item.client} user={item.user} />
          {item.mode && <span className="text-xs text-slate-500">{t(`sapWrite.approval.mode.${item.mode}`)}</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <section>
          <div className="text-sm font-medium text-white">{t(operationKey(fact.arac, fact.islem))}</div>
          <div className="mt-0.5 font-mono text-2xs text-slate-500">
            {fact.arac}
            {fact.islem ? ` · ${fact.islem}` : ""}
          </div>
        </section>

        {Object.entries(fact.secenekler ?? {})
          .filter(([, on]) => on)
          .map(([flag]) => (
            <div
              key={flag}
              data-testid="sap-write-flag"
              className="flex items-start gap-2 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs text-[var(--status-warning-text)]"
            >
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <span>{FLAG[flag] ? t(FLAG[flag]) : t("sapWrite.flag.other", { flag })}</span>
            </div>
          ))}

        {fact.sinif === "HER_SEFER" && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs text-[var(--status-warning-text)]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <span>{t("sapWrite.approval.everyTime")}</span>
          </div>
        )}

        {fact.nesneler.length > 0 && (
          <section className="space-y-3">
            <Label t={t} k="sapWrite.approval.objects" />
            {fact.nesneler.map((o) => (
              <ObjectBlock key={`${o.tip}:${o.ad}`} obj={o} t={t} />
            ))}
          </section>
        )}

        {packageOnly && (
          <section>
            <Label t={t} k="sapWrite.approval.package" />
            <div className="font-mono text-sm text-slate-200">{packageOnly}</div>
          </section>
        )}

        <section>
          <Label t={t} k="sapWrite.approval.transport" />
          {fact.transport ? (
            <div className="text-sm text-slate-200">
              <span className="font-mono">{fact.transport}</span>
              {fact.transport_bilgi && (
                <span className="text-slate-400">
                  {" — "}
                  {fact.transport_bilgi.aciklama || t("sapWrite.approval.noDescription")} · {fact.transport_bilgi.sahip} ·{" "}
                  {fact.transport_bilgi.durum}
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-400">{t("sapWrite.approval.noTransport")}</div>
          )}
        </section>

        {(fact.teslim || fact.abapgit) && (
          <section>
            <Label t={t} k="sapWrite.approval.delivery" />
            <div className="text-sm text-slate-200">
              {fact.teslim && t("sapWrite.approval.deliveryMethod", { method: fact.teslim.yontem })}
              {fact.abapgit && (
                <span className="font-mono">
                  {fact.abapgit.script}
                  {fact.abapgit.zip_sha256 && ` · ZIP ${fact.abapgit.zip_sha256.slice(0, 12)}`}
                </span>
              )}
            </div>
          </section>
        )}

        <p className="text-xs text-slate-500">{t("sapWrite.approval.expiry")}</p>
        {error && <p className="text-xs text-[var(--status-danger-text)]">{t("sapWrite.approval.failed", { error })}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-line/50 px-6 py-4">
        <button type="button" autoFocus disabled={busy} onClick={() => void answer("reddet")} className={btn("neutral", "lg")}>
          {t("sapWrite.approval.reject")}
        </button>
        {item.canSession && (
          <button type="button" disabled={busy || !armed} onClick={() => void answer("oturum")} className={btn("neutral", "lg")}>
            {t("sapWrite.approval.session", { transport: fact.transport || "$TMP" })}
          </button>
        )}
        <button type="button" disabled={busy || !armed} onClick={() => void answer("bu_seferlik")} className={btn("primary", "lg")}>
          {t("sapWrite.approval.once")}
        </button>
      </div>
    </Shell>
  );
}

function Label({ t, k }: { t: TranslateFn; k: TranslationKey }) {
  return <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{t(k)}</div>;
}

function ObjectBlock({ obj, t }: { obj: FactObject; t: TranslateFn }) {
  return (
    <div className="rounded-lg border border-line/60 bg-control/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-mono text-2xs text-slate-500">{obj.tip}</span>
        <span className="font-mono text-white">{obj.ad}</span>
        <span className="text-xs text-slate-400">{t("sapWrite.approval.inPackage", { package: obj.paket })}</span>
        {obj.yeni && <span className="text-xs text-slate-400">· {t("sapWrite.approval.newObject")}</span>}
      </div>
      {obj.kalite && (
        <div className="mt-1 text-xs text-slate-400">
          <span className={obj.kalite.yuksek > 0 ? "text-[var(--status-warning-text)]" : undefined}>
            {t("sapWrite.approval.quality", {
              kritik: obj.kalite.kritik,
              yuksek: obj.kalite.yuksek,
              orta: obj.kalite.orta,
              dusuk: obj.kalite.dusuk,
            })}
          </span>
          <span className="ml-2 text-slate-500">{t("sapWrite.approval.reviewMatches")}</span>
        </div>
      )}
      {obj.fark ? (
        <>
          <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-app px-2 py-1.5 font-mono text-2xs leading-relaxed">
            {obj.fark.split("\n").map((line, i) => (
              <div key={i} className={diffLineClass(line)}>
                {line || " "}
              </div>
            ))}
          </pre>
          {obj.fark_kirpildi && <div className="mt-1 text-2xs text-slate-500">{t("sapWrite.approval.diffTrimmed")}</div>}
        </>
      ) : (
        !obj.yeni &&
        obj.kaynak_sha256 && <div className="mt-1 text-2xs text-slate-500">{t("sapWrite.approval.noDiff")}</div>
      )}
    </div>
  );
}

function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) return "text-slate-500";
  if (line.startsWith("+")) return "text-[var(--status-success-text)]";
  if (line.startsWith("-")) return "text-[var(--status-danger-text)]";
  return "text-slate-300";
}
