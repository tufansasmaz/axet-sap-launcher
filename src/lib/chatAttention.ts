// Bir sohbetin kullanıcıdan ne beklediği — kenar çubuğundaki satır noktası
// ve başka moddayken "Sohbet" sekmesindeki nokta buradan okunuyor.
//
// Öncelik sırası bilerek böyle: soru soran ajan TURU DURDURMUŞ, cevap
// gelmeden hiçbir şey ilerlemiyor; bakılmamış cevap bekleyebilir ama
// kaçırılmamalı; süren iş yalnızca bilgi.
export type ChatAttention = "asking" | "unseen" | "working";

// `ChatSession`'ın yalnızca bu üç alanı. Tür oradan alınmıyor: chatTypes
// bir .tsx'e (ChatBubble) bağlı, bu dosya ise .ts testlerinden de okunuyor.
interface AttentionFields {
  pending: boolean;
  pendingAsk: unknown;
  unseen: boolean;
}

export function sessionAttention(session: AttentionFields): ChatAttention | null {
  if (session.pending && session.pendingAsk) return "asking";
  if (session.pending) return "working";
  if (session.unseen) return "unseen";
  return null;
}

const RANK: Record<ChatAttention, number> = { asking: 3, unseen: 2, working: 1 };

export function overallAttention(sessions: AttentionFields[]): ChatAttention | null {
  let best: ChatAttention | null = null;
  for (const session of sessions) {
    const attention = sessionAttention(session);
    if (attention && (!best || RANK[attention] > RANK[best])) best = attention;
  }
  return best;
}
