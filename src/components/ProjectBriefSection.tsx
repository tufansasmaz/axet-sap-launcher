import { useCallback, useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import type { ProjectBrief } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { btn } from "../ui/buttons";

/**
 * Ayarlar'daki "Proje reçetesi" bölümü.
 *
 * Sistem bilgisi bağlanırken zaten keşfediliyor; buradaki alanların hiçbiri
 * keşfedilemez — "bu işin amacı ne", "hangi pakete yazılacak", "kime
 * sorulacak". Ajan bunları bilmediğinde susmuyor, tahmin ediyor.
 *
 * Bu yüzden boş alan formdan da dosyadan da DÜŞMÜYOR: `sap-context.md`'ye
 * `[BİLİNMİYOR]` olarak yazılıyor. Yazılmayan alan ajan için yok hükmünde;
 * `[BİLİNMİYOR]` yazan alan ise açık bir talimat — burayı sor.
 */

/** `savedAt` bir alan değil, damga — formda yeri yok. */
type BriefField = Exclude<keyof ProjectBrief, "savedAt">;

/** Uzun serbest metin isteyen alanlar; diğerleri tek satır. */
const MULTILINE = new Set<BriefField>(["goal", "outOfScope", "constraints"]);

const FIELDS: BriefField[] = [
  "customer",
  "modules",
  "packageName",
  "transport",
  "goal",
  "outOfScope",
  "contact",
  "constraints"
];

export default function ProjectBriefSection({ projectDir }: { projectDir: string | null }) {
  const t = useT();
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!projectDir) {
      setBrief(null);
      return;
    }
    void window.api
      .getProjectBrief(projectDir)
      .then((loaded) => {
        setBrief(loaded);
        setSavedAt(loaded.savedAt);
      })
      .catch(() => setBrief(null));
  }, [projectDir]);

  useEffect(load, [load]);

  const save = async () => {
    if (!projectDir || !brief || saving) return;
    setSaving(true);
    try {
      const result = await window.api.saveProjectBrief(projectDir, brief);
      setBrief(result);
      setSavedAt(result.savedAt);
    } finally {
      setSaving(false);
    }
  };

  if (!projectDir) return <p className="text-xs text-slate-500">{t("projectBrief.noProject")}</p>;
  if (!brief) return <p className="text-xs text-slate-500">{t("common.loading")}</p>;

  const emptyCount = FIELDS.filter((field) => brief[field].trim().length === 0).length;

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">{t("projectBrief.hint")}</p>

      <div className="space-y-2.5">
        {FIELDS.map((field) => (
          <div key={field}>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {t(`projectBrief.label.${field}`)}
            </label>
            {MULTILINE.has(field) ? (
              <textarea
                rows={2}
                value={brief[field]}
                onChange={(e) => setBrief({ ...brief, [field]: e.target.value })}
                placeholder={t("projectBrief.placeholder")}
                className="w-full resize-y rounded-md border border-line bg-control px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent-500/60"
              />
            ) : (
              <input
                type="text"
                value={brief[field]}
                onChange={(e) => setBrief({ ...brief, [field]: e.target.value })}
                placeholder={t("projectBrief.placeholder")}
                className="h-8 w-full rounded-md border border-line bg-control px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent-500/60"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-xs text-slate-500">
          {emptyCount > 0 ? t("projectBrief.emptyCount", { count: emptyCount }) : t("projectBrief.allFilled")}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`${btn("neutral", "sm")} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {savedAt && !saving ? <Check size={12} /> : <Save size={12} />}
          {t("projectBrief.save")}
        </button>
      </div>
    </div>
  );
}
