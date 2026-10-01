import { createContext, useContext, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import {
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
  Terminal,
  Circle
} from "lucide-react";
import type { AppConfig, AppPalette, UpdateStatus } from "../../app-electron/shared/types";
import { PALETTES, THEME_SURFACES } from "../../app-electron/shared/themeSurfaces";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { useT } from "../i18n";
import type { TranslateFn } from "../i18n";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";
import { Toggle } from "../ui/Toggle";
import { btn, iconBtn, tintBtn } from "../ui/buttons";
import SettingsNav from "./settings/SettingsNav";
import { SETTINGS_SECTIONS, EDITED_FIELDS, dirtySections, type SettingsSectionId } from "./settings/settingsSections";

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

// `Field`'ın görünen başlığının kimliği. `SegmentedControl` grubunu bu
// başlıkla adlandırıyor: ekran okuyucu "Tema, grup" diyor, yalnızca "Koyu,
// düğme, basılı" değil. Bağlam, çünkü başlık ile kontrol aynı `Field`'da ve
// kimliği elle taşımak her kullanımda ayrı ayrı unutulabilirdi.
const FieldLabelContext = createContext<string | undefined>(undefined);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const labelId = useId();
  return (
    <div>
      <label id={labelId} className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
      </label>
      <FieldLabelContext.Provider value={labelId}>{children}</FieldLabelContext.Provider>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Ortak `Input`, adını üstteki `Field` başlığından alıyor. Elle çizilmiş
// girdilerin adı yoktu: ekran okuyucu yalnızca "düzenleme alanı" diyordu.
function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const labelledBy = useContext(FieldLabelContext);
  return <Input aria-labelledby={labelledBy} {...props} />;
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
            type="button"
            onClick={() => window.api.downloadUpdate()}
            className={tintBtn("accent", "sm")}
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
            type="button"
            onClick={() => window.api.installUpdate()}
            // Soluk vurgu, dolgulu değil: pencerenin tek birincil düğmesi
            // alttaki Kaydet (bkz. buttons.ts). Sabit `bg-emerald-600` de
            // kullanılmıyor — satırın metni zaten "başarı" tonunda, düğmenin de
            // yeşil olması ikisini birbirine karıştırıyordu.
            className={tintBtn("accent", "sm")}
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
  const [section, setSection] = useState<SettingsSectionId>("general");
  const baseId = useId();

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
  // Sıfırlama ÇİZİM SIRASINDA, efektte değil: efekt ilk çizimden SONRA
  // çalışıyordu ve yeniden açılışın ilk karesinde bir an eski form
  // görünüyordu. React çizim sırasındaki `setState`'i ekrana basmadan önce
  // yeniden çizerek uyguluyor.
  //
  // Açıkken gelen yeni `config` ise formu SIFIRLAMIYOR, `mergeIntoForm` ile
  // katılıyor (bkz. orada). `synced.config` formun en son eşitlendiği
  // `config`: düzenlenmiş alanı düzenlenmemişten ayırmanın ölçüsü.
  //
  // Escape ve ilk odak ortak `Modal`'da. İlk odak pencerenin kendisine
  // (`initialFocus="dialog"`): gövdenin ilk öğesi dil seçimi ve oraya inen
  // odakta Enter dili değiştiriyordu.
  const [synced, setSynced] = useState<{ open: boolean; config: AppConfig | null }>({ open: false, config: null });
  if (open !== synced.open || (open && config !== synced.config)) {
    setSynced({ open, config });
    if (open && !synced.open) {
      setForm(config);
      setSection("general");
    } else if (open && config) {
      const previous = synced.config;
      setForm((current) => (current && previous ? mergeIntoForm(current, previous, config) : config));
    }
  }

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
  const dirty = dirtySections(form, config);
  const isDirty = dirty.size > 0;

  if (!open || !form) return null;

  // Formu değiştiren her yer buradan geçiyor. İşlevsel güncelleme: klasör
  // seçici `await`'ten sonra yazıyor ve o arada yapılan düzenleme, formun
  // eski kopyası yayılınca sessizce siliniyordu.
  const update = (patch: Partial<AppConfig>) =>
    setForm((current) => (current ? { ...current, ...patch } : current));

  const pickFolder = async () => {
    const dir = await window.api.pickFolder();
    if (dir) update({ projectsBaseDir: dir });
  };

  const pickAxetWorkspaceDir = async () => {
    const dir = await window.api.pickFolder();
    if (dir) update({ axetWorkspaceDir: dir });
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
  const current = SETTINGS_SECTIONS.find((s) => s.id === section) ?? SETTINGS_SECTIONS[0];
  const CARD = "space-y-4 rounded-xl border border-line bg-card p-5";

  const browseButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      title={t("settingsModal.browseFolder")}
      aria-label={t("settingsModal.browseFolder")}
      className={iconBtn("neutral", "md")}
    >
      <FolderOpen size={16} />
    </button>
  );

  // Yalnız seçili bölüm çiziliyor (spec §2): uzun kaydırma yok, bölümler
  // landmark değil. Form tek; bölüm değişince düzenleme kaybolmuyor.
  const renderSection = (): ReactNode => {
    switch (section) {
      case "general":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.languageLabel")}>
              <SegmentedControl
                value={form.language}
                onChange={(language) => update({ language })}
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
                  <FieldInput
                    value={form.projectsBaseDir}
                    onChange={(e) => update({ projectsBaseDir: e.target.value })}
                    className="pl-9"
                  />
                </div>
                {browseButton(pickFolder)}
              </div>
            </Field>
          </div>
        );
      case "appearance":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.paletteLabel")}>
              <PalettePicker
                value={form.palette}
                label={t("settingsModal.paletteLabel")}
                names={{
                  ntt: { name: t("settingsModal.paletteNtt"), description: t("settingsModal.paletteNttDesc") },
                  indigo: { name: t("settingsModal.paletteIndigo"), description: t("settingsModal.paletteIndigoDesc") },
                  amber: { name: t("settingsModal.paletteAmber"), description: t("settingsModal.paletteAmberDesc") },
                  graphite: { name: t("settingsModal.paletteGraphite"), description: t("settingsModal.paletteGraphiteDesc") }
                }}
                onChange={(palette) => update({ palette })}
              />
            </Field>
            <Field label={t("settingsModal.themeLabel")}>
              <SegmentedControl
                value={form.theme}
                onChange={(theme) => update({ theme })}
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
                onChange={(chatFontSize) => update({ chatFontSize })}
                options={[
                  { key: "sm", label: t("settingsModal.chatFontSizeSm") },
                  { key: "md", label: t("settingsModal.chatFontSizeMd") },
                  { key: "lg", label: t("settingsModal.chatFontSizeLg") }
                ]}
              />
            </Field>
          </div>
        );
      case "axetCode":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.axetWorkspaceDirLabel")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <FieldInput
                    value={form.axetWorkspaceDir}
                    onChange={(e) => update({ axetWorkspaceDir: e.target.value })}
                    className="pl-9"
                  />
                </div>
                {browseButton(pickAxetWorkspaceDir)}
              </div>
            </Field>
            {/* Bağlayıcı kipi ("Sohbette uygulama bağlantıları") BURADAN
                KALDIRILDI (2026-09-04). Aynı şeyi iki ayrı ekrandan ifade
                etmek — burada "kapalı", Uygulama Bağlantıları'nda yeşil tik —
                kullanıcının "bağlandı diyor ama olmuyor" şikayetinin
                kaynağıydı. Açık/kapalı artık Uygulama Bağlantıları
                ekranındaki Bağlan/Bağlantıyı Kes butonu, ne zaman
                yükleneceği de yine orada; tek yer, tek doğruluk kaynağı. */}
            {/* Yetenek profili, proje reçetesi ve Ortam Hazırlık BURADAN
                KALDIRILDI (2026-09-07) — hepsi kenar çubuğundaki "Hazırlık"
                ekranına taşındı (bkz. ReadinessHome.tsx). Buraya bir kısayol
                bile konmadı: aynı şeyi iki yerden göstermek, bağlayıcı kipinde
                yaşanan "iki ekran iki farklı şey söylüyor" sorununun aynısını
                üretirdi (yukarıdaki nota bakınız). `skillProfile` bu yüzden
                EDITED_FIELDS listesinden de çıkarıldı: burada düzenlenmeyen bir
                alanın Kaydet'e basıldığında form değerine geri yazılması,
                Hazırlık ekranında yapılan seçimi sessizce geri alırdı. */}
          </div>
        );
      case "chatAppearance":
        // Sohbet ekranının okuma konforu. Terminal/dizin ayarlarından AYRI
        // bir bölüm: burası "nasıl çalışsın" değil "nasıl görünsün" — ikisi
        // aynı kutuda olsaydı görünüm ayarları teknik ayarların arasında
        // kaybolurdu.
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.chatDensityLabel")} hint={t("settingsModal.chatDensityHint")}>
              <SegmentedControl
                value={form.chatDensity}
                onChange={(chatDensity) => update({ chatDensity })}
                options={[
                  { key: "comfortable", label: t("settingsModal.chatDensityComfortable") },
                  { key: "compact", label: t("settingsModal.chatDensityCompact") }
                ]}
              />
            </Field>
          </div>
        );
      case "terminal":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.axetCommandLabel")}>
              <div className="relative">
                <Terminal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <FieldInput
                  value={form.axetCommand}
                  onChange={(e) => update({ axetCommand: e.target.value })}
                  className="pl-9"
                />
              </div>
            </Field>
            <Field label={t("settingsModal.shellLabel")} hint={t("settingsModal.shellHelper")}>
              <SegmentedControl
                value={form.terminal}
                onChange={(terminal) => update({ terminal })}
                options={[
                  { key: "cmd", label: t("settingsModal.shellCmd") },
                  { key: "powershell", label: t("settingsModal.shellPowershell") }
                ]}
              />
            </Field>
          </div>
        );
      case "advanced":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.landscapePathLabel")}>
              <FieldInput
                value={form.landscapePathOverride ?? ""}
                onChange={(e) => update({ landscapePathOverride: e.target.value || null })}
                placeholder="C:\Users\...\AppData\Roaming\SAP\Common\SAPUILandscape.xml"
                aria-invalid={pathCheck.landscape === false || undefined}
              />
              {pathCheck.landscape === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
            <Field label={t("settingsModal.sapShcutPathLabel")}>
              <FieldInput
                value={form.sapShcutPathOverride ?? ""}
                onChange={(e) => update({ sapShcutPathOverride: e.target.value || null })}
                placeholder="C:\Program Files (x86)\SAP\FrontEnd\SapGui\sapshcut.exe"
                aria-invalid={pathCheck.sapShcut === false || undefined}
              />
              {pathCheck.sapShcut === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
          </div>
        );
      case "manual":
        return (
          <div className={CARD}>
            <p className="text-xs text-slate-500">{t("settingsModal.manualSystemsHelper")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
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
                type="button"
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
          </div>
        );
      case "updates":
        return (
          <div className={CARD}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-200">{t("settingsModal.autoCheckLabel")}</span>
              <Toggle
                checked={form.autoCheckUpdates}
                onChange={(autoCheckUpdates) => update({ autoCheckUpdates })}
                label={t("settingsModal.autoCheckLabel")}
              />
            </div>
            <button type="button" onClick={handleCheckForUpdates} className={btn("neutral", "md", "w-full gap-2")}>
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
          </div>
        );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dirty={isDirty}
      initialFocus="dialog"
      title={t("settingsModal.title")}
      subtitle={t("settingsModal.subtitle")}
      icon={<SlidersHorizontal size={18} />}
      size="xl"
      bare
      footer={
        <>
          {isDirty && (
            <span className="mr-auto flex items-center gap-1.5 text-xs text-[var(--status-warning-text)]">
              <Circle size={6} className="fill-current" />
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
      <SettingsNav
        value={section}
        onChange={setSection}
        dirty={dirty}
        idPrefix={baseId}
        footer={t("settingsModal.versionText", { version: appVersion || "…" })}
      />
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${section}`}
        className="min-h-0 flex-1 overflow-y-auto p-6"
      >
        <h3 className="text-base font-semibold text-white">{t(current.titleKey)}</h3>
        <p className="mt-1 text-sm text-slate-400">{t(current.descKey)}</p>
        <div className="mt-5 space-y-4">{renderSection()}</div>
      </div>
    </Modal>
  );
}
