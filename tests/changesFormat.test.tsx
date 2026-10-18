// @vitest-environment jsdom
// Değişiklikler: renderer veri katmanı (spec 2026-10-18 degisiklikler §5).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  canAccept,
  canRevert,
  clockLabel,
  FAILURE_KEY,
  latestForSubtask,
  newestFirst,
  REASON_KEY,
  REPO_KEY,
  REVIEW_KEY,
  STATUS_KEY
} from "../src/changes/changesFormat";
import { useChangesState } from "../src/changes/useChanges";
import { ChangesFocusProvider, useChangesFocus } from "../src/changes/changesFocus";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import { CHANGES_FAILURES, type ChangesState, type Checkpoint } from "../app-electron/shared/changesTypes";

const cp = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "a",
  tree: n.toString(16).padStart(40, "0"),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: "",
  reviewed: "pending",
  ...over
});

describe("saf yardımcılar", () => {
  it("bütün anahtar tabloları iki dilde var", () => {
    const keys = [...Object.values(REASON_KEY), ...Object.values(REVIEW_KEY), ...Object.values(REPO_KEY), ...Object.values(STATUS_KEY), ...CHANGES_FAILURES.map((f) => FAILURE_KEY[f])];
    for (const key of keys) {
      expect(tr[key], key).toBeTruthy();
      expect(en[key as keyof typeof en], key).toBeTruthy();
    }
  });

  it("newestFirst kopya; latestForSubtask en yeni eşleşme ya da null", () => {
    const list = [cp("a", 1, { subtaskId: "s1" }), cp("b", 2), cp("c", 3, { subtaskId: "s1" })];
    expect(newestFirst(list).map((c) => c.id)).toEqual(["c", "b", "a"]);
    expect(list.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(latestForSubtask(list, "s1")?.id).toBe("c");
    expect(latestForSubtask(list, "s9")).toBeNull();
  });

  it("clockLabel: bugünse saat:dakika, değilse gün.ay saat:dakika", () => {
    const now = new Date(2026, 9, 18, 14, 0).getTime();
    expect(clockLabel(new Date(2026, 9, 18, 9, 5).getTime(), now)).toBe("09:05");
    expect(clockLabel(new Date(2026, 9, 17, 23, 59).getTime(), now)).toBe("17.10 23:59");
  });

  it("canAccept yalnız pending; canRevert süresi dolmamış ve geri alınmamış", () => {
    expect(canAccept(cp("a", 1))).toBe(true);
    expect(canAccept(cp("a", 1, { reviewed: "accepted" }))).toBe(false);
    expect(canRevert(cp("a", 1), [])).toBe(true);
    expect(canRevert(cp("a", 1, { reviewed: "accepted" }), [])).toBe(true);
    expect(canRevert(cp("a", 1, { reviewed: "reverted" }), [])).toBe(false);
    expect(canRevert(cp("a", 1), ["a"])).toBe(false);
  });
});

describe("useChangesState", () => {
  let listener: ((s: ChangesState) => void) | null = null;
  const off = vi.fn();
  let resolveState: (s: ChangesState | null) => void = () => {};
  let prevApi: unknown;
  beforeEach(() => {
    prevApi = (window as unknown as { api?: unknown }).api;
    listener = null;
    off.mockClear();
    (window as unknown as { api: unknown }).api = {
      changesState: vi.fn(
        () =>
          new Promise<ChangesState | null>((r) => {
            resolveState = r;
          })
      ),
      onChangesChanged: vi.fn((cb: (s: ChangesState) => void) => {
        listener = cb;
        return off;
      })
    };
  });
  afterEach(() => {
    cleanup();
    (window as unknown as { api: unknown }).api = prevApi;
  });

  function Probe({ id }: { id: string }) {
    const { state } = useChangesState(id);
    return <span data-testid="durum">{state ? `${state.workspaceId}:${state.checkpoints.length}` : "yok"}</span>;
  }
  const st = (workspaceId: string, n: number): ChangesState => ({ workspaceId, repo: "ok", checkpoints: Array.from({ length: n }, (_, i) => cp(`c${i}`, i + 1)), expired: [] });

  it("ilk durum yükleniyor; başka alanın olayı yok sayılıyor; aynı alanın olayı uygulanıyor; sökülünce abonelik kalkıyor", async () => {
    const { unmount } = render(<Probe id="a" />);
    expect(screen.getByTestId("durum").textContent).toBe("yok");
    await act(async () => resolveState(st("a", 1)));
    expect(screen.getByTestId("durum").textContent).toBe("a:1");
    act(() => listener?.(st("b", 5)));
    expect(screen.getByTestId("durum").textContent).toBe("a:1");
    act(() => listener?.(st("a", 2)));
    expect(screen.getByTestId("durum").textContent).toBe("a:2");
    unmount();
    expect(off).toHaveBeenCalled();
  });

  it("olay ilk yanıttan önce geldiyse eski yanıt onu ezmiyor", async () => {
    render(<Probe id="a" />);
    act(() => listener?.(st("a", 3)));
    await act(async () => resolveState(st("a", 1)));
    expect(screen.getByTestId("durum").textContent).toBe("a:3");
  });
});

describe("ChangesFocusProvider", () => {
  afterEach(cleanup);

  function Probe() {
    const { focus, requestFocus, clearFocus } = useChangesFocus();
    return (
      <div>
        <span data-testid="odak">{focus ? `${focus.workspaceId}/${focus.subtaskId}` : "yok"}</span>
        <button onClick={() => requestFocus("a", "s1")}>iste</button>
        <button onClick={clearFocus}>temizle</button>
      </div>
    );
  }

  it("sağlayıcısız no-op; sağlayıcıyla iste/temizle", () => {
    render(<Probe />);
    act(() => screen.getByText("iste").click());
    expect(screen.getByTestId("odak").textContent).toBe("yok");
    cleanup();
    render(
      <ChangesFocusProvider>
        <Probe />
      </ChangesFocusProvider>
    );
    act(() => screen.getByText("iste").click());
    expect(screen.getByTestId("odak").textContent).toBe("a/s1");
    act(() => screen.getByText("temizle").click());
    expect(screen.getByTestId("odak").textContent).toBe("yok");
  });
});
