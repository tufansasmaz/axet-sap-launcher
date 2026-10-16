// Sohbet geçmişinin diske yazılma gecikmesi.
//
// Düz debounce (600 ms) akış sırasında HİÇ tetiklenmiyordu: parçalar ~50 ms
// aralıkla geliyor ve her biri zamanlayıcıyı sıfırlıyordu. Uzun bir turda
// uygulama kapanırsa kullanıcının o turdaki kendi mesajı bile diske inmemiş
// oluyordu. Üst sınır: ilk kirlenmeden en geç 10 sn sonra yazılıyor.

export const SAVE_DEBOUNCE_MS = 600;
export const SAVE_MAX_WAIT_MS = 10_000;

export function saveDelay(now: number, dirtySince: number): number {
  return Math.max(0, Math.min(SAVE_DEBOUNCE_MS, dirtySince + SAVE_MAX_WAIT_MS - now));
}
