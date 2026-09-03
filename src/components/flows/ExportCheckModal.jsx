import React from 'react';

const SEVERITY_LABEL = { error: 'KRITIK', warning: 'UYARI' };

export default function ExportCheckModal({ issues, blocking, targetLabel, onProceed, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Disa Aktarim Oncesi Kontrol</h2>
        <p className="modal-hint">
          {targetLabel} icin flow'da {issues.length} sorun tespit edildi
          {blocking ? ' (en az biri kritik seviyede).' : ' (hepsi sadece uyari seviyesinde).'}
        </p>
        <div className="export-check-list">
          {issues.map((issue, i) => (
            <div key={i} className={`validation-issue validation-issue-${issue.severity}`}>
              <div className="validation-issue-head">
                <span className="validation-issue-badge">{SEVERITY_LABEL[issue.severity] || issue.severity}</span>
                <span className="validation-issue-title">{issue.title}</span>
                <span className="validation-issue-node">{issue.nodeName}</span>
              </div>
              <div className="validation-issue-row">
                <span className="trace-stopped-label">Neden:</span> {issue.cause}
              </div>
              <div className="validation-issue-row">
                <span className="trace-stopped-label">Ne yapmali:</span> {issue.suggestion}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onCancel}>Vazgec, Duzelteyim</button>
          <button className="primary" onClick={onProceed}>
            Yine de {targetLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
