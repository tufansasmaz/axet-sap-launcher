import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";

// Etiket + girdi + ipucu + hata, tek düzende (spec §6.3).
//
// `Field` içindeki girdiye `id`, `aria-describedby` ve (hata varsa)
// `aria-invalid`'i cloneElement ile veriyor; çağıranın bunları elle kurması
// gerekmiyor. Girdiye elle verilen `id` ve `aria-describedby` korunuyor:
// `id` onunki kalıyor, açıklamalar birleştiriliyor.

export interface ControlAria {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

/** Girdinin kendi niteliklerini Field'dan gelenlerle birleştirir (Field dışında). */
export function useFieldControl<P extends ControlAria>(props: P): P {
  return props;
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
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  // Children'ı clone et ve aria niteliklerini ekle
  let childId = contextId;
  let enhancedChild = children;

  if (isValidElement(children)) {
    childId = children.props.id ?? contextId;
    const childAriaDescribedBy = [
      children.props["aria-describedby"],
      describedBy
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    enhancedChild = cloneElement(children, {
      id: childId,
      "aria-describedby": childAriaDescribedBy,
      "aria-invalid": children.props["aria-invalid"] ?? (error ? true : undefined)
    });
  }

  return (
    <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ""}`}>
      <label htmlFor={childId} className="text-xs font-medium text-slate-300">
        {label}
      </label>
      {enhancedChild}
      {hint && (
        <p id={hintId} className="text-xs text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-[var(--status-danger-text)]">
          {error}
        </p>
      )}
    </div>
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
  return <input ref={ref} className={join(`h-10 ${INPUT_CLASS}`, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={join(`py-2 ${INPUT_CLASS}`, className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref
) {
  return <select ref={ref} className={join(`h-10 ${INPUT_CLASS}`, className)} {...props} />;
});
