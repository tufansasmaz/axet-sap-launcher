// Bölmeye yazılan tuşlardan "gönderilen satır"ı çıkarır (spec 2026-10-17
// ajan-alani §6.1). axet-code okuyucusu bu satırı oturum veritabanında arayıp
// ajanın oturumunu buluyor. Satırlar YALNIZ BELLEKTE: diske ve günlüğe gitmez.
//
// Satır içi düzenleme (ok tuşuyla geri gidip araya yazma) izlenmiyor: ok
// dizileri atılıyor, karakterler sona ekleniyor. Böyle bir satır veritabanında
// bulunmaz; okuyucu o zaman "tahmini"de kalır — yanlış oturuma bağlanmaz.

const MAX_LINE = 4_000;
// CSI (`ESC [ … son`), SS3 (`ESC O x`) ya da iki baytlık `ESC x`.
const ESCAPE_SEQUENCE = /^\x1b(?:\[[0-?]*[ -/]*[@-~]|O[@-~]|[@-_])/;

export class InputLineBuffer {
  private line = "";
  private pasting = false;

  feed(data: string): string[] {
    const lines: string[] = [];
    let i = 0;
    while (i < data.length) {
      const ch = data[i];
      if (ch === "\x1b") {
        const rest = data.slice(i, i + 32);
        if (rest.startsWith("\x1b[200~")) {
          this.pasting = true;
          i += 6;
          continue;
        }
        if (rest.startsWith("\x1b[201~")) {
          this.pasting = false;
          i += 6;
          continue;
        }
        const match = ESCAPE_SEQUENCE.exec(rest);
        // Tek başına Esc (soru kutusunu kapatma vb.) yalnızca atlanıyor.
        i += match ? match[0].length : 1;
        continue;
      }
      if (ch === "\r") {
        if (this.pasting) {
          this.append(" ");
        } else {
          const done = this.line.trim();
          if (done) lines.push(done);
          this.line = "";
        }
        i += data[i + 1] === "\n" ? 2 : 1;
        continue;
      }
      // axet-code'da Ctrl+J istem içinde yeni satır: gönderme değil.
      if (ch === "\n") {
        this.append(" ");
        i += 1;
        continue;
      }
      if (ch === "\x7f" || ch === "\b") {
        this.line = Array.from(this.line).slice(0, -1).join("");
        i += 1;
        continue;
      }
      // Ctrl+C ve Ctrl+U taslağı siliyor.
      if (ch === "\x03" || ch === "\x15") {
        this.line = "";
        i += 1;
        continue;
      }
      if (ch < " ") {
        i += 1;
        continue;
      }
      this.append(ch);
      i += 1;
    }
    return lines;
  }

  hasDraft(): boolean {
    return this.line.trim().length > 0;
  }

  private append(text: string): void {
    if (this.line.length < MAX_LINE) this.line += text;
  }
}
