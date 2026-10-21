// Ekip köprüsü (Tur 4): bir ajan, ekibindeki öteki ajanları görüp onlara soru
// sorabilsin. Ajanın terminaline (pty) üç ortam değişkeni veriliyor:
//   NTT_TEAM_URL   http://127.0.0.1:<rastgele port>  (yalnız yerel arayüz)
//   NTT_TEAM_PTY   bölmenin pty kimliği
//   NTT_TEAM_TOKEN HMAC(oturum sırrı, pty kimliği) — bölme başına, yalnız bellekte;
//                  diske yazılmıyor, uygulama kapanınca geçersiz.
// ve PATH'in başına `ntt-team` betiğinin klasörü. Ajan şunları çalıştırır:
//   ntt-team list                 ekip üyeleri (ad, rol, durum)
//   ntt-team ask <ajan> "<soru>"  hedefe Akış yoluyla iletir, sonraki cevabını döndürür
//   ntt-team feed                 ekibin son Akış olayları
//   ntt-team memory add|search|get|link|list   ekip ya da kendi belleği (Tur 5, memoryCommands.ts)
//   ntt-team spawn|assign|wait|status|close     yalnız Lider: ekip kurar, görev verir (Tur 7, teamLead.ts)
// Hedefe yazım Akış mesaj kutusunun kapılarından geçiyor (agentSender): meşgul,
// soru bekleyen, açılış seçimindeki ajana yazılmıyor, sebebi dönüyor.
// 8787 (ADT köprüsü) ve tek-sistem kuralına dokunulmuyor: ayrı, rastgele port.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import http from "node:http";
import type { AgentStatus } from "../shared/agentTypes";
import type { StoredFlowEvent } from "../shared/flowHistory";
import { runMemoryCommand, type MemoryCommandStore } from "../shared/memoryCommands";
import { GENERAL_MEMORY_ID } from "../shared/memoryNotes";
import type { LeadAct } from "../shared/leadCommands";

export interface TeamMember {
  paneId: string;
  name: string;
  role: string;
  engine: string;
  state: string;
  exact: boolean;
}

export interface TeamCaller {
  workspaceId: string;
  paneId: string;
  name: string;
}

export interface TeamRelayEvent {
  workspaceId: string;
  /** Konuşan ajanın bölmesi (akışta renk/ad için). */
  paneId: string;
  name: string;
  detail: string;
  /** Tur 7: lider kartı (açtı / görev / sonuç / kapattı / reddedildi). */
  act?: LeadAct;
  /** Tur 7: kartın hedef bölmesi (ofiste ışın). */
  toPaneId?: string;
}

export interface TeamBridgeDeps {
  caller(ptyId: string): TeamCaller | null;
  members(workspaceId: string): TeamMember[];
  send(workspaceId: string, paneId: string, text: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  status(paneId: string): AgentStatus | null;
  feed(workspaceId: string): StoredFlowEvent[];
  relay(event: TeamRelayEvent): void;
  now(): number;
  sleep(ms: number): Promise<void>;
  log(tag: string, fields: Record<string, string | number | boolean>): void;
  /** Tur 5: ekibin bellek notları (yoksa memory komutu kapalı). */
  memory?(workspaceId: string): MemoryCommandStore;
  /** Bir ajan belleğe yazdı: Bellek ekranı yenilensin. */
  memoryChanged?(workspaceId: string): void;
  /** Tur 7: lider komutları (yoksa kapalı). */
  lead?(caller: TeamCaller, args: unknown): Promise<TeamResponse>;
}

export interface TeamResponse {
  status: number;
  body: Record<string, unknown>;
}

export const ASK_TIMEOUT_DEFAULT_S = 180;
export const ASK_TIMEOUT_MAX_S = 600;
const POLL_MS = 1_000;
const MESSAGE_MAX = 1_500;
const FEED_MAX = 30;

export interface TeamBridge {
  tokenFor(ptyId: string): string;
  verify(ptyId: string, token: string): boolean;
  handle(method: string, url: string, headers: Record<string, string | undefined>, body: string): Promise<TeamResponse>;
}

/** Ajanın cevabını bekler: gönderimden sonra çalışmaya başlayıp yeniden boşa düşmesi. */
export async function waitForReply(
  deps: Pick<TeamBridgeDeps, "status" | "now" | "sleep">,
  paneId: string,
  sentAt: number,
  timeoutMs: number
): Promise<{ done: true; reply: string | null; asking?: string } | { done: false }> {
  const until = sentAt + timeoutMs;
  let sawRunning = false;
  while (deps.now() < until) {
    await deps.sleep(POLL_MS);
    const s = deps.status(paneId);
    if (!s) return { done: true, reply: null };
    if (s.state === "running") {
      sawRunning = true;
      continue;
    }
    // Tahmini durumda son etkinlik yankıyla da tazelenir: yalnız çalışma görüldüyse.
    const fresh = s.source === "exact" && s.lastActivity !== null && s.lastActivity >= sentAt;
    if (s.state === "asking" && (sawRunning || fresh)) return { done: true, reply: null, asking: s.question?.question ?? "" };
    if ((s.state === "idle" || s.state === "finished") && (sawRunning || fresh)) {
      return { done: true, reply: s.source === "exact" && s.reply ? s.reply : null };
    }
  }
  return { done: false };
}

export function createTeamBridge(deps: TeamBridgeDeps, secret: Buffer = randomBytes(32)): TeamBridge {
  const tokenFor = (ptyId: string) => createHmac("sha256", secret).update(`ntt-team:${ptyId}`).digest("hex");
  const verify = (ptyId: string, token: string): boolean => {
    if (!ptyId || !token) return false;
    const expected = Buffer.from(tokenFor(ptyId));
    const given = Buffer.from(token);
    return expected.length === given.length && timingSafeEqual(expected, given);
  };
  const json = (status: number, body: Record<string, unknown>): TeamResponse => ({ status, body });

  async function ask(caller: TeamCaller, raw: string): Promise<TeamResponse> {
    let input: { to?: unknown; message?: unknown; timeout?: unknown };
    try {
      input = JSON.parse(raw) as typeof input;
    } catch {
      return json(400, { ok: false, error: "Gövde JSON değil." });
    }
    const to = typeof input.to === "string" ? input.to.trim() : "";
    const message = typeof input.message === "string" ? input.message.replace(/\s+/g, " ").trim().slice(0, MESSAGE_MAX) : "";
    if (!to || !message) return json(400, { ok: false, error: "Kullanım: ntt-team ask <ajan> \"<soru>\"" });
    const members = deps.members(caller.workspaceId);
    const lower = to.toLocaleLowerCase("tr");
    const target = members.find((m) => m.paneId === to || m.name.toLocaleLowerCase("tr") === lower);
    if (!target) return json(404, { ok: false, error: `Ekipte "${to}" yok. Üyeler: ${members.map((m) => m.name).join(", ")}` });
    if (target.paneId === caller.paneId) return json(400, { ok: false, error: "Kendine soru soramazsın." });
    const timeoutS = Math.min(ASK_TIMEOUT_MAX_S, Math.max(10, typeof input.timeout === "number" ? input.timeout : ASK_TIMEOUT_DEFAULT_S));
    const sentAt = deps.now();
    const result = await deps.send(caller.workspaceId, target.paneId, `${caller.name} (ekip arkadaşın) soruyor: ${message}`);
    if (!result.ok) {
      deps.log("ekip.sor", { sonuc: result.reason });
      return json(409, { ok: false, reason: result.reason, error: `${target.name} şu an mesaj alamıyor (${result.reason}).` });
    }
    deps.relay({ workspaceId: caller.workspaceId, paneId: caller.paneId, name: `${caller.name} → ${target.name}`, detail: message });
    const outcome = await waitForReply(deps, target.paneId, sentAt, timeoutS * 1000);
    if (!outcome.done) {
      deps.log("ekip.sor", { sonuc: "zamanAsimi" });
      return json(504, { ok: false, error: `${target.name} ${timeoutS} sn içinde cevap vermedi; sonra "ntt-team feed" ile bak.` });
    }
    const note = outcome.asking !== undefined
      ? `${target.name} bir soru soruyor: ${outcome.asking}`
      : outcome.reply === null
        ? `${target.name} işini bitirdi ama cevabın metni okunamadı (durum tahmini); cevap onun terminalinde.`
        : "";
    deps.relay({ workspaceId: caller.workspaceId, paneId: target.paneId, name: `${target.name} → ${caller.name}`, detail: outcome.reply ?? note });
    deps.log("ekip.sor", { sonuc: "tamam", metin: outcome.reply !== null });
    return json(200, { ok: true, from: target.name, reply: outcome.reply, note });
  }

  return {
    tokenFor,
    verify,
    async handle(method, url, headers, body) {
      try {
        const ptyId = headers["x-ntt-pty"] ?? "";
        const auth = headers.authorization ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        // Tarayıcıdan gelen istek (Origin) reddediliyor; jeton zaten gerekiyor.
        if (headers.origin || !verify(ptyId, token)) return json(401, { ok: false, error: "Yetkisiz." });
        const caller = deps.caller(ptyId);
        if (!caller) return json(404, { ok: false, error: "Bu terminal bir ekibe kayıtlı ajan değil." });
        const path = url.split("?")[0];
        if (method === "GET" && path === "/team") {
          return json(200, {
            ok: true,
            you: caller.name,
            members: deps.members(caller.workspaceId).map((m) => ({ ...m, you: m.paneId === caller.paneId }))
          });
        }
        if (method === "GET" && path === "/feed") {
          const events = deps.feed(caller.workspaceId).slice(-FEED_MAX);
          return json(200, { ok: true, events: events.map((e) => ({ at: new Date(e.at).toISOString(), kind: e.kind, name: e.name, detail: e.reply ?? e.detail })) });
        }
        if (method === "POST" && path === "/ask") return await ask(caller, body);
        if (method === "POST" && path === "/memory") {
          if (!deps.memory) return json(404, { ok: false, error: "Bellek kapali." });
          let args: unknown = [];
          try {
            args = (JSON.parse(body) as { args?: unknown }).args;
          } catch {
            return json(400, { ok: false, error: "Gövde JSON değil." });
          }
          const result = runMemoryCommand(args, { paneId: caller.paneId, name: caller.name }, deps.memory(caller.workspaceId));
          if (result.changed) deps.memoryChanged?.(caller.workspaceId);
          // Tur 13: ortak Genel bellek değişti; bütün ekiplerin Bellek ekranı yenilensin.
          if (result.changedGeneral) deps.memoryChanged?.(GENERAL_MEMORY_ID);
          deps.log("ekip.bellek", { sonuc: result.status, degisti: result.changed });
          return json(result.status, { ok: result.status < 400, text: result.text, ...(result.status >= 400 ? { error: result.text } : {}) });
        }
        if (method === "POST" && path === "/lead") {
          if (!deps.lead) return json(404, { ok: false, error: "Lider komutlari kapali." });
          let args: unknown = [];
          try {
            args = (JSON.parse(body) as { args?: unknown }).args;
          } catch {
            return json(400, { ok: false, error: "Gövde JSON değil." });
          }
          return await deps.lead(caller, args);
        }
        return json(404, { ok: false, error: "Bilinmeyen komut." });
      } catch {
        return json(500, { ok: false, error: "Köprü hatası." });
      }
    }
  };
}

const BODY_MAX = 16 * 1024;

/** Yalnız 127.0.0.1'de, rastgele portta dinler. */
export function startTeamBridgeServer(bridge: TeamBridge): Promise<{ port: number; close: () => void } | null> {
  return new Promise((resolve) => {
    try {
      const server = http.createServer((req, res) => {
        let body = "";
        let tooLarge = false;
        req.setEncoding("utf8");
        req.on("data", (chunk: string) => {
          if (tooLarge) return;
          body += chunk;
          if (body.length > BODY_MAX) tooLarge = true;
        });
        req.on("end", () => {
          const headers: Record<string, string | undefined> = {};
          for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
          const reply = (status: number, payload: Record<string, unknown>) => {
            res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(payload));
          };
          if (tooLarge) return reply(413, { ok: false, error: "Gövde çok büyük." });
          void bridge.handle(req.method ?? "GET", req.url ?? "/", headers, body).then(
            (r) => reply(r.status, r.body),
            () => reply(500, { ok: false, error: "Köprü hatası." })
          );
        });
      });
      // Uzun süren "ask" (en çok 10 dk) bağlantıyı kesmesin.
      server.requestTimeout = 0;
      server.headersTimeout = 15_000;
      server.on("error", () => resolve(null));
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close();
          resolve(null);
          return;
        }
        resolve({ port: address.port, close: () => server.close() });
      });
    } catch {
      resolve(null);
    }
  });
}

/** Ajanın çalıştıracağı betikler (sır içermez; her açılışta yeniden yazılır). */
export const TEAM_CMD = `@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ntt-team.ps1" %*\r\n`;

/**
 * Tur 10 (ölçüldü): Claude Code'un Bash aracı Windows'ta Git Bash; orada .cmd/.ps1
 * uzantısız adla bulunmuyor ("ntt-team: command not found"). Uzantısız sh betiği
 * ps1'i çağırıyor; MSYS yol dönüştürmesi kapalı ("/src ..." gibi argümanlar bozulmasın).
 * cmd ve PowerShell uzantısız dosyayı seçmiyor, .cmd'yi çalıştırıyor (ölçüldü).
 */
export const TEAM_SH = [
  "#!/bin/sh",
  "# NTT Studio ekip köprüsü (Git Bash / sh). Sır içermez.",
  'd=$(dirname "$0")',
  'if command -v cygpath >/dev/null 2>&1; then d=$(cygpath -w "$d"); fi',
  'MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*" exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$d/ntt-team.ps1" "$@"',
  ""
].join("\n");

export const TEAM_PS1 = [
  "# NTT Studio ekip köprüsü (Tur 4). Sır içermez: jeton ortam değişkeninden.",
  "# Tur 7: param() yerine $args — PowerShell '--bayrak deger' çiftlerini ayrı bağlayıp sırayı bozuyordu.",
  "$argv = @($args | ForEach-Object { [string]$_ })",
  "$Command = 'help'; if ($argv.Count -gt 0) { $Command = $argv[0] }",
  "$To = ''; if ($argv.Count -gt 1) { $To = $argv[1] }",
  "$Rest = @(); if ($argv.Count -gt 2) { $Rest = $argv[2..($argv.Count - 1)] }",
  "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
  "$base = $env:NTT_TEAM_URL",
  "if (-not $base) { Write-Output 'NTT Studio ekip koprusu yok: bu terminal NTT Studio ajani degil.'; exit 2 }",
  "$h = @{ Authorization = \"Bearer $($env:NTT_TEAM_TOKEN)\"; 'X-NTT-Pty' = $env:NTT_TEAM_PTY }",
  "# Yerel köprü: kurumsal vekil sunucu (proxy) atlanıyor.",
  "[System.Net.WebRequest]::DefaultWebProxy = New-Object System.Net.WebProxy",
  "# PowerShell 5'te 4xx gövdesi ErrorDetails'e düşmüyor: yanıt akışından okunuyor (Tur 7).",
  "function Fail($err) { $m = $err.Exception.Message; $txt = ''; if ($err.ErrorDetails -and $err.ErrorDetails.Message) { $txt = $err.ErrorDetails.Message } elseif ($err.Exception.Response) { try { $sr = New-Object System.IO.StreamReader($err.Exception.Response.GetResponseStream(), [System.Text.Encoding]::UTF8); $txt = $sr.ReadToEnd() } catch {} }; if ($txt) { try { $m = ($txt | ConvertFrom-Json).error } catch { $m = $txt } }; Write-Output $m; exit 1 }",
  "switch ($Command) {",
  "  'list' { try { $r = Invoke-RestMethod -Uri \"$base/team\" -Headers $h -TimeoutSec 15 } catch { Fail $_ }",
  "    Write-Output \"Sen: $($r.you)\"; foreach ($m in $r.members) { $me = ''; if ($m.you) { $me = ' (sen)' }; Write-Output (\"{0}{1} | rol: {2} | durum: {3} | motor: {4}\" -f $m.name, $me, $m.role, $m.state, $m.engine) } }",
  "  'feed' { try { $r = Invoke-RestMethod -Uri \"$base/feed\" -Headers $h -TimeoutSec 15 } catch { Fail $_ }",
  "    foreach ($e in $r.events) { Write-Output (\"{0} {1}: {2}\" -f $e.at, $e.name, $e.detail) } }",
  "  'ask' { $msg = ($Rest -join ' ').Trim().Trim([char]34).Trim(); if (-not $To -or -not $msg) { Write-Output 'Kullanim: ntt-team ask <ajan> \"<soru>\"'; exit 1 }",
  "    $body = @{ to = $To; message = $msg } | ConvertTo-Json -Compress",
  "    try { $r = Invoke-RestMethod -Method Post -Uri \"$base/ask\" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json; charset=utf-8' -TimeoutSec 660 } catch { Fail $_ }",
  "    if ($r.reply) { Write-Output (\"{0} cevapladi:\" -f $r.from); Write-Output $r.reply } else { Write-Output $r.note } }",
  "  'memory' { $all = @(); if ($To) { $all += $To }; if ($Rest) { $all += $Rest }; $body = @{ args = $all } | ConvertTo-Json -Compress",
  "    try { $r = Invoke-RestMethod -Method Post -Uri \"$base/memory\" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json; charset=utf-8' -TimeoutSec 30 } catch { Fail $_ }",
  "    Write-Output $r.text }",
  "  { @('spawn','assign','wait','status','close') -contains $_ } { $body = @{ args = $argv } | ConvertTo-Json -Compress",
  "    try { $r = Invoke-RestMethod -Method Post -Uri \"$base/lead\" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json; charset=utf-8' -TimeoutSec 660 } catch { Fail $_ }",
  "    if ($r.text) { Write-Output $r.text } else { Write-Output $r.error } }",
  "  default { Write-Output 'ntt-team list | ntt-team ask <ajan> \"<soru>\" | ntt-team feed | ntt-team memory add|search|get|link|list | (Lider) ntt-team spawn|assign|wait|status|close' }",
  "}",
  ""
].join("\r\n");

/** Ajana ilk Akış mesajında bir kez verilen ipucu (ekipte 2+ ajan varken). */
export const TEAM_HINT = " (Ekip araci: `ntt-team list` uyeleri gosterir, `ntt-team ask <ajan> \"<soru>\"` ekip arkadasina sorar ve cevabini dondurur, `ntt-team feed` son olaylar; `ntt-team memory add|search|get|link` ekip bellegi.)";
