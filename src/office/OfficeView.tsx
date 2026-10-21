// Piksel ofis (spec 2026-10-18 ajanlar-yeniden §3, §2b): alanın ajanları
// kuşbakışı bir ofiste — açık ofis, mutfak, lider odası, sunucu odası,
// dinlenme odası. İki katman:
//   - tek <canvas> alanı tam kaplıyor: zemin, duvar, eşya, kişiler, ışın,
//     gündüz/gece (officeScene); kişilerin davranışı officeSim (saf), dünya
//     officeWorld (saf);
//   - KESKİN HTML katmanı: kişi başına odaklanabilir düğme (kişiyi izliyor),
//     ad etiketi, durum çipi, alt görev. jsdom'da ya da getContext null ise
//     yalnız bu katman kalıyor.
// Yeni bilgi yok: durum `useAgentStatuses`, alt görev `useBoards` +
// `activeSubtaskOf`. Düz kabuk bölmeleri ajan değil; köşede sayıları.
// Tıklama/Enter/Space -> revealPane. Lime yalnız seçim ve odak halkası.
// Kamera: sürükle, tekerlek (imlecin altındaki nokta yerinde kalır), −/+ (orta
// düğme sığdırır); yakınlık ve konum yumuşak geçişle (hareketi azaltta anında).
// Ofis turu 2026-10-20: küçük harita kaldırıldı; konuşma/soru balonu ve
// üzerine gelince bilgi kartı keskin HTML (canvas'taki 10 px yazı okunmuyordu);
// üst çubukta "N/M aktif" ve saat (otomatik/gündüz/gece).
// Tek requestAnimationFrame döngüsü: biri yürürken, yazarken, dinlenirken ya
// da ışın varken döner; görünmezken ve hareketi azaltta durur.
import { useEffect, useRef, useState } from "react";
import { Moon, Plus, Sun, SunMoon } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { useFlow } from "../agents/flowContext";
import { agentPanes, TONE_DOT, type StatusTone } from "../agents/agentView";
import { agentName } from "../agents/agentLabels";
import { phaseText } from "../agents/agentPhase";
import type { AgentStatus } from "../../app-electron/shared/agentTypes";
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardDisplay";
import { OFFICE_TASK_MAX, clipText, officeSeat, type OfficeSeatView } from "./officeLayout";
import { BEAM_MS, boardLeadActive, leaderPane, newAssignments } from "./officeMotion";
import { lookFor, type Look } from "./officeSprites";
import { ENTRY, H, W, leadSeat, type Room } from "./officeWorld";
import {
  ZOOMS, assignSeats, clampCamera, createSim, say, simBusy, stepSim, stepZoom, syncSim, worldToScreen,
  type Actor, type ActorInput, type Camera, type Sim
} from "./officeSim";
import { doorOpenness, drawFrame, headY, nightFactor, paintBackground } from "./officeScene";
import { usePrefersReducedMotion } from "./reducedMotion";

const NPC_LEAD = "__office-lead__";
/** Kişinin tıklama kutusu (dünya pikseli): ayak noktasına göre. */
const HIT_W = 32;
const HIT_UP = 50;
const HIT_DOWN = 4;

interface Beam {
  id: number;
  paneId: string;
  start: number;
}

function safeContext(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

/** Alanın ölçüsü (ResizeObserver); yoksa 0. */
function useAreaSize(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, active]);
  return size;
}

/** Sekme gizliyken ya da görünüm ekranda değilken çizim döngüsü durur. */
function useOnScreen(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  const [intersecting, setIntersecting] = useState(true);
  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setIntersecting(entries.some((e) => e.isIntersecting)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, active]);
  return pageVisible && intersecting;
}

/** Ortam animasyonunun kare aralığı (ms). */
const AMBIENT_MS = 250;

/** Saat: otomatik (bilgisayarın saati), hep gündüz, hep gece. */
type Clock = "auto" | "day" | "night";
const CLOCKS: readonly Clock[] = ["auto", "day", "night"];
const CLOCK_ICON = { auto: SunMoon, day: Sun, night: Moon } as const;

/** Konuşma balonu süreleri (ms): kısa görünüp kaybolur. */
const SAY_MS = 2600;
const REPLY_SAY_MS = 5000;
/** Aynı ajanın aşama balonu en sık bu aralıkla. */
const PHASE_SAY_GAP_MS = 6000;
/** Balon ve karttaki metin sınırları (karakter). */
const SAY_MAX = 90;
const CARD_REPLY_MAX = 220;

/** Kamera yumuşatması: saniyedeki yaklaşma katsayısı. */
const CAM_EASE = 10;

/** Ajanın son cevabından balona giden ilk anlamlı satır. */
export function replyLine(reply: string | undefined): string {
  const line = (reply ?? "").split(/\r?\n/).map((l) => l.replace(/^[#>*\-\s]+/, "").trim()).find(Boolean) ?? "";
  return clipText(line, SAY_MAX);
}

/** 2026-10-21: saat seçimi yerel tercih (localStorage); gizli bir şey değil. */
const CLOCK_KEY = "ntt.office.clock";
function readClock(): Clock {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(CLOCK_KEY);
    return (CLOCKS as readonly (string | null)[]).includes(raw) ? (raw as Clock) : "auto";
  } catch {
    return "auto";
  }
}
function writeClock(clock: Clock): void {
  try {
    localStorage.setItem(CLOCK_KEY, clock);
  } catch {
    // kaydedilemedi: bu oturumda yine geçerli
  }
}

/** Tahmini ajanın bitti balonu en sık bu aralıkla (ajan başına). */
export const ESTIMATED_SAY_GAP_MS = 20_000;

/**
 * 2026-10-21: Akış "finished" kartından balon. Kesin kaynakta her zaman. Tahmini
 * kaynakta yalnız güvenilir turda: gerçek istemle başlamış (tur yalnız istemden
 * sonra var) VE motorun ölçülmüş tur sonu işaretiyle bitmiş (`turn.marked`);
 * cevap Tur 11'in ekran okuyucusundan. Sıklık ajan başına sınırlı. `line` boşsa "Bitti!".
 */
export function finishedSay(
  event: { exact?: boolean; reply?: string },
  status: AgentStatus | undefined,
  lastAt: number | undefined,
  now: number
): { line: string; ms: number } | null {
  if (event.exact === false) {
    if (status?.source !== "estimated" || !status.turn?.done || !status.turn.marked) return null;
    if (lastAt !== undefined && now - lastAt < ESTIMATED_SAY_GAP_MS) return null;
  }
  const line = replyLine(event.reply);
  return { line, ms: line ? REPLY_SAY_MS : SAY_MS };
}

/** Saate göre gece katsayısı (0 gündüz … 1 gece). */
export function nightOf(clock: Clock, reduced: boolean, at: Date): number {
  if (clock === "day") return 0;
  if (clock === "night") return 1;
  return reduced ? 0 : nightFactor(at);
}

/**
 * Varsayılan yakınlık (kademesiz): alanı DOLDURUR (spec 2026-10-18 ajanlar-ux
 * §6) — eskiden bütün ofisi sığdırıyor, bir kenarda koyu şerit bırakıyordu.
 * Taşan kısım sürükleyerek kaydırılıyor; küçük harita yeri gösteriyor.
 */
export function fitOf(cw: number, ch: number): number {
  return Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], Math.max(cw / W, ch / H)));
}

function hitBox(x: number, y: number, low: boolean, cam: Camera, cw: number, ch: number) {
  const top = worldToScreen(cam, cw, ch, x - HIT_W / 2, y - (low ? HIT_UP - 6 : HIT_UP));
  return { left: top.x, top: top.y, width: HIT_W * cam.zoom, height: (low ? HIT_UP - 6 + HIT_DOWN : HIT_UP + HIT_DOWN) * cam.zoom };
}

function accentColor(): string {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return "#a3e635";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent-500-rgb").trim();
  return v ? `rgb(${v})` : "#a3e635";
}

interface LoopState {
  inputs: ActorInput[];
  looks: Map<string, Look>;
  questions: Map<string, string>;
  leaderId: string | null;
  beams: Beam[];
  reduced: boolean;
  live: boolean;
  animated: boolean;
  /** Ortam animasyonu (sunucu LED'leri, ekranlar) düşük hızda: kimse hareket etmiyorken. */
  ambient: boolean;
  zoom: number | null;
  clock: Clock;
  selectedId: string | null;
  labels: string;
  label: (room: Room) => string;
}

export default function OfficeView({
  workspace,
  onAddAgent,
  visible = true
}: {
  workspace: TerminalWorkspace;
  onAddAgent: () => void;
  /** Görünüm başka sekmenin arkasındaysa false: çizim döngüsü durur. */
  visible?: boolean;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { statuses, now } = useAgentStatuses();
  const { boards } = useBoards();
  const reduced = usePrefersReducedMotion();
  const agents = agentPanes(workspace);
  const shells = workspace.panes.length - agents.length;
  const empty = agents.length === 0;

  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const area = useAreaSize(areaRef, !empty);
  const onScreen = useOnScreen(areaRef, !empty);
  const live = visible && onScreen;

  /** null: sığdır; sayı: kullanıcının seçtiği yakınlık. */
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const [clockMode, setClockMode] = useState<Clock>(readClock);
  const sim = useRef<Sim>(createSim());
  // İlk kamera üstte: masalar (ajanların çoğu) kuzey duvarında; "cover" yakınlıkta orta kırpılıyordu.
  const cam = useRef<Camera>({ x: W / 2, y: 0, zoom: ZOOMS[0] });
  /** Kameranın gittiği yer (yumuşak geçiş); null: ilk kare, anında otur. */
  const camGoal = useRef<{ x: number; y: number } | null>(null);
  const hover = useRef<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const boxes = useRef(new Map<string, HTMLLIElement>());
  const kick = useRef<() => void>(() => {});
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const id of all) clearTimeout(id);
      all.clear();
    };
  }, []);
  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
  /** Kısa konuşma balonu; süre bitince bir kare daha (hareketi azaltta döngü yok). */
  const speak = (id: string, text: string, ms = SAY_MS) => {
    if (!text) return;
    say(sim.current, id, text, Date.now(), ms);
    kick.current();
    later(ms + 60, () => kick.current());
  };

  const leaderId = leaderPane(agents);
  const npcLead = !leaderId && boardLeadActive(boards[workspace.id]);
  const seatOf = assignSeats(agents.map((p) => p.id), leaderId);
  const clock = now || Date.now();
  const seats = agents.map((pane) => ({
    pane,
    seat: seatOf.get(pane.id) ?? leadSeat,
    view: officeSeat(pane, statuses[pane.id], clock),
    job: activeSubtaskOf(boards, pane.id)
  }));
  const names = new Map(agents.map((p) => [p.id, agentName(p, t)]));

  // Pano olayı: aktif alt görevi değişen bölmeye liderden (ya da girişten) ışın.
  const assignKey = seats.map((s) => `${s.pane.id}=${s.job?.subtask.id ?? ""}`).join("|");
  const prevAssign = useRef<Record<string, string | null> | null>(null);
  const beamSeq = useRef(0);
  const [beams, setBeams] = useState<Beam[]>([]);
  useEffect(() => {
    const next: Record<string, string | null> = {};
    for (const part of assignKey ? assignKey.split("|") : []) {
      const [id, subId] = part.split("=");
      next[id] = subId || null;
    }
    const fresh = newAssignments(prevAssign.current, next);
    prevAssign.current = next;
    if (reduced || fresh.length === 0) return;
    const start = Date.now();
    const added = fresh.map((paneId) => ({ id: ++beamSeq.current, paneId, start }));
    setBeams((b) => [...b, ...added]);
    const lead = loop.current?.leaderId;
    const targetId = fresh[fresh.length - 1];
    const target = names.get(targetId);
    if (lead && target && !fresh.includes(lead)) speak(lead, `→ ${clipText(target, 24)}`, 2400);
    // Prototipteki gibi: görevi alan kısa bir "tamam" der.
    for (const id of fresh) later(900, () => speak(id, t("office.say.onIt")));
    const ids = new Set(added.map((b) => b.id));
    const timer = setTimeout(() => setBeams((b) => b.filter((x) => !ids.has(x.id))), BEAM_MS);
    return () => clearTimeout(timer);
    // names her çizimde yeni; yalnız atama değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignKey, reduced]);
  // Tur 7: Lider ntt-team ile görev verdi (Akış "relay"/assign): aynı ışın, hedef ajana.
  const { events } = useFlow();
  const mountedAt = useRef(Date.now());
  const seenAssign = useRef(0);
  const lastAssign = [...events].reverse().find((e) => e.workspaceId === workspace.id && e.kind === "relay" && e.act === "assign" && e.toPaneId);
  const assignStamp = lastAssign && lastAssign.at >= mountedAt.current ? lastAssign.id : 0;
  useEffect(() => {
    if (!assignStamp || assignStamp === seenAssign.current || !lastAssign?.toPaneId) return;
    seenAssign.current = assignStamp;
    if (reduced || !names.has(lastAssign.toPaneId)) return;
    const start = Date.now();
    const beam = { id: ++beamSeq.current, paneId: lastAssign.toPaneId, start };
    setBeams((b) => [...b, beam]);
    const to = lastAssign.toPaneId;
    later(900, () => speak(to, t("office.say.onIt")));
    const timer = setTimeout(() => setBeams((b) => b.filter((x) => x.id !== beam.id)), BEAM_MS);
    return () => clearTimeout(timer);
    // yalnız yeni görev kartında
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignStamp, reduced]);
  // Ajan bir şey dediğinde (Akış "finished"): cevabının ilk satırı kısa süre
  // balonda; cevap terminaldeyse yalnız "Bitti!". Yalnız bu görünüm açıldıktan sonrakiler.
  // 2026-10-21: tahmini ajanda yalnız işaretle biten turda ve seyrek (finishedSay).
  const seenSaid = useRef(0);
  const estimatedSaidAt = useRef(new Map<string, number>());
  const lastSaid = [...events].reverse().find((e) => e.workspaceId === workspace.id && e.kind === "finished" && e.paneId);
  const saidStamp = lastSaid && lastSaid.at >= mountedAt.current ? lastSaid.id : 0;
  useEffect(() => {
    if (!saidStamp || saidStamp === seenSaid.current || !lastSaid?.paneId) return;
    seenSaid.current = saidStamp;
    if (!names.has(lastSaid.paneId)) return;
    const paneId = lastSaid.paneId;
    const at = Date.now();
    const said = finishedSay(lastSaid, statuses[paneId], estimatedSaidAt.current.get(paneId), at);
    if (!said) return;
    if (lastSaid.exact === false) estimatedSaidAt.current.set(paneId, at);
    speak(paneId, said.line || t("office.say.done"), said.ms);
    // yalnız yeni "bitti" kartında
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saidStamp]);
  // Çalışırken aşama değişince (kesin kaynak) kısa balon: "dosya okuyor" gibi; ajan başına seyrek.
  const phaseKey = agents
    .map((p) => {
      const st = statuses[p.id];
      return st?.state === "running" && st.source === "exact" && st.phase ? `${p.id}=${phaseText(st.phase, t, false)}` : "";
    })
    .filter(Boolean)
    .join("|");
  const prevPhase = useRef<Map<string, string> | null>(null);
  const phaseSaidAt = useRef(new Map<string, number>());
  useEffect(() => {
    const next = new Map(phaseKey ? phaseKey.split("|").map((part) => part.split("=") as [string, string]) : []);
    const prev = prevPhase.current;
    prevPhase.current = next;
    if (!prev) return; // ilk görünüşte eski aşamayı duyurma
    const at = Date.now();
    for (const [id, text] of next) {
      if (prev.get(id) === text || at - (phaseSaidAt.current.get(id) ?? 0) < PHASE_SAY_GAP_MS) continue;
      phaseSaidAt.current.set(id, at);
      speak(id, `${text}…`);
    }
    // yalnız aşama değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);
  const shownBeams = reduced ? [] : beams;

  const inputs: ActorInput[] = seats.map((s) => ({ id: s.pane.id, pose: s.view.pose, motion: s.view.motion, seat: s.seat }));
  if (npcLead) inputs.push({ id: NPC_LEAD, pose: "typing", motion: false, seat: leadSeat });
  const looks = new Map<string, Look>(agents.map((p) => [p.id, lookFor(p.id, p.color)]));
  looks.set(NPC_LEAD, lookFor("lider", "violet"));
  const questions = new Map<string, string>();
  for (const s of seats) if (s.view.question) questions.set(s.pane.id, s.view.question);

  const animated = live && !reduced && (shownBeams.length > 0 || inputs.some((i) => (i.pose === "typing" && i.motion) || i.pose === "resting"));
  // Spec 2026-10-18 ajanlar-ux §6: bütün ajanlar "tahmini"yken ofis donuk
  // kalmasın — hareketi azalt kapalıysa ortam ~4 kare/sn canlı.
  const ambient = live && !reduced && !animated;
  const label = (room: Room) => (room.label ? t(room.label) : "");

  const loop = useRef<LoopState | null>(null);
  loop.current = {
    inputs,
    looks,
    questions,
    leaderId: leaderId ?? (npcLead ? NPC_LEAD : null),
    beams: shownBeams,
    reduced,
    live,
    animated,
    ambient,
    zoom: userZoom,
    clock: clockMode,
    selectedId: workspace.focusedPaneId,
    labels: ["hall", "coffee", "command", "server", "gym"].map((id) => t(`office.room.${id}` as Parameters<typeof t>[0])).join("|"),
    label
  };

  // Girdileri dünyaya uygula (poz/koltuk değişince yürüyüş başlıyor).
  const inputsKey = inputs.map((i) => `${i.id}:${i.pose}:${i.motion}:${i.seat.id}`).join("|");
  useEffect(() => {
    syncSim(sim.current, loop.current?.inputs ?? [], Date.now(), reduced);
    kick.current();
  }, [inputsKey, reduced]);

  // Çizim döngüsü.
  useEffect(() => {
    if (empty) return;
    const canvas = canvasRef.current;
    const ctx = safeContext(canvas);
    let raf = 0;
    let idle: ReturnType<typeof setTimeout> | null = null;
    let last = Date.now();
    let bg: { key: string; image: HTMLCanvasElement | null } | null = null;
    const doors: number[] = [];
    const accent = accentColor();
    const frame = () => {
      raf = 0;
      if (idle) clearTimeout(idle);
      idle = null;
      const s = loop.current;
      if (!s) return;
      const time = Date.now();
      const dt = Math.min(0.05, Math.max(0, (time - last) / 1000));
      last = time;
      stepSim(sim.current, dt, time, s.reduced);

      const cw = areaRef.current?.clientWidth ?? 0;
      const ch = areaRef.current?.clientHeight ?? 0;
      // Kamera: hedefe yumuşak yaklaşma (ilk karede ve hareketi azaltta anında).
      const goal = clampCamera({ x: camGoal.current?.x ?? cam.current.x, y: camGoal.current?.y ?? cam.current.y, zoom: s.zoom ?? fitOf(cw, ch) }, cw, ch);
      const k = s.reduced || !camGoal.current ? 1 : 1 - Math.exp(-dt * CAM_EASE);
      camGoal.current = { x: goal.x, y: goal.y };
      const prev = cam.current;
      const eased = { x: prev.x + (goal.x - prev.x) * k, y: prev.y + (goal.y - prev.y) * k, zoom: prev.zoom + (goal.zoom - prev.zoom) * k };
      const settled = Math.abs(eased.zoom - goal.zoom) < 0.002 && Math.abs(eased.x - goal.x) < 0.5 && Math.abs(eased.y - goal.y) < 0.5;
      cam.current = settled ? goal : clampCamera(eased, cw, ch);
      const camMoving = !settled;
      const c = cam.current;
      for (const [id, li] of boxes.current) {
        const a = sim.current.actors.get(id);
        if (!a) continue;
        const b = hitBox(a.x, a.y, a.sitting && !!a.seat?.low, c, cw, ch);
        li.style.left = `${b.left}px`;
        li.style.top = `${b.top}px`;
        li.style.width = `${b.width}px`;
        li.style.height = `${b.height}px`;
        // Konuşma balonu: sim'deki kısa söz; açıkken soru balonu geri çekilir.
        const said = a.bubble && time < a.bubble.until ? a.bubble.text : "";
        const sayEl = li.querySelector<HTMLElement>("[data-office-say]");
        if (sayEl) {
          if (sayEl.dataset.text !== said) {
            sayEl.dataset.text = said;
            const text = sayEl.querySelector<HTMLElement>("[data-say-text]");
            if (text) text.textContent = said;
          }
          sayEl.hidden = !said;
        }
        const askEl = li.querySelector<HTMLElement>("[data-office-ask]");
        if (askEl) askEl.style.visibility = said ? "hidden" : "";
      }

      const target = doorOpenness(sim.current);
      let doorsMoving = false;
      target.forEach((v, i) => {
        const cur = doors[i] ?? v;
        const next = s.reduced ? v : cur + (v - cur) * Math.min(1, dt * 8);
        doors[i] = Math.abs(next - v) < 0.01 ? v : next;
        if (doors[i] !== v) doorsMoving = true;
      });

      const busy = simBusy(sim.current, time) || doorsMoving || camMoving || s.beams.length > 0;
      if (canvas && ctx) {
        const dpr = typeof window !== "undefined" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
        const pw = Math.round(cw * dpr);
        const ph = Math.round(ch * dpr);
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw;
          canvas.height = ph;
        }
        if (bg?.key !== s.labels) {
          const image = typeof document !== "undefined" ? document.createElement("canvas") : null;
          const bctx = safeContext(image);
          if (image && bctx) {
            image.width = W;
            image.height = H;
            paintBackground(bctx, s.label);
          }
          bg = { key: s.labels, image: image && bctx ? image : null };
        }
        const byId = sim.current.actors;
        const head = (a: Actor) => ({ x: a.x, y: headY(a) + 20 });
        const lead = s.leaderId ? byId.get(s.leaderId) : undefined;
        const from = lead ? head(lead) : { x: ENTRY.x, y: ENTRY.y - 30 };
        const beamsNow = s.beams.flatMap((b) => {
          const to = byId.get(b.paneId);
          return to && b.paneId !== s.leaderId ? [{ from, to: head(to), t: (time - b.start) / BEAM_MS }] : [];
        });
        drawFrame(
          ctx,
          {
            bg: bg.image,
            cam: c,
            cw,
            ch,
            dpr,
            sim: sim.current,
            looks: s.looks,
            questions: s.questions,
            beams: beamsNow,
            t: s.reduced ? 0 : time / 1000,
            now: time,
            night: nightOf(s.clock, s.reduced, new Date(time)),
            selectedId: s.selectedId,
            hoverId: hover.current,
            accent
          },
          doors
        );
      }
      if (s.live && !s.reduced && (busy || s.animated) && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);
      else if (s.ambient) idle = setTimeout(frame, AMBIENT_MS);
    };
    kick.current = () => {
      if (!raf) frame();
    };
    frame();
    return () => {
      kick.current = () => {};
      if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
      if (idle) clearTimeout(idle);
    };
  }, [empty, live, reduced]);

  // Her React çiziminde bir kare (durum, seçim, ölçü, dil değişmiş olabilir).
  useEffect(() => {
    kick.current();
  });

  // Tekerlek: bir kademe yakın/uzak (pasif olmayan dinleyici: sayfa kaymasın).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const goalZoom = stepZoom(loop.current?.zoom ?? cam.current.zoom, e.deltaY < 0 ? 1 : -1);
      // İmlecin altındaki dünya noktası yerinde kalsın (kamera hissi).
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left - el.clientWidth / 2;
      const my = e.clientY - rect.top - el.clientHeight / 2;
      const c = cam.current;
      if (el.clientWidth > 0 && Number.isFinite(mx) && Number.isFinite(my)) {
        camGoal.current = { x: c.x + mx / c.zoom - mx / goalZoom, y: c.y + my / c.zoom - my / goalZoom };
      }
      setUserZoom(goalZoom);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [empty]);

  // Sürükleyerek kaydırma.
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const z = cam.current.zoom;
    cam.current = { ...cam.current, x: cam.current.x - (e.clientX - d.x) / z, y: cam.current.y - (e.clientY - d.y) / z };
    // Sürükleme elle: hedef de aynı yerde (geri kaymasın).
    camGoal.current = { x: cam.current.x, y: cam.current.y };
    drag.current = { x: e.clientX, y: e.clientY };
    kick.current();
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const activeCount = seats.filter((s) => s.view.pose === "typing" || s.view.pose === "asking").length;
  const ClockIcon = CLOCK_ICON[clockMode];
  const zoomNow = userZoom ?? fitOf(area.w, area.h);
  const camNow = clampCamera({ ...cam.current, zoom: zoomNow }, area.w, area.h);
  const open = (paneId: string) => {
    // revealPane görünümü kendisi değiştiriyor (terminalStore).
    commands.revealPane(paneId);
  };

  return (
    <section aria-label={t("office.label")} data-office="" className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {empty ? (
        <div data-office-empty="" className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-sm text-slate-200">{t("office.empty")}</p>
          <p className="max-w-sm text-xs text-slate-500">{t("office.emptyBody")}</p>
          <button type="button" onClick={onAddAgent} className={PRIMARY_BUTTON}>
            <Plus size={12} />
            {t("agents.addAgent")}
          </button>
        </div>
      ) : (
        <div
          ref={areaRef}
          data-office-stage=""
          data-animated={String(animated)}
          data-ambient={String(ambient)}
          data-beams={shownBeams.length}
          className="relative min-h-0 flex-1 overflow-hidden"
          style={{ backgroundColor: "#0a0c10" }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
            style={{ imageRendering: "pixelated" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <ul role="list" aria-label={t("office.seats")} className="pointer-events-none absolute inset-0 m-0 list-none p-0">
            {seats.map((s) => {
              const a = sim.current.actors.get(s.pane.id);
              const box = a ? hitBox(a.x, a.y, a.sitting && !!a.seat?.low, camNow, area.w, area.h) : hitBox(s.seat.x, s.seat.y, s.seat.low, camNow, area.w, area.h);
              return (
                <li
                  key={s.pane.id}
                  role="listitem"
                  data-office-desk={s.seat.id}
                  ref={(el) => {
                    if (el) boxes.current.set(s.pane.id, el);
                    else boxes.current.delete(s.pane.id);
                  }}
                  className={`absolute ${hovered === s.pane.id ? "z-20" : ""}`}
                  style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                >
                  <SpeechBubble />
                  {s.view.question && <QuestionBubble text={s.view.question} />}
                  <OfficePerson
                    pane={s.pane}
                    view={s.view}
                    job={s.job?.subtask.title ?? null}
                    selected={workspace.focusedPaneId === s.pane.id}
                    cardId={hovered === s.pane.id ? `office-card-${s.pane.id}` : undefined}
                    onOpen={() => open(s.pane.id)}
                    onHover={(on) => {
                      hover.current = on ? s.pane.id : hover.current === s.pane.id ? null : hover.current;
                      setHovered((h) => (on ? s.pane.id : h === s.pane.id ? null : h));
                      kick.current();
                    }}
                  />
                  {hovered === s.pane.id && (
                    <PersonCard
                      id={`office-card-${s.pane.id}`}
                      pane={s.pane}
                      view={s.view}
                      status={statuses[s.pane.id]}
                      job={s.job?.subtask.title ?? null}
                      flip={box.left + box.width / 2 > area.w * 0.6}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {/* Üst çubuk (prototip/demo gibi): alan adı + "N/M aktif", saat, yakınlık. Sağda: sol duvardaki oda etiketini örtmesin. */}
          <div data-office-bar="" className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
            <span className="pointer-events-none flex h-6 items-center gap-2 rounded-md border border-slate-700 bg-slate-900/90 px-2 text-xs">
              <span className="max-w-[12rem] truncate font-medium text-slate-200">{workspace.name}</span>
              <span data-office-active="" className="flex items-center gap-1 tabular-nums text-slate-400">
                {t("office.active", { count: activeCount, total: agents.length })}
                <span className={`h-1.5 w-1.5 rounded-full ${activeCount > 0 ? "bg-emerald-400" : "bg-slate-500"}`} />
              </span>
            </span>
            <button
              type="button"
              data-office-clock={clockMode}
              title={t("office.clockHint")}
              aria-label={t(`office.clock.${clockMode}`)}
              onClick={() => {
                const next = CLOCKS[(CLOCKS.indexOf(clockMode) + 1) % CLOCKS.length];
                setClockMode(next);
                writeClock(next);
              }}
              className="flex h-6 items-center gap-1 rounded-md border border-slate-700 bg-slate-900/90 px-2 text-xs text-slate-300 hover:bg-slate-700"
            >
              <ClockIcon size={12} aria-hidden="true" />
              {t(`office.clock.${clockMode}`)}
            </button>
          <div className="flex items-center overflow-hidden rounded-md border border-slate-700 bg-slate-900/90">
            <button
              type="button"
              aria-label="-"
              title={t("office.zoomOut")}
              onClick={() => setUserZoom(stepZoom(userZoom ?? cam.current.zoom, -1))}
              className="h-6 w-7 font-mono text-sm text-slate-200 hover:bg-slate-700"
            >
              −
            </button>
            <button
              type="button"
              aria-label={`${+zoomNow.toFixed(2)}x`}
              title={t("office.zoomFit")}
              onClick={() => setUserZoom(null)}
              className="h-6 min-w-[3rem] px-1 font-mono text-xs tabular-nums text-slate-400 hover:bg-slate-700"
            >
              {+zoomNow.toFixed(2)}x
            </button>
            <button
              type="button"
              aria-label="+"
              title={t("office.zoomIn")}
              onClick={() => setUserZoom(stepZoom(userZoom ?? cam.current.zoom, 1))}
              className="h-6 w-7 font-mono text-sm text-slate-200 hover:bg-slate-700"
            >
              +
            </button>
          </div>
          </div>
        </div>
      )}
      {shells > 0 && (
        <div className="pointer-events-none absolute bottom-1.5 left-3 flex flex-col items-start gap-0.5">
          <p data-office-shells="" className="font-mono text-2xs tabular-nums text-slate-500">
            {t("office.shellCount", { count: shells })}
          </p>
        </div>
      )}
    </section>
  );
}

/** Kişi etiketlerinin renkleri: durum çipinin zemini. */
const CHIP_TONE: Record<StatusTone, string> = {
  success: "bg-[#2f9e63] text-[#eafff2]",
  warning: "bg-[#d6a531] text-[#1b1d24]",
  danger: "bg-[#c4554d] text-white",
  muted: "bg-[#3a4152] text-[#c9cfdb]"
};

function OfficePerson({
  pane,
  view,
  job,
  selected,
  cardId,
  onOpen,
  onHover
}: {
  pane: TerminalPane;
  view: OfficeSeatView;
  job: string | null;
  selected: boolean;
  /** Üzerine gelince açılan bilgi kartının kimliği (aria-describedby). */
  cardId?: string;
  onOpen: () => void;
  onHover: (on: boolean) => void;
}) {
  const t = useT();
  const name = agentName(pane, t);
  const state = t(view.key, view.params);
  const spoken = view.estimated ? `${state} ${t("office.estimatedSuffix")}` : state;
  // aria-label "<ad>, <durum>"; kesin soru ve aktif alt görev ekran okuyucuya da gidiyor.
  const label = [name, spoken, view.question, job].filter(Boolean).join(", ");
  return (
    <button
      type="button"
      data-office-seat={pane.id}
      data-pose={view.pose}
      aria-label={label}
      aria-pressed={selected}
      aria-describedby={cardId}
      onClick={onOpen}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className="pointer-events-auto relative block h-full w-full cursor-pointer rounded-sm bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      <span className="absolute left-1/2 top-full mt-0.5 flex -translate-x-1/2 flex-col items-center gap-0.5">
        <span
          data-office-name=""
          className={`flex max-w-[11rem] items-center gap-1 whitespace-nowrap rounded-sm border px-1 font-mono text-2xs font-bold uppercase leading-4 ${
            selected ? "border-accent-500/60 bg-[#14171f]" : "border-transparent bg-[#14171f]"
          }`}
        >
          <span data-tone={view.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[view.tone]}`} />
          <span title={name} className={`min-w-0 truncate ${view.tone === "success" ? "text-[#3ddc84]" : "text-[#c9cfdb]"}`}>
            {name}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1">
          <span
            data-office-chip=""
            title={view.question ?? undefined}
            className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-1 font-mono text-2xs leading-4 ${CHIP_TONE[view.tone]}`}
          >
            <span>{state}</span>
            {view.estimated && (
              <span data-estimated="" title={t("agents.estimatedHint")} className="opacity-70">
                ≈
              </span>
            )}
          </span>
          {job && (
            <span data-office-task="" title={job} className="max-w-[12rem] truncate whitespace-nowrap rounded-sm bg-[#1b2030] px-1 font-mono text-2xs leading-4 text-[#6ea8ff]">
              {clipText(job, OFFICE_TASK_MAX)}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

// ------------------------------------------------------------ balonlar
// Prototipteki piksel balon: koyu 2 px kenarlık, köşesiz, sert gölge, basamaklı
// kuyruk. Yazı keskin HTML (yakınlıktan bağımsız okunur), en çok 2-3 satıra
// sığdırılır; kişinin başının üstünde, kişiyle birlikte kayar.
const BUBBLE =
  "pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-max max-w-[208px] -translate-x-1/2 border-2 border-[#1b1d24] px-2 py-1 text-[11px] font-medium leading-[14px] text-[#1b1d24] shadow-[3px_3px_0_0_rgba(0,0,0,0.35)]";

function BubbleTail({ fill }: { fill: string }) {
  return (
    <span aria-hidden="true" className="absolute left-1/2 top-full -translate-x-1/2">
      <span className={`block h-[4px] w-[10px] border-x-2 border-b-2 border-[#1b1d24] ${fill}`} />
      <span className="mx-auto block h-[3px] w-[4px] bg-[#1b1d24]" />
    </span>
  );
}

/** Kısa söz: metni ve görünürlüğü çizim döngüsü yazar (sim'deki `bubble`). */
function SpeechBubble() {
  return (
    <span data-office-say="" data-text="" hidden className={`${BUBBLE} bg-white`}>
      <span data-say-text="" className="line-clamp-2 break-words" />
      <BubbleTail fill="bg-white" />
    </span>
  );
}

/** Kesin "soru soruyor": belirgin sarı ton ve "?" rozeti; cevap bekledikçe durur. */
function QuestionBubble({ text }: { text: string }) {
  const t = useT();
  return (
    <span data-office-ask="" className={`${BUBBLE} flex items-start gap-1.5 bg-[#fff4d1]`}>
      <span
        aria-hidden="true"
        className="mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center bg-[#f0c44c] font-mono text-[10px] font-bold leading-none text-[#1b1d24] motion-safe:animate-pulse"
      >
        ?
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[9px] font-bold uppercase tracking-wide text-[#8a6412]">{t("office.say.question")}</span>
        <span className="line-clamp-3 break-words">{text}</span>
      </span>
      <BubbleTail fill="bg-[#fff4d1]" />
    </span>
  );
}

// ------------------------------------------------------------ bilgi kartı
/** Üzerine gelince: ad, rol, durum, şu anki aşama, görev, soru, son cevabın özeti. */
function PersonCard({
  id,
  pane,
  view,
  status,
  job,
  flip
}: {
  id: string;
  pane: TerminalPane;
  view: OfficeSeatView;
  status: AgentStatus | undefined;
  job: string | null;
  /** Sağ kenara yakınsa kart solda açılır. */
  flip: boolean;
}) {
  const t = useT();
  const name = agentName(pane, t);
  const role = pane.agent?.role?.trim() ?? "";
  const running = status?.state === "running" && status.source === "exact";
  const phase = running && status?.phase ? phaseText(status.phase, t) : "";
  const question = status?.state === "asking" && status.question ? (status.question.question.trim() || status.question.header).trim() : "";
  const reply = !running && status?.reply ? clipText(status.reply, CARD_REPLY_MAX) : "";
  return (
    <div
      id={id}
      role="tooltip"
      data-office-card=""
      className={`pointer-events-none absolute top-0 z-20 w-60 rounded-md border border-line bg-raised p-2.5 text-xs text-slate-300 shadow-[var(--elev-1)] ${
        flip ? "right-full mr-2" : "left-full ml-2"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
          {role && <p className="truncate text-2xs text-slate-400">{role}</p>}
        </div>
        <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-1.5 font-mono text-2xs leading-4 ${CHIP_TONE[view.tone]}`}>
          {t(view.key, view.params)}
          {view.estimated && <span className="opacity-70">≈</span>}
        </span>
      </div>
      <dl className="mt-2 space-y-1.5">
        {phase && <CardRow label={t("office.card.phase")} value={phase} />}
        <CardRow label={t("office.card.task")} value={job ?? t("office.card.noTask")} muted={!job} />
        {question && <CardRow label={t("office.card.question")} value={question} tone="text-[#f0c44c]" clamp />}
        {reply && <CardRow label={t("office.card.reply")} value={reply} clamp />}
      </dl>
      <p className="mt-2 border-t border-line pt-1.5 text-2xs text-slate-500">{t("office.card.open")}</p>
    </div>
  );
}

function CardRow({ label, value, muted, tone, clamp }: { label: string; value: string; muted?: boolean; tone?: string; clamp?: boolean }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`break-words ${clamp ? "line-clamp-3" : "truncate"} ${tone ?? (muted ? "text-slate-500" : "text-slate-200")}`}>{value}</dd>
    </div>
  );
}
