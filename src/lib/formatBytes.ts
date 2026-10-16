/** Byte sayısını insan okur kısa biçime çevirir: "1,2 MB", "450 KB" gibi. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log2(bytes) / 10), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}
