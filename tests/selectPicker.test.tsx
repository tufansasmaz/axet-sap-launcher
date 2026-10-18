// @vitest-environment jsdom
// Bizim stilde açılır seçici (Tur 3): combobox + listbox + option; klavye ile gezinme.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Select } from "../src/ui/Select";

afterEach(cleanup);

const OPTIONS = [
  { value: "", label: "Varsayılan" },
  { value: "coder", label: "coder", description: "Kod yazar" },
  { value: "task", label: "task", description: "Görev böler" }
];

function Harness({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Select
      label="Rol"
      value={value}
      options={OPTIONS}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

const box = () => screen.getByRole("combobox", { name: "Rol" });

describe("Select", () => {
  it("kapalıyken liste yok; tıkla açılıyor, satır ad + açıklama, seçili işaretli", () => {
    render(<Harness onChange={vi.fn()} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(box().getAttribute("aria-expanded")).toBe("false");
    expect(box().getAttribute("aria-haspopup")).toBe("listbox");
    fireEvent.click(box());
    expect(box().getAttribute("aria-expanded")).toBe("true");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[1].textContent).toContain("Kod yazar");
    expect(options[0].getAttribute("aria-selected")).toBe("true");
  });

  it("klavye: ↓ açar, ↓/End/Home gezer, Enter seçer ve kapatır", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    const activeId = box().getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId ?? "")?.textContent).toContain("coder");
    fireEvent.keyDown(box(), { key: "End" });
    fireEvent.keyDown(box(), { key: "Home" });
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("task");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(box().textContent).toContain("task");
  });

  it("Esc kapatır, seçim değişmez; fareyle seçim", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(box());
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(box());
    fireEvent.mouseDown(screen.getAllByRole("option")[1]);
    expect(onChange).toHaveBeenCalledWith("coder");
  });
});
