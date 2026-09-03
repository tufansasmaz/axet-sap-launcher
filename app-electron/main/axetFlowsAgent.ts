import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { axetSpawnEnv } from "./axetSpawnEnv";

// axet.flows Agent — sohbet penceresinden gelen her turu (bir JSON-aksiyon
// protokolü isteği) `axet-code run --quiet` alt-process'i olarak çalıştırır.
// axetChat.ts'teki (axet.code sohbet ekranı) `sendChatMessage`'dan KASITLI
// OLARAK AYRI bir modül — buradaki prompt STDIN'den verilir (axet.flows'un
// orijinal tasarımı; JSON-aksiyon promptları çok uzun/özel karakter içerebilir,
// argv yerine stdin şekil/kaçış sorunlarından bağımsız), ve `--cwd` her zaman
// sabit bir scratch klasörüne kilitlenir (agent'ın yanlışlıkla gerçek proje
// dosyalarına dokunmaması için — sistem promptu da ayrıca bash/edit/view
// kullanmamasını söylüyor, bkz. src/flows/agent/systemPrompt.js).

const AXETCODE_TIMEOUT_MS = 120_000;

function scratchDir(): string {
  return path.join(os.tmpdir(), "axet-flows-agent-scratch");
}

async function ensureScratchDir(): Promise<string> {
  const dir = scratchDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function runFlowsAgentStep(prompt: string, model: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureScratchDir()
      .then((dir) => {
        const args = ["run", "--quiet", "--cwd", dir];
        if (model) args.push("-m", model);

        let child;
        try {
          // Bağlayıcılar KOŞULSUZ kapalı: bu ajan yapılandırılmış flow JSON'ı
          // üretiyor, hiçbir MCP aracı (Outlook/SharePoint) çağırmıyor — ne
          // prompt'unda ne de protokolünde bunlara atıf var. Kurulup yıkılmaları
          // tur başına ~8 saniye ekliyordu (ölçüm: axetSpawnEnv.ts).
          child = spawn("axet-code", args, { cwd: dir, shell: true, windowsHide: true, env: axetSpawnEnv(false) });
        } catch (err) {
          reject(err as Error);
          return;
        }

        let stdout = "";
        let stderr = "";
        let settled = false;

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          child.kill();
          reject(new Error("axet-code run zaman aşımına uğradı (120s)."));
        }, AXETCODE_TIMEOUT_MS);

        child.stdout?.on("data", (d: Buffer) => (stdout += d.toString("utf-8")));
        child.stderr?.on("data", (d: Buffer) => (stderr += d.toString("utf-8")));

        child.on("error", (err: NodeJS.ErrnoException) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (err.code === "ENOENT") {
            reject(new Error('axet-code CLI bulunamadı (PATH\'de yok). "axet-code -v" komutunun çalıştığını doğrula.'));
          } else {
            reject(err);
          }
        });

        child.on("close", (code: number | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (code !== 0 && !stdout.trim()) {
            reject(new Error(stderr.trim() || `axet-code run kod ${code} ile bitti.`));
            return;
          }
          resolve(stdout.trim());
        });

        child.stdin?.write(prompt, "utf-8");
        child.stdin?.end();
      })
      .catch(reject);
  });
}
