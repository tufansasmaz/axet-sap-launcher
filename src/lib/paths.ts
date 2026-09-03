export function quotePathIfNeeded(p: string): string {
  return /\s/.test(p) ? `"${p}"` : p;
}
