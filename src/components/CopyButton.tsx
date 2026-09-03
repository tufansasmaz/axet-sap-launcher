import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useT } from "../i18n";

export default function CopyButton({ value, title }: { value: string; title?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard erişimi başarısız olsa da sessizce geç, kritik değil
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title ?? t("copyButton.copy")}
      className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-base-700 hover:text-slate-200"
    >
      {copied ? <Check size={13} className="text-[var(--status-success-text)]" /> : <Copy size={13} />}
    </button>
  );
}
