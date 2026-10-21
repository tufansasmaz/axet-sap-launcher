// @vitest-environment jsdom
// Tur 13: Bellek → "Kimlik ve kurallar" bölümü: ekip ve ajan kuralları, kaydet.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import RulesPanel from "../src/agents/brain/RulesPanel";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";

let rulesSet: ReturnType<typeof vi.fn>;
beforeEach(() => {
  rulesSet = vi.fn(async () => "ok");
  (window as unknown as { api: unknown }).api = {
    rulesGet: vi.fn(async () => ({ team: "Türkçe yaz.", agents: { p1: "Yalnız test." } })),
    rulesSet
  };
});
afterEach(cleanup);

const workspace: TerminalWorkspace = {
  id: "w1",
  name: "Ekip",
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  panes: [
    { id: "p1", kind: "agent", cwd: "C:\\p", title: "Test ajanı", agent: { engine: "axet-code", role: "Test", roleKind: "preset" }, run: { state: "queued" } },
    { id: "p2", kind: "agent", cwd: "C:\\p", title: "Analist", agent: { engine: "claude", role: "Analist", roleKind: "custom" }, run: { state: "queued" } }
  ]
};

describe("Kimlik ve kurallar", () => {
  it("kayıtlı kuralları gösteriyor; düzenleyip kaydedince ekip + ajan kuralları gidiyor", async () => {
    render(
      <LanguageProvider language="tr">
        <RulesPanel workspace={workspace} />
      </LanguageProvider>
    );
    const team = (await screen.findByLabelText("Ekip kuralları")) as HTMLTextAreaElement;
    await waitFor(() => expect(team.value).toBe("Türkçe yaz."));
    fireEvent.change(team, { target: { value: "Türkçe yaz. SAP'ye yazma." } });
    fireEvent.change(screen.getByLabelText("Ajan"), { target: { value: "p2" } });
    fireEvent.change(screen.getByLabelText("Bu ajana özel kurallar"), { target: { value: "Yalnız analiz." } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() =>
      expect(rulesSet).toHaveBeenCalledWith("w1", { team: "Türkçe yaz. SAP'ye yazma.", agents: { p1: "Yalnız test.", p2: "Yalnız analiz." } })
    );
    expect(await screen.findByText("Kaydedildi.")).toBeTruthy();
  });
});
