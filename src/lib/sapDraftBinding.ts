// Taslak sohbetin bağlantısı, aktif SAP bağlamı değişince (kararlilik-2 R8a).
//
// Bağlanınca boş taslağa o sistemin klasörü (`newBinding`) iliştiriliyor.
// Kullanıcı rozetten bağlantıyı kesince bu iliştirme taslakta kalıyordu: ekran
// "bağlı değil" derken yazılan ilk mesaj kesilmiş sistemin klasöründe, onun
// `.conn_adt`'siyle çalışıyordu. Arayüz durumu ile gerçek durum ayrışıyordu.

export interface DraftBinding {
  cwd: string;
  label: string;
}

function sameDir(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/[\\/]+$/, "").replace(/\//g, "\\").toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Önceki bağlı sistemin klasörüne iliştirilmiş taslak bağlantı, o sistem artık
 * aktif değilse düşürülür (`null`). Başka her durumda olduğu gibi döner —
 * elle seçilmiş bir klasör ya da yeni bağlantının kendi iliştirmesi
 * korunuyor.
 */
export function draftBindingAfterSapChange(
  previousSapDir: string | null,
  nextSapDir: string | null,
  binding: DraftBinding | null
): DraftBinding | null {
  if (!binding || !previousSapDir) return binding;
  if (!sameDir(binding.cwd, previousSapDir)) return binding;
  if (nextSapDir && sameDir(nextSapDir, previousSapDir)) return binding;
  return null;
}
