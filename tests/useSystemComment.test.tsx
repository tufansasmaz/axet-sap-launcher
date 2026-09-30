// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSystemComment } from "../src/components/useSystemComment";
import type { SapService } from "../app-electron/shared/types";

const win = window as unknown as { api: unknown };
const originalApi = win.api;
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const SERVICE: SapService = {
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
const SELECTION = { service: SERVICE, itemUuid: "item-a" };

describe("useSystemComment", () => {
  it("yükleme reddedilirse 'yükleniyor'da takılı kalmıyor", async () => {
    win.api = { getSystemCommentDefault: () => Promise.reject(new Error("okunamadı")) };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.commentLoading).toBe(false));
  });

  it("yüklenen notu ve kaynağını veriyor", async () => {
    win.api = { getSystemCommentDefault: () => Promise.resolve({ comment: "eski", source: "sapLogon" }) };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.comment).toBe("eski"));
    expect(result.current.commentSource).toBe("sapLogon");
    expect(result.current.isDirty).toBe(false);
  });

  it("kayıt başarısız olursa not kirli kalıyor ve kayıt kilidi açılıyor", async () => {
    const setSystemComment = vi.fn(() => Promise.reject(new Error("yazılamadı")));
    win.api = {
      getSystemCommentDefault: () => Promise.resolve({ comment: "", source: "none" }),
      setSystemComment
    };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.commentLoading).toBe(false));
    act(() => result.current.setComment("yeni"));
    await act(async () => {
      await result.current.save();
    });
    expect(setSystemComment).toHaveBeenCalledWith("svc-a", "yeni");
    expect(result.current.commentSaving).toBe(false);
    expect(result.current.isDirty).toBe(true);
  });

  it("başarılı kayıttan sonra not temiz ve kaynağı 'saved'", async () => {
    win.api = {
      getSystemCommentDefault: () => Promise.resolve({ comment: "", source: "none" }),
      setSystemComment: vi.fn(() => Promise.resolve())
    };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.commentLoading).toBe(false));
    act(() => result.current.setComment("yeni"));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.commentSource).toBe("saved");
    expect(result.current.commentSaved).toBe(true);
  });

  it("seçim yokken hiçbir şey okumuyor, kaydetme bir şey yapmıyor", async () => {
    const getSystemCommentDefault = vi.fn();
    const setSystemComment = vi.fn();
    win.api = { getSystemCommentDefault, setSystemComment };
    const { result } = renderHook(() => useSystemComment(null));
    await act(async () => {
      await result.current.save();
    });
    expect(getSystemCommentDefault).not.toHaveBeenCalled();
    expect(setSystemComment).not.toHaveBeenCalled();
  });
});
