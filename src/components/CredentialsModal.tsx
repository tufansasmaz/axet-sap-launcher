import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AlertTriangle, ChevronDown, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import type { SapConnectOpen, SapConnectTarget, SapService } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

interface Props {
  open: boolean;
  service: SapService | null;
  connecting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  /** `target`: bağlantı başarılı olunca nerede açılacağı (Sohbet / ajan / kabuk). */
  onSubmit: (username: string, password: string, client: string, target: SapConnectTarget) => void;
  /** Ayardaki "SAP bağlanınca" seçimi; yoksa bugünkü davranış (Sohbet). */
  openPreference?: SapConnectOpen;
  loadDefaults: (serviceUuid: string) => Promise<{ username: string; password: string; client: string }>;
}

export default function CredentialsModal({
  open,
  service,
  connecting,
  errorMessage,
  onClose,
  onSubmit,
  openPreference = "chat",
  loadDefaults
}: Props) {
  const t = useT();
  const formId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [client, setClient] = useState("");
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems = useRef<(HTMLButtonElement | null)[]>([]);
  const splitRef = useRef<HTMLDivElement | null>(null);

  // Menü açılınca odak ilk seçenekte (klavyeyle gelen kullanıcı için).
  useEffect(() => {
    if (!menuOpen) return;
    menuItems.current[0]?.focus();
    // Dışarı tıklanınca kapanıyor.
    const onDown = (e: MouseEvent) => {
      if (!splitRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!open) return;
    setShowPassword(false);
  }, [open, service?.uuid]);

  useEffect(() => {
    if (!open || !service) return;
    setLoadingDefaults(true);
    loadDefaults(service.uuid)
      .then((defaults) => {
        setUsername(defaults.username);
        setPassword(defaults.password);
        setClient(defaults.client);
      })
      .finally(() => setLoadingDefaults(false));
  }, [open, service?.uuid]);

  if (!open || !service) return null;

  const isCloud = service.type === "BTP/CLOUD";
  const disabled = loadingDefaults || connecting;
  const canSubmit =
    username.trim().length > 0 && password.length > 0 && (isCloud || client.trim().length > 0) && !connecting;

  const address = service.manualAdtUrl ?? `${service.host ?? "?"}${service.port ? `:${service.port}` : ""}`;

  // basicAuth.ts'teki nonAsciiChars ile aynı kural. Ana süreç modülü renderer'a
  // import EDİLEMİYOR (Buffer), bu yüzden iki satırı burada tekrar ediyoruz.
  const passwordNonAscii = [...new Set([...password].filter((ch) => ch.codePointAt(0)! > 127))];

  // Varsayılan hedef ayardan; "ask" bir hedef değil — Bağlan menüyü açıyor.
  const defaultTarget: SapConnectTarget | null =
    openPreference === "terminal" ? "agent" : openPreference === "ask" ? null : "chat";

  const submitTo = (target: SapConnectTarget) => {
    setMenuOpen(false);
    if (!canSubmit) return;
    onSubmit(username.trim(), password, client.trim(), target);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (defaultTarget) submitTo(defaultTarget);
    else setMenuOpen(true);
  };

  const TARGETS: { key: SapConnectTarget; label: string }[] = [
    { key: "chat", label: t("credentialsModal.openChat") },
    { key: "agent", label: t("credentialsModal.openAgent") },
    { key: "shell", label: t("credentialsModal.openShell") }
  ];

  // Menü klavyesi: oklar gezer, Escape YALNIZ menüyü kapatır (pencere değil).
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems.current.filter((el): el is HTMLButtonElement => !!el);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setMenuOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      // Doğrulama sürerken kapanmıyor: sonuç (hata satırı ya da sertifika
      // sorusu) bu pencereye dönüyor.
      closeDisabled={connecting}
      size="md"
      icon={<KeyRound size={18} />}
      title={t("credentialsModal.title")}
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">
            {service.name}
            {service.systemId && ` (${service.systemId})`}
          </span>
          {(service.manualAdtUrl || service.host) && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate font-mono">{address}</span>
            </>
          )}
        </span>
      }
      footer={
        <>
          {/* Nerede açılacağı görünür — "Bağlan"ın sonucunu tahmin ettirmiyor. */}
          {defaultTarget && !connecting && (
            <span className="mr-auto text-xs text-slate-500">
              {t(defaultTarget === "agent" ? "credentialsModal.opensAgent" : "credentialsModal.opensChat")}
            </span>
          )}
          <ModalCancelButton />
          {/* Bölünmüş düğme: ana parça ayardaki yere bağlanıyor, ok tek
              seferlik başka bir yer seçtiriyor (2026-10-19). */}
          <div ref={splitRef} className="relative flex items-stretch">
            <Button
              type="submit"
              form={formId}
              variant="primary"
              disabled={!canSubmit}
              className="rounded-r-none"
            >
              {connecting && <Loader2 size={14} className="animate-spin" />}
              {connecting
                ? t("credentialsModal.verifying")
                : defaultTarget
                  ? t("credentialsModal.connect")
                  : t("credentialsModal.connectAsk")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!canSubmit}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t("credentialsModal.openElsewhere")}
              title={t("credentialsModal.openElsewhere")}
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-l-none border-l border-black/20 px-2"
            >
              <ChevronDown size={14} />
            </Button>
            {menuOpen && (
              <div
                role="menu"
                // Escape önce menünün (Modal bu işarete bakıp pencereyi kapatmıyor).
                data-escape-owner
                aria-label={t("credentialsModal.openElsewhere")}
                onKeyDown={onMenuKey}
                className="absolute bottom-full right-0 z-10 mb-1 min-w-[200px] rounded-lg border border-line bg-card p-1 shadow-lg"
              >
                {TARGETS.map((item, i) => (
                  <button
                    key={item.key}
                    ref={(el) => {
                      menuItems.current[i] = el;
                    }}
                    type="button"
                    role="menuitem"
                    onClick={() => submitTo(item.key)}
                    className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left text-sm text-slate-200 hover:bg-hover focus:bg-hover focus:outline-none"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t("credentialsModal.username")}>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={disabled} />
        </Field>

        <div className="flex flex-col gap-2">
          <Field label={t("credentialsModal.password")}>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                disabled={disabled}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("credentialsModal.hidePassword") : t("credentialsModal.showPassword")}
                title={showPassword ? t("credentialsModal.hidePassword") : t("credentialsModal.showPassword")}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-active hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          {/* Şifrede ASCII dışı karakter varsa DENEMEDEN uyar. Ölçüm
              (2026-09-23, DS4) böyle bir şifrenin SAP GUI'de kabul edilip
              HTTP/ADT kanalında — hem UTF-8 hem ISO-8859-9 baytlarıyla —
              401 aldığını gösterdi; kod sayfası değiştirmek çözmüyor (bkz.
              app-electron/main/basicAuth.ts). Uyarı bağlantıyı ENGELLEMİYOR:
              şifre gerçekten çalışıyor olabilir ve tek ölçüm tek sistemde. */}
          {passwordNonAscii.length > 0 && (
            <div
              className="flex items-start gap-2 rounded-lg border border-l-[3px] px-3 py-2.5 text-xs"
              style={{
                borderColor: "var(--status-warning-border)",
                backgroundColor: "var(--status-warning-bg)",
                color: "var(--status-warning-text)"
              }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{t("credentialsModal.passwordNonAscii", { chars: passwordNonAscii.join(" ") })}</span>
            </div>
          )}
        </div>

        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              {/* lang="en": "Client" Türkçe sözlükte de İngilizce kalıyor (SAP
                  terimi); ekran okuyucu onu İngilizce okusun. */}
              <span lang="en">{t("credentialsModal.client")}</span>
              {isCloud && (
                <span className="rounded-full border border-line-strong px-1.5 py-0.5 text-2xs leading-none text-slate-500">
                  {t("credentialsModal.optional").trim()}
                </span>
              )}
            </span>
          }
        >
          <Input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder={
              isCloud ? t("credentialsModal.clientPlaceholderCloud") : t("credentialsModal.clientPlaceholderOnprem")
            }
            disabled={disabled}
          />
        </Field>

        {errorMessage && (
          <div
            role="alert"
            className="animate-alert-slide-in flex items-start gap-2 rounded-lg border border-l-[3px] px-3 py-2.5 text-xs"
            style={{
              borderColor: "var(--status-danger-border)",
              backgroundColor: "var(--status-danger-bg)",
              color: "var(--status-danger-text)"
            }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
