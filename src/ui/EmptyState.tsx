import type { ReactNode } from "react";

// Boş liste/ekran (spec §6.4): simge + başlık + açıklama + isteğe bağlı
// eylem. Simge süs; ekran okuyucuya gizli. Başlık bir başlık ETİKETİ değil
// düz metin: sayfadaki başlık sırasını bozmasın.

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center${className ? ` ${className}` : ""}`}>
      {icon && (
        <div aria-hidden="true" className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-control text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-white">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
