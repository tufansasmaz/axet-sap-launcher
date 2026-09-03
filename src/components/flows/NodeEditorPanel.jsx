import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, ArrowLeft } from 'lucide-react';
import { catalogEntry, formFieldsFor, defaultConfigFor, getMissingRequiredFields } from '../../flows/nodeCatalog';
import { useFlowSnapshot, useFlowActions } from '../../flows/FlowContext';

function stringifyForJsonField(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function NodeEditorPanel({ selectedId, onSelect, onDeleted }) {
  const snapshot = useFlowSnapshot();
  const { updateNode, removeNode, addNode } = useFlowActions();
  const node = selectedId ? snapshot.nodesById[selectedId] : null;
  const [draft, setDraft] = useState({});
  const [jsonErrors, setJsonErrors] = useState({});
  // Bir config-ref alanindan "Duzenle"/"Yeni" ile config node'una gecince
  // kullanicinin GERI donebilecegi bir yer olsun diye kucuk bir navigasyon
  // yigini - sadece bu panelin kendi ici, canvas secimini degistirmiyor,
  // sadece "nereden geldim" hafizasi.
  const navStackRef = useRef([]);
  const lastNavTargetRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    // Bu selectedId degisimi bizim kendi navigasyonumuzdan (handleEditConfig/
    // handleCreateConfig/handleBack) GELMIYORSA (yani kullanici canvas'ta/
    // config listesinde baska bir seye tikladi) yigin gecersiz hale gelir -
    // temizle ki "Geri" butonu ilgisiz bir node'a atlamasin.
    if (selectedId !== lastNavTargetRef.current) {
      navStackRef.current = [];
    }
    lastNavTargetRef.current = null;
    setDraft(node ? { ...node } : {});
    setJsonErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, node?.type]);

  // Agent (veya baska bir kaynak) su an sec konusundaki node'u disaridan
  // guncelleyebilir; kullanici o alanda aktif olarak yazmiyorsa (odak bu
  // panelin disindaysa) draft'i modelle senkronize et. Boylece "agent bir
  // alani degistirdi ama panel eski degeri gosteriyor" hatasi olusmaz,
  // ayni zamanda kullanicinin o an yazdigi metin kaybolmaz.
  useEffect(() => {
    if (!node) return;
    if (rootRef.current && rootRef.current.contains(document.activeElement)) return;
    setDraft({ ...node });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  if (!node) {
    return (
      <div className="node-editor node-editor-empty">
        <div className="node-editor-title">Ozellikler</div>
        <p className="node-editor-hint">Duzenlemek icin canvas'ta veya config listesinde bir node sec.</p>
      </div>
    );
  }

  const entry = catalogEntry(node.type);
  const formFields = formFieldsFor(node.type);
  // GERCEK Node-RED editor'unun formu ANLIK yazarken de kirmizi kenarlikla
  // isaretlemesinin (bkz. nodeCatalog.js getMissingRequiredFields) AYNISI -
  // `draft` (commit edilmemis anlik yazi dahil) uzerinden hesaplanir, boylece
  // kullanici yazarken alan dolar dolmaz kirmizi kenarlik hemen kalkar
  // (blur/commit'i beklemez).
  const missingFieldKeys = new Set(getMissingRequiredFields(node.type, draft).map((m) => m.key));

  function isFieldRequired(f) {
    return Boolean(f.required || (typeof f.requiredIf === 'function' && f.requiredIf(draft)));
  }

  function fieldWrapperClass(f, extra) {
    const classes = ['node-editor-field'];
    if (extra) classes.push(extra);
    if (missingFieldKeys.has(f.key)) classes.push('node-editor-field-invalid');
    return classes.join(' ');
  }

  function renderLabel(f) {
    return (
      <label>
        {f.label}
        {isFieldRequired(f) && <span className="node-editor-field-required-mark" title="Zorunlu alan">*</span>}
      </label>
    );
  }

  function commit(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    updateNode(node.id, { [key]: value });
  }

  function handleTextChange(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleTextBlur(key) {
    updateNode(node.id, { [key]: draft[key] });
  }

  function handleJsonChange(key, text) {
    setDraft((d) => ({ ...d, [key]: text }));
  }

  function handleJsonBlur(key) {
    const text = draft[key];
    if (text === '' || text === undefined) {
      updateNode(node.id, { [key]: undefined });
      setJsonErrors((e) => ({ ...e, [key]: null }));
      return;
    }
    try {
      const parsed = JSON.parse(text);
      updateNode(node.id, { [key]: parsed });
      setJsonErrors((e) => ({ ...e, [key]: null }));
    } catch (err) {
      setJsonErrors((e) => ({ ...e, [key]: err.message }));
    }
  }

  function handleDelete() {
    removeNode(node.id);
    onDeleted?.(node.id);
    onSelect?.(null);
  }

  function handleCreateConfig(configType, key) {
    const id = addNode({ type: configType, config: defaultConfigFor(configType) });
    updateNode(node.id, { [key]: id });
    setDraft((d) => ({ ...d, [key]: id }));
    // Kullanıcı geri bildirimi: "+ Yeni" dediğimde config menüsü açılmıyor —
    // önceden bu buton sadece config node'u SESSİZCE oluşturup referans
    // alanına ATIYORDU, kullanıcı yeni config'i düzenlemek için ayrıca
    // canvas'ta/ConfigNodesPanel'de o node'u bulup tıklamak zorundaydı. Artık
    // yeni oluşturulan config node'a HEMEN geçiliyor (bu panel kendi
    // formunu gösterecek şekilde yeniden render olur) — "Yeni" demek artık
    // gerçekten "düzenleme ekranını aç" anlamına geliyor.
    navStackRef.current = [...navStackRef.current, node.id];
    lastNavTargetRef.current = id;
    onSelect?.(id);
  }

  function handleEditConfig(configId) {
    navStackRef.current = [...navStackRef.current, node.id];
    lastNavTargetRef.current = configId;
    onSelect?.(configId);
  }

  function handleBack() {
    const stack = navStackRef.current;
    if (stack.length === 0) return;
    const prevId = stack[stack.length - 1];
    navStackRef.current = stack.slice(0, -1);
    lastNavTargetRef.current = prevId;
    onSelect?.(prevId);
  }

  const configOptions = (configType) =>
    snapshot.order
      .map((id) => snapshot.nodesById[id])
      .filter((n) => n && n.type === configType);

  return (
    <div className="node-editor" ref={rootRef}>
      <div className="node-editor-header">
        {navStackRef.current.length > 0 && (
          <button type="button" className="node-editor-back" onClick={handleBack} title="Onceki node'a geri don">
            <ArrowLeft size={14} />
          </button>
        )}
        <span className="node-editor-swatch" style={{ background: entry.color }} />
        <div className="node-editor-header-text">
          <div className="node-editor-title">{entry.label || node.type}</div>
          <div className="node-editor-meta">
            <span className="node-editor-pill node-editor-pill-type">{node.type}</span>
            <span className="node-editor-pill node-editor-pill-id">{node.id.slice(0, 10)}</span>
          </div>
        </div>
      </div>

      <div className="node-editor-fields">
        {formFields.map((f) => {
            const value = draft[f.key];
            switch (f.type) {
              case 'checkbox':
                return (
                  <div className="node-editor-field node-editor-field-checkbox" key={f.key}>
                    <label className="node-editor-toggle-label">
                      <span className="node-editor-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => commit(f.key, e.target.checked)}
                        />
                        <span className="node-editor-toggle-track">
                          <span className="node-editor-toggle-thumb" />
                        </span>
                      </span>
                      <span>{f.label}</span>
                    </label>
                  </div>
                );
              case 'number':
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <input
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => handleTextChange(f.key, e.target.value)}
                      onBlur={() => updateNode(node.id, { [f.key]: Number(draft[f.key]) || 0 })}
                    />
                  </div>
                );
              case 'password':
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={value ?? ''}
                      onChange={(e) => handleTextChange(f.key, e.target.value)}
                      onBlur={() => handleTextBlur(f.key)}
                    />
                  </div>
                );
              case 'select':
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <select value={value ?? ''} onChange={(e) => commit(f.key, e.target.value)}>
                      {(f.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              case 'textarea':
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <textarea
                      rows={f.rows || 4}
                      value={value ?? ''}
                      onChange={(e) => handleTextChange(f.key, e.target.value)}
                      onBlur={() => handleTextBlur(f.key)}
                    />
                  </div>
                );
              case 'code':
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <textarea
                      className="node-editor-code"
                      rows={f.rows || 8}
                      value={value ?? ''}
                      onChange={(e) => handleTextChange(f.key, e.target.value)}
                      onBlur={() => handleTextBlur(f.key)}
                      spellCheck={false}
                    />
                  </div>
                );
              case 'json':
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <textarea
                      className="node-editor-code"
                      rows={f.rows || 5}
                      value={stringifyForJsonField(value)}
                      onChange={(e) => handleJsonChange(f.key, e.target.value)}
                      onBlur={() => handleJsonBlur(f.key)}
                      spellCheck={false}
                    />
                    {jsonErrors[f.key] && <div className="node-editor-json-error">Gecersiz JSON: {jsonErrors[f.key]}</div>}
                  </div>
                );
              case 'config-ref': {
                const options = configOptions(f.configType);
                const refConfig = value ? snapshot.nodesById[value] : null;
                const refMissing = refConfig ? getMissingRequiredFields(refConfig.type, refConfig) : [];
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <div className="node-editor-config-ref">
                      <select value={value || ''} onChange={(e) => commit(f.key, e.target.value)}>
                        <option value="">(secilmedi)</option>
                        {options.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name || opt.summary || opt.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      {/* Kullanıcı geri bildirimi: "seçili configi editleme
                          butonu eksik" — value dolu olduğunda (bir config
                          zaten seçilmiş/oluşturulmuş) bu buton görünür,
                          tıklanınca panel doğrudan o config node'unun
                          formuna geçer. */}
                      {value && (
                        <button
                          type="button"
                          className="node-editor-config-ref-edit"
                          onClick={() => handleEditConfig(value)}
                          title="Bu config'i duzenle"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      <button type="button" onClick={() => handleCreateConfig(f.configType, f.key)} title="Yeni config olustur ve duzenle">
                        <Plus size={12} />
                        Yeni
                      </button>
                    </div>
                    {refMissing.length > 0 && (
                      <div className="node-editor-field-hint node-editor-field-hint-danger">
                        Bu config'te eksik alan(lar): {refMissing.map((m) => m.label).join(', ')}
                      </div>
                    )}
                  </div>
                );
              }
              default:
                return (
                  <div className={fieldWrapperClass(f)} key={f.key}>
                    {renderLabel(f)}
                    <input
                      type="text"
                      value={value ?? ''}
                      placeholder={f.placeholder}
                      onChange={(e) => handleTextChange(f.key, e.target.value)}
                      onBlur={() => handleTextBlur(f.key)}
                    />
                  </div>
                );
            }
          })}
      </div>

      <div className="node-editor-actions">
        <button className="node-editor-delete" onClick={handleDelete}>
          Node'u Sil
        </button>
      </div>
    </div>
  );
}
