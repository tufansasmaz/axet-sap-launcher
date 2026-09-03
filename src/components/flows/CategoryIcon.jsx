import {
  Zap,
  Globe,
  Puzzle,
  Bot,
  Upload,
  ShieldCheck,
  Monitor,
  Database,
  Mail,
  KeyRound,
  Pin,
  FileSpreadsheet,
  Wrench,
  AlertTriangle,
  Link2,
  Square
} from "lucide-react";

// aXet.flows canvas'ındaki node kategori rozetleri (FlowNode başlığı,
// NodePalette) artık uygulamanın GENELİNDE kullanılan tek ikon dilini
// (lucide-react) paylaşıyor — kaynak projedeki emoji rozetler (⚡🌐🧩🤖...)
// buradan taşındı. `nodeCatalog.js` React'tan BAĞIMSIZ (saf JS) kalması
// gerektiği için bu eşleme (kategori -> React ikon bileşeni) burada,
// component katmanında tutuluyor — nodeCatalog.js sadece kategori
// isimlerini/etiketlerini tanımlar, görsel temsili BURASI belirler.
const CATEGORY_ICON_COMPONENTS = {
  input: Zap,
  network: Globe,
  function: Puzzle,
  ai: Bot,
  output: Upload,
  audit: ShieldCheck,
  ui: Monitor,
  db: Database,
  msgraph: Mail,
  credentials: KeyRound,
  session: Pin,
  "excel-utils": FileSpreadsheet,
  utils: Wrench,
  deprecated: AlertTriangle,
  subflow: Link2,
  other: Square
};

export default function CategoryIcon({ category, size = 12 }) {
  const Icon = CATEGORY_ICON_COMPONENTS[category] || Square;
  return <Icon size={size} strokeWidth={2} />;
}
