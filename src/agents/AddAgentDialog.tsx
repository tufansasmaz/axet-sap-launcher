import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FolderOpen } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { AGENT_ENGINES, isSafeArg } from "../../app-electron/shared/agentEngines";
import {
  AGENT_COMMAND_MAX,
  AGENT_ENGINE_IDS,
  AGENT_MODEL_MAX,
  AGENT_ROLE_MAX,
  type AgentEngineId,
  type AgentEngineInfo,
  type AgentSpec,
  type AxetAgentEntry
} from "../../app-electron/shared/agentTypes";
import { PANE_TITLE_MAX, TERMINAL_PANE_COLORS } from "../../app-electron/shared/terminalLayout";
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import { middleEllipsis } from "../lib/paths";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { PANE_COLOR_LABEL, PANE_COLOR_VAR } from "../terminal/paneColors";
import type { NewAgentInput } from "../stores/terminalStoreContext";
import { ENGINE_LABEL } from "./agentLabels";

// "+ Ajan" penceresi (spec 2026-10-17 ajan-alani §4): ad, motor, rol, model,
// klasör, renk. axet-code'da rol, axet-code'un kendi ajan listesinden
// (`agent list --json`, spec §14.2) ve `--agent` ile başlatılıyor; öteki
// motorlarda rol serbest metin ya da hazır etiket. Model alanı yalnız model
// bayrağı bilinen motorlarda. Kurulu olmayan motor seçilebiliyor; kartta
// "kurulu değil" yazıyor ve bölme açılmıyor.

export const ROLE_PRESETS: TranslationKey[] = ["agents.roleDeveloper", "agents.roleAnalyst", "agents.roleTest", "agents.roleReview"];

/** Kurulu motorlar önce; kendi aralarında tanım sırası. Bilgi yoksa hepsi kurulu sayılıyor. */
export function orderEngines(engines: AgentEngineInfo[] | null): AgentEngineId[] {
  const installed = (id: AgentEngineId) => engines?.find((e) => e.id === id)?.installed ?? true;
  return [...AGENT_ENGINE_IDS].sort((a, b) => Number(installed(b)) - Number(installed(a)));
}

const RADIO_BASE = "flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors";
const RADIO_ON = "bg-[var(--accent-glow)] text-slate-100";
const RADIO_OFF = "text-slate-400 hover:text-slate-200";
const INPUT =
  "h-7 w-full min-w-0 rounded border border-line bg-transparent px-2 text-xs text-slate-200 outline-none focus:border-accent-500/60";
const INPUT_ERR =
  "h-7 w-full min-w-0 rounded border border-[var(--status-error-border)] bg-transparent px-2 text-xs text-slate-200 outline-none focus:border-[var(--status-error-border)]";

export default function AddAgentDialog({
  open,
  defaultCwd,
  defaultName,
  engines,
  onAdd,
  onCancel
}: {
  open: boolean;
  defaultCwd: string;
  defaultName: string;
  engines: AgentEngineInfo[] | null;
  onAdd: (input: NewAgentInput) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const order = useMemo(() => orderEngines(engines), [engines]);
  const [name, setName] = useState(defaultName);
  const [engine, setEngine] = useState<AgentEngineId>(order[0]);
  const [axetRole, setAxetRole] = useState("");
  const [role, setRole] = useState("");
  const [model, setModel] = useState("");
  const [command, setCommand] = useState("");
  const [cwd, setCwd] = useState(defaultCwd);
  const [color, setColor] = useState<TerminalPaneColor>("gray");
  const [axetAgents, setAxetAgents] = useState<AxetAgentEntry[]>([]);
  // Çift göndermeyi önlemek için ref (React yeniden çizmeden önce etkili).
  const submittedRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);

  // Her açılışta varsayılana dön (NewPaneDialog ile aynı kural).
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEngine(order[0]);
    setAxetRole("");
    setRole("");
    setModel("");
    setCommand("");
    setCwd(defaultCwd);
    setColor("gray");
    submittedRef.current = false;
    setSubmitted(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || engine !== "axet-code") return;
    let alive = true;
    window.api.axetAgents(cwd).then(
      (list) => {
        if (alive) setAxetAgents(list);
      },
      () => {
        if (alive) setAxetAgents([]);
      }
    );
    return () => {
      alive = false;
    };
  }, [open, engine, cwd]);

  const def = AGENT_ENGINES[engine];
  const info = engines?.find((e) => e.id === engine);

  // Komuta girecek değerleri doğrula; geçersizse açık hata (sessizce düşürme yok).
  const roleError = engine !== "axet-code" && role.trim() !== "" && !isSafeArg(role.trim());
  const modelError = def.modelFlag !== null && model.trim() !== "" && !isSafeArg(model.trim());

  const valid =
    name.trim() !== "" &&
    cwd !== "" &&
    (engine !== "ozel" || command.trim() !== "") &&
    !roleError &&
    !modelError;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    const typedRole = role.trim().slice(0, AGENT_ROLE_MAX);
    const spec: AgentSpec =
      engine === "axet-code"
        ? { engine, role: axetRole, roleKind: axetRole ? "axetAgent" : "custom" }
        : { engine, role: typedRole, roleKind: ROLE_PRESETS.some((k) => t(k) === typedRole) ? "preset" : "custom" };
    if (def.modelFlag && model.trim()) spec.model = model.trim().slice(0, AGENT_MODEL_MAX);
    if (engine === "ozel") spec.command = command.trim().slice(0, AGENT_COMMAND_MAX);
    onAdd({ spec, name: name.trim().slice(0, PANE_TITLE_MAX), color, cwd });
  };

  const pick = async () => {
    const folder = await window.api.pickFolder();
    if (folder) setCwd(folder);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("agents.addTitle")} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.nameLabel")}</span>
          <input
            aria-label={t("agents.nameLabel")}
            value={name}
            maxLength={PANE_TITLE_MAX}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.engineLabel")}</span>
          <div role="radiogroup" aria-label={t("agents.engineLabel")} className="flex flex-wrap gap-1 rounded-md bg-control p-0.5">
            {order.map((id) => {
              const missing = engines?.find((e) => e.id === id)?.installed === false;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={engine === id}
                  onClick={() => setEngine(id)}
                  className={`${RADIO_BASE} ${engine === id ? RADIO_ON : RADIO_OFF}`}
                >
                  {t(ENGINE_LABEL[id])}
                  {missing && <span className="text-slate-500"> · {t("agents.notInstalledShort")}</span>}
                </button>
              );
            })}
          </div>
          {info?.installed === false && <p className="text-2xs text-[var(--status-warning-text)]">{t("agents.engineMissingHint")}</p>}
          {info?.note && <p className="text-2xs text-[var(--status-warning-text)]">{info.note}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.roleLabel")}</span>
          {engine === "axet-code" ? (
            <select aria-label={t("agents.roleLabel")} value={axetRole} onChange={(e) => setAxetRole(e.target.value)} className={INPUT}>
              <option value="">{t("agents.roleDefault")}</option>
              {axetAgents.map((a) => (
                <option key={a.name} value={a.name} title={a.description || undefined}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="flex flex-wrap gap-1">
                {ROLE_PRESETS.map((key) => (
                  <button key={key} type="button" onClick={() => setRole(t(key))} className={TOOL_BUTTON}>
                    {t(key)}
                  </button>
                ))}
              </div>
              <input
                aria-label={t("agents.roleLabel")}
                value={role}
                maxLength={AGENT_ROLE_MAX}
                onChange={(e) => setRole(e.target.value)}
                className={roleError ? INPUT_ERR : INPUT}
              />
              {roleError && (
                <p role="alert" className="text-2xs text-[var(--status-error-text)]">
                  {t("agents.argInvalid")}
                </p>
              )}
            </>
          )}
        </div>

        {def.modelFlag && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">{t("agents.modelLabel")}</span>
            <input
              aria-label={t("agents.modelLabel")}
              value={model}
              maxLength={AGENT_MODEL_MAX}
              placeholder={t("agents.modelHint")}
              onChange={(e) => setModel(e.target.value)}
              className={modelError ? INPUT_ERR : INPUT}
            />
            {modelError && (
              <p role="alert" className="text-2xs text-[var(--status-error-text)]">
                {t("agents.argInvalid")}
              </p>
            )}
          </div>
        )}

        {engine === "ozel" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">{t("agents.commandLabel")}</span>
            <input
              aria-label={t("agents.commandLabel")}
              value={command}
              maxLength={AGENT_COMMAND_MAX}
              placeholder={t("agents.commandHint")}
              onChange={(e) => setCommand(e.target.value)}
              className={`${INPUT} font-mono`}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.folderLabel")}</span>
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="shrink-0 text-slate-400" />
            <span title={cwd || undefined} className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">
              {cwd ? middleEllipsis(cwd, 44) : t("terminal.noFolder")}
            </span>
            <button type="button" onClick={() => void pick()} className={TOOL_BUTTON}>
              {t("terminal.changeFolder")}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.colorLabel")}</span>
          <div role="radiogroup" aria-label={t("agents.colorLabel")} className="flex gap-1.5">
            {TERMINAL_PANE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={t(PANE_COLOR_LABEL[c])}
                title={t(PANE_COLOR_LABEL[c])}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border ${color === c ? "border-accent-400" : "border-line"}`}
                style={{ background: PANE_COLOR_VAR[c] ?? "transparent" }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <ModalCancelButton />
          <button type="submit" disabled={!valid || submitted} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("agents.add")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
