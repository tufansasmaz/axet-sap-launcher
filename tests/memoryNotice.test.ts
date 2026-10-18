// Bellek bildiriminin zamanlaması (spec 2026-10-18 ajan-bellegi §3, §7): saf
// durum makinesi, sahte saatle.
import { describe, expect, it } from "vitest";
import {
  MEMORY_NOTICE_GAP_MS,
  MEMORY_NOTICE_TRIES,
  agentAtRest,
  noticeAborted,
  noticeBlocked,
  noticeDelivered,
  noticeDue,
  noticeLater,
  noticeMissed,
  noticeRetry,
  noticeSending,
  startNotice,
  type NoticeAgent
} from "../app-electron/shared/memoryNotice";

const idle: NoticeAgent = { status: { state: "idle", source: "exact", lastActivity: 1 }, inputIdle: true, engineReady: true };

describe("agentAtRest", () => {
  it("motor hazır + taslak yok + idle ya da unknown", () => {
    expect(agentAtRest(idle)).toBe(true);
    expect(agentAtRest({ ...idle, status: { state: "unknown", source: "estimated", lastActivity: null } })).toBe(true);
  });

  it("çalışıyor, soru, bitti, hata, durum yok, motor hazır değil, kullanıcı yazıyor: hayır", () => {
    for (const state of ["running", "asking", "finished", "error"] as const) {
      expect(agentAtRest({ ...idle, status: { state, source: "exact", lastActivity: 1 } }), state).toBe(false);
    }
    expect(agentAtRest({ ...idle, status: null })).toBe(false);
    expect(agentAtRest({ ...idle, engineReady: false })).toBe(false);
    expect(agentAtRest({ ...idle, inputIdle: false })).toBe(false);
  });
});

describe("durum makinesi", () => {
  it("başlangıç: bekliyor, deneme 0, hemen uygun", () => {
    const s = startNotice("t1");
    expect(s).toEqual({ ptyId: "t1", phase: "pending", attempts: 0, nextAt: 0 });
    expect(noticeDue(s, idle, 5)).toBe(true);
  });

  it("gönderiliyor/gönderildi/vazgeçildi durumunda bir daha uygun değil", () => {
    const s = startNotice("t1");
    expect(noticeDue(noticeSending(s), idle, 1e12)).toBe(false);
    expect(noticeDue(noticeDelivered(noticeSending(s)), idle, 1e12)).toBe(false);
    expect(noticeDue(noticeBlocked(s), idle, 1e12)).toBe(false);
  });

  it("düşen deneme: 10 sn sonra yeniden; üçüncüde vazgeçiliyor", () => {
    let now = 1_000;
    let s = startNotice("t1");
    for (let i = 1; i <= MEMORY_NOTICE_TRIES; i += 1) {
      expect(noticeDue(s, idle, now), `deneme ${i}`).toBe(true);
      s = noticeMissed(noticeSending(s), now);
      expect(s.attempts).toBe(i);
      if (i < MEMORY_NOTICE_TRIES) {
        expect(s.phase).toBe("pending");
        expect(noticeDue(s, idle, now + MEMORY_NOTICE_GAP_MS - 1)).toBe(false);
        now += MEMORY_NOTICE_GAP_MS;
      }
    }
    expect(s.phase).toBe("failed");
    expect(noticeDue(s, idle, now + 10 * MEMORY_NOTICE_GAP_MS)).toBe(false);
    expect(MEMORY_NOTICE_TRIES).toBe(3);
    expect(MEMORY_NOTICE_GAP_MS).toBe(10_000);
  });

  it("Enter'dan önce kesilen (aborted) deneme sayılıyor ve doğrudan vazgeçiliyor; kendiliğinden yeniden yok", () => {
    const s = noticeAborted(noticeSending(startNotice("t1")));
    expect(s).toEqual({ ptyId: "t1", phase: "failed", attempts: 1, nextAt: 0 });
    expect(noticeDue(s, idle, 1e12)).toBe(false);
    expect(noticeRetry(s)).toEqual({ ptyId: "t1", phase: "pending", attempts: 0, nextAt: 0 });
  });

  it("noticeLater denemeyi saymadan erteliyor", () => {
    const s = noticeLater(startNotice("t1"), 1_000);
    expect(s).toEqual({ ptyId: "t1", phase: "pending", attempts: 0, nextAt: 1_000 + MEMORY_NOTICE_GAP_MS });
  });

  it("Yeniden bildir: vazgeçilmiş ya da gönderilmiş yeniden bekliyor (deneme 0); gönderilirken reddediliyor", () => {
    const failed = { ptyId: "t1", phase: "failed" as const, attempts: 3, nextAt: 99 };
    expect(noticeRetry(failed)).toEqual({ ptyId: "t1", phase: "pending", attempts: 0, nextAt: 0 });
    expect(noticeRetry(noticeDelivered(startNotice("t1")))?.phase).toBe("pending");
    expect(noticeRetry(noticeSending(startNotice("t1")))).toBeNull();
  });
});
