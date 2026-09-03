import { useEffect, useState } from "react";
import { Copy, Loader2, MousePointer2, Table2 } from "lucide-react";
import { useT } from "../../i18n";
import { EmptyState, GHOST_ICON_BUTTON, PANEL_TITLE, TOOL_BUTTON } from "./ui";
import type { GuiScriptComponentDetail } from "../../../app-electron/shared/types";

// Eleman denetçisi — özellikler + aksiyonlar + grid verisi.
//
// Eskiden 5 alan gösteriliyordu (id/tip/ad/tooltip/değiştirilebilir). Artık
// köprünün okuyabildiği HER özellik geliyor (bkz. bridge'teki
// DETAIL_PROPERTIES): geometri, MaxLength, IconName, RowCount/CurrentRow,
// MessageType… Geometri ayrıca canlı ekran görüntüsü üzerine çerçeve çizmeyi
// mümkün kılan şey (bkz. ScreenViewer.tsx).
//
// Özellikler İKİ GRUBA ayrılıyor: "temel" (her zaman görünür) ve "tümü"
// (katlanır). Bir GuiTextField'de 30 satır özellik listelemek, aranan üç
// alanı bulmayı zorlaştırıyordu.

const PRIMARY_PROPS = ["changeable", "modified", "required", "maxLength", "iconName", "highlighted", "visible"] as const;
const GEOMETRY_PROPS = ["left", "top", "width", "height", "screenLeft", "screenTop", "charLeft", "charTop", "charWidth", "charHeight"] as const;

interface Props {
  node: GuiScriptComponentDetail | null;
  state: "loading" | "error" | null;
  busy: boolean;
  onAction: (
    action: "setText" | "press" | "select" | "doubleClick" | "selectContextMenuItem",
    value?: string,
    extra?: Record<string, unknown>,
  ) => void;
}

function formatValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export default function ElementInspector({ node, state, busy, onAction }: Props) {
  const t = useT();
  const [textValue, setTextValue] = useState("");
  const [contextMenuValue, setContextMenuValue] = useState("");
  // VARSAYILAN "metin": işlev kodu ("&XXL") ekranda hiçbir yerde yazmıyor,
  // menüde görünen metin ise yazıyor. Kullanıcının okuyabildiği şeyi
  // varsayılan yapmak, tahmin ettirmekten iyi (bkz. köprüdeki
  // `_apply_context_menu`).
  const [contextMenuBy, setContextMenuBy] = useState<"text" | "code" | "position">("text");
  const [showAllProps, setShowAllProps] = useState(false);

  useEffect(() => {
    setTextValue(node?.text ?? "");
  }, [node?.id, node?.text]);

  if (state === "loading") {
    return <EmptyState icon={<Loader2 size={20} className="animate-spin" />} text={t("sapGuiScripting.treeLoading")} />;
  }
  if (state === "error") {
    return <EmptyState icon={<MousePointer2 size={20} />} text={t("sapGuiScripting.treeError")} />;
  }
  if (!node) {
    return <EmptyState icon={<MousePointer2 size={20} />} text={t("sapGuiScripting.detailEmpty")} />;
  }

  const props = node.properties ?? {};
  const primary = PRIMARY_PROPS.filter((key) => props[key] !== undefined);
  const geometry = GEOMETRY_PROPS.filter((key) => props[key] !== undefined);
  const rest = Object.keys(props)
    .filter((key) => !PRIMARY_PROPS.includes(key as never) && !GEOMETRY_PROPS.includes(key as never))
    .filter((key) => key !== "tooltip" && key !== "subType")
    .sort();

  const row = (label: string, value: string, mono = false) => (
    <div key={label} className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="shrink-0 text-[11px] text-slate-500">{label}</span>
      <span className={`min-w-0 truncate text-[11px] text-slate-200 ${mono ? "font-mono" : ""}`} title={value}>
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-mono text-[11px] text-accent-400">{node.type || t("sapGuiScripting.unknown")}</div>
            <div className="truncate text-xs font-medium text-slate-100">{node.name || node.text || "—"}</div>
          </div>
          <button onClick={() => navigator.clipboard.writeText(node.id)} title={t("sapGuiScripting.copyId")} className={GHOST_ICON_BUTTON}>
            <Copy size={12} />
          </button>
        </div>
        <div className="mt-1 break-all rounded-md bg-base-850 px-2 py-1 font-mono text-[10px] leading-relaxed text-slate-400">
          {node.id}
        </div>
      </div>

      <div className="space-y-0 border-t border-base-800 pt-2">
        {row(t("sapGuiScripting.fieldText"), node.text ?? "")}
        {row(t("sapGuiScripting.fieldTooltip"), node.tooltip)}
        {node.subType ? row(t("sapGuiScripting.fieldSubType"), node.subType) : null}
        {primary.map((key) => row(key, formatValue(props[key]!)))}
      </div>

      {geometry.length > 0 && (
        <div className="space-y-0 border-t border-base-800 pt-2">
          <div className={`pb-1 ${PANEL_TITLE}`}>
            {t("sapGuiScripting.geometryTitle")}
          </div>
          <div className="grid grid-cols-2 gap-x-3">{geometry.map((key) => row(key, formatValue(props[key]!), true))}</div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="border-t border-base-800 pt-2">
          <button
            onClick={() => setShowAllProps((v) => !v)}
            className={`cursor-pointer hover:text-slate-300 ${PANEL_TITLE}`}
          >
            {showAllProps ? t("sapGuiScripting.hideAllProps") : t("sapGuiScripting.showAllProps", { count: rest.length })}
          </button>
          {showAllProps && <div className="mt-1 space-y-0">{rest.map((key) => row(key, formatValue(props[key]!), true))}</div>}
        </div>
      )}

      {/* Aksiyonlar kendi kutusunda: özellik listesiyle aynı düzlemde
          duruyorlardı ve "okunacak bilgi" ile "basılacak düğme" ayırt
          edilmiyordu. */}
      <div className="space-y-2 rounded-md border border-base-800 bg-base-850/60 p-2.5">
        <div className={PANEL_TITLE}>{t("sapGuiScripting.actionsTitle")}</div>
        <div className="flex gap-1.5">
          <input
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={t("sapGuiScripting.setTextPlaceholder")}
            className="h-7 min-w-0 flex-1 rounded-md border border-base-700 bg-base-800 px-2 text-[11px] text-slate-100 outline-none focus:border-accent-500"
          />
          <button disabled={busy} onClick={() => onAction("setText", textValue)} className={TOOL_BUTTON}>
            {t("sapGuiScripting.setText")}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["press", "select", "doubleClick"] as const).map((action) => (
            <button key={action} disabled={busy} onClick={() => onAction(action)} className={TOOL_BUTTON}>
              {t(action === "press" ? "sapGuiScripting.press" : action === "select" ? "sapGuiScripting.select" : "sapGuiScripting.doubleClick")}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <select
            value={contextMenuBy}
            onChange={(e) => setContextMenuBy(e.target.value as typeof contextMenuBy)}
            className="h-7 shrink-0 cursor-pointer rounded-md border border-base-700 bg-base-800 px-1 text-[11px] text-slate-200 outline-none focus:border-accent-500"
          >
            <option value="text">{t("sapGuiScripting.contextMenuByText")}</option>
            <option value="code">{t("sapGuiScripting.contextMenuByCode")}</option>
            <option value="position">{t("sapGuiScripting.contextMenuByPosition")}</option>
          </select>
          <input
            value={contextMenuValue}
            onChange={(e) => setContextMenuValue(e.target.value)}
            placeholder={t(
              contextMenuBy === "text"
                ? "sapGuiScripting.contextMenuPlaceholderText"
                : contextMenuBy === "code"
                  ? "sapGuiScripting.contextMenuPlaceholder"
                  : "sapGuiScripting.contextMenuPlaceholderPosition",
            )}
            className="h-7 min-w-0 flex-1 rounded-md border border-base-700 bg-base-800 px-2 text-[11px] text-slate-100 outline-none focus:border-accent-500"
          />
          <button
            disabled={busy}
            onClick={() => onAction("selectContextMenuItem", contextMenuValue, { by: contextMenuBy })}
            className={TOOL_BUTTON}
          >
            {t("sapGuiScripting.go")}
          </button>
        </div>
      </div>

      {node.grid && (
        <div className="space-y-1.5 border-t border-base-800 pt-3">
          <div className={`flex items-center gap-1.5 ${PANEL_TITLE}`}>
            <Table2 size={12} />
            {t("sapGuiScripting.gridTitle")}
            {/* Başlıkta SAP'nin bildirdiği gerçek satır×sütun yazıyor; aşağıdaki
                tablo bunun kırpılmış hâli olabilir (bkz. köprüdeki
                GRID_CELL_LIMIT_*). Kırpma varsa alttaki not söylüyor. */}
            <span className="font-normal normal-case text-slate-500">
              {node.grid.kind === "alv" ? "ALV" : "Table Control"} · {node.grid.rowCount}
              {node.grid.columnCount ? ` × ${node.grid.columnCount}` : ""}
            </span>
          </div>
          {node.grid.rows.length === 0 ? (
            <div className="text-xs text-slate-500">{t("sapGuiScripting.gridEmpty")}</div>
          ) : (
            <>
              <div className="max-h-64 overflow-auto rounded-md border border-base-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-base-800 text-slate-400">
                    <tr>
                      {node.grid.columns.map((col) => (
                        <th key={col} className="whitespace-nowrap px-2 py-1 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* HÜCREYE ÇİFT TIKLAMA = SAP'de o hücreye çift tıklamak.
                        Yukarıdaki "doubleClick" düğmesi bir grid'de tek başına
                        işe yaramıyor: SAP satır+sütun istiyor ve denetçide
                        bunları verecek başka bir yer yok. Tablo zaten burada
                        duruyorken doğru yer burası — tıklanan hücre satırı da
                        sütunu da kendisi söylüyor. */}
                    {node.grid.rows.map((gridRow, i) => (
                      <tr key={i} className="border-t border-base-800/70 text-slate-300">
                        {node.grid!.columns.map((col) => (
                          <td
                            key={col}
                            onDoubleClick={() =>
                              !busy && onAction("doubleClick", undefined, { row: i, column: col })
                            }
                            title={t("sapGuiScripting.gridCellHint")}
                            className="cursor-pointer whitespace-nowrap px-2 py-1 hover:bg-base-800">
                            {String(gridRow[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {node.grid.truncated && (
                <div className="text-[10px] text-slate-500">{t("sapGuiScripting.gridTruncated", { count: node.grid.rows.length })}</div>
              )}
              {node.grid.columnsTruncated && (
                <div className="text-[10px] text-slate-500">
                  {t("sapGuiScripting.gridColsTruncated", { count: node.grid.columns.length })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
