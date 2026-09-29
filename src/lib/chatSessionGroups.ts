import type { ChatProject } from "../../app-electron/shared/types";

// Sohbet kenar çubuğunun sıralama, arama ve gruplama hesabı. `AxetCodeHome`'dan
// çıkarıldı (grafit, spec §5.1): kenar çubuğu ayrı bir bileşene taşınırken
// hesabın ekranla birlikte değil kendi başına test edilebilmesi için.

// Bölüm başlıklarının kendi anahtarları. `cwd` hiçbir zaman bu biçimde
// olamayacağı için sistem gruplarıyla çakışmıyorlar.
export const GENERAL_GROUP_KEY = "__general__";
export const SAP_SECTION_KEY = "__sap__";
export const PROJECTS_SECTION_KEY = "__projects__";

// Gruplamanın bir sohbetten okuduğu alanlar. `ChatSession`'ın tamamı değil:
// testler süren tur, model, taslak gibi alanları kurmak zorunda kalmasın.
export interface GroupableSession {
  id: string;
  title: string;
  messages: readonly { content: string }[];
  updatedAt: number;
  cwd: string | null;
  sapLabel: string | null;
  projectId: string | null;
  keepInGeneral: boolean;
}

export interface ProjectGroup<S> {
  key: string;
  project: ChatProject;
  sessions: S[];
}

export interface SapGroup<S> {
  key: string;
  cwd: string;
  label: string;
  sessions: S[];
}

export interface SessionGroups<S> {
  projectGroups: ProjectGroup<S>[];
  sapGroups: SapGroup<S>[];
  general: S[];
}

// Türkçe küçük harf: "İ" → "i", "I" → "ı". Varsayılan yerel ayarla
// "İSTANBUL" araması "istanbul"u bulmazdı.
export function normalizeSessionQuery(query: string): string {
  return query.trim().toLocaleLowerCase("tr");
}

export function orderSessions<S extends GroupableSession>(sessions: readonly S[]): S[] {
  return sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function filterSessions<S extends GroupableSession>(ordered: S[], normalizedQuery: string): S[] {
  if (!normalizedQuery) return ordered;
  return ordered.filter(
    (s) =>
      s.title.toLocaleLowerCase("tr").includes(normalizedQuery) ||
      // Başlık ilk mesajdan türetildiği için başlık araması tek başına
      // yetmiyor — sohbetin İÇİNDE geçen bir terimle de bulunabilmeli.
      s.messages.some((m) => m.content.toLocaleLowerCase("tr").includes(normalizedQuery))
  );
}

export function groupSessions<S extends GroupableSession>(
  visible: readonly S[],
  projects: readonly ChatProject[],
  searching: boolean
): SessionGroups<S> {
  const byProject = new Map<string, S[]>();
  const sap = new Map<string, SapGroup<S>>();
  const general: S[] = [];
  // Silinmiş bir projeye işaret eden `projectId` YOK SAYILIYOR: sohbet
  // görünmez bir grubun içinde kaybolmak yerine sistemine/geneline düşüyor.
  const knownProjects = new Set(projects.map((p) => p.id));
  for (const s of visible) {
    // Proje, `cwd`'yi YENİYOR: proje bilinçli bir seçim, `cwd` ise
    // bağlantının yan ürünü. Bir SAP sohbeti bir projeye taşındıysa
    // kullanıcı onu orada görmek istiyor demektir.
    if (s.projectId && knownProjects.has(s.projectId)) {
      const list = byProject.get(s.projectId);
      if (list) list.push(s);
      else byProject.set(s.projectId, [s]);
      continue;
    }
    const cwd = s.cwd ?? "";
    // `keepInGeneral`: elle "Yeni sohbet" ile açılmış sohbet. `cwd`'si olsa
    // bile sistem grubuna girmiyor — bkz. shared/types.ts.
    if (!cwd || s.keepInGeneral) {
      general.push(s);
      continue;
    }
    const key = cwd.toLowerCase();
    const existing = sap.get(key);
    if (existing) existing.sessions.push(s);
    else
      sap.set(key, {
        key,
        // Anahtar küçük harfe çevrilmiş; grubun "+" düğmesinin yeni sohbete
        // vereceği klasör yolu ise ÖZGÜN hâliyle gerekiyor.
        cwd,
        label: s.sapLabel || cwd.split(/[\\/]/).filter(Boolean).pop() || cwd,
        sessions: [s]
      });
  }
  // `visible` zaten en yeniden eskiye sıralı, dolayısıyla her grubun
  // ilk üyesi o grubun en tazesi — gruplar da ona göre sıralanıyor.
  const sapGroups = Array.from(sap.values()).sort((a, b) => b.sessions[0].updatedAt - a.sessions[0].updatedAt);
  // Projeler SOHBETSİZ de listeleniyor (SAP gruplarının aksine): yeni
  // kurulan bir proje boş doğuyor ve görünmeseydi kullanıcı onu kurduğunu
  // sanıp içine sohbet açamazdı. Ama ARAMA sırasında boşlar gizleniyor —
  // aramanın sonucu, eşleşmesi olmayan başlıklarla dolmamalı.
  const projectGroups = projects
    .map((project) => ({ key: project.id, project, sessions: byProject.get(project.id) ?? [] }))
    .filter((g) => !searching || g.sessions.length > 0)
    .sort(
      (a, b) => (b.sessions[0]?.updatedAt ?? b.project.createdAt) - (a.sessions[0]?.updatedAt ?? a.project.createdAt)
    );
  return { projectGroups, sapGroups, general };
}

// Etkin sohbetin görünmesi için açık olması gereken grupların anahtarları,
// dıştan içe. Kural `groupSessions`'la aynı: bilinmeyen proje genele ya da
// SAP grubuna düşüyor.
export function activeGroupKeys(session: GroupableSession, projects: readonly ChatProject[]): string[] {
  if (session.projectId && projects.some((p) => p.id === session.projectId)) {
    return [PROJECTS_SECTION_KEY, session.projectId];
  }
  if (!session.cwd || session.keepInGeneral) return [GENERAL_GROUP_KEY];
  return [SAP_SECTION_KEY, session.cwd.toLowerCase()];
}
