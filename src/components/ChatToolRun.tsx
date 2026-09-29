import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  FolderSearch,
  Globe,
  ListChecks,
  Pencil,
  Search,
  Terminal,
  Wrench,
  X
} from "lucide-react";
import type { AxetChatActivity } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

// axet-code'un araç adları → okunur metin. Liste KAPALI DEĞİL: bilinmeyen bir
// ad çeviriye zorlanmıyor, `toolGeneric` ile ham hâliyle gösteriliyor. Yeni
// bir araç eklendiğinde gösterge yanlış bir şey söylemektense sade bir şey
// söylüyor.
const TOOL_KEYS: Record<string, TranslationKey> = {
  view: "axetCodeHome.toolView",
  read: "axetCodeHome.toolView",
  edit: "axetCodeHome.toolEdit",
  write: "axetCodeHome.toolWrite",
  bash: "axetCodeHome.toolBash",
  glob: "axetCodeHome.toolGlob",
  grep: "axetCodeHome.toolGrep",
  ls: "axetCodeHome.toolLs",
  fetch: "axetCodeHome.toolFetch",
  download: "axetCodeHome.toolFetch",
  agent: "axetCodeHome.toolAgent",
  todo: "axetCodeHome.toolTodo"
};

/** Araç adının okunur karşılığı. Bilinmeyen ad ham hâliyle geçiyor. */
export function useToolLabel(): (tool: string) => string {
  const t = useT();
  return useMemo(
    () => (tool: string) => {
      // MCP araçlarında "Uygulama bağlantısı:" ÖN EKİ YOK (kullanıcı kararı,
      // 2026-09-04: *"Uygulama bağlantıları bu yazmasına gerek yok"*). Adın
      // kendisi zaten hangi uygulama olduğunu söylüyor (`outlook list emails`);
      // önüne bir de kategori adı koymak, dar bir satırda asıl bilgiyi
      // kırpılmaya itiyordu.
      if (tool.startsWith("mcp:")) return tool.slice(4).replace(/_/g, " ");
      const key = TOOL_KEYS[tool];
      return key ? t(key) : t("axetCodeHome.toolGeneric", { name: tool });
    },
    [t]
  );
}

/**
 * Bir araç adımının ayrıntısı: dosya farkı ya da tam çıktı.
 *
 * FARK ÖNCELİKLİ. Bir `edit` çağrısında aracın kendi çıktısı yalnızca
 * "Content replaced in file: …" diyor — yani en az bilgi veren metin. Asıl
 * merak edilen NE değiştiği ve o, girdiden üretilen farkta duruyor.
 *
 * Yükseklik sınırlı ve kendi içinde kaydırılıyor: 4000 karakterlik bir çıktı
 * sohbeti aşağı doğru metrelerce iterdi.
 */
export function StepDetail({ diff, output }: { diff?: string; output?: string }) {
  if (diff) {
    const lines = diff.split("\n");
    return (
      <pre className="chat-scroll mt-1 max-h-64 overflow-auto rounded-md bg-app p-2 font-mono text-2xs leading-[1.5]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith("+")
                ? "text-[var(--status-success-text)]"
                : line.startsWith("-")
                  ? "text-[var(--status-danger-text)]"
                  : "text-slate-500"
            }
          >
            {/* Boş satır da bir satır: yüksekliği çökmesin diye sıfır genişlikli
                boşlukla dolduruluyor. */}
            {line || "​"}
          </div>
        ))}
      </pre>
    );
  }
  return (
    <pre className="chat-scroll mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-app p-2 font-mono text-2xs leading-[1.5] text-slate-400">
      {output}
    </pre>
  );
}

// Araç adı → özet satırındaki TÜR. `read` ile `view` aynı iş, `download` ile
// `fetch` de; özette ayrı ayrı sayılsalar "1× Okuma · 1× Okuma" gibi
// tekrarlar çıkardı. Listede olmayan araç (MCP dahil) kendi adıyla ayrı bir
// tür sayılıyor.
const KIND_OF: Record<string, string> = {
  view: "view",
  read: "view",
  edit: "edit",
  write: "write",
  bash: "bash",
  glob: "glob",
  grep: "grep",
  ls: "ls",
  fetch: "fetch",
  download: "fetch",
  agent: "agent",
  todo: "todo"
};

const KIND_LABELS: Record<string, TranslationKey> = {
  view: "chatToolRun.kind.view",
  edit: "chatToolRun.kind.edit",
  write: "chatToolRun.kind.write",
  bash: "chatToolRun.kind.bash",
  glob: "chatToolRun.kind.glob",
  grep: "chatToolRun.kind.grep",
  ls: "chatToolRun.kind.ls",
  fetch: "chatToolRun.kind.fetch",
  agent: "chatToolRun.kind.agent",
  todo: "chatToolRun.kind.todo"
};

const KIND_ICONS: Record<string, LucideIcon> = {
  view: FileText,
  edit: Pencil,
  write: FilePlus,
  bash: Terminal,
  glob: FolderSearch,
  grep: Search,
  ls: Folder,
  fetch: Globe,
  agent: Bot,
  todo: ListChecks
};

export interface KindCount {
  kind: string;
  label?: TranslationKey;
  count: number;
}

/** Adımları türe göre sayar; sıra, türün İLK görüldüğü sıra. */
export function summarizeKinds(steps: AxetChatActivity[]): KindCount[] {
  const counts = new Map<string, KindCount>();
  for (const step of steps) {
    const tool = step.tool ?? "";
    const kind = KIND_OF[tool] ?? tool;
    const entry = counts.get(kind);
    if (entry) entry.count++;
    else counts.set(kind, { kind, label: KIND_LABELS[kind], count: 1 });
  }
  return Array.from(counts.values());
}

type RunStatus = "failed" | "running" | "done";

/**
 * Bir turun araç çağrıları, TEK SATIRDA toplanmış hâlde.
 *
 * Kapalıyken: sayı, tür özeti ve durum simgesi. Açıkken: kutusuz, ince bir sol
 * çizginin arkasında adım adım liste. Ayrıntısı (fark ya da çıktı) olan adım
 * tıklanınca ayrıntı altında açılıyor.
 *
 * Aynı bileşen hem biten cevabın üstünde (`done`) hem canlı turda (`running`)
 * kullanılıyor: tur bitince görünüm değişmiyor, yalnızca durum simgesi.
 */
export default function ChatToolRun({
  steps,
  status
}: {
  steps: AxetChatActivity[];
  status: "running" | "done";
}) {
  const t = useT();
  const toolLabel = useToolLabel();
  const [open, setOpen] = useState(false);
  // Küme: iki adımın farkını yan yana görmek isteniyor.
  const [openSteps, setOpenSteps] = useState<Set<string>>(() => new Set());
  // Kullanıcı canlı turda bir ayrıntı açtıysa tercihi YAPIŞKAN: yeni gelen son
  // adımın ayrıntısı da kendiliğinden açılıyor. Her adımda yeniden tıklatmak,
  // canlı izlemeyi imkânsız kılardı.
  const stickyRef = useRef(false);
  const toggleStep = (key: string) => {
    stickyRef.current = true;
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const lastIndex = steps.length - 1;
  const last = lastIndex >= 0 ? steps[lastIndex] : null;
  const lastKey = last ? (last.callId ?? String(lastIndex)) : "";
  const lastHasDetail = Boolean(last?.diff || last?.output);
  useEffect(() => {
    if (status !== "running" || !stickyRef.current || !lastKey || !lastHasDetail) return;
    setOpenSteps((prev) => (prev.has(lastKey) ? prev : new Set(prev).add(lastKey)));
  }, [lastKey, status, lastHasDetail]);

  // Açık liste 320px'te kendi içinde kayıyor; canlı turda yeni adım altta
  // görünmez kalmasın diye liste dipteyse dipte TUTULUYOR. Kullanıcı yukarı
  // kaydırdıysa bırakılıyor — okuduğu yerden çekilmemeli.
  const listRef = useRef<HTMLDivElement>(null);
  const listAtBottomRef = useRef(true);
  const onListScroll = () => {
    const el = listRef.current;
    if (el) listAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };
  useEffect(() => {
    const el = listRef.current;
    if (!open || status !== "running" || !el || !listAtBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [steps.length, open, status]);

  const kinds = useMemo(() => summarizeKinds(steps), [steps]);
  const failed = steps.some((s) => s.failed);
  const runStatus: RunStatus = failed ? "failed" : status === "running" ? "running" : "done";
  const summary = kinds.map((k) => `${k.count}× ${k.label ? t(k.label) : toolLabel(k.kind)}`).join(" · ");

  return (
    <div className="min-w-0 text-2xs">
      <button
        type="button"
        data-status={runStatus}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-slate-500 transition hover:bg-hover hover:text-slate-300"
      >
        {open ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
        <Wrench size={12} className="shrink-0" />
        <span className="shrink-0">{t("chatToolRun.count", { count: String(steps.length) })}</span>
        <span className="truncate font-mono text-slate-600">{summary}</span>
        {/* Canlı ve kapalıyken son adımın hedefi: ne olduğunu açmadan görmek. */}
        {status === "running" && !open && last?.target && (
          <span className="truncate font-mono text-slate-600/70" title={last.target}>
            {last.target}
          </span>
        )}
        <StatusIcon status={runStatus} />
      </button>
      {open && (
        <div
          data-testid="tool-run-list"
          ref={listRef}
          onScroll={onListScroll}
          className="chat-scroll ml-1.5 mt-1 flex max-h-[320px] flex-col gap-1 overflow-auto border-l border-line pl-3"
        >
          {steps.map((step, i) => {
            const key = step.callId ?? String(i);
            const detail = step.diff || step.output || "";
            const detailOpen = openSteps.has(key);
            const Icon = KIND_ICONS[KIND_OF[step.tool ?? ""] ?? ""] ?? Wrench;
            // Satırın kendi durumu: canlı turda sonucu henüz gelmemiş SON adım sürüyor.
            const rowStatus: RunStatus = step.failed
              ? "failed"
              : status === "running" && i === lastIndex && !step.result && !step.output
                ? "running"
                : "done";
            return (
              <div key={key} className="min-w-0">
                <div
                  role={detail ? "button" : undefined}
                  onClick={detail ? () => toggleStep(key) : undefined}
                  className={`flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 ${
                    detail ? "cursor-pointer hover:bg-hover" : ""
                  }`}
                >
                  <Icon size={12} className="shrink-0 text-slate-500" />
                  <span className="shrink-0 text-slate-400">{toolLabel(step.tool ?? "")}</span>
                  {step.target && (
                    <span className="truncate font-mono text-slate-500" title={step.target}>
                      {step.target}
                    </span>
                  )}
                  {step.result && (
                    <span
                      className={`truncate font-mono ${
                        step.failed ? "text-[var(--status-danger-text)]" : "text-slate-600"
                      }`}
                      title={step.result}
                    >
                      ↳{" "}
                      {step.extraLines
                        ? t("axetCodeHome.toolMoreLines", { count: String(step.extraLines) })
                        : step.result}
                    </span>
                  )}
                  <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
                    {rowStatus === "running" && <span className="text-slate-500">{t("chatToolRun.running")}</span>}
                    <StatusIcon status={rowStatus} />
                  </span>
                </div>
                {detailOpen && detail && <StepDetail diff={step.diff} output={step.output} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: RunStatus }) {
  if (status === "failed") return <X size={12} className="shrink-0 text-[var(--status-danger-text)]" />;
  if (status === "running")
    return <span className="chat-breathe block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />;
  return <Check size={12} className="shrink-0 text-[var(--status-success-text)]" />;
}
