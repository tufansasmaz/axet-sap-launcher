// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SystemPanel from "../src/components/SystemPanel";
import type { ConnectivityState, SapService, SystemTier } from "../app-electron/shared/types";

// Sağ taraf yeniden yazılmadan ÖNCE bugünkü davranışı sabitliyor (plan,
// görev 1). Testler yalnızca yeni düzende de geçerli olan şeylere bakıyor:
// erişilebilir ad, metin ve çağrılan işlev. Sınıf adına bakan test yok.

const win = window as unknown as { api: unknown };
const originalApi = win.api;

// Tanımlanmayan her işlev hiç dönmeyen bir söz veriyor, `on…` abonelikleri
// boş bir iptal (logonSidebar.test ile aynı sahte).
function fakeApi(impl: Record<string, unknown> = {}) {
  return new Proxy(
    {},
    {
      get: (_t, k) => {
        if (typeof k !== "string") return undefined;
        if (k in impl) return impl[k];
        return k.startsWith("on") ? () => () => {} : () => new Promise(() => {});
      }
    }
  );
}

let setSystemComment: ReturnType<typeof vi.fn>;
beforeEach(() => {
  setSystemComment = vi.fn(() => Promise.resolve());
  win.api = fakeApi({
    getSystemCommentDefault: () => Promise.resolve({ comment: "", source: "none" }),
    setSystemComment
  });
});
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const SERVICE_A: SapService = {
  uuid: "svc-a",
  systemId: "D01",
  name: "D01 Geliştirme",
  type: "SAPGUI",
  host: "d01.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

const SERVICE_B: SapService = { ...SERVICE_A, uuid: "svc-b", systemId: "Q01", name: "Q01 Kalite" };

function selectionOf(service: SapService, itemUuid = `item-${service.uuid}`) {
  return { path: ["Test Müşteri"], service, itemUuid };
}

type PanelProps = Parameters<typeof SystemPanel>[0];

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props: PanelProps = {
    selection: selectionOf(SERVICE_A),
    connectivity: {} as Record<string, ConnectivityState>,
    tierOverrides: {} as Record<string, SystemTier>,
    lastConnectedAt: null,
    onCheck: vi.fn(),
    onConnect: vi.fn(),
    onOpenSapLogon: vi.fn(),
    onEditManual: vi.fn(),
    onDeleteManual: vi.fn(),
    onSetTier: vi.fn(),
    ...overrides
  };
  const view = render(
    <LanguageProvider language="tr">
      <SystemPanel {...props} />
    </LanguageProvider>
  );
  const rerender = (next: Partial<PanelProps>) =>
    view.rerender(
      <LanguageProvider language="tr">
        <SystemPanel {...props} {...next} />
      </LanguageProvider>
    );
  return { props, rerender };
}

// Not alanı yükleme bitene kadar devre dışı; yazmadan önce beklenmeli.
async function notesReady(): Promise<HTMLTextAreaElement> {
  const box = screen.getByRole("textbox") as HTMLTextAreaElement;
  await waitFor(() => expect(box.disabled).toBe(false));
  return box;
}

describe("SystemPanel — bugünkü davranış", () => {
  it("açılışta bir kez denetliyor, yeniden denetle düğmesi tekrar çağırıyor", async () => {
    const { props } = renderPanel();
    expect(props.onCheck).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Yeniden Kontrol Et/ }));
    expect(props.onCheck).toHaveBeenCalledTimes(2);
    expect(props.onCheck).toHaveBeenLastCalledWith(SERVICE_A);
    await notesReady();
  });

  it("el ile eklenmiş sistemde düzenle ve sil var, doğru işlevi çağırıyor", async () => {
    const manual = { ...SERVICE_A, isManual: true };
    const { props } = renderPanel({ selection: selectionOf(manual) });
    fireEvent.click(screen.getByRole("button", { name: "Düzenle" }));
    expect(props.onEditManual).toHaveBeenCalledWith(manual);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(props.onDeleteManual).toHaveBeenCalledWith(manual);
    await notesReady();
  });

  it("SAP Logon'da Aç host ve port varken görünüyor, bulut sistemde yok", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /SAP Logon'da Aç/ }));
    expect(props.onOpenSapLogon).toHaveBeenCalledWith(SERVICE_A);
    await notesReady();
    cleanup();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, type: "BTP/CLOUD" }) });
    expect(screen.queryByRole("button", { name: /SAP Logon'da Aç/ })).toBeNull();
    await notesReady();
  });

  it("axet.code'da Aç seçimi onConnect'e veriyor", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /axet.code'da Aç/ }));
    expect(props.onConnect).toHaveBeenCalledWith(props.selection);
    await notesReady();
  });

  it("ortam seçici onSetTier çağırıyor", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "QA" }));
    expect(props.onSetTier).toHaveBeenCalledWith(SERVICE_A, "QA");
    await notesReady();
  });

  it("erişilemiyor ve PRD uyarıları görünüyor", async () => {
    renderPanel({
      connectivity: { "svc-a": "unreachable" },
      tierOverrides: { "svc-a": "PRD" }
    });
    expect(screen.getByText(/Bu sisteme ağ üzerinden erişilemiyor/)).toBeTruthy();
    expect(screen.getByText(/Bu bir PRODUCTION sistemi/)).toBeTruthy();
    await notesReady();
  });

  it("SAProuter satırı yalnızca router varken çiziliyor", async () => {
    renderPanel();
    expect(screen.queryByText("SAProuter")).toBeNull();
    await notesReady();
    cleanup();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, routerString: "/H/router.example.test/S/3299" }) });
    expect(screen.getByText("SAProuter")).toBeTruthy();
    await notesReady();
  });

  it("not Ctrl+Enter ile kaydediliyor", async () => {
    renderPanel();
    const box = await notesReady();
    fireEvent.change(box, { target: { value: "yeni not" } });
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    });
    expect(setSystemComment).toHaveBeenCalledWith("svc-a", "yeni not");
  });

  it("kaydedilmemiş taslak sistemler arasında gezerken kaybolmuyor", async () => {
    const { rerender } = renderPanel();
    const box = await notesReady();
    fireEvent.change(box, { target: { value: "taslak" } });
    rerender({ selection: selectionOf(SERVICE_B) });
    await notesReady();
    rerender({ selection: selectionOf(SERVICE_A) });
    expect(await screen.findByDisplayValue("taslak")).toBeTruthy();
  });
});
