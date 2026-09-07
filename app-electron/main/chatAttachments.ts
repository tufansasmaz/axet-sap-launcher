import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ChatAttachmentPreviewResult, ChatAttachmentSaveResult } from "../shared/types";
import { mt } from "./i18n";

// axet.code sohbet ekranına sürükle-bırakılan/yapıştırılan dosyaların BÜYÜK
// çoğunluğu (Explorer'dan sürüklenen bir dosya, kopyalanan bir dosya) zaten
// diskte gerçek bir yola sahip — bu durumda `webUtils.getPathForFile`
// (preload'ta zaten var) yeterli, bu modüle hiç gerek yok. Bu modül SADECE
// diskte karşılığı olmayan ham veriler için devreye giriyor (örn. bir ekran
// görüntüsü aracının panoya koyduğu çıplak bir görsel/blob — "Dosya" değil,
// sadece bayt dizisi) — bu durumda `axet-code`'un okuyabileceği bir dosya
// yolu üretmek için veriyi kendimiz uygulamanın kendi klasörüne yazıyoruz.

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB — sohbete yapıştırılan tekil bir dosya için makul bir üst sınır

// Bu dosyalar `temp` ALTINDA DEĞİL. Sohbet geçmişi kalıcı (chatStore.ts) ve
// mesajın içinde yalnızca DOSYA YOLU duruyor — dosyanın kendisi silinirse
// geçmişteki görsel kırık bir yola dönüşüyor. Windows'un/kurumsal temizlik
// politikalarının `%TEMP%`'i süpürmesi, kullanıcının "sohbet geçmişinde
// eklediğim görsel silinmiş oluyor" şikâyetinin (2026-09-02) ikinci
// sebebiydi: birincisi kaydın hiç yazılmaması, ikincisi yazılsa bile
// dosyanın altından kayması. `userData` uygulamanın kendi alanı, kimse
// süpürmüyor.
function attachmentsDir(): string {
  return path.join(app.getPath("userData"), "chat-attachments");
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return cleaned || "yapistirilan-dosya";
}

// Composer'daki/mesajdaki çipte gösterilecek küçük resim. SADECE görseller
// için; başka bir uzantıda `ok: true` + `dataUrl` yok döner (hata değil —
// çip ikonla çizilir).
//
// Önizleme sınırı, ek yükleme sınırından (20MB) AYRI ve ondan küçük: burada
// dosya base64'e çevrilip IPC üzerinden renderer'a taşınıyor ve base64 boyu
// ~%33 büyütüyor. 8MB'lık bir görselin önizlemesi için ~11MB'lık bir string'i
// process sınırından geçirmenin kimseye faydası yok; ek yine de gönderilir,
// sadece küçük resmi olmaz.
const MAX_PREVIEW_BYTES = 6 * 1024 * 1024;

const PREVIEW_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml"
};

export async function readAttachmentPreview(filePath: string): Promise<ChatAttachmentPreviewResult> {
  try {
    const mime = PREVIEW_MIME[path.extname(filePath).toLowerCase()];
    if (!mime) return { ok: true };
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > MAX_PREVIEW_BYTES) return { ok: true };
    const buffer = await fs.readFile(filePath);
    return { ok: true, dataUrl: `data:${mime};base64,${buffer.toString("base64")}` };
  } catch (err) {
    // Dosya silinmiş/erişilemiyor olabilir. Önizleme kozmetik olduğu için
    // bu bir hata olarak yüzeye çıkmıyor, çip ikona düşüyor.
    return { ok: false, error: (err as Error).message };
  }
}

export async function saveClipboardAttachment(fileName: string, base64Data: string): Promise<ChatAttachmentSaveResult> {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.byteLength === 0) {
      return { ok: false, error: mt("chatAttachments.readFailed") };
    }
    if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: mt("chatAttachments.tooLarge") };
    }
    const dir = attachmentsDir();
    await fs.mkdir(dir, { recursive: true });
    const finalName = `${randomUUID()}-${sanitizeFileName(fileName)}`;
    const filePath = path.join(dir, finalName);
    await fs.writeFile(filePath, buffer);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
