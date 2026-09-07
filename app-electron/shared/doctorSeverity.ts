// Teşhis satırlarından kenar çubuğundaki tek bir noktaya inen karar.
//
// Doctor'ın var olma sebebi "bir şey bozulduğunu ÖNCEDEN söylemek"ti, ama
// ekranı açmayan kullanıcı için hiçbir şey söylemiyordu. Nokta o boşluğu
// kapatıyor.
//
// Neden yalnızca `fail`: `warn` satırlarının çoğu normal bir başlangıç
// durumu — ADT sunucusu henüz bağlanılmadığı için kapalı, RFC köprüsü
// gerekmediği için kapalı. Bunlara da nokta koysaydık uygulama her açılışta
// uyarı gösterirdi ve nokta bir hafta içinde görünmez olurdu. `fail` ise
// kullanıcının GERÇEKTEN yapacak bir şeyi olduğu hâller: Python yok, pip
// paketleri eksik, SAP skill paketi bulunamıyor.

import type { DoctorRow } from "./types";

/** Kenar çubuğu noktası gösterilmeli mi. */
export function hasDoctorFault(rows: readonly DoctorRow[]): boolean {
  return rows.some((row) => row.status === "fail");
}

/** Noktanın ipucu metnine giren, arızalı satır kimlikleri. */
export function doctorFaultIds(rows: readonly DoctorRow[]): string[] {
  return rows.filter((row) => row.status === "fail").map((row) => row.id);
}
