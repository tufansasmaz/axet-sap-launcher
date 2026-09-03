import { spawn, type ChildProcess } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { axetSpawnEnv } from "./axetSpawnEnv";

// SAP GUI Scripting Agent — Faz 3. `axetFlowsAgent.ts`'in BİREBİR AYNI
// mimarisi: her tur (JSON-aksiyon protokolü isteği) `axet-code run --quiet`
// alt-process'i olarak çalıştırılır, prompt STDIN'den verilir (uzun/özel
// karakter içeren JSON-aksiyon promptları için argv yerine stdin), `--cwd`
// her zaman sabit bir scratch klasörüne kilitlenir (agent'ın yanlışlıkla
// gerçek proje dosyalarına dokunmaması için — sistem promptu da ayrıca
// bash/edit/view kullanmamasını söylüyor, bkz. src/lib/sapGuiAgent/
// systemPrompt.ts). TEK FARK: `axetChat.ts`'teki iptal (`Map<requestId,
// ChildProcess>`) deseni EKLENDİ — axetFlowsAgent.ts'te hiç yoktu, ama bu
// agent gerçek SAP GUI aksiyonları uyguladığı için (canvas'ta bir node
// eklemekten çok daha "geri alınamaz" olabilir) bir "Durdur" butonu
// güvenlik açısından önemli görüldü.

const AXETCODE_TIMEOUT_MS = 120_000;

const running = new Map<string, ChildProcess>();

function scratchDir(): string {
  return path.join(os.tmpdir(), "axet-sapgui-agent-scratch");
}

async function ensureScratchDir(): Promise<string> {
  const dir = scratchDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function runSapGuiAgentStep(
  requestId: string,
  prompt: string,
  model: string | null
): Promise<{ text: string; cancelled: boolean }> {
  return new Promise((resolve, reject) => {
    ensureScratchDir()
      .then((dir) => {
        const args = ["run", "--quiet", "--cwd", dir];
        if (model) args.push("-m", model);

        let child: ChildProcess;
        try {
          // NOT: axetFlowsAgent.ts'teki `shell: true` BİLEREK BURAYA
          // TAŞINMADI — canlı test SIRASINDA (bu dosyanın smoke-test'i)
          // gerçek bir bug ORTAYA ÇIKTI: Windows'ta `shell:true` ile spawn
          // edilen process'te `child.kill()` sadece ARA `cmd.exe`
          // kabuğunu öldürür, gerçek `axet-code.exe` (cmd'nin child'ı
          // olarak) HAYATTA KALIR — bu yüzden iptal hiç çalışmıyordu,
          // 120s timeout'a düşüyordu (canlı doğrulandı). `axetChat.ts`'in
          // KANITLANMIŞ ÇALIŞAN deseni (`shell:true` YOK, doğrudan spawn)
          // buraya taşındı — cancel bu şekilde gerçekten çalışıyor (bkz.
          // aşağıdaki PROJE-BILGI.md notu).
          // Bağlayıcılar KOŞULSUZ kapalı: bu ajan SAP GUI'yi süren aksiyon
          // JSON'ı üretiyor, hiçbir MCP aracı (Outlook/SharePoint) çağırmıyor.
          // Kurulup yıkılmaları tur başına ~8 saniye ekliyordu (ölçüm:
          // axetSpawnEnv.ts).
          child = spawn("axet-code", args, { cwd: dir, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env: axetSpawnEnv(false) });
        } catch (err) {
          reject(err as Error);
          return;
        }
        running.set(requestId, child);

        let stdout = "";
        let stderr = "";
        let settled = false;
        let cancelled = false;

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          running.delete(requestId);
          child.kill();
          reject(new Error("axet-code run zaman aşımına uğradı (120s)."));
        }, AXETCODE_TIMEOUT_MS);

        child.stdout?.on("data", (d: Buffer) => (stdout += d.toString("utf-8")));
        child.stderr?.on("data", (d: Buffer) => (stderr += d.toString("utf-8")));

        child.on("error", (err: NodeJS.ErrnoException) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          running.delete(requestId);
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
          running.delete(requestId);
          if (cancelled) {
            resolve({ text: stdout.trim(), cancelled: true });
            return;
          }
          if (code !== 0 && !stdout.trim()) {
            reject(new Error(stderr.trim() || `axet-code run kod ${code} ile bitti.`));
            return;
          }
          resolve({ text: stdout.trim(), cancelled: false });
        });

        (child as ChildProcess & { __markCancelled?: () => void }).__markCancelled = () => {
          cancelled = true;
        };

        child.stdin?.write(prompt, "utf-8");
        child.stdin?.end();
      })
      .catch(reject);
  });
}

export function cancelSapGuiAgentStep(requestId: string): void {
  const proc = running.get(requestId);
  if (!proc) return;
  (proc as ChildProcess & { __markCancelled?: () => void }).__markCancelled?.();
  try {
    proc.kill();
  } catch {
    // process zaten kapanmış olabilir
  }
  running.delete(requestId);
}

export function cancelAllSapGuiAgentSteps(): void {
  for (const id of Array.from(running.keys())) cancelSapGuiAgentStep(id);
}
