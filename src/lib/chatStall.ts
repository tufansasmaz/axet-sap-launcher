// Sohbette asılı kalan tur (kararlilik-2 R8c).
//
// Kullanıcı: "İş verdiğimde adımlarda takılı kaldığı oluyor, ilerlemiyor,
// saatlerce bekletiyor."
//
// Ölçüm (kod): başsız tur, axet-code'dan 5 dk hiçbir belirti (metin, araç,
// veritabanı ilerlemesi) gelmezse `stalled` olayını yayıyor ve bunu 5 dk'da
// bir tekrarlıyor; süreci ancak 6 SAATLİK üst sınırda öldürüyor
// (axetHeadless.ts `silenceMs`/`hardCapMs`). Ekranda yalnız "Hâlâ düşünüyor
// (N dk)" yazıyordu: ne durdurma önerisi ne üst süre. Tur bu arada kuyruğu da
// kilitliyor (sıradaki mesaj tur bitene kadar gitmiyor).
//
// Kural: ilk sessizlik olayında kart ("takıldı olabilir — Durdur / Yeniden
// dene"); 30 dk belirtisiz kalan tur kendiliğinden durduruluyor ve cevap
// "Devam et" ile sürdürülebilir hâlde bırakılıyor. Soru kartı (askUser) ve
// SAP onayı beklemesi bu sayıma girmiyor: onlar kullanıcıyı bekliyor, `stalled`
// yaymıyor.

/** Belirtisiz geçen bu kadar dakikadan sonra tur kendiliğinden durdurulur. */
export const STALL_AUTO_STOP_MIN = 30;

export type StallAction = "none" | "card" | "autoStop";

export function stallAction(activity: string | null | undefined, stalledMinutes: number): StallAction {
  if (activity !== "stalled" || !(stalledMinutes > 0)) return "none";
  return stalledMinutes >= STALL_AUTO_STOP_MIN ? "autoStop" : "card";
}
