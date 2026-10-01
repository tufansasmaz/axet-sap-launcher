import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Globe, Lock } from "lucide-react";
import type { GlobalSkillList, GlobalSkillRow, SkillSet } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Kümeler EKRANDA da küme: kullanıcının modeli (2026-09-08) *"kesiştiği
 * noktada iki rolün de kullandığı skiller, sol küme modül, sağ küme teknik"*.
 * Sıra da bu: önce kesişim, sonra iki taraf.
 */
const SETS: SkillSet[] = ["shared", "module", "technical", "sandbox"];

/**
 * Global yetenek yönetimi.
 *
 * Rolün SAP'a YAZMAYAN yetenekleri `%LOCALAPPDATA%\axet-code\skills`'e
 * kuruluyor; oradan her sohbet görüyor — SAP projesi olmayan düz sohbetler
 * dahil. Bu pencere o listeyi gösteriyor ve tek tek kapatmaya izin veriyor.
 *
 * İKİ SINIR, ikisi de kullanıcının isteği:
 *   1. **Rol dışındaki yetenek AÇILAMAZ** (*"o rol dışındaki skiller aktif
 *      edilemeyecek"*). Satır görünüyor ama anahtarı kilitli — gizleseydik
 *      "bu yetenek niye bende yok" sorusu cevapsız kalırdı; göstermek, rol
 *      sınırını listenin kendisine yazıyor.
 *   2. **Rol semantiği değişmiyor** (*"rol bazlı skillerin geçerliliği eski
 *      süreçteki gibi işlemeye devam edicek"*). Bu ekran rolün verdiğini
 *      KISABİLİR, genişletemez. Ana süreç de aynı kuralı ayrıca uyguluyor
 *      (`skills:global:set`), yani kilit yalnızca görselde değil.
 *
 * SAP'a yazan dört yetenek burada YOK: onlar sistem başına kuruluyor, çünkü
 * PRD kapısı sistemin önem derecesine bakıyor. Global'e taşınsalardı o kapı
 * anlamını yitirirdi.
 *
 * Çerçeve ortak `Modal` (2026-10-01): Escape ve odak artık Modal tarafından
 * yönetiliyor. `initialFocus="dialog"` — bu kutuda belirgin bir ilk alan yok.
 */
export default function GlobalSkillsModal({ open, onClose }: Props) {
  const t = useT();
  const [list, setList] = useState<GlobalSkillList | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    void window.api
      .listGlobalSkills()
      .then((next) => {
        setList(next);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const toggle = async (row: GlobalSkillRow) => {
    if (!row.inRole || pending) return;
    setPending(row.name);
    try {
      setList(await window.api.setGlobalSkill(row.name, !row.enabled));
      setFailed(false);
    } catch {
      setFailed(true);
      load();
    } finally {
      setPending(null);
    }
  };

  const rows = list?.rows ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      initialFocus="dialog"
      icon={<Globe size={18} />}
      title={t("globalSkills.title")}
      subtitle={<span title={list?.root}>{t("globalSkills.subtitle")}</span>}
    >
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-400">{t("globalSkills.intro")}</p>

        {failed && (
          <p className="flex items-start gap-1.5 text-xs text-[var(--status-danger-text)]">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            {t("globalSkills.error")}
          </p>
        )}

        {!list?.profile && <p className="text-xs text-slate-500">{t("globalSkills.noRole")}</p>}

        {list?.profile &&
          SETS.map((set) => {
            const group = rows.filter((row) => row.set === set);
            if (group.length === 0) return null;
            return (
              <div key={set} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">{t(`globalSkills.set.${set}`)}</span>
                  <span className="text-2xs text-slate-500">
                    {t("globalSkills.setCount", { count: String(group.length) })}
                  </span>
                </div>
                <p className="text-2xs leading-relaxed text-slate-500">{t(`globalSkills.setDesc.${set}`)}</p>
                <ul className="space-y-1 rounded-lg border border-line/50 bg-control/30 p-2">
                  {group.map((row) => (
                    <li key={row.name} className="flex items-center justify-between gap-2">
                      <span
                        className={`min-w-0 truncate font-mono text-2xs ${
                          row.inRole ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {row.name}
                      </span>
                      {row.inRole ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.enabled}
                          aria-label={row.name}
                          disabled={pending !== null}
                          onClick={() => void toggle(row)}
                          className={`relative h-4 w-7 shrink-0 cursor-pointer rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            row.enabled
                              ? "border-accent-500/60 bg-accent-500/70"
                              : "border-line/60 bg-control"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 size-2.5 rounded-full bg-white transition-all ${
                              row.enabled ? "left-3.5" : "left-0.5"
                            }`}
                          />
                        </button>
                      ) : (
                        <span
                          title={t("globalSkills.outOfRole")}
                          className="flex shrink-0 items-center gap-1 text-2xs text-slate-500"
                        >
                          <Lock size={10} />
                          {t("globalSkills.locked")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </Modal>
  );
}
