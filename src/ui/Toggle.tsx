import { useFieldControl, useInField } from "./Field";

// Açma/kapama anahtarı (spec §6.3). `role="switch"` + `aria-checked`: ekran
// okuyucu "açık/kapalı" diye okuyor, onay kutusu gibi "işaretli" diye değil.
//
// Düğme açıkken accent dolgulu; topuz `accent-on` rengiyle — açık temada
// accent dolgunun üstünde beyaz, koyu temada koyu duruyor (bkz. index.css
// `--accent-on-rgb`). Kapalıyken nötr kontrol zemini.
//
// Erişilebilir ad: `Field` içindeyse etiketi oradan, değilse `label`
// niteliğinden gelir. Field içindeyken `label` prop'u aria-label olmaması için
// `useInField` kontrol edilir.

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}) {
  const aria = useFieldControl({ id });
  const inField = useInField();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={inField ? undefined : label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      {...aria}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/20 focus-visible:border-accent-500 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-accent-500 bg-accent-500" : "border-line-strong bg-control"
      }`}
    >
      <span
        className={`size-3.5 rounded-full transition-transform ${
          checked ? "translate-x-[18px] bg-accent-on" : "translate-x-[2px] bg-slate-400"
        }`}
      />
    </button>
  );
}
