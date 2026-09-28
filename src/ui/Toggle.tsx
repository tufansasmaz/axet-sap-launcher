// Açma/kapama anahtarı (spec §6.3). `role="switch"` + `aria-checked`: ekran
// okuyucu "açık/kapalı" diye okuyor, onay kutusu gibi "işaretli" diye değil.
//
// Düğme açıkken accent dolgulu; topuz `accent-on` rengiyle — açık temada
// accent dolgunun üstünde beyaz, koyu temada koyu duruyor (bkz. index.css
// `--accent-on-rgb`). Kapalıyken nötr kontrol zemini.
//
// Erişilebilir ad: `Field` içindeyse etiketi oradan (`htmlFor`), değilse
// `label` niteliğinden (`aria-label`).

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
