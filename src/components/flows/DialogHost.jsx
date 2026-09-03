import React, { useEffect, useRef, useState } from 'react';
import { subscribeDialog } from '../../flows/utils/dialogService';

export default function DialogHost() {
  const [request, setRequest] = useState(null);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => subscribeDialog(setRequest), []);

  useEffect(() => {
    if (request?.type === 'prompt') {
      setValue(request.defaultValue || '');
      // autoFocus + select-all, tipki tarayicinin native prompt()'unun yaptigi gibi.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [request]);

  if (!request) return null;

  if (request.type === 'prompt') {
    function submit(e) {
      e.preventDefault();
      request.resolve(value);
    }
    return (
      <div className="modal-overlay">
        <form className="modal modal-dialog" onSubmit={submit}>
          <p className="modal-dialog-message">{request.message}</p>
          <input
            ref={inputRef}
            className="modal-dialog-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') request.resolve(null);
            }}
          />
          <div className="modal-actions">
            <button type="button" onClick={() => request.resolve(null)}>
              Vazgec
            </button>
            <button type="submit" className="primary">
              Tamam
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (request.type === 'confirm') {
    return (
      <div className="modal-overlay">
        <div className="modal modal-dialog">
          <p className="modal-dialog-message">{request.message}</p>
          <div className="modal-actions">
            <button onClick={() => request.resolve(false)}>Vazgec</button>
            <button className={request.tone === 'danger' ? 'primary primary-danger' : 'primary'} onClick={() => request.resolve(true)}>
              Onayla
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-dialog">
        <p className="modal-dialog-message">{request.message}</p>
        <div className="modal-actions">
          <button className="primary" onClick={() => request.resolve()}>
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
