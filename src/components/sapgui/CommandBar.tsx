import { useState, type ReactNode } from "react";
import { CornerDownLeft, Keyboard } from "lucide-react";
import { useT } from "../../i18n";
import { ALL_VKEYS, QUICK_VKEYS, vkeyDef } from "../../lib/sapGui/vkeys";
import type { GuiScriptToolbarKey } from "../../../app-electron/shared/types";

// Komut çubuğu — transaction'a geçiş + fonksiyon tuşları.
//
// NEDEN VAR: bu iki şey SAP'de en sık yapılan iki hareket ve eskiden ikisi de
// dolambaçlıydı. Bir transaction'a gitmek için ağaçtan `wnd[0]/tbar[0]/okcd`
// bulunup metin yazılıp sonra ayrı bir alandan "0" VKey'i gönderiliyordu;
// fonksiyon tuşları ise ham sayı olarak giriliyordu ("8" nedir?). Burada
// tcode tek Enter ile gidiyor (köprüdeki `navigate` aksiyonu /n önekini ve
// Enter'ı kendi ekliyor) ve tuşlar İSİMLERİYLE görünüyor (bkz. vkeys.ts).

// TUŞUN ETKİN OLUP OLMADIĞI: `toolbarKeys` SAP'nin standart araç çubuğundan
// canlı okunuyor. Etkin olmayan bir tuşa `sendVKey` göndermek SAP tarafından
// reddediliyor ("The virtual key is not enabled", kod 617) ve kullanıcı bunu
// ancak TIKLADIKTAN sonra öğreniyordu — "kaydet çalışmıyor" şikayeti buydu.
// Artık buton önceden soluk ve sebebi tooltip'te yazıyor.
//
// LİSTEDE OLMAYAN tuş SOLUK GÖSTERİLMEZ: araç çubuğunda görünmeyen ama
// çalışan tuşlar var (alan içindeki F4 gibi). "Bilinmiyor"u "kapalı" diye
// göstermek, çalışan bir tuşu kullanıcıdan saklamak olurdu.

interface Props {
  busy: boolean;
  toolbarKeys?: GuiScriptToolbarKey[];
  onNavigate: (tcode: string) => void;
  onVKey: (vkey: number) => void;
  /**
   * Otomasyon düğmeleri (Kaydet · Script · AI Agent). Kendi şeritleri yerine
   * BURAYA konuyor: fonksiyon tuşlarıyla vkey seçicisi arasındaki boşluk zaten
   * boş duruyordu ve ayrı bir `h-9` şerit hem 36 piksel yiyor hem de dar
   * pencerede aşağı kayıp görünmez oluyordu.
   */
  dock?: ReactNode;
}

export default function CommandBar({ busy, toolbarKeys, onNavigate, onVKey, dock }: Props) {
  const t = useT();
  const [tcode, setTcode] = useState("");
  const [customVKey, setCustomVKey] = useState("0");
  const keyState = new Map((toolbarKeys ?? []).map((entry) => [entry.vkey, entry]));

  const submit = () => {
    const trimmed = tcode.trim();
    if (!trimmed || busy) return;
    onNavigate(trimmed);
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-base-700 bg-base-900 px-3">
      <div className="flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-base-700 bg-base-800 focus-within:border-accent-500">
        <span className="flex select-none items-center self-stretch border-r border-base-700 px-2 font-mono text-xs text-slate-500">/n</span>
        <input
          value={tcode}
          onChange={(e) => setTcode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("sapGuiScripting.tcodePlaceholder")}
          className="h-full w-28 bg-transparent px-2 font-mono text-xs uppercase text-slate-100 outline-none"
        />
        <button
          onClick={submit}
          disabled={busy || !tcode.trim()}
          title={t("sapGuiScripting.tcodeGo")}
          className="flex h-full cursor-pointer items-center border-l border-base-700 px-2.5 text-slate-400 hover:bg-base-700 hover:text-white disabled:cursor-default disabled:opacity-40"
        >
          <CornerDownLeft size={14} />
        </button>
      </div>

      {/* Fonksiyon tuşları TEK bir kutunun içinde: eskiden serbestçe yan yana
          dizilmiş sekiz düğmeydi ve soldaki tcode kutusuyla, sağdaki vkey
          seçicisiyle aynı ağırlıkta görünüyorlardı — üç ayrı iş, tek bir
          düğme kalabalığı gibi okunuyordu. */}
      <div className="flex h-8 min-w-0 shrink items-center gap-0.5 overflow-x-auto rounded-md border border-base-700 bg-base-800/40 px-1">
        {QUICK_VKEYS.map((vkey) => {
          const def = vkeyDef(vkey);
          const live = keyState.get(vkey);
          const known = live !== undefined;
          const off = known && !live.enabled;
          // Tooltip'te SAP'nin kendi etiketi varsa o kazanır: transaction
          // tuşu yeniden atamışsa bizim statik tablomuz yanlış olur.
          const label = live?.tooltip || (def?.meaning ? `${def.combo} · ${def.meaning}` : def?.combo);
          return (
            <button
              key={vkey}
              onClick={() => onVKey(vkey)}
              disabled={busy || off}
              title={off ? `${label} — ${t("sapGuiScripting.vkeyDisabled")}` : label}
              className={`flex h-6 shrink-0 items-center rounded px-2 text-xs font-medium ${
                off
                  ? "cursor-not-allowed text-slate-600 line-through"
                  : "cursor-pointer text-slate-200 hover:bg-base-700 disabled:cursor-default disabled:opacity-40"
              }`}
            >
              {def?.meaning?.split(" ")[0] ?? def?.combo ?? vkey}
            </button>
          );
        })}
      </div>

      {dock && (
        <>
          <div className="mx-1 h-6 w-px shrink-0 bg-base-700" />
          <div className="flex min-w-0 shrink items-center gap-1 overflow-x-auto">{dock}</div>
        </>
      )}

      {/* Nadir yol: listede olmayan bir vkey'i elle göndermek. Bu yüzden
          sağa, ikincil ağırlıkta duruyor. */}
      <div className="ml-auto flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-base-700 bg-base-800 focus-within:border-accent-500">
        <Keyboard size={13} className="ml-2 shrink-0 text-slate-500" />
        {/* Açılır listenin RENGİ: `<option>` gövdesi Chromium'da yerli bir
            pencerede çiziliyor ve CSS ile boyanmıyor. Temayı takip etmesi
            `index.css`'teki `color-scheme` sayesinde; buradaki `bg-base-800`
            yalnızca kapalı hâldeki kutuyu ilgilendiriyor. */}
        <select
          value={customVKey}
          onChange={(e) => setCustomVKey(e.target.value)}
          className="h-full max-w-[190px] cursor-pointer bg-base-800 px-1.5 text-xs text-slate-200 outline-none"
        >
          {ALL_VKEYS.map((def) => (
            <option key={def.vkey} value={def.vkey}>
              {def.vkey} · {def.combo}
              {def.meaning ? ` · ${def.meaning}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => onVKey(Number(customVKey) || 0)}
          disabled={busy}
          className="h-full cursor-pointer border-l border-base-700 px-2.5 text-xs font-medium text-slate-300 hover:bg-base-700 hover:text-white disabled:cursor-default disabled:opacity-40"
        >
          {t("sapGuiScripting.send")}
        </button>
      </div>
    </div>
  );
}
