// Vite'ın import.meta.glob'u (projede vite/client tipleri yüklü değil).
interface ImportMeta {
  glob<T = unknown>(pattern: string, options?: { eager?: boolean; query?: string; import?: string }): Record<string, T>;
}
