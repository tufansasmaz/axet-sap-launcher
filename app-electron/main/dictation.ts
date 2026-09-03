import { app } from "electron";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DictationResult } from "../shared/types";
import { getEmbeddedWhisperRuntime } from "./embeddedRuntime";

// Sohbet kutusundaki mikrofon (kullanıcı isteği, 2026-09-02: *"chat box'a
// mikrofon ekleyelim, tıkladığımızda konuştuklarımızı da yazabilsin"*).
//
// Tanıma YERELDE, gömülü whisper.cpp ile yapılıyor. Ses bu makineden HİÇ
// çıkmıyor. Elenen iki yol ve NEDEN elendikleri — aynı turlarda tekrar
// denenmesin diye yazılı:
//
//   1. Web Speech API (`webkitSpeechRecognition`) ELECTRON'DA ÇALIŞMIYOR.
//      Chromium'un tanıması Google'ın konuşma servisine derleme anında
//      gömülen bir anahtarla gidiyor; resmî Electron yapılarında o anahtar
//      yok, çağrı her seferinde `error: "network"` ile düşüyor.
//   2. Windows'un kendi sesle yazması (Win+H) BU MAKİNEDE TÜRKÇE YAPMIYOR.
//      Denendi ve ölçüldü (2026-09-03): kurulu tek yerel tanıyıcı
//      `MS-1033-110-WINMO-DNN` (yalnızca en-US) ve Windows'un çevrimiçi
//      konuşma servisinin bu kurulumda desteklediği diller
//      `HKLM:\SOFTWARE\Microsoft\Speech_OneCore\ServiceLanguages` altında
//      de/en/es/fr/it/ja/pt-BR/zh — TÜRKÇE YOK. Ayrıca
//      `OnlineSpeechPrivacy.HasAccepted` boştu, yani çevrimiçi tanıma hiç
//      kabul edilmemiş. Win+H açılsa bile en iyi ihtimalle İngilizce yazardı.
//   3. Bulut STT (Whisper API/Azure) bir API anahtarı ister ve kurumsal bir
//      makineden dışarı SES çıkarır — bu teknik bir detay değil, ayrı bir
//      karar. Kullanıcı yerel çözümü seçti (2026-09-03).
//
// Ses, RENDERER tarafında 16kHz mono PCM16 WAV olarak üretiliyor (bkz.
// src/lib/dictationRecorder.ts) — whisper.cpp'nin beklediği format bu ve
// böylece araya bir ffmpeg dönüştürücüsü koymak gerekmiyor.

// Üst sınır: 16kHz mono PCM16 = 32000 bayt/saniye, yani ~5 dakika. Sohbet
// kutusuna dikte edilen bir cümle için fazlasıyla yeterli; sınırsız bıraksak
// yanlışlıkla açık kalan bir kayıt dakikalarca CPU yerdi.
const MAX_AUDIO_BYTES = 5 * 60 * 32000;

// whisper.cpp bir cümleyi saniyeler içinde çözüyor; bunu aşan bir çalışma
// takılmış demektir. Süreç öldürülüyor ki mikrofon kalıcı olarak "meşgul"
// görünmesin.
const TRANSCRIBE_TIMEOUT_MS = 120_000;

// Konuşma olmayan bölümlerde whisper köşeli/parantezli işaretler üretiyor
// (`[BLANK_AUDIO]`, `(müzik)`, `[sessizlik]`). Bunlar metin değil, yazı
// kutusuna düşmemeliler.
const NON_SPEECH = /^[[(][^\])]*[\])]$/;

function cleanTranscript(stdout: string): string {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !NON_SPEECH.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function transcribeAudio(base64Wav: string, language = "auto"): Promise<DictationResult> {
  const runtime = getEmbeddedWhisperRuntime();
  if (!runtime) {
    // Runtime build makinesinde elle hazırlanıyor ve repoya girmiyor
    // (bkz. embeddedRuntime.ts) — geliştirici makinesinde eksik olabilir.
    return { ok: false, error: "missing_runtime" };
  }

  const buffer = Buffer.from(base64Wav, "base64");
  if (buffer.byteLength === 0) return { ok: false, error: "empty_audio" };
  if (buffer.byteLength > MAX_AUDIO_BYTES) return { ok: false, error: "audio_too_long" };

  // Ses dosyası GERÇEKTEN geçici: whisper okuduğu anda işi bitiyor, saklamak
  // için bir sebep yok (eklerin aksine — onlar geçmişte yaşıyor, bkz.
  // chatAttachments.ts).
  const wavPath = path.join(app.getPath("temp"), `axet-dictation-${randomUUID()}.wav`);
  try {
    await fs.writeFile(wavPath, buffer);
    const text = await runWhisper(runtime.cliPath, runtime.modelPath, wavPath, language);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    // Temizlik başarısız olsa da sonucu etkilemiyor — dosya zaten temp'te.
    await fs.unlink(wavPath).catch(() => {});
  }
}

function runWhisper(cliPath: string, modelPath: string, wavPath: string, language: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      cliPath,
      [
        "-m", modelPath,
        "-f", wavPath,
        // Dil OTOMATİK algılanıyor. Bir ara sabit "tr" idi ve kullanıcı haklı
        // olarak *"İngilizce dil desteği de yok"* dedi.
        //
        // Sabitlemek yalnızca eksik değil, TEHLİKELİ: ölçüldü (2026-09-03),
        // İngilizce bir cümle `-l tr` ile çözümlendiğinde çıkan metin tamamen
        // uydurma oluyor ("Kustamın numara 472'e bir saldırı yapabilirsiniz…")
        // ve üstelik 3 kat yavaşlıyor (4.7 sn → 12.6 sn), çünkü çözücü
        // tutarsız sesle boğuşuyor. Otomatik algılama aynı 30 saniyelik
        // pencereden bedavaya geliyor ve ölçümde İngilizceyi p=0.999 ile
        // buldu.
        //
        // Parametre olarak duruyor ki ileride açık bir dil seçici (TR/EN/Oto)
        // eklemek tek satır olsun.
        "-l", language,
        // Zaman damgası ve ilerleme çıktısı YOK — stdout'ta sadece metin
        // kalsın, ayrıştırmaya gerek olmasın.
        "-nt",
        "-np",
        // Konuşma olmayan token'ları bastır: aksi hâlde nefes/tıkırtı
        // `[BLANK_AUDIO]` gibi işaretlere dönüşüyor.
        "-sns",
        // Tüm çekirdekleri değil: dikte arka planda çalışıyor, kullanıcı bu
        // sırada uygulamayı kullanmaya devam ediyor.
        "-t", String(Math.max(1, Math.min(8, os.cpus().length - 1)))
      ],
      // `cwd` DLL'lerin yanı: whisper-cli.exe ggml*.dll'lerini kendi
      // klasöründen yüklüyor.
      { cwd: path.dirname(cliPath), windowsHide: true }
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("timeout"));
    }, TRANSCRIBE_TIMEOUT_MS);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(cleanTranscript(stdout));
      else reject(new Error(stderr.trim().split(/\r?\n/).pop() || `whisper çıkış kodu ${code}`));
    });
  });
}

// Runtime kurulu mu? Renderer bunu mikrofon düğmesini çizmeden ÖNCE soruyor:
// çalışmayacağı belli olan bir düğmeyi göstermek, tıklayınca hata veren bir
// düğme göstermekten daha kötü.
export function isDictationAvailable(): boolean {
  return getEmbeddedWhisperRuntime() !== null;
}
