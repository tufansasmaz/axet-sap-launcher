// @vitest-environment jsdom
// Başlıktan sürükle-bırak (spec 2026-10-14 §3.4).
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { usePaneDrag } from "../src/terminal/usePaneDrag";
import type { Box } from "../src/terminal/dropZone";

afterEach(cleanup);

// jsdom'da PointerEvent'e güvenmemek için: clientX/clientY taşıyan MouseEvent,
// tür adı pointer*. React 18 de pencere dinleyicisi de bunu pointer olayı sayıyor.
function pointer(target: EventTarget, type: string, x: number, y: number) {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  });
}

const RECTS: Record<string, Box> = {
  a: { left: 0, top: 0, width: 100, height: 100 },
  b: { left: 110, top: 0, width: 100, height: 100 }
};

function Harness({ onDrop, canDrop = () => true }: { onDrop: (...args: unknown[]) => void; canDrop?: (a: string, b: string) => boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef(RECTS);
  const { drag, start } = usePaneDrag({ containerRef, rectsRef, canDrop, onDrop });
  return (
    <div ref={containerRef}>
      <div data-testid="handle" onPointerDown={(e) => start("a", e)} />
      <output data-testid="state">{drag ? `${drag.active}:${drag.target}:${drag.zone}` : "yok"}</output>
    </div>
  );
}

const state = () => screen.getByTestId("state").textContent;

describe("usePaneDrag", () => {
  it("4 px'ten az hareket sürükleme değil", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 52, 12);
    expect(state()).toBe("false:null:null");
    pointer(window, "pointerup", 52, 12);
    expect(state()).toBe("yok");
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("hedefin ortası takas, kenarı kenar", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 160, 50);
    expect(state()).toBe("true:b:center");
    pointer(window, "pointermove", 115, 50);
    expect(state()).toBe("true:b:left");
    pointer(window, "pointerup", 115, 50);
    expect(onDrop).toHaveBeenCalledWith("a", "b", "left");
    expect(state()).toBe("yok");
  });

  it("kendi üstüne ve boşluğa bırakma bir şey yapmıyor", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 60, 60);
    expect(state()).toBe("true:null:null");
    pointer(window, "pointermove", 105, 50); // aralık
    pointer(window, "pointerup", 105, 50);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("Esc iptal ediyor; sonraki bırakma bir şey yapmıyor", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 160, 50);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(state()).toBe("yok");
    pointer(window, "pointerup", 160, 50);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("bırakırken hedef artık yoksa bir şey yapmıyor (inceleme odağı 4)", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} canDrop={() => false} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 160, 50);
    pointer(window, "pointerup", 160, 50);
    expect(onDrop).not.toHaveBeenCalled();
  });
});
