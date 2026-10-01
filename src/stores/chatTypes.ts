// Sohbet ekranı, sohbet kenar çubuğu ve `ChatStore`'un ortak türleri.
// `AxetCodeHome.tsx`'ten çıkarıldı (grafit, spec §5.1): üç dosya aynı türü
// kullanıyor, türün sahibi bileşenlerden biri olursa diğerleri ona bağımlı
// kalıyordu.

import type {
  AxetChatActivity,
  AxetChatActivityPhase,
  AxetModelEntry,
  AxetTodo,
  ChatAttachment,
  SapService
} from "../../app-electron/shared/types";
import type { ChatMessage } from "../components/ChatBubble";
import type { QueuedPrompt } from "../lib/chatQueue";

// Bir düzenlemenin geri alınması için gereken HER ŞEY: kesilen mesajlar ve
// composer'ın o andaki hâli. Yalnızca mesajları saklamak yetmezdi — geri
// alındığında düzenlenmek üzere kutuya konan metnin de gitmesi gerekiyor,
// yoksa aynı mesaj hem listede hem composer'da durur.
export interface EditUndo {
  messages: ChatMessage[];
  draft: string;
  attachments: ChatAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: AxetModelEntry | null;
  draft: string;
  // Henüz gönderilmemiş ekler (bkz. shared/types.ts `ChatAttachment`).
  attachments: ChatAttachment[];
  pending: boolean;
  requestId: string | null;
  // Cevap beklenirken alt sürecin bildirdiği son aşama (bkz. axetChat.ts).
  // Diske YAZILMIYOR: bekleyen bir istek yeniden başlatmayı atlatmıyor.
  activity: AxetChatActivityPhase | null;
  // Bu turda çağrılan araçlar, ÇAĞRI SIRASIYLA — terminaldeki gibi bir
  // döküm. Sonuçlar geldikçe aynı satırın üzerine yazılıyor (eşleşme
  // `callId` ile), yeni satır açılmıyor.
  activitySteps: AxetChatActivity[];
  // Kaç dakikadır axet-code'dan hiçbir belirti gelmediği. `0` = akış normal.
  // Yalnızca `stalled` aşamasında dolu; ilk belirtide sıfırlanıyor.
  stalledMinutes: number;
  // Ajanın ŞU AN sorduğu soru (`ask_user`). Doluyken tur, kullanıcı bir
  // seçenek seçene kadar DURUYOR — cevap TUI'deki soru kutusuna tuş olarak
  // gidiyor (bkz. axetChatTui.ts `answerTuiQuestion`).
  //
  // Diske YAZILMIYOR: bekleyen bir soru, süreciyle birlikte yaşıyor. Uygulama
  // kapanınca cevaplanacak bir kutu kalmıyor, kayıtlı bir soru ise sonsuza
  // kadar tıklanabilir ama etkisiz bir düğme olurdu.
  pendingAsk: AxetChatActivity | null;
  // Ajanın KENDİ planı (axet-code'un `todos` aracı). Bizim ürettiğimiz bir
  // şey değil, oturum veritabanından okunuyor — bkz. axetSessionDb.ts
  // `sessionTodos`. Tur bittiğinde SİLİNMİYOR: plan bir sonraki turda da
  // geçerli, ajan onu güncelleyene kadar duruyor.
  todos: AxetTodo[];
  // Bağlam doluluğu — son isteğin jeton sayısı ve pencerenin büyüklüğü.
  // `0` = henüz ölçüm yok.
  contextTokens: number;
  contextLimit: number;
  // "Mesajı düzenle"nin kestiği kuyruk. Düzenleme, o mesajdan SONRASINI
  // siliyor ve bu geri ALINAMIYORDU: tek bir kalem tıklamasıyla yarım sohbet,
  // uyarısız, kalıcı olarak gidiyordu (diske de öyle yazılıyor). Kesme
  // davranışı doğru — düzeltilmiş soruya ait olmayan cevaplar bağlamda
  // kalmamalı — eksik olan geri dönüş yoluydu.
  //
  // Diske YAZILMIYOR: geri alma o anki düzenlemeye ait, uygulama kapanınca
  // anlamı kalmaz.
  editUndo: EditUndo | null;
  // "Durdur"a basıldı ama tur DURMADI — ajan arkada üretmeye devam ediyor
  // (bkz. axetChatTui.ts `cancelTui`, shared/types.ts `AxetChatCancelVerdict`).
  //
  // Bu bayrak iptalden 1–4 saniye SONRA geliyor: esc yazılıyor, sonra
  // axet-code'un veritabanına bakılıp turun gerçekten kesilip kesilmediği
  // doğrulanıyor. Eskiden doğrulamanın sonucu yalnızca günlüğe yazılıyordu,
  // yani kullanıcı "durdurdum" sanırken jeton harcanmaya devam ediyordu.
  //
  // Diske YAZILMIYOR: uygulama kapanınca pty de ölüyor, yani arkada süren
  // bir tur kalmıyor — kaydedilmiş bir uyarı sonsuza kadar yalan söylerdi.
  cancelStuck: boolean;
  // Cevap sürerken yazılan, tur bitince kendiliğinden gidecek mesaj (bkz.
  // lib/chatQueue.ts). `null` = sırada bir şey yok.
  //
  // Ayrı alan olarak diske YAZILMIYOR — kaydederken taslağa katılıyor:
  // uygulama tur ortasında kapanırsa yeniden açılışta tur yok, kendiliğinden
  // gönderilecek bir şey de yok; ama yazılan metin kaybolmamalı.
  queued: QueuedPrompt | null;
  createdAt: number;
  // Listedeki sıralama bunun üzerinden — sohbetler artık diskte kalıcı
  // olduğu için "en son dokunulan üstte" olmadan liste hızla kullanılamaz
  // hâle geliyor (en eski sohbet en üstte kalırdı).
  updatedAt: number;
  // Bu sohbetin bağlı olduğu SAP proje klasörü (bkz. shared/types.ts
  // `StoredChatSession.cwd`). `null` = genel çalışma alanı.
  cwd: string | null;
  sapLabel: string | null;
  // Kullanıcının elle kurduğu projeye aidiyet (bkz. shared/types.ts
  // `ChatProject`). `cwd`'den BAĞIMSIZ: bir SAP sohbeti de bir projeye
  // konabilir, o zaman kenar çubuğunda proje altında görünüyor.
  projectId: string | null;
  // "SAP sohbetleri" altına değil "Sohbetler" altına düşsün (bkz.
  // shared/types.ts `StoredChatSession.keepInGeneral`). `cwd` dolu olsa bile.
  keepInGeneral: boolean;
}

export interface RecentEntry {
  path: string[];
  service: SapService;
  itemUuid: string;
  connectedAt: string;
}

export const TITLE_MAX_LEN = 42;

export function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LEN) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LEN)}…`;
}
