import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play, Link2, AlertTriangle } from 'lucide-react';
import { catalogEntry, infoLineFor } from '../../flows/nodeCatalog';
import CategoryIcon from './CategoryIcon';

const SUBFLOW_COLOR = '#c084e8';
const HTTP_IN_TYPES = new Set(['axetflows-http-in', 'http in']);

// Referans görseldeki "START → INPUT → QUERY → END" düzenine göre: node artık
// kutulu/başlıklı bir kart DEĞİL, ortalanmış YUVARLAK-KÖŞELİ bir KARE (kategori
// renginde, beyaz ikon) + altında küçük bir etiket — node paletindeki rozet
// (`NodeIconBadge`, `.node-palette-item-badge`) ile AYNI şekil dili (kullanıcı
// isteği: "node ikonları şekli düzenlensin" — önceki tur tam daireydi, palet
// rozetlerinden görsel olarak kopuktu). Kart çerçevesi sadece SEÇİLİYKEN
// belirir (yumuşak bir vurgu halkası) — seçili değilken node'lar canvas'ta
// "yüzen" bir ikon+etiket ikilisi gibi görünür.
//
// Handle konumları artık YÜZDE değil SABİT piksel — ikonun dikey merkezine
// (CIRCLE_TOP + CIRCLE_SIZE/2) sabitlenmiş; birden fazla çıkışı olan node'lar
// (switch/function gibi) bu bandın içinde eşit aralıklarla dağıtılır, tek
// çıkışlı node'lar (çoğunluk) doğrudan ikonun ortasından çıkar. Boyut 44'ten
// 36'ya düşürüldü (kullanıcı isteği: "biraz daha küçük olsun").
const CIRCLE_SIZE = 36;
const CIRCLE_TOP = 6;
const CIRCLE_CENTER = CIRCLE_TOP + CIRCLE_SIZE / 2;

function handleTopFor(index, total) {
  if (total <= 1) return CIRCLE_CENTER;
  const band = CIRCLE_SIZE - 10;
  const start = CIRCLE_TOP + 5;
  return start + (band * index) / (total - 1);
}

export default function FlowNode({ data }) {
  const { raw, selected, subflowName, runtimeStatus, onTriggerInject, onTestEndpoint, validationIssues } = data;
  const isSubflowInstance = typeof raw.type === 'string' && raw.type.startsWith('subflow:');
  const entry = catalogEntry(raw.type);
  const realOutputs = Array.isArray(raw.wires) ? raw.wires.length : entry.outputs === 'dynamic' ? 1 : entry.outputs || 0;
  // aXet.flows Designer'da bir node canvas'a eklendigi anda solundan ve
  // sagindan hemen bir baglanti noktasi (handle) cikar - node'un gercek
  // input/output sayisi 0 olsa da (orn. debug, http response, inject)
  // kullanici gorsel olarak baglanti kurabilecegini hemen gorur. Bu yuzden
  // her node en az 1 sol (target) + 1 sag (source) handle gosterir; catalog
  // birden fazla cikis tanimliyorsa (switch/function/exec gibi) hepsi
  // gosterilir.
  const outputs = Math.max(realOutputs, 1);
  const circleColor = isSubflowInstance ? SUBFLOW_COLOR : entry.color;
  const primaryLabel = isSubflowInstance ? subflowName || 'Subflow' : raw.name || entry.label || raw.type;
  const secondaryLabel = isSubflowInstance
    ? `subflow (${subflowName || 'silinmis?'})`
    : raw.name
      ? entry.label || raw.type
      : null;
  const infoLine = isSubflowInstance ? null : infoLineFor(raw);

  const isInject = raw.type === 'inject';
  const isHttpIn = HTTP_IN_TYPES.has(raw.type);
  const isDeployed = Boolean(runtimeStatus?.running);

  // GERCEK Node-RED editor'unun "required field bos -> kirmizi/gecersiz
  // node" davranisinin AYNISI (bkz. nodeCatalog.js getNodeValidationIssues) -
  // hem node'un KENDI alanlari hem isaret ettigi config node'un alanlari
  // (recursive) kontrol edilir. `validationIssues` FlowCanvas.jsx tarafindan
  // onceden hesaplanip data'ya eklenmis geliyor (her render'da yeniden
  // hesaplamamak icin).
  const ownMissing = validationIssues?.ownMissing || [];
  const configIssues = validationIssues?.configIssues || [];
  const isInvalid = !isSubflowInstance && (ownMissing.length > 0 || configIssues.length > 0);
  const invalidTooltip = isInvalid
    ? [
        ...ownMissing.map((m) => `"${m.label}" alani bos`),
        ...configIssues.map((c) => `"${c.fieldLabel}" -> "${c.configLabel}" icinde ${c.missing.map((m) => m.label).join(', ')} bos`)
      ].join('\n')
    : null;

  function handleTrigger(e) {
    e.stopPropagation();
    onTriggerInject?.(raw.id);
  }

  function handleTest(e) {
    e.stopPropagation();
    onTestEndpoint?.(raw);
  }

  return (
    <div className={`flow-node${selected ? ' flow-node-selected' : ''}${isInvalid ? ' flow-node-invalid' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="flow-handle flow-handle-in"
        style={{ top: `${CIRCLE_CENTER}px` }}
      />
      <div className="flow-node-circle" style={{ background: circleColor }}>
        {isSubflowInstance ? <Link2 size={15} strokeWidth={2} /> : <CategoryIcon category={entry.category} size={15} />}
        {isInject && isDeployed && (
          <button className="flow-node-run-btn nodrag" onClick={handleTrigger} title="Manuel tetikle">
            <Play size={8} strokeWidth={2.5} fill="currentColor" />
          </button>
        )}
        {isInvalid && (
          <span className="flow-node-invalid-badge" title={invalidTooltip}>
            <AlertTriangle size={9} strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="flow-node-caption">
        <div className="flow-node-caption-primary" title={primaryLabel}>
          {primaryLabel}
        </div>
        {secondaryLabel && <div className="flow-node-caption-secondary">{secondaryLabel}</div>}
        {isHttpIn ? (
          <div className="flow-node-endpoint">
            <span className="flow-node-endpoint-method">{(raw.method || 'get').toUpperCase()}</span>
            <span className="flow-node-endpoint-url">{raw.url || '/'}</span>
          </div>
        ) : (
          infoLine && <div className="flow-node-info">{infoLine}</div>
        )}
        {isHttpIn && isDeployed && (
          <button className="flow-node-test-btn nodrag" onClick={handleTest} title="Bu endpoint'e test istegi gonder">
            Test Et
          </button>
        )}
      </div>
      {Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={i}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          className="flow-handle flow-handle-out"
          style={{ top: `${handleTopFor(i, outputs)}px` }}
        />
      ))}
    </div>
  );
}
