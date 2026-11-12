// @vitest-environment jsdom
//
// Çoklu sistem — Logon'da sistem başına durum: bağlı her sistemin başlığında
// "Bağlı · client / kullanıcı"; bağlı olmayanda hiçbir şey.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SapService } from "../app-electron/shared/types";
import SystemHeader from "../src/components/SystemHeader";
import { LanguageProvider } from "../src/i18n";

afterEach(cleanup);

const SERVICE = { uuid: "u1", name: "S4D", systemId: "S4D", type: "SAPGUI", host: "h", port: 3200 } as unknown as SapService;

function mount(connected: { client: string; username: string; agentReady: boolean } | null) {
  const noop = vi.fn();
  render(
    <LanguageProvider language="tr">
      <SystemHeader
        path={["M"]}
        service={SERVICE}
        state="unknown"
        tier="DEV"
        lastConnectedAt={null}
        onCheck={noop}
        onConnect={noop}
        onOpenSapLogon={noop}
        onEditManual={noop}
        onDeleteManual={noop}
        connected={connected}
      />
    </LanguageProvider>
  );
}

describe("SystemHeader — sistem başına bağlantı durumu", () => {
  it("bağlıysa client / kullanıcı ile işaret", () => {
    mount({ client: "100", username: "DEV1", agentReady: true });
    expect(screen.getByTestId("system-connected").textContent).toBe("Bağlı · 100 / DEV1");
  });

  it("ajan sunucusu yoksa uyarı ipucu", () => {
    mount({ client: "100", username: "DEV1", agentReady: false });
    expect(screen.getByTestId("system-connected").getAttribute("title")).toContain("ADT sunucusu");
  });

  it("bağlı değilse işaret yok", () => {
    mount(null);
    expect(screen.queryByTestId("system-connected")).toBeNull();
  });
});
