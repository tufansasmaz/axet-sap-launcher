// Tur 13: Bellek → "Kimlik ve kurallar" (demodaki Identity & Rules). Kullanıcının
// yazdığı ekip kuralları ve isteğe bağlı ajan başına kurallar. Ajan açılışında
// ve ilk Akış mesajında (lider rehberiyle birlikte) kısa özet olarak gidiyor
// (memoryRules.rulesDigest, ≤600 karakter). Yazım ana süreçte: atomik, gizli süzgeçli.
import { useEffect, useMemo, useState } from "react";
import { useT } from "../../i18n";
import type { TerminalWorkspace } from "../../stores/terminalTypes";
import { INPUT_CLASS } from "../../ui/Field";
import { PRIMARY_BUTTON } from "../../ui/buttons";
import { RULES_DIGEST_MAX, RULES_TEXT_MAX, type MemoryRules } from "../../../app-electron/shared/memoryRules";
import { agentName } from "../agentLabels";
import { agentPanes } from "../agentView";

type Status = "idle" | "saving" | "saved" | "failed";

export default function RulesPanel({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const agents = useMemo(() => agentPanes(workspace).map((p) => ({ id: p.id, name: agentName(p, t) })), [workspace, t]);
  const [rules, setRules] = useState<MemoryRules>({ team: "", agents: {} });
  const [loaded, setLoaded] = useState(false);
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    const get = typeof window !== "undefined" ? window.api?.rulesGet : undefined;
    void (get ? get(workspace.id) : Promise.resolve({ team: "", agents: {} })).then(
      (r) => {
        if (!alive) return;
        setRules({ team: r?.team ?? "", agents: { ...(r?.agents ?? {}) } });
        setLoaded(true);
      },
      () => alive && setLoaded(true)
    );
    return () => {
      alive = false;
    };
  }, [workspace.id]);

  useEffect(() => {
    if (!agents.some((a) => a.id === agentId)) setAgentId(agents[0]?.id ?? "");
  }, [agents, agentId]);

  const edit = (patch: Partial<MemoryRules>) => {
    setRules((r) => ({ ...r, ...patch }));
    setStatus("idle");
  };

  const save = async () => {
    const set = window.api?.rulesSet;
    if (!set) return;
    setStatus("saving");
    // Ekipten çıkmış ajanların kuralları atılıyor.
    const live = new Set(agents.map((a) => a.id));
    const agentsOut = Object.fromEntries(Object.entries(rules.agents).filter(([id, text]) => live.has(id) && text.trim()));
    try {
      setStatus((await set(workspace.id, { team: rules.team, agents: agentsOut })) === "ok" ? "saved" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <section data-memory-rules="" aria-label={t("brain.rules.title")} className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-6 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{t("brain.rules.title")}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">{t("brain.rules.body", { max: RULES_DIGEST_MAX })}</p>
      </div>
      <label className="flex max-w-3xl flex-col gap-1 text-xs text-slate-300">
        {t("brain.rules.team")}
        <textarea
          aria-label={t("brain.rules.team")}
          value={rules.team}
          disabled={!loaded}
          maxLength={RULES_TEXT_MAX}
          rows={6}
          placeholder={t("brain.rules.teamPlaceholder")}
          onChange={(e) => edit({ team: e.target.value })}
          className={`${INPUT_CLASS} py-2 text-xs`}
        />
      </label>
      {agents.length > 0 && (
        <div className="flex max-w-3xl flex-col gap-1 text-xs text-slate-300">
          <label className="flex items-center gap-2">
            {t("brain.rules.agent")}
            <select aria-label={t("brain.rules.agent")} value={agentId} onChange={(e) => setAgentId(e.target.value)} className={`${INPUT_CLASS} h-7 !w-auto text-xs`}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <textarea
            aria-label={t("brain.rules.agentRules")}
            value={rules.agents[agentId] ?? ""}
            disabled={!loaded || !agentId}
            maxLength={RULES_TEXT_MAX}
            rows={4}
            placeholder={t("brain.rules.agentPlaceholder")}
            onChange={(e) => edit({ agents: { ...rules.agents, [agentId]: e.target.value } })}
            className={`${INPUT_CLASS} py-2 text-xs`}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <button type="button" disabled={!loaded || status === "saving"} onClick={() => void save()} className={`${PRIMARY_BUTTON} disabled:opacity-40`}>
          {t("common.save")}
        </button>
        {status === "saved" && <span role="status" className="text-2xs text-slate-400">{t("brain.rules.saved")}</span>}
        {status === "failed" && <span role="alert" className="text-2xs text-[var(--status-warning-text)]">{t("brain.rules.failed")}</span>}
      </div>
    </section>
  );
}
