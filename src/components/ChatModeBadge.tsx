import { overallAttention } from "../lib/chatAttention";
import { useChatStore } from "../stores/chatStore";
import AttentionDot from "./AttentionDot";

// Başka moddayken (Logon, Terminal) "Sohbet" sekmesindeki nokta: sohbetlerin
// en acil hâli. Ayrı bir "arka plan işleri" şeridi yerine bu — satırdaki
// noktalar zaten var, eksik olan başka moddan bakınca onları görmekti.
//
// `ChatStoreProvider`'ın İÇİNDE çizilmeli; App'in kendisi sağlayıcının
// dışında, bu yüzden düğüm olarak `Sidebar`'a veriliyor.
export default function ChatModeBadge() {
  const { sessions } = useChatStore();
  const attention = overallAttention(sessions);
  return attention ? <AttentionDot attention={attention} /> : null;
}
