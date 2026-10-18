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
// Kamera: sürükle, tekerlek, −/+ (orta düğme sığdırır).
// Tek requestAnimationFrame döngüsü: biri yürürken, yazarken, dinlenirken ya
// da ışın varken döner; görünmezken ve hareketi azaltta durur.
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes, TONE_DOT, type StatusTone } from "../agents/agentView";
import { agentName } from "../agents/agentLabels";
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
import { MINI_H, MINI_W, doorOpenness, drawFrame, drawMinimap, headY, minimapToWorld, nightFactor, paintBackground, paintMinimapBase } from "./officeScene";
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
  const miniRef = useRef<HTMLCanvasElement>(null);
  const area = useAreaSize(areaRef, !empty);
  const onScreen = useOnScreen(areaRef, !empty);
  const live = visible && onScreen;

  /** null: sığdır; sayı: kullanıcının seçtiği yakınlık. */
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const sim = useRef<Sim>(createSim());
  const cam = useRef<Camera>({ x: W / 2, y: H / 2, zoom: ZOOMS[0] });
  const hover = useRef<string | null>(null);
  const boxes = useRef(new Map<string, HTMLLIElement>());
  const kick = useRef<() => void>(() => {});

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
    const target = names.get(fresh[fresh.length - 1]);
    if (lead && target && !fresh.includes(lead)) say(sim.current, lead, `→ ${clipText(target, 24)}`, start);
    const ids = new Set(added.map((b) => b.id));
    const timer = setTimeout(() => setBeams((b) => b.filter((x) => !ids.has(x.id))), BEAM_MS);
    return () => clearTimeout(timer);
    // names her çizimde yeni; yalnız atama değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignKey, reduced]);
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
    const mini = miniRef.current;
    const mctx = safeContext(mini);
    let raf = 0;
    let idle: ReturnType<typeof setTimeout> | null = null;
    let last = Date.now();
    let bg: { key: string; image: HTMLCanvasElement | null; mini: HTMLCanvasElement | null } | null = null;
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
      cam.current = clampCamera({ ...cam.current, zoom: s.zoom ?? fitOf(cw, ch) }, cw, ch);
      const c = cam.current;
      for (const [id, li] of boxes.current) {
        const a = sim.current.actors.get(id);
        if (!a) continue;
        const b = hitBox(a.x, a.y, a.sitting && !!a.seat?.low, c, cw, ch);
        li.style.left = `${b.left}px`;
        li.style.top = `${b.top}px`;
        li.style.width = `${b.width}px`;
        li.style.height = `${b.height}px`;
      }

      const target = doorOpenness(sim.current);
      let doorsMoving = false;
      target.forEach((v, i) => {
        const cur = doors[i] ?? v;
        const next = s.reduced ? v : cur + (v - cur) * Math.min(1, dt * 8);
        doors[i] = Math.abs(next - v) < 0.01 ? v : next;
        if (doors[i] !== v) doorsMoving = true;
      });

      const busy = simBusy(sim.current, time) || doorsMoving || s.beams.length > 0;
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
          let miniBase: HTMLCanvasElement | null = null;
          if (image && bctx) {
            image.width = W;
            image.height = H;
            paintBackground(bctx, s.label);
            miniBase = document.createElement("canvas");
            miniBase.width = MINI_W;
            miniBase.height = MINI_H;
            const mb = safeContext(miniBase);
            if (mb) paintMinimapBase(mb, image);
            else miniBase = null;
          }
          bg = { key: s.labels, image: image && bctx ? image : null, mini: miniBase };
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
            night: s.reduced ? 0 : nightFactor(new Date(time)),
            selectedId: s.selectedId,
            hoverId: hover.current,
            accent
          },
          doors
        );
        if (mini && mctx) {
          const zoomedIn = cw / c.zoom < W - 1 || ch / c.zoom < H - 1;
          mini.style.display = zoomedIn ? "block" : "none";
          if (zoomedIn) drawMinimap(mctx, bg.mini, sim.current, c, cw, ch);
        }
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
      setUserZoom(stepZoom(cam.current.zoom, e.deltaY < 0 ? 1 : -1));
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
    drag.current = { x: e.clientX, y: e.clientY };
    kick.current();
  };
  const onPointerUp = () => {
    drag.current = null;
  };

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
                  className="absolute"
                  style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                >
                  <OfficePerson
                    pane={s.pane}
                    view={s.view}
                    job={s.job?.subtask.title ?? null}
                    selected={workspace.focusedPaneId === s.pane.id}
                    onOpen={() => open(s.pane.id)}
                    onHover={(on) => {
                      hover.current = on ? s.pane.id : hover.current === s.pane.id ? null : hover.current;
                      kick.current();
                    }}
                  />
                </li>
              );
            })}
          </ul>
          {/* Yakınlık: − / sığdır / + */}
          <div className="absolute right-2 top-2 z-10 flex items-center overflow-hidden rounded-md border border-slate-700 bg-slate-900/90">
            <button
              type="button"
              aria-label="-"
              title={t("office.zoomOut")}
              onClick={() => setUserZoom(stepZoom(cam.current.zoom, -1))}
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
              onClick={() => setUserZoom(stepZoom(cam.current.zoom, 1))}
              className="h-6 w-7 font-mono text-sm text-slate-200 hover:bg-slate-700"
            >
              +
            </button>
          </div>
          <canvas
            ref={miniRef}
            aria-hidden="true"
            width={MINI_W}
            height={MINI_H}
            className="absolute bottom-2 right-2 z-10 cursor-pointer rounded-md border border-slate-700"
            style={{ display: "none", width: MINI_W, height: MINI_H, imageRendering: "pixelated", backgroundColor: "#0f1218" }}
            onClick={(e) => {
              const p = minimapToWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
              cam.current = { ...cam.current, x: p.x, y: p.y };
              kick.current();
            }}
          />
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
  onOpen,
  onHover
}: {
  pane: TerminalPane;
  view: OfficeSeatView;
  job: string | null;
  selected: boolean;
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
