// ADT sunucularının araç sayısı — TEK KAYNAK (kucukler-3 madde 3).
//
// Ölçüm: `py adt_gated_server.py --list-tools` ve SQL + dump kapıları açık
// `py adt_readonly_server.py --list-tools` (SAP'siz). tests/skillToolCounts.test.ts
// gerçek sunucularla karşılaştırıyor; Python testi (test_gated_flow.py) aynı
// sayıyı bekliyor. Beceri notları (SKILL.md) sayı yazmıyor: "yazma araç seti" /
// "salt okunur araç seti". Kit senkronunda sayı değişirse yalnız burası değişir.

/** DEV'de açılan onaylı yazma sunucusu (adt_gated_server.py). */
export const ADT_WRITE_TOOL_COUNT = 68;
/** Diğer her durumda açılan salt okunur sarmalayıcı (SQL + dump okuma açık). */
export const ADT_READONLY_TOOL_COUNT = 30;
