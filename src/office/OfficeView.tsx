// Piksel ofis (spec 2026-10-18 ajanlar-yeniden §3, §2b): alanın ajanları
// kuşbakışı bir ofiste, masalarında. İki katman:
//   - tek <canvas>: zemin, duvar, eşya, kişiler, ışın (officeCanvas, ince);
//   - KESKİN HTML katmanı: masa başına görünmez ama odaklanabilir düğme, ad
//     etiketi, durum çipi, alt görev satırı. jsdom'da ya da getContext null
//     ise yalnız bu katman kalıyor.
// Yeni bilgi yok: durum `useAgentStatuses`, alt görev `useBoards` +
// `activeSubtaskOf`. Düz kabuk bölmeleri ajan değil; köşede sayıları.
// Tıklama/Enter/Space -> revealPane. Lime yalnız seçim ve odak halkası.
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes, TONE_DOT } from "../agents/agentView";
import { agentName } from "../agents/agentLabels";
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardDisplay";
import { OFFICE_TASK_MAX, clipText, officeSeat, type OfficeSeatView } from "./officeLayout";
import { CELL_H, TILE, officePlan, type OfficePlan } from "./officeFloor";
import { BEAM_MS, FRAME_MS, beamShape, leaderPane, needsAnimation, newAssignments, seatFrame } from "./officeMotion";
import { cellBox, deskPoints, paintBackground, paintScene, type SceneBeam, type SceneSeat } from "./officeCanvas";
import { HAIR, SHIRT, hairIndex } from "./officePalette";
import { usePrefersReducedMotion } from "./reducedMotion";

/** Ad etiketinin yüksekliği (sanat pikseli): monitörün üst kenarına kadar. */
const NAME_ART_H = 10;
/** Durum çipi + alt görev satırının başladığı yer (hücrenin tepesinden, sanat pikseli). */
const FOOT_ART_Y = 54;

interface Beam {
  id: number;
  paneId: string;
  start: number;
}

function context2d(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

/** Alanın ölçüsü (ResizeObserver); yoksa 0 — plan en küçük ölçeği seçer. */
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
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const area = useAreaSize(areaRef, !empty);
  const onScreen = useOnScreen(stageRef, !empty);
  const live = visible && onScreen;

  const plan = useMemo(() => officePlan(agents.length, area.w, area.h), [agents.length, area.w, area.h]);
  const clock = now || Date.now();
  const seats = agents.map((pane, i) => ({
    pane,
    desk: plan.desks[i],
    view: officeSeat(pane, statuses[pane.id], clock),
    job: activeSubtaskOf(boards, pane.id)
  }));

  // Pano olayı: aktif alt görevi değişen bölmeye liderden (ya da kapıdan) ışın.
  const assignKey = seats.map((s) => `${s.pane.id}=${s.job?.subtask.id ?? ""}`).join("|");
  const prevAssign = useRef<Record<string, string | null> | null>(null);
  const beamSeq = useRef(0);
  const [beams, setBeams] = useState<Beam[]>([]);
  useEffect(() => {
    const next: Record<string, string | null> = {};
    for (const part of assignKey ? assignKey.split("|") : []) {
      const [id, sub] = part.split("=");
      next[id] = sub || null;
    }
    const fresh = newAssignments(prevAssign.current, next);
    prevAssign.current = next;
    if (reduced || fresh.length === 0) return;
    const start = Date.now();
    const added = fresh.map((paneId) => ({ id: ++beamSeq.current, paneId, start }));
    setBeams((b) => [...b, ...added]);
    const ids = new Set(added.map((b) => b.id));
    const timer = setTimeout(() => setBeams((b) => b.filter((x) => !ids.has(x.id))), BEAM_MS);
    return () => clearTimeout(timer);
  }, [assignKey, reduced]);
  const shownBeams = reduced ? [] : beams;

  const frames = seats.map((s) => seatFrame(s.view.pose, s.view.motion, reduced, 0));
  const animated = needsAnimation(frames, shownBeams.length, live, reduced);

  const sceneKey = seats.map((s) => `${s.pane.id}:${s.view.pose}:${s.view.motion}:${s.pane.color ?? "gray"}`).join("|");
  const scene = useMemo(
    () =>
      seats.map((s) => ({
        paneId: s.pane.id,
        desk: s.desk,
        pose: s.view.pose,
        motion: s.view.motion,
        hair: HAIR[hairIndex(s.pane.id)],
        shirt: SHIRT[s.pane.color ?? "gray"]
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sceneKey, plan]
  );
  const leader = leaderPane(agents);

  const background = useRef<{ plan: OfficePlan; image: HTMLCanvasElement | null } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = context2d(canvas);
    if (!canvas || !ctx || plan.desks.length === 0) return;
    const artW = plan.cols * TILE;
    const artH = plan.rows * TILE;
    const dpr = typeof window !== "undefined" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const width = Math.round(artW * plan.scale * dpr);
    const height = Math.round(artH * plan.scale * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const k = width / artW;
    if (background.current?.plan !== plan) {
      const image = typeof document !== "undefined" ? document.createElement("canvas") : null;
      const bctx = context2d(image);
      if (image && bctx) {
        image.width = artW;
        image.height = artH;
        paintBackground(bctx, plan);
      }
      background.current = { plan, image: image && bctx ? image : null };
    }
    const source = (() => {
      const lead = leader ? scene.find((s) => s.paneId === leader) : undefined;
      if (lead) return deskPoints(lead.desk).head;
      return { x: plan.door.x * TILE + TILE / 2, y: plan.door.y * TILE + TILE - 2 };
    })();
    let raf = 0;
    let lastTick = -1;
    const paint = () => {
      const time = Date.now();
      const tick = Math.floor(time / FRAME_MS);
      const sceneBeams: SceneBeam[] = [];
      for (const b of shownBeams) {
        const shape = beamShape(b.start, time);
        const target = scene.find((s) => s.paneId === b.paneId);
        if (shape && target && b.paneId !== leader) sceneBeams.push({ from: source, to: deskPoints(target.desk).head, ...shape });
      }
      const seatFrames = scene.map((s) => seatFrame(s.pose, s.motion, reduced, time));
      if (tick !== lastTick || sceneBeams.length > 0) {
        lastTick = tick;
        const drawn: SceneSeat[] = scene.map((s, i) => ({ desk: s.desk, frame: seatFrames[i], hair: s.hair, shirt: s.shirt }));
        paintScene(ctx, k, background.current?.image ?? null, plan, drawn, sceneBeams, tick);
      }
      if (typeof requestAnimationFrame === "function" && needsAnimation(seatFrames, sceneBeams.length, live, reduced)) {
        raf = requestAnimationFrame(paint);
      }
    };
    paint();
    return () => {
      if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
    };
  }, [plan, scene, live, reduced, shownBeams, leader]);

  const open = (paneId: string) => {
    // revealPane görünümü kendisi değiştiriyor (terminalStore).
    commands.revealPane(paneId);
  };
  const cssW = plan.cols * TILE * plan.scale;
  const cssH = plan.rows * TILE * plan.scale;

  return (
    <section aria-label={t("office.label")} data-office="" className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {empty ? (
        <div data-office-empty="" className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-sm text-slate-200">{t("office.empty")}</p>
          <button type="button" onClick={onAddAgent} className={PRIMARY_BUTTON}>
            <Plus size={12} />
            {t("agents.addAgent")}
          </button>
        </div>
      ) : (
        <div ref={areaRef} className="flex min-h-0 flex-1 overflow-auto p-4">
          <div
            ref={stageRef}
            data-office-stage=""
            data-animated={String(animated)}
            data-beams={shownBeams.length}
            className="relative m-auto shrink-0"
            style={{ width: cssW, height: cssH }}
          >
            <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated" }} />
            <ul role="list" aria-label={t("office.seats")} className="absolute inset-0 m-0 list-none p-0">
              {seats.map((s) => {
                const box = cellBox(s.desk, plan.scale);
                return (
                  <li key={s.pane.id} role="listitem" className="absolute" style={{ left: box.left, top: box.top, width: box.width, height: CELL_H * TILE * plan.scale }}>
                    <OfficeDesk
                      pane={s.pane}
                      view={s.view}
                      job={s.job?.subtask.title ?? null}
                      scale={plan.scale}
                      selected={workspace.focusedPaneId === s.pane.id}
                      onOpen={() => open(s.pane.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {shells > 0 && (
        <p data-office-shells="" className="pointer-events-none absolute bottom-2 right-3 font-mono text-2xs tabular-nums text-slate-500">
          {t("office.shellCount", { count: shells })}
        </p>
      )}
    </section>
  );
}

function OfficeDesk({
  pane,
  view,
  job,
  scale,
  selected,
  onOpen
}: {
  pane: TerminalPane;
  view: OfficeSeatView;
  job: string | null;
  scale: number;
  selected: boolean;
  onOpen: () => void;
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
      className="relative block h-full w-full cursor-pointer rounded-sm bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      <span
        data-office-name=""
        className={`absolute left-1/2 top-0 flex max-w-full -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded border bg-card/90 px-1 text-2xs leading-4 ${
          selected ? "border-accent-500/60" : "border-line"
        }`}
        style={{ maxHeight: NAME_ART_H * scale }}
      >
        <span data-tone={view.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[view.tone]}`} />
        <span title={name} className="min-w-0 truncate font-medium text-slate-200">
          {name}
        </span>
      </span>
      <span className="absolute inset-x-0 flex flex-col items-center gap-0.5" style={{ top: FOOT_ART_Y * scale }}>
        <span
          data-office-chip=""
          title={view.question ?? undefined}
          className="flex max-w-full items-center gap-1 whitespace-nowrap rounded bg-card/90 px-1 text-2xs leading-4 text-slate-300"
        >
          <span className="min-w-0 truncate">{state}</span>
          {view.estimated && (
            <span data-estimated="" title={t("agents.estimatedHint")} className="shrink-0 text-slate-500">
              ≈
            </span>
          )}
        </span>
        {job && (
          <span data-office-task="" title={job} className="max-w-full truncate rounded bg-card/90 px-1 text-2xs leading-4 text-slate-400">
            {clipText(job, OFFICE_TASK_MAX)}
          </span>
        )}
      </span>
    </button>
  );
}

