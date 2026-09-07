import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { axetSpawnEnv } from "./axetSpawnEnv";
import { mt } from "./i18n";

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

/**
 * @param useConnectors Bağlı sağlayıcıların MCP araçları bu turda açık olsun
 *   mu? Kararı `connectorPolicy.shouldUseConnectors` veriyor ve SADECE
 *   kullanıcının kendi cümlesine bakıyor — bu ajanın sistem prompt'unda
 *   "mail" geçen node adları var, ona bakılsa her tur boşuna yavaşlardı.
 */
export function runFlowsAgentStep(prompt: string, model: string | null, useConnectors = false): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureScratchDir()
      .then((dir) => {
        const args = ["run", "--quiet", "--cwd", dir];
        if (model) args.push("-m", model);

        let child;
        try {
          // Bağlayıcılar VARSAYILAN OLARAK kapalı — kurulup yıkılmaları tur
          // başına ~8 saniye ekliyor (ölçüm: axetSpawnEnv.ts) ve bu ajanın
          // çoğu turu ("bir HTTP node ekle") bunlarla hiç ilgilenmiyor. Ama
          // KOŞULSUZ kapalı DEĞİL: kullanıcı "gelen maili okuyan bir akış
          // kur" derse ajanın posta kutusuna bakabilmesi gerekiyor. MCP araç
          // çağrıları axet-code'un kendi döngüsünde olup bittiği için
          // stdout'a yine sadece nihai JSON düşüyor; protokol bozulmuyor.
          child = spawn("axet-code", args, { cwd: dir, shell: true, windowsHide: true, env: axetSpawnEnv(useConnectors) });
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
          reject(new Error(mt("axetCode.runTimeout")));
        }, AXETCODE_TIMEOUT_MS);

        child.stdout?.on("data", (d: Buffer) => (stdout += d.toString("utf-8")));
        child.stderr?.on("data", (d: Buffer) => (stderr += d.toString("utf-8")));

        child.on("error", (err: NodeJS.ErrnoException) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (err.code === "ENOENT") {
            reject(new Error(mt("axetCode.cliNotFound")));
          } else {
            reject(err);
          }
        });

        child.on("close", (code: number | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (code !== 0 && !stdout.trim()) {
            reject(new Error(stderr.trim() || mt("axetCode.runExitCode", { code })));
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
