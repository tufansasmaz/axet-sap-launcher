import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";

// Etiket + girdi + ipucu + hata, tek düzende (spec §6.3).
//
// `Field` içindeki girdiye `id`, `aria-describedby` ve (hata varsa)
// `aria-invalid`'i bağlam (context) üzerinden veriyor; çağıranın bunları
// elle kurması gerekmiyor. Girdiye elle verilen `id` ve `aria-describedby`
// korunuyor: `id` onunki kalıyor, açıklamalar birleştiriliyor.
//
// Girdinin kendi id'si varsa Field'ın sağladığı contextId'si yerine o kullanılır.
// Label htmlFor, girdinin gerçek id'sini (kendi mi context mi) alır.

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface ControlAria {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

/**
 * Girdinin kendi niteliklerini Field'dan gelenlerle birleştirir.
 *
 * Field içindeyse: girdiye id/aria-describedby/aria-invalid bağlar.
 * Field dışındaysa: prop'ları olduğu gibi döndürür.
 * Girdinin kendi değerleri her zaman Field'ının önüne gelir.
 */
export function useFieldControl<P extends ControlAria>(props: P): P {
  const ctx = useContext(FieldContext);
  if (!ctx) return props;
  const describedBy = [props["aria-describedby"], ctx.describedBy].filter(Boolean).join(" ") || undefined;
  return {
    ...props,
    id: props.id ?? ctx.id,
    "aria-describedby": describedBy,
    "aria-invalid": props["aria-invalid"] ?? (ctx.invalid ? true : undefined)
  };
}

export function Field({
  label,
  hint,
  error,
  className,
  children
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const base = useId();
  const contextId = `${base}-control`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  // Girdinin kendi id'si varsa onu kullan, yoksa contextId
  const id =
    typeof children === "object" &&
    children !== null &&
    "props" in children &&
    typeof children.props.id === "string"
      ? children.props.id
      : contextId;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ""}`}>
        <label htmlFor={id} className="text-xs font-medium text-slate-300">
          {label}
        </label>
        {children}
        {hint ? (
          <p id={hintId} className="text-xs text-slate-400">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="text-xs text-[var(--status-danger-text)]">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

// 40px yükseklik: `Button` md ile aynı hizada dursun. Hata hâli
// `aria-invalid`'den okunuyor, ayrı bir sınıf gerekmesin diye.
export const INPUT_CLASS =
  "w-full rounded-md border border-line-strong bg-control px-3 text-sm text-slate-100 outline-none transition " +
  "placeholder:text-slate-500 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-[var(--status-danger-text)]";

function join(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={join(`h-10 ${INPUT_CLASS}`, className)} {...useFieldControl(props)} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={join(`py-2 ${INPUT_CLASS}`, className)} {...useFieldControl(props)} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref
) {
  return <select ref={ref} className={join(`h-10 ${INPUT_CLASS}`, className)} {...useFieldControl(props)} />;
});
