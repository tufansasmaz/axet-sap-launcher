// Tur 11: ajan terminalinin ekranı — ConPTY çıktısını uygulayan küçük VT (yalnız metin).
// Amaç cevap çıkarmak (terminalReply.ts): renk, fare, kip ayrıntısı yok. ConPTY ekranı
// mutlak konum (H), imleç ileri (C), satır/karakter silme (K/X) ve CRLF/çıplak LF ile
// güncelliyor (ölçüldü, .superpowers/olcum/tur11). Satırlar YALNIZ BELLEKTE.

const SCROLLBACK_MAX = 400;

export class TerminalScreen {
  private grid: string[][];
  private scrollback: string[] = [];
  private x = 0;
  private y = 0;
  private wrapPending = false;
  private saved: { x: number; y: number } = { x: 0, y: 0 };
  /** Parça sınırında yarım kalan kaçış dizisi. */
  private carry = "";

  constructor(
    private cols: number,
    private rows: number
  ) {
    this.cols = Math.max(1, cols);
    this.rows = Math.max(1, rows);
    this.grid = Array.from({ length: this.rows }, () => this.blank());
  }

  private blank(): string[] {
    return Array<string>(this.cols).fill(" ");
  }

  resize(cols: number, rows: number): void {
    cols = Math.max(1, Math.floor(cols));
    rows = Math.max(1, Math.floor(rows));
    if (cols === this.cols && rows === this.rows) return;
    const grid = this.grid.map((row) => {
      const next = row.slice(0, cols);
      while (next.length < cols) next.push(" ");
      return next;
    });
    while (grid.length > rows) {
      // Alttaki boş satırlar önce atılıyor; yoksa üstteki geçmişe kayıyor.
      const last = grid[grid.length - 1];
      if (last.every((c) => c === " ") && grid.length - 1 > this.y) grid.pop();
      else {
        this.pushScrollback(grid.shift() as string[]);
        this.y = Math.max(0, this.y - 1);
      }
    }
    this.cols = cols;
    this.rows = rows;
    while (grid.length < rows) grid.push(this.blank());
    this.grid = grid;
    this.x = Math.min(this.x, cols - 1);
    this.y = Math.min(this.y, rows - 1);
    this.wrapPending = false;
  }

  private pushScrollback(row: string[]): void {
    this.scrollback.push(row.join("").replace(/\s+$/, ""));
    if (this.scrollback.length > SCROLLBACK_MAX) this.scrollback.splice(0, this.scrollback.length - SCROLLBACK_MAX);
  }

  private lineFeed(): void {
    if (this.y === this.rows - 1) {
      this.pushScrollback(this.grid.shift() as string[]);
      this.grid.push(this.blank());
    } else this.y += 1;
  }

  private put(ch: string): void {
    if (this.wrapPending) {
      this.x = 0;
      this.lineFeed();
      this.wrapPending = false;
    }
    this.grid[this.y][this.x] = ch;
    if (this.x === this.cols - 1) this.wrapPending = true;
    else this.x += 1;
  }

  private clearRange(row: number, from: number, to: number): void {
    const r = this.grid[row];
    for (let i = Math.max(0, from); i < Math.min(this.cols, to); i++) r[i] = " ";
  }

  private csi(params: string, final: string): void {
    if (params.startsWith("?") || params.startsWith(">") || params.startsWith("=")) {
      // Alternatif ekran: geçişte ekran boş başlıyor.
      if (/^\?(?:1049|47|1047)$/.test(params) && (final === "h" || final === "l")) {
        this.grid = Array.from({ length: this.rows }, () => this.blank());
      }
      return;
    }
    const p = params.split(";").map((v) => parseInt(v, 10));
    const n = Number.isFinite(p[0]) && p[0] > 0 ? p[0] : 1;
    const mode = Number.isFinite(p[0]) ? p[0] : 0;
    this.wrapPending = final === "m" ? this.wrapPending : false;
    switch (final) {
      case "H":
      case "f":
        this.y = Math.min(this.rows - 1, Math.max(0, (Number.isFinite(p[0]) && p[0] > 0 ? p[0] : 1) - 1));
        this.x = Math.min(this.cols - 1, Math.max(0, (Number.isFinite(p[1]) && p[1] > 0 ? p[1] : 1) - 1));
        break;
      case "A":
        this.y = Math.max(0, this.y - n);
        break;
      case "B":
      case "e":
        this.y = Math.min(this.rows - 1, this.y + n);
        break;
      case "C":
      case "a":
        this.x = Math.min(this.cols - 1, this.x + n);
        break;
      case "D":
        this.x = Math.max(0, this.x - n);
        break;
      case "E":
        this.y = Math.min(this.rows - 1, this.y + n);
        this.x = 0;
        break;
      case "F":
        this.y = Math.max(0, this.y - n);
        this.x = 0;
        break;
      case "G":
      case "`":
        this.x = Math.min(this.cols - 1, n - 1);
        break;
      case "d":
        this.y = Math.min(this.rows - 1, n - 1);
        break;
      case "K":
        if (mode === 0) this.clearRange(this.y, this.x, this.cols);
        else if (mode === 1) this.clearRange(this.y, 0, this.x + 1);
        else this.clearRange(this.y, 0, this.cols);
        break;
      case "J":
        if (mode === 0) {
          this.clearRange(this.y, this.x, this.cols);
          for (let r = this.y + 1; r < this.rows; r++) this.clearRange(r, 0, this.cols);
        } else if (mode === 1) {
          for (let r = 0; r < this.y; r++) this.clearRange(r, 0, this.cols);
          this.clearRange(this.y, 0, this.x + 1);
        } else for (let r = 0; r < this.rows; r++) this.clearRange(r, 0, this.cols);
        break;
      case "X":
        this.clearRange(this.y, this.x, this.x + n);
        break;
      case "P": {
        const row = this.grid[this.y];
        row.splice(this.x, n);
        while (row.length < this.cols) row.push(" ");
        break;
      }
      case "@": {
        const row = this.grid[this.y];
        row.splice(this.x, 0, ...Array<string>(n).fill(" "));
        row.length = this.cols;
        break;
      }
      case "L":
        for (let i = 0; i < n; i++) {
          this.grid.splice(this.y, 0, this.blank());
          this.grid.length = this.rows;
        }
        break;
      case "M":
        for (let i = 0; i < n; i++) {
          this.grid.splice(this.y, 1);
          this.grid.push(this.blank());
        }
        break;
      case "S":
        for (let i = 0; i < n; i++) {
          this.pushScrollback(this.grid.shift() as string[]);
          this.grid.push(this.blank());
        }
        break;
      case "T":
        for (let i = 0; i < n; i++) {
          this.grid.pop();
          this.grid.unshift(this.blank());
        }
        break;
      case "s":
        this.saved = { x: this.x, y: this.y };
        break;
      case "u":
        this.x = this.saved.x;
        this.y = this.saved.y;
        break;
      default:
        break;
    }
  }

  feed(data: string): void {
    const s = this.carry + data;
    this.carry = "";
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === "\x1b") {
        const rest = s.slice(i, i + 256);
        if (rest.length < 2) {
          this.carry = rest;
          return;
        }
        const csi = /^\x1b\[([0-?]*)[ -/]*([@-~])/.exec(rest);
        if (csi) {
          this.csi(csi[1], csi[2]);
          i += csi[0].length;
          continue;
        }
        if (rest[1] === "[") {
          // Yarım CSI: sonraki parçayla birleşsin.
          if (/^\x1b\[[0-?]*[ -/]*$/.test(rest)) {
            this.carry = rest;
            return;
          }
          i += 2;
          continue;
        }
        if (rest[1] === "]" || rest[1] === "P" || rest[1] === "_" || rest[1] === "^") {
          // OSC/DCS/APC/PM: BEL ya da ST'ye kadar atlanıyor.
          const end = /\x07|\x1b\\/.exec(s.slice(i + 2));
          if (!end) {
            this.carry = s.slice(i);
            return;
          }
          i += 2 + end.index + end[0].length;
          continue;
        }
        if (rest[1] === "(" || rest[1] === ")" || rest[1] === "#") {
          i += 3;
          continue;
        }
        if (rest[1] === "7") this.saved = { x: this.x, y: this.y };
        else if (rest[1] === "8") {
          this.x = this.saved.x;
          this.y = this.saved.y;
        } else if (rest[1] === "M") this.y = Math.max(0, this.y - 1);
        i += 2;
        continue;
      }
      if (ch === "\r") {
        this.x = 0;
        this.wrapPending = false;
      } else if (ch === "\n") {
        this.wrapPending = false;
        this.lineFeed();
      } else if (ch === "\b") {
        this.x = Math.max(0, this.x - 1);
        this.wrapPending = false;
      } else if (ch === "\t") {
        this.x = Math.min(this.cols - 1, (Math.floor(this.x / 8) + 1) * 8);
      } else if (ch >= " " && ch !== "\x7f") {
        const cp = s.codePointAt(i) ?? 0;
        const glyph = String.fromCodePoint(cp);
        this.put(glyph);
        i += glyph.length;
        continue;
      }
      i += 1;
    }
  }

  /** Görünen ekran (sağ boşluk kırpılmış). */
  lines(): string[] {
    return this.grid.map((row) => row.join("").replace(/\s+$/, ""));
  }

  /** Geçmiş + ekran. */
  allLines(): string[] {
    return [...this.scrollback, ...this.lines()];
  }
}
