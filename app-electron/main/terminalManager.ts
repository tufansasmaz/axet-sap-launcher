import type { BrowserWindow } from "electron";
import * as pty from "@lydell/node-pty";

// node-pty (ConPTY üzerinden, N-API tabanlı, prebuilt binary — el yazımı
// koffi/Win32 FFI DEĞİL) ile gerçek bir Windows konsol pseudo-terminal'i
// açar ve çıktısını renderer'daki xterm.js'e IPC event'leriyle akıtır.
// Önceki gömülü terminal denemesi (bkz. PROJE-BILGI.md) el yazımı ConPTY
// FFI çağrılarıyla yapılmıştı ve gerçek Electron içinde asla veri akıtmadı;
// bu implementasyon VS Code'un kendi terminalinin kullandığı, N-API ile
// derlenmiş, ABI'ye bağımlı olmayan standart kütüphaneyi kullanıyor.

interface TerminalSession {
  id: string;
  proc: pty.IPty;
  window: BrowserWindow;
  buffer: string[];
  bufferLen: number;
  ready: boolean;
  readyTimer: NodeJS.Timeout | null;
}

const sessions = new Map<string, TerminalSession>();

// Bir terminale "axet-code -y" gibi bir başlangıç komutu yazıldığında,
// kabuk açılışı + komutun kendisinin yazılması + axet.code'un kendi
// boot süreci arada görünürse kullanıcı "terminalde önce çirkin bir kabuk
// döngüsü görüyorum, sonra axet açılıyor" şeklinde bir flicker yaşar.
// Bunun yerine terminal arka planda sessizce oluşturulur, panel/tab hiç
// gösterilmez; axet.code (Ink/Bubbletea/blessed gibi tam ekran TUI
// framework'leri) kendi arayüzünü çizmeye başlarken terminale "alternate
// screen buffer" escape kodunu (\x1b[?1049h ve türevleri) veya en azından
// bir tam ekran temizleme kodunu yazar — bunu tespit edip "terminal:ready"
// event'i gönderiyoruz, renderer da bunu görünce tab'ı/panel'i açıyor.
// Bazı CLI'lar bu kodu hiç yazmayabilir (düz satır tabanlı) diye bir
// zaman aşımı fallback'i de var — sonsuza kadar gizli kalmasın.
const READY_PATTERNS = [
  /\u001b\[\?1049h/,
  /\u001b\[\?47h/,
  /\u001b\[\?1047h/,
  /\u001b\[2J/,
  /\u001b\[H\u001b\[2J/
];
const READY_FALLBACK_MS = 8000;
const MAX_BUFFER_CHARS = 2_000_000;

function resolveShellPath(shell: "cmd" | "powershell"): string {
  if (shell === "powershell") {
    return "powershell.exe";
  }
  return process.env.COMSPEC || "cmd.exe";
}

function resolveShellArgs(shell: "cmd" | "powershell"): string[] {
  // -NoLogo: PowerShell'in her açılışta gösterdiği telif/versiyon banner'ını
  // bastırır — terminal sekmesi doğrudan temiz bir prompt ile açılsın diye.
  // Kullanıcının kendi profilini (`$PROFILE`, alias/fonksiyonları) kasıtlı
  // olarak BOZMUYORUZ (-NoProfile eklemedik) — sadece görsel gürültüyü
  // kaldırıyoruz.
  return shell === "powershell" ? ["-NoLogo"] : [];
}

function appendToBuffer(session: TerminalSession, data: string): void {
  session.buffer.push(data);
  session.bufferLen += data.length;
  while (session.bufferLen > MAX_BUFFER_CHARS && session.buffer.length > 1) {
    const removed = session.buffer.shift()!;
    session.bufferLen -= removed.length;
  }
}

function markReady(session: TerminalSession): void {
  if (session.ready) return;
  session.ready = true;
  if (session.readyTimer) {
    clearTimeout(session.readyTimer);
    session.readyTimer = null;
  }
  if (!session.window.isDestroyed()) {
    session.window.webContents.send("terminal:ready", session.id);
  }
}

export function createTerminal(
  window: BrowserWindow,
  id: string,
  cwd: string,
  cols: number,
  rows: number,
  shell: "cmd" | "powershell",
  initialCommand?: string
): void {
  const hasInitialCommand = Boolean(initialCommand && initialCommand.trim());
  const proc = pty.spawn(resolveShellPath(shell), resolveShellArgs(shell), {
    name: "xterm-color",
    cols: cols > 0 ? cols : 80,
    rows: rows > 0 ? rows : 24,
    cwd: cwd && cwd.trim() ? cwd : process.cwd(),
    env: process.env as Record<string, string>
  });

  const session: TerminalSession = {
    id,
    proc,
    window,
    buffer: [],
    bufferLen: 0,
    ready: false,
    readyTimer: null
  };
  sessions.set(id, session);

  proc.onData((data: string) => {
    appendToBuffer(session, data);
    if (!session.ready && READY_PATTERNS.some((p) => p.test(data))) {
      markReady(session);
    }
    if (!window.isDestroyed()) {
      window.webContents.send("terminal:data", id, data);
    }
  });

  proc.onExit(({ exitCode }: { exitCode: number }) => {
    markReady(session);
    if (!window.isDestroyed()) {
      window.webContents.send("terminal:exit", id, exitCode);
    }
    sessions.delete(id);
  });

  if (hasInitialCommand) {
    session.readyTimer = setTimeout(() => markReady(session), READY_FALLBACK_MS);
    proc.write(`${initialCommand!.trim()}\r\n`);
  } else {
    // Manuel/bağımsız terminal — bekletecek bir başlangıç komutu yok,
    // hemen "hazır" say ki renderer tab'ı gecikmeden açsın.
    setImmediate(() => markReady(session));
  }
}

export function getTerminalBuffer(id: string): string {
  return sessions.get(id)?.buffer.join("") ?? "";
}

export function writeTerminal(id: string, data: string): void {
  sessions.get(id)?.proc.write(data);
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  if (cols <= 0 || rows <= 0) return;
  try {
    sessions.get(id)?.proc.resize(cols, rows);
  } catch {
    // process az önce kapanmış olabilir, göz ardı et
  }
}

export function disposeTerminal(id: string): void {
  const session = sessions.get(id);
  if (!session) return;
  if (session.readyTimer) clearTimeout(session.readyTimer);
  try {
    session.proc.kill();
  } catch {
    // zaten kapalı
  }
  sessions.delete(id);
}

export function disposeAllTerminals(): void {
  for (const id of Array.from(sessions.keys())) {
    disposeTerminal(id);
  }
}
