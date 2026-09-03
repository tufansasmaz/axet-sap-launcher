import React, { useState } from 'react';

export default function TestRequestModal({ node, onClose }) {
  const [body, setBody] = useState('{\n  \n}');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const method = (node.method || 'get').toUpperCase();
  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';

  async function handleSend() {
    setSending(true);
    setResponse(null);
    setError(null);
    try {
      let parsedBody;
      if (hasBody && body.trim()) {
        try {
          parsedBody = JSON.parse(body);
        } catch (err) {
          setError(`Body gecersiz JSON: ${err.message}`);
          setSending(false);
          return;
        }
      }
      const res = await window.api.flowsSendTestRequest({
        method,
        path: node.url,
        body: parsedBody,
        headers: hasBody ? { 'Content-Type': 'application/json' } : undefined
      });
      if (!res.ok) {
        setError(res.error || 'Istek basarisiz.');
      } else {
        setResponse(res);
      }
    } finally {
      setSending(false);
    }
  }

  let prettyBody = response?.body || '';
  try {
    prettyBody = JSON.stringify(JSON.parse(response?.body || ''), null, 2);
  } catch {
    // ham metin olarak birakilir
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <h2>Endpoint Test Et</h2>
        <p className="modal-hint">
          <span className="test-request-method">{method}</span> {node.url}
        </p>
        {hasBody && (
          <label>
            Request Body (JSON)
            <textarea
              className="node-editor-code"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              style={{ fontFamily: "'Consolas', 'Courier New', monospace", fontSize: '12px' }}
            />
          </label>
        )}
        {error && <div className="test-request-error">{error}</div>}
        {response && (
          <div className="test-request-response">
            <div className={`test-request-status test-request-status-${response.statusCode < 400 ? 'ok' : 'error'}`}>
              HTTP {response.statusCode}
            </div>
            <pre className="test-request-body">{prettyBody}</pre>
          </div>
        )}
        <div className="modal-actions">
          <button onClick={onClose} disabled={sending}>
            Kapat
          </button>
          <button onClick={handleSend} disabled={sending} className="primary">
            {sending ? 'Gonderiliyor...' : 'Istegi Gonder'}
          </button>
        </div>
      </div>
    </div>
  );
}
