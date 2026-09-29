import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Languages,
  TerminalSquare,
  Wrench,
  Database,
  ChevronRight,
  Terminal,
  Sparkles,
  Type,
  Palette
} from "lucide-react";
import type { AppConfig, AppPalette, UpdateStatus } from "../../app-electron/shared/types";
import { PALETTES, THEME_SURFACES } from "../../app-electron/shared/themeSurfaces";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { useT } from "../i18n";
import type { TranslateFn } from "../i18n";
import { Button } from "../ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  config: AppConfig | null;
  /** `silent`: "Ayarlar kaydedildi" bildirimi çıkmasın — kullanıcı Kaydet'e
   *  basmadığı ara kayıtlar için (ör. güncelleme kontrolünden önce
   *  `autoCheckUpdates`). */
  onSave: (partial: Partial<AppConfig>, options?: { silent?: boolean }) => Promise<void>;
  onExportManualSystems: () => Promise<void>;
  onImportManualSystems: () => Promise<void>;
}

function Section({
  icon: Icon,
  title,
  children
}: {
  icon: typeof SlidersHorizontal;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-lg border border-line bg-card/40">
      <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500/15 text-[var(--accent-soft-text)]">
          <Icon size={13} />
        </span>
        <span className="text-2xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

// `Field`'ın görünen başlığının kimliği. `SegmentedControl` grubunu bu
// başlıkla adlandırıyor: ekran okuyucu "Tema, grup" diyor, yalnızca "Koyu,
// düğme, basılı" değil. Bağlam, çünkü başlık ile kontrol aynı `Field`'da ve
// kimliği elle taşımak her kullanımda ayrı ayrı unutulabilirdi.
const FieldLabelContext = createContext<string | undefined>(undefined);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const labelId = useId();
  return (
    <div>
      <label id={labelId} className="mb-1.5 block text-2xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <FieldLabelContext.Provider value={labelId}>{children}</FieldLabelContext.Provider>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
}) {
  const labelledBy = useContext(FieldLabelContext);
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="inline-flex items-center gap-0.5 rounded-md border border-line bg-app/40 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`cursor-pointer rounded-[5px] px-3 py-1.5 text-sm font-medium transition ${
            value === option.key
              ? "bg-accent-500/25 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Vurgu seçimi: üç kart; her kartta o vurgunun iki sırası — üstte koyu, altta
// açık — ve her sırada üç renk (zemin, kart, vurgu). Renkler CSS
// değişkeninden DEĞİL `THEME_SURFACES`'ten geliyor: seçili olmayan vurgunun ve
// öbür temanın değişkenleri o an sayfada tanımlı değil. İki sıra da her zaman
// görünüyor; kullanıcı bir vurguyu seçerken iki temadaki hâlini birlikte
// görüyor (grafit spec §3.4).
//
// Klavye, radyo grubu kalıbında: Tab grupta yalnızca seçili karta duruyor, ok
// tuşları seçimi ve odağı birlikte taşıyor (sondan başa sarıyor).
function PalettePicker({
  value,
  label,
  names,
  onChange
}: {
  value: AppPalette;
  label: string;
  names: Record<AppPalette, { name: string; description: string }>;
  onChange: (palette: AppPalette) => void;
}) {
  const baseId = useId();
  const refs = useRef<Partial<Record<AppPalette, HTMLButtonElement | null>>>({});

  const move = (from: AppPalette, step: number) => {
    const next = PALETTES[(PALETTES.indexOf(from) + step + PALETTES.length) % PALETTES.length];
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-3">
      {PALETTES.map((palette) => {
        const checked = value === palette;
        return (
          <button
            key={palette}
            ref={(el) => {
              refs.current[palette] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-labelledby={`${baseId}-${palette}-name`}
            aria-describedby={`${baseId}-${palette}-desc`}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(palette)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(palette, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(palette, -1);
              }
            }}
            className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left transition ${
              checked ? "border-accent-500 bg-accent-500/10" : "border-line hover:bg-hover"
            }`}
          >
            <span className="flex flex-col gap-1" aria-hidden="true">
              {(["dark", "light"] as const).map((theme) => {
                const surface = THEME_SURFACES[palette][theme];
                return (
                  <span key={theme} data-swatch={theme} className="flex gap-1">
                    {[surface.app, surface.card, surface.accent].map((color, index) => (
                      <span
                        key={index}
                        className="h-4 flex-1 rounded-sm border border-line"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                );
              })}
            </span>
            <span id={`${baseId}-${palette}-name`} className="text-sm font-medium text-slate-100">
              {names[palette].name}
            </span>
            <span id={`${baseId}-${palette}-desc`} className="text-xs text-slate-400">
              {names[palette].description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Uyarı, hata değil: yol yanlış olsa da kaydetmek serbest. Kullanıcı henüz
// bağlanmamış bir ağ sürücüsündeki yolu bilerek girmiş olabilir.
function PathMissing({ text }: { text: string }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--status-warning-text)]">
      <AlertCircle size={12} className="mt-0.5 shrink-0" />
      {text}
    </p>
  );
}

const inputClass =
  "w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20";

function renderUpdateStatus(updateStatus: UpdateStatus, t: TranslateFn) {
  switch (updateStatus.phase) {
    case "checking":
      return (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <RefreshCw size={12} className="animate-spin" /> {t("settingsModal.checking")}
        </p>
      );
    case "available":
      return (
        <div className="flex items-center justify-between gap-2 text-xs text-accent-400">
          <span className="flex items-center gap-1.5">
            <Download size={12} /> {t("settingsModal.updateAvailable", { version: updateStatus.version ?? "" })}
          </span>
          <button
            onClick={() => window.api.downloadUpdate()}
            className="cursor-pointer rounded-md border border-accent-500/40 bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-[var(--accent-soft-text)] hover:bg-accent-500/25"
          >
            {t("settingsModal.download")}
          </button>
        </div>
      );
    case "not-available":
      return (
        <p className="flex items-center gap-1.5 text-xs text-[var(--status-success-text)]">
          <CheckCircle2 size={12} /> {t("settingsModal.upToDate")}
        </p>
      );
    case "downloading":
      return (
        <p className="flex items-center gap-1.5 text-xs text-accent-400">
          <Download size={12} /> {t("settingsModal.downloading", { percent: updateStatus.percent ?? 0 })}
        </p>
      );
    case "downloaded":
      return (
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--status-success-text)]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} /> {t("settingsModal.downloaded", { version: updateStatus.version ?? "" })}
          </span>
          <button
            onClick={() => window.api.installUpdate()}
            // Zemin `bg-emerald-600` DEĞİL artık: o, temadan bağımsız sabit bir
            // Tailwind rengiydi. Bu satırın birincil eylemi olduğu için düz
            // vurgu dolgusu kullanıyor — satırın metni zaten "başarı" tonunda,
            // düğmenin de yeşil olması ikisini birbirine karıştırıyordu.
            // `text-white` DEĞİL: o token temaya bağlı (`--ink-strong-rgb`) ve
            // açık temada koyu griye düşüyor — dolu zemin üstünde ~3.9:1
            // kontrast, AA'nın altında. `text-accent-on` her iki temada da
            // gerçek beyaz (bkz. index.css).
            className="cursor-pointer rounded-md bg-accent-500 px-2.5 py-1 text-xs font-medium text-accent-on hover:bg-accent-600"
          >
            {t("settingsModal.restartAndInstall")}
          </button>
        </div>
      );
    case "error":
      return (
        <p className="flex items-start gap-1.5 text-xs text-[var(--status-danger-text)]">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {updateStatus.message}
        </p>
      );
    default:
      return null;
  }
}

/**
 * Bu kutunun GERÇEKTEN düzenlediği alanlar — kaydederken yalnızca bunlar
 * gönderiliyor.
 *
 * NEDEN bir liste: `form`, kutu açıldığında alınmış bir `AppConfig`
 * ANLIK GÖRÜNTÜSÜ. Eskiden `onSave(form)` bu görüntünün TAMAMINI yolluyordu ve
 * `saveConfig` gelen nesneyi diskteki hâlin üstüne yaydığı için, kutu açıkken
 * ANA SÜRECİN yazdığı her alan sessizce eski değerine dönüyordu.
 *
 * Ana sürecin sahibi olduğu alanlar az değil: `connectorIntegrations`,
 * `connectorAutoDisabled` (bkz. connectorHealth.ts), `connectorEnabled`,
 * `lastCredentials`, `trustedCertificates`. Bunlar kullanıcı ayarı değil,
 * ÖLÇÜM sonucu — geri alınmaları hiçbir yerde görünmüyor, yalnızca etkisi
 * görünüyor (ölçüm 2026-09-05: kapatılmış iki bağlayıcı kendiliğinden geri
 * açıldı, tur başına ~24k jeton yeniden ~153k oldu).
 *
 * Buraya yeni bir alan eklerken listeye de eklemek gerekiyor; unutulursa alan
 * kaydedilmez — sessizce başka bir ayarı bozmasından iyidir.
 */
const EDITED_FIELDS = [
  "language",
  // Görünüm (2026-09-28). `theme` soldaki güneş/ay düğmesiyle de değişiyor;
  // Ayarlar açıkken o düğmeye ulaşılamıyor (pencere modal), yani iki yazar
  // aynı anda çalışmıyor.
  "palette",
  "theme",
  "projectsBaseDir",
  "axetWorkspaceDir",
  "chatDisplayName",
  "chatFontSize",
  "chatDensity",
  "chatSidebarOpen",
  "axetCommand",
  "terminal",
  "landscapePathOverride",
  "sapShcutPathOverride",
  "autoCheckUpdates"
] as const satisfies readonly (keyof AppConfig)[];

/**
 * Pencere AÇIKKEN gelen yeni `config`'i forma katar, kullanıcının
 * düzenlemesini ezmeden.
 *
 * NEDEN: açık pencerede `config`'i değiştiren yollar var — "Güncellemeleri
 * Şimdi Kontrol Et" `autoCheckUpdates`'i kaydediyor, "İçe aktar" listeyi
 * yeniliyor; ikisi de App'te `setConfig` demek. Eskiden form her `config`
 * değişiminde baştan dolduruluyordu ve kaydedilmemiş düzenleme sessizce
 * gidiyordu.
 *
 * Kural: `previous` (formun en son eşitlendiği `config`) ile formu farklı olan
 * alan kullanıcının düzenlemesi, o korunuyor. Geri kalan her şey — dokunulmamış
 * alanlar ve ana sürecin alanları — yeni değeri alıyor.
 */
function mergeIntoForm(form: AppConfig, previous: AppConfig, next: AppConfig): AppConfig {
  const merged: AppConfig = { ...next };
  for (const field of EDITED_FIELDS) {
    if (form[field] !== previous[field]) merged[field] = form[field] as never;
  }
  return merged;
}

export default function SettingsModal({
  open,
  onClose,
  config,
  onSave,
  onExportManualSystems,
  onImportManualSystems
}: Props) {
  const t = useT();
  const [form, setForm] = useState<AppConfig | null>(config);
  const [appVersion, setAppVersion] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ phase: "idle" });
  const [pathCheck, setPathCheck] = useState<{ landscape: boolean | null; sapShcut: boolean | null }>({
    landscape: null,
    sapShcut: null
  });

  useEffect(() => {
    if (!open) return;
    window.api.getAppVersion().then(setAppVersion);
    window.api.getLastUpdateStatus().then(setUpdateStatus);
    const unsubscribe = window.api.onUpdateStatus(setUpdateStatus);
    return unsubscribe;
  }, [open]);

  // Kutuyu her AÇILIŞTA (kapalı → açık) SIFIRLIYOR. Bileşen kapanınca `null`
  // döndürüyor ama SÖKÜLMÜYOR — state olduğu gibi duruyor. Sıfırlama olmadan,
  // kaydetmeden çıkılan bir düzenleme bir sonraki açılışta hâlâ ekranda
  // duruyordu (ve "kaydedilmemiş" uyarısını da tetiklerdi).
  //
  // Açıkken gelen yeni `config` ise formu SIFIRLAMIYOR, `mergeIntoForm` ile
  // katılıyor (bkz. orada). `syncedRef` formun en son eşitlendiği `config`:
  // düzenlenmiş alanı düzenlenmemişten ayırmanın ölçüsü.
  //
  // Escape ve ilk odak ortak `Modal`'da. İlk odak pencerenin kendisine
  // (`initialFocus="dialog"`): gövdenin ilk öğesi dil seçimi ve oraya inen
  // odakta Enter dili değiştiriyordu.
  const wasOpenRef = useRef(false);
  const syncedRef = useRef<AppConfig | null>(null);
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open) return;
    const previous = syncedRef.current;
    syncedRef.current = config;
    if (!wasOpen) {
      setForm(config);
      return;
    }
    if (!config || config === previous) return;
    setForm((current) => (current && previous ? mergeIntoForm(current, previous, config) : config));
  }, [open, config]);

  // Yazarken doğrulama, kaydederken değil — kaydettikten SONRA "bu yol yok"
  // demek geç kalmış olurdu, kutu çoktan kapanmış olur. Yazma sırasında her
  // tuşta ana sürece gitmemek için 400 ms bekliyor.
  const landscapePath = form?.landscapePathOverride ?? null;
  const sapShcutPath = form?.sapShcutPathOverride ?? null;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      window.api
        .validateOverridePaths({ landscapePath, sapShcutPath })
        .then((result) => {
          if (!cancelled) setPathCheck(result);
        })
        .catch(() => {
          // Doğrulama başarısızsa uyarı göstermiyoruz — var olmayan bir yolu
          // sessizce geçmek, var olan bir yolu yanlışlıkla kırmızı boyamaktan
          // iyi.
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, landscapePath, sapShcutPath]);

  // Yalnızca bu kutunun düzenlediği alanlar karşılaştırılıyor — ana sürecin
  // arka planda yazdığı alanlar (`connectorAutoDisabled` vb.) `form`'u
  // "kirli" göstermemeli, bkz. EDITED_FIELDS.
  const isDirty = useMemo(() => {
    if (!form || !config) return false;
    return EDITED_FIELDS.some((field) => form[field] !== config[field]);
  }, [form, config]);

  if (!open || !form) return null;

  const pickFolder = async () => {
    const dir = await window.api.pickFolder();
    if (dir) setForm({ ...form, projectsBaseDir: dir });
  };

  const pickAxetWorkspaceDir = async () => {
    const dir = await window.api.pickFolder();
    if (dir) setForm({ ...form, axetWorkspaceDir: dir });
  };

  const save = async () => {
    const patch: Partial<AppConfig> = {};
    for (const field of EDITED_FIELDS) patch[field] = form[field] as never;
    await onSave(patch);
    onClose();
  };

  // `autoCheckUpdates` kontrolden önce kaydediliyor ama SESSİZ: kullanıcı
  // Kaydet'e basmadı, "Ayarlar kaydedildi" bildirimi yanıltıcı olurdu (ve
  // formdaki öteki düzenlemeler kaydedilmiş sanılırdı).
  const handleCheckForUpdates = async () => {
    await onSave({ autoCheckUpdates: form.autoCheckUpdates }, { silent: true });
    await window.api.checkForUpdates();
  };

  const updateStatusNode = renderUpdateStatus(updateStatus, t);

  return (
    <Modal
      open
      onClose={onClose}
      dirty={isDirty}
      initialFocus="dialog"
      title={t("settingsModal.title")}
      subtitle={t("settingsModal.subtitle")}
      icon={<SlidersHorizontal size={18} />}
      width={560}
      footer={
        <>
          {isDirty && (
            <span className="mr-auto text-xs text-[var(--status-warning-text)]">
              {t("settingsModal.unsavedBadge")}
            </span>
          )}
          <ModalCancelButton />
          <Button variant="primary" onClick={() => void save()}>
            {t("common.save")}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <Section icon={Languages} title={t("settingsModal.sectionGeneral")}>
            <Field label={t("settingsModal.languageLabel")}>
              <SegmentedControl
                value={form.language}
                onChange={(lang) => setForm({ ...form, language: lang })}
                options={[
                  { key: "tr", label: t("settingsModal.languageTr") },
                  { key: "en", label: t("settingsModal.languageEn") }
                ]}
              />
            </Field>
            <Field label={t("settingsModal.projectsDirLabel")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={form.projectsBaseDir}
                    onChange={(e) => setForm({ ...form, projectsBaseDir: e.target.value })}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <button
                  onClick={pickFolder}
                  title={t("settingsModal.browseFolder")}
                  className="cursor-pointer rounded-md border border-line-strong px-3 text-slate-300 transition hover:bg-active"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </Field>
          </Section>

          <Section icon={Palette} title={t("settingsModal.sectionAppearance")}>
            <Field label={t("settingsModal.paletteLabel")}>
              <PalettePicker
                value={form.palette}
                label={t("settingsModal.paletteLabel")}
                names={{
                  ntt: {
                    name: t("settingsModal.paletteNtt"),
                    description: t("settingsModal.paletteNttDesc")
                  },
                  indigo: {
                    name: t("settingsModal.paletteIndigo"),
                    description: t("settingsModal.paletteIndigoDesc")
                  },
                  amber: {
                    name: t("settingsModal.paletteAmber"),
                    description: t("settingsModal.paletteAmberDesc")
                  }
                }}
                onChange={(palette) => setForm({ ...form, palette })}
              />
            </Field>
            <Field label={t("settingsModal.themeLabel")}>
              <SegmentedControl
                value={form.theme}
                onChange={(theme) => setForm({ ...form, theme })}
                options={[
                  { key: "dark", label: t("settingsModal.themeDark") },
                  { key: "light", label: t("settingsModal.themeLight") }
                ]}
              />
            </Field>
            {/* "Sohbet görünümü"nden buraya taşındı (spec §7): yazı boyutu
                okuma konforu, yani görünüm ayarı. İpucu kapsamını söylüyor —
                uygulamanın geri kalanı bu ayarla büyümüyor. */}
            <Field label={t("settingsModal.chatFontSizeLabel")} hint={t("settingsModal.chatFontSizeHint")}>
              <SegmentedControl
                value={form.chatFontSize}
                onChange={(size) => setForm({ ...form, chatFontSize: size })}
                options={[
                  { key: "sm", label: t("settingsModal.chatFontSizeSm") },
                  { key: "md", label: t("settingsModal.chatFontSizeMd") },
                  { key: "lg", label: t("settingsModal.chatFontSizeLg") }
                ]}
              />
            </Field>
          </Section>

          <Section icon={Sparkles} title={t("settingsModal.sectionAxetCode")}>
            <Field label={t("settingsModal.axetWorkspaceDirLabel")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={form.axetWorkspaceDir}
                    onChange={(e) => setForm({ ...form, axetWorkspaceDir: e.target.value })}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <button
                  onClick={pickAxetWorkspaceDir}
                  title={t("settingsModal.browseFolder")}
                  className="cursor-pointer rounded-md border border-line-strong px-3 text-slate-300 transition hover:bg-active"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </Field>
            {/* Bağlayıcı kipi ("Sohbette uygulama bağlantıları") BURADAN
                KALDIRILDI (2026-09-04). Aynı şeyi iki ayrı ekrandan ifade
                etmek — burada "kapalı", Uygulama Bağlantıları'nda yeşil tik —
                kullanıcının "bağlandı diyor ama olmuyor" şikayetinin
                kaynağıydı. Açık/kapalı artık Uygulama Bağlantıları
                ekranındaki Bağlan/Bağlantıyı Kes butonu, ne zaman
                yükleneceği de yine orada; tek yer, tek doğruluk kaynağı. */}
          </Section>

          {/* Yetenek profili, proje reçetesi ve Ortam Hazırlık BURADAN
              KALDIRILDI (2026-09-07) — hepsi kenar çubuğundaki "Hazırlık"
              ekranına taşındı (bkz. ReadinessHome.tsx). Buraya bir kısayol
              bile konmadı: aynı şeyi iki yerden göstermek, bağlayıcı kipinde
              yaşanan "iki ekran iki farklı şey söylüyor" sorununun aynısını
              üretirdi (yukarıdaki nota bakınız). `skillProfile` bu yüzden
              EDITED_FIELDS listesinden de çıkarıldı: burada düzenlenmeyen bir
              alanın Kaydet'e basıldığında form değerine geri yazılması,
              Hazırlık ekranında yapılan seçimi sessizce geri alırdı. */}

          {/* Sohbet ekranının okuma konforu. Terminal/dizin ayarlarından AYRI
              bir bölüm: burası "nasıl çalışsın" değil "nasıl görünsün" — ikisi
              aynı kutuda olsaydı görünüm ayarları teknik ayarların arasında
              kaybolurdu. */}
          <Section icon={Type} title={t("settingsModal.sectionChatAppearance")}>
            <Field label={t("settingsModal.chatDisplayNameLabel")} hint={t("settingsModal.chatDisplayNameHint")}>
              <input
                value={form.chatDisplayName}
                onChange={(e) => setForm({ ...form, chatDisplayName: e.target.value })}
                placeholder={t("settingsModal.chatDisplayNamePlaceholder")}
                className={inputClass}
              />
            </Field>
            <Field label={t("settingsModal.chatDensityLabel")} hint={t("settingsModal.chatDensityHint")}>
              <SegmentedControl
                value={form.chatDensity}
                onChange={(density) => setForm({ ...form, chatDensity: density })}
                options={[
                  { key: "comfortable", label: t("settingsModal.chatDensityComfortable") },
                  { key: "compact", label: t("settingsModal.chatDensityCompact") }
                ]}
              />
            </Field>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.chatSidebarOpen}
                onChange={(e) => setForm({ ...form, chatSidebarOpen: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-accent-500"
              />
              {t("settingsModal.chatSidebarOpenLabel")}
            </label>
          </Section>

          <Section icon={TerminalSquare} title={t("settingsModal.sectionTerminal")}>
            <Field label={t("settingsModal.axetCommandLabel")}>
              <div className="relative">
                <Terminal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={form.axetCommand}
                  onChange={(e) => setForm({ ...form, axetCommand: e.target.value })}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>
            <Field label={t("settingsModal.shellLabel")} hint={t("settingsModal.shellHelper")}>
              <SegmentedControl
                value={form.terminal}
                onChange={(shell) => setForm({ ...form, terminal: shell })}
                options={[
                  { key: "cmd", label: t("settingsModal.shellCmd") },
                  { key: "powershell", label: t("settingsModal.shellPowershell") }
                ]}
              />
            </Field>
          </Section>

          <Section icon={Wrench} title={t("settingsModal.sectionAdvanced")}>
            <Field label={t("settingsModal.landscapePathLabel")}>
              <input
                value={form.landscapePathOverride ?? ""}
                onChange={(e) => setForm({ ...form, landscapePathOverride: e.target.value || null })}
                placeholder="C:\Users\...\AppData\Roaming\SAP\Common\SAPUILandscape.xml"
                className={`${inputClass} ${pathCheck.landscape === false ? "border-[var(--status-danger-border)]" : ""}`}
              />
              {pathCheck.landscape === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
            <Field label={t("settingsModal.sapShcutPathLabel")}>
              <input
                value={form.sapShcutPathOverride ?? ""}
                onChange={(e) => setForm({ ...form, sapShcutPathOverride: e.target.value || null })}
                placeholder="C:\Program Files (x86)\SAP\FrontEnd\SapGui\sapshcut.exe"
                className={`${inputClass} ${pathCheck.sapShcut === false ? "border-[var(--status-danger-border)]" : ""}`}
              />
              {pathCheck.sapShcut === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
          </Section>

          <Section icon={Database} title={t("settingsModal.sectionManual")}>
            <p className="text-xs text-slate-500">{t("settingsModal.manualSystemsHelper")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={onExportManualSystems}
                className="group flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-line bg-app/30 p-3 text-left transition-colors hover:border-line-strong hover:bg-hover/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-control text-slate-400 group-hover:text-slate-200">
                  <Download size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200">{t("settingsModal.exportJson")}</div>
                  <div className="truncate text-xs text-slate-500">{t("settingsModal.exportJsonDesc")}</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </button>
              <button
                onClick={onImportManualSystems}
                className="group flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-line bg-app/30 p-3 text-left transition-colors hover:border-line-strong hover:bg-hover/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-control text-slate-400 group-hover:text-slate-200">
                  <Upload size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200">{t("settingsModal.importJson")}</div>
                  <div className="truncate text-xs text-slate-500">{t("settingsModal.importJsonDesc")}</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </button>
            </div>
          </Section>

          <Section icon={Download} title={t("settingsModal.sectionUpdates")}>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.autoCheckUpdates}
                  onChange={(e) => setForm({ ...form, autoCheckUpdates: e.target.checked })}
                  className="cursor-pointer accent-accent-500"
                />
                {t("settingsModal.autoCheckLabel")}
              </label>
              <span className="text-xs text-slate-500">
                {t("settingsModal.versionText", { version: appVersion || "…" })}
              </span>
            </div>

            <button
              onClick={handleCheckForUpdates}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm text-slate-300 transition hover:bg-active"
            >
              <RefreshCw size={14} />
              {t("settingsModal.checkNow")}
            </button>

            {updateStatusNode && (
              <div className="rounded-md border border-line/60 bg-app/30 px-3 py-2">{updateStatusNode}</div>
            )}
            {/* axet-code'un KENDİ güncelleme duyurusu buraya konmuyor — sohbet
                AÇILIŞ ekranında gösteriliyor (bkz. ChatSessionPane). Kullanıcı
                kararı (2026-09-07): Ayarlar'ı kimse güncelleme haberi için
                açmıyor. Aynı şeyi iki yerde göstermek de gereksiz. */}
          </Section>
        </div>
    </Modal>
  );
}
