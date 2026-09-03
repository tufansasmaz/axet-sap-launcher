import React, { useEffect, useRef } from 'react';

export default function NodeContextMenu({ x, y, items, onClose }) {
  const rootRef = useRef(null);

  useEffect(() => {
    function handleMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose();
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="node-context-menu" style={{ left: x, top: y }} ref={rootRef}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={`sep-${i}`} className="node-context-menu-sep" />
        ) : (
          <button
            key={item.key || item.label}
            className={`node-context-menu-item${item.danger ? ' node-context-menu-item-danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
