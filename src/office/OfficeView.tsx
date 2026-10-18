// Piksel ofis (spec 2026-10-18 ajanlar-yeniden §3, §2b + kalite turu): alanın
// ajanları kuşbakışı bir ofiste — açık çalışma alanı, lider odası, toplantı,
// mutfak, sunucu/arşiv. İki katman:
//   - tek <canvas>: zemin, duvar, eşya, yürüyen/oturan kişiler, ışın
//     (officeCanvas, ince); kişilerin davranışı officeActors (saf);
//   - KESKİN HTML katmanı: masa başına görünmez ama odaklanabilir düğme, ad
//     etiketi, durum çipi, alt görev. jsdom'da ya da getContext null ise
//     yalnız bu katman kalıyor.
// Yeni bilgi yok: durum `useAgentStatuses`, alt görev `useBoards` +
// `activeSubtaskOf`. Düz kabuk bölmeleri ajan değil; köşede sayıları.
// Tıklama/Enter/Space -> revealPane. Lime yalnız seçim ve odak halkası.
// Tek requestAnimationFrame döngüsü: yalnız biri yürürken, yazarken, ışın ya
// da zamanlayıcı varken döner; görünmezken ve hareketi azaltta durur; kare
// değişmediyse çizmez.
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
import { BEAM_MS, FRAME_MS, beamShape, boardLeadActive, leaderPane, newAssignments, talking } from "./officeMotion";
import { actorView, stepWorld, worldBusy, type ActorInput, type World } from "./officeActors";
import { cellBox, headPoint, paintBackground, paintScene, safeContext, type Look, type Scene, type SceneBeam, type SceneDesk } from "./officeCanvas";
import { HAIR, PANTS, SHIRT, SKIN, appearanceOf } from "./officePalette";
import { usePrefersReducedMotion } from "./reducedMotion";

/** Ad etiketinin yüksekliği (sanat pikseli): monitörün üst kenarına kadar. */
const NAME_ART_H = 10;
/** Durum çipi + alt görev satırının başladığı yer (hücrenin tepesinden, sanat pikseli). */
const FOOT_ART_Y = 50;
const NPC_LEAD = "__office-lead__";

interface Beam {
  id: number;
  paneId: string;
  start: number;
}

function lookOf(id: string, color: TerminalPane["color"]): Look {
  const a = appearanceOf(id);
  const [hair, hairShade] = HAIR[a.hair];
  const [skin, skinShade] = SKIN[a.skin];
  const [pants, pantsShade] = PANTS[a.pants];
  const [shirt, shirtShade] = SHIRT[color ?? "gray"];
  return { style: a.style, slots: { hair, hairShade, skin, skinShade, pants, pantsShade, shirt, shirtShade } };
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

interface LoopState {
  plan: OfficePlan;
  inputs: ActorInput[];
  looks: Record<string, Look>;
  /** Masa sırasıyla sahibinin kimliği. */
  owners: string[];
  leaderId: string | null;
  beams: Beam[];
  reduced: boolean;
  live: boolean;
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

  const leaderId = leaderPane(agents);
  const workers = agents.filter((p) => p.id !== leaderId);
  const plan = useMemo(() => officePlan(workers.length, area.w, area.h), [workers.length, area.w, area.h]);
  const clock = now || Date.now();
  const deskOf = new Map(workers.map((p, i) => [p.id, i]));
  const seats = agents.map((pane) => {
    const i = deskOf.get(pane.id);
    return {
      pane,
      cell: i === undefined ? plan.lead.cell : plan.desks[i],
      home: i === undefined ? plan.lead.seat : plan.seats[i],
      leader: i === undefined,
      view: officeSeat(pane, statuses[pane.id], clock),
      job: activeSubtaskOf(boards, pane.id)
    };
  });

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

  // Kişilerin girdisi: bölmenin pozu; panonun lideri iş başındaysa ve lider ajan yoksa lider odasında bir figür.
  const npcLead = !leaderId && boardLeadActive(boards[workspace.id]);
  const inputs: ActorInput[] = seats.map((s) => ({ id: s.pane.id, pose: s.view.pose, motion: s.view.motion, home: s.home, leader: s.leader }));
  if (npcLead) inputs.push({ id: NPC_LEAD, pose: "typing", motion: false, home: plan.lead.seat, leader: true });
  const looks: Record<string, Look> = Object.fromEntries(agents.map((p) => [p.id, lookOf(p.id, p.color)]));
  looks[NPC_LEAD] = lookOf("lider", "gray");

  const animated = live && !reduced && (shownBeams.length > 0 || inputs.some((i) => (i.pose === "typing" && i.motion) || i.pose === "resting"));

  const loop = useRef<LoopState | null>(null);
  loop.current = {
    plan,
    inputs,
    looks,
    owners: workers.map((p) => p.id),
    leaderId: leaderId ?? (npcLead ? NPC_LEAD : null),
    beams: shownBeams,
    reduced,
    live
  };

  const inputsKey = inputs.map((i) => `${i.id}:${i.pose}:${i.motion}:${i.home.x},${i.home.y}`).join("|");
  const looksKey = agents.map((p) => `${p.id}:${p.color ?? ""}`).join("|");
  const world = useRef<{ plan: OfficePlan; world: World | null } | null>(null);
  const background = useRef<{ plan: OfficePlan; image: HTMLCanvasElement | null } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = safeContext(canvas);
    if (!canvas || !ctx || empty) return;
    let raf = 0;
    let last = Date.now();
    let lastSig = "";
    const frame = () => {
      raf = 0;
      const s = loop.current;
      if (!s) return;
      const time = Date.now();
      const dt = Math.min(100, Math.max(0, time - last));
      last = time;
      const { plan: p } = s;
      const artW = p.cols * TILE;
      const artH = p.rows * TILE;
      const dpr = typeof window !== "undefined" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
      const width = Math.round(artW * p.scale * dpr);
      const height = Math.round(artH * p.scale * dpr);
      let resized = false;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        resized = true;
      }
      if (background.current?.plan !== p) {
        const image = typeof document !== "undefined" ? document.createElement("canvas") : null;
        const bctx = safeContext(image);
        if (image && bctx) {
          image.width = artW;
          image.height = artH;
          paintBackground(bctx, p);
        }
        background.current = { plan: p, image: image && bctx ? image : null };
      }
      if (world.current?.plan !== p) world.current = { plan: p, world: null };
      const w = stepWorld(world.current.world, p, s.inputs, time, dt, s.reduced);
      world.current.world = w;

      const byId = new Map(s.inputs.map((i) => [i.id, i]));
      const views = new Map(w.actors.map((a) => [a.id, actorView(a, byId.get(a.id) as ActorInput, time, s.reduced)]));
      const desks: SceneDesk[] = p.desks.map((desk, i) => {
        const owner = s.owners[i];
        const input = byId.get(owner);
        const seated = views.get(owner)?.seated === "desk";
        const pose = input?.pose;
        const screen: SceneDesk["screen"] = !seated ? "off" : pose === "typing" || pose === "asking" ? "on" : pose === "error" ? "error" : "off";
        return { desk, screen, flicker: screen === "on" && pose === "typing" && !!input?.motion && !s.reduced };
      });
      const leadView = s.leaderId ? views.get(s.leaderId) : undefined;
      const source = leadView ? headPoint(leadView) : { x: p.door.x * TILE + TILE / 2, y: p.door.y * TILE + 4 };
      const sceneBeams: SceneBeam[] = [];
      for (const b of s.beams) {
        const shape = beamShape(b.start, time);
        const target = views.get(b.paneId);
        if (shape && target && b.paneId !== s.leaderId) sceneBeams.push({ from: source, to: headPoint(target), ...shape });
      }
      const talk = leadView && talking(s.beams.map((b) => b.start), time) ? headPoint(leadView) : null;
      const scene: Scene = {
        actors: w.actors.map((a) => ({ id: a.id, view: views.get(a.id)!, look: s.looks[a.id] ?? lookOf(a.id, "gray") })),
        desks,
        beams: sceneBeams,
        talk,
        tick: Math.floor(time / FRAME_MS)
      };
      const sig = [
        ...scene.actors.map((a) => `${a.id}${Math.round(a.view.px)},${Math.round(a.view.py)}${a.view.pose}${a.view.dir}${a.view.mark}${a.view.dim}`),
        ...desks.map((d) => `${d.screen}${d.flicker ? scene.tick % 4 : ""}`),
        ...sceneBeams.map((b) => `${b.head.toFixed(2)}${b.alpha.toFixed(2)}`),
        talk ? "talk" : ""
      ].join("|");
      if (sig !== lastSig || resized) {
        lastSig = sig;
        paintScene(ctx, width / artW, background.current.image, p, scene);
      }
      const busy = worldBusy(w, s.inputs, time, s.reduced) || sceneBeams.length > 0 || !!talk;
      if (s.live && !s.reduced && busy && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);
    };
    frame();
    return () => {
      if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
    };
  }, [plan, inputsKey, looksKey, shownBeams, reduced, live, empty, npcLead]);

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
                const box = cellBox(s.cell, plan.scale);
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
      <span className="absolute inset-x-0 flex min-w-0 items-center justify-center gap-1" style={{ top: FOOT_ART_Y * scale }}>
        <span
          data-office-chip=""
          title={view.question ?? undefined}
          className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-card/90 px-1 text-2xs leading-4 text-slate-300"
        >
          <span>{state}</span>
          {view.estimated && (
            <span data-estimated="" title={t("agents.estimatedHint")} className="text-slate-500">
              ≈
            </span>
          )}
        </span>
        {job && (
          <span data-office-task="" title={job} className="min-w-0 truncate rounded bg-card/90 px-1 text-2xs leading-4 text-slate-400">
            {clipText(job, OFFICE_TASK_MAX)}
          </span>
        )}
      </span>
    </button>
  );
}
