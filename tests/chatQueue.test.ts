// Mesaj kuyruğu: cevap sürerken yazılan mesaj sıraya giriyor, tur bitince
// kendiliğinden gidiyor. Sıradaki metin ASLA kaybolmamalı — durdurulunca,
// hata olunca ya da uygulama kapanırken taslağa geri dönüyor.
import { describe, expect, it } from "vitest";
import { enqueuePrompt, mergeQueuedIntoDraft } from "../src/lib/chatQueue";
import type { ChatAttachment } from "../app-electron/shared/types";

const att = (name: string) => ({ name, path: `C:\\${name}` }) as unknown as ChatAttachment;

describe("enqueuePrompt", () => {
  it("boş kuyruğa ilk mesaj", () => {
    expect(enqueuePrompt(null, "  merhaba ", [att("a.png")])).toEqual({ text: "merhaba", attachments: [att("a.png")] });
  });

  it("ikinci mesaj aynı sıraya ekleniyor, boş satırla", () => {
    const first = enqueuePrompt(null, "bir", []);
    expect(enqueuePrompt(first, "iki", [att("b.png")])).toEqual({ text: "bir\n\niki", attachments: [att("b.png")] });
  });

  it("yalnız ek de sıraya girebiliyor", () => {
    expect(enqueuePrompt({ text: "bir", attachments: [] }, "", [att("c.png")])).toEqual({
      text: "bir",
      attachments: [att("c.png")]
    });
  });
});

describe("mergeQueuedIntoDraft", () => {
  it("kuyruk yoksa taslak aynen", () => {
    expect(mergeQueuedIntoDraft("taslak", [att("a")], null)).toEqual({ draft: "taslak", attachments: [att("a")] });
  });

  it("önce sıradaki, sonra sonradan yazılan taslak", () => {
    expect(mergeQueuedIntoDraft("sonra", [att("b")], { text: "önce", attachments: [att("a")] })).toEqual({
      draft: "önce\n\nsonra",
      attachments: [att("a"), att("b")]
    });
  });

  it("taslak boşsa yalnızca sıradaki", () => {
    expect(mergeQueuedIntoDraft("  ", [], { text: "önce", attachments: [] })).toEqual({ draft: "önce", attachments: [] });
  });
});
