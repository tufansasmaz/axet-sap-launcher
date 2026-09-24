// SAP DEV yazma onayı — main süreci, renderer ve adt_gated_server.py arasındaki sözleşme.
// Yalnızca tip: renderer da import ediyor, çalışma zamanı kodu buraya girmez.
// Alan adları Python tarafının gönderdiği JSON ile birebir aynı (Türkçe, ASCII).

export type ToolClass = "SERBEST" | "TRANSPORT_ONAYLI" | "HER_SEFER";
export type WorkMode = "dogrudan" | "yerel";
export type Choice = "reddet" | "bu_seferlik" | "oturum";
export type Decision = "izinli" | "bekliyor" | "reddedildi" | "sure_doldu" | "yerel_mod" | "mod_secilmedi";
export type DecisionSource = "pencere" | "oturum_izni" | "teslim_izni" | "ust_onay";

export interface Quality {
  kritik: number;
  yuksek: number;
  orta: number;
  dusuk: number;
}

export interface FactObject {
  ad: string;
  /** R3TR tipi: CLAS, PROG, FUNC, DDLS ... */
  tip: string;
  paket: string;
  yeni: boolean;
  /** CRLF→LF normalize edilmiş kaynak dosyalarının sha256'ları. */
  kaynak_sha256?: string[];
  /** Sistemdeki aktif sürümle birleşik fark (kırpılmış olabilir). Günlüğe YAZILMAZ. */
  fark?: string;
  fark_kirpildi?: boolean;
  kalite?: Quality;
}

export interface TransportInfo {
  aciklama: string;
  sahip: string;
  durum: string;
}

export interface WriteFact {
  arac: string;
  sinif: "TRANSPORT_ONAYLI" | "HER_SEFER";
  nesneler: FactObject[];
  /** Nesnesiz araçlarda (transport/paket açma) ve teslimde hedef paket. */
  paket?: string;
  transport: string;
  transport_bilgi: TransportInfo | null;
  /** Aracın bağlanmış argümanları + kaynak hash'lerinin kanonik JSON sha256'sı. */
  arg_hash: string;
  teslim?: { yontem: string; zip_sha256?: string };
  abapgit?: { script: string; zip_sha256?: string; paket?: string };
  ust_onay?: string;
}

export interface SessionView {
  id: string;
  sid: string;
  client: string;
  user: string;
  mode: WorkMode | null;
}

export interface ApprovalView {
  id: string;
  sessionId: string;
  createdAt: number;
  fact: WriteFact;
  canSession: boolean;
  mode: WorkMode | null;
  sid: string;
  client: string;
  user: string;
}

export interface SapWriteState {
  sessions: SessionView[];
  pending: ApprovalView[];
}
