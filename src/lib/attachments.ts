import type { ChatAttachment } from "../../app-electron/shared/types";
import { quotePathIfNeeded } from "./paths";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Sürükle-bırakılan veya panoya yapıştırılan dosyaları axet-code'un
// okuyabileceği gerçek disk yollarına çevirir. İki durum var:
// 1. Dosyanın diskte gerçek bir karşılığı VAR (Explorer'dan sürüklenen/
//    kopyalanan normal bir dosya) — `webUtils.getPathForFile` bunu doğrudan
//    verir, hiçbir I/O gerekmez.
// 2. Diskte karşılığı YOK (örn. bir ekran görüntüsü aracının panoya koyduğu
//    çıplak görsel verisi) — bu durumda main process'e (bkz.
//    chatAttachments.ts) veriyi kendimiz yazdırıp dönen geçici dosya yolunu
//    kullanıyoruz.
//
// Dönen yollar TIRNAKSIZ ve ham. Tırnaklama (`quotePathIfNeeded`) yalnızca
// prompt metni kurulurken yapılıyor — ek nesnesinin içinde tırnaklı bir yol
// tutmak, aynı yolla yapılan önizleme okumasını sessizce bozardı.
export async function resolveFilesToPaths(files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    let resolved: string | null = null;
    try {
      const direct = window.api.getPathForFile(file);
      if (direct) resolved = direct;
    } catch {
      // gerçek bir disk yolu yok, aşağıdaki fallback'e düş
    }
    if (!resolved) {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        const result = await window.api.saveChatAttachment(file.name || "yapistirilan-dosya", base64);
        if (result.ok && result.path) resolved = result.path;
      } catch {
        // dosya okunamadı, atla
      }
    }
    if (resolved) paths.push(resolved);
  }
  return paths;
}

export function baseName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

export function toAttachments(paths: string[]): ChatAttachment[] {
  return paths.map((p) => ({ id: crypto.randomUUID(), path: p, name: baseName(p) }));
}

// Ekler artık mesaj METNİNİN parçası değil (bkz. shared/types.ts
// `ChatAttachment`), ama `axet-code` yine de dosyaları yollarından okuyor —
// bu yüzden yollar SADECE gönderim anında, prompt'un sonuna ekleniyor.
// Kullanıcının ekranda gördüğü mesaj metni bundan etkilenmiyor.
//
// Aynı fonksiyon geçmiş mesajları transkripte çevirirken de kullanılıyor:
// kullanılmazsa ajan, iki mesaj önce konuşulan dosyanın yolunu kaybeder ve
// "hangi dosya?" diye sorar.
export function promptWithAttachments(text: string, attachments: ChatAttachment[]): string {
  if (attachments.length === 0) return text;
  const list = attachments.map((a) => quotePathIfNeeded(a.path)).join("\n");
  const block = `Ekli dosyalar (bu yollardan okuyabilirsin):\n${list}`;
  return text ? `${text}\n\n${block}` : block;
}
