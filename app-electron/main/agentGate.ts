// Tur 9: aynı motor için eşzamanlılık kapısı ve 429 ortak geri çekilmesi. SAF.
//
// Ölçüm (.superpowers/olcum/hata/429-*.txt): kullanıcının ekibinde 429 anlarında
// aynı hesapta 2–4 oturum aynı dakikada çalışıyordu; ileti "Too many tokens,
// please wait before trying again", Retry-After yok. axet-code 429'u kendi içinde
// 3 kez (2 sn, 4 sn) yeniliyor, sonra turu hatayla bitiriyor.
//
// Kurallar: otomatik gönderimler (lider görevi, pano dağıtımı, yeniden deneme)
// bu kapıdan geçiyor; kullanıcının kendi yazdığı geçmiyor. Lider sınırdan muaf
// (yönetim kilitlenmesin) ama çalışırken öbürlerinin sayısına giriyor; 429
// bekleme süresi lider dahil herkes için.
import type { AgentEngineId } from "../shared/agentTypes";

/** Ardışık 429'larda ortak bekleme (sapmalı); 5 dk sakin geçerse sıfırlanır. */
export const RATE_COOLDOWN_MS = [20_000, 40_000, 80_000, 120_000] as const;
export const RATE_STREAK_RESET_MS = 5 * 60_000;

export interface GateAgent {
  paneId: string;
  engine: AgentEngineId;
  running: boolean;
}

export type GateResult = "ok" | "cooldown" | "full";

export interface EngineGateDeps {
  now(): number;
  rand?(): number;
  /** Motor için aynı anda çalışan ajan sınırı; 0 sınırsız. */
  limit(engine: AgentEngineId): number;
}

export interface EngineGate {
  /** Bir ajan 429 aldı: aynı motorun otomatik gönderimleri bekler. Bekleme (ms) döner. */
  noteRateLimit(engine: AgentEngineId): number;
  cooldownLeft(engine: AgentEngineId): number;
  check(paneId: string, engine: AgentEngineId, agents: readonly GateAgent[], opts?: { lead?: boolean }): GateResult;
}

export function createEngineGate(deps: EngineGateDeps): EngineGate {
  const cool = new Map<AgentEngineId, { until: number; streak: number; last: number }>();
  const rand = () => Math.min(1, Math.max(0, deps.rand ? deps.rand() : Math.random()));

  function cooldownLeft(engine: AgentEngineId): number {
    const c = cool.get(engine);
    return c ? Math.max(0, c.until - deps.now()) : 0;
  }

  return {
    noteRateLimit(engine) {
      const now = deps.now();
      const prev = cool.get(engine);
      const streak = prev && now - prev.last < RATE_STREAK_RESET_MS ? prev.streak + 1 : 1;
      const base = RATE_COOLDOWN_MS[Math.min(streak - 1, RATE_COOLDOWN_MS.length - 1)];
      const until = Math.max(prev?.until ?? 0, now + Math.round(base * (0.8 + 0.4 * rand())));
      cool.set(engine, { until, streak, last: now });
      return until - now;
    },
    cooldownLeft,
    check(paneId, engine, agents, opts) {
      if (cooldownLeft(engine) > 0) return "cooldown";
      if (opts?.lead) return "ok";
      const limit = deps.limit(engine);
      if (!(limit > 0)) return "ok";
      const running = agents.filter((a) => a.engine === engine && a.running && a.paneId !== paneId).length;
      return running >= limit ? "full" : "ok";
    }
  };
}
