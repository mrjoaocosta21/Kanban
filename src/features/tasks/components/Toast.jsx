import { useEffect, useState } from 'react';

const AUTO_DISMISS_DELAY = 3200;
const EXIT_ANIMATION_DURATION = 160;

function Toast({ message, onDismiss }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const closeTimeout = window.setTimeout(() => {
      setIsClosing(true);
    }, AUTO_DISMISS_DELAY);

    return () => window.clearTimeout(closeTimeout);
  }, []);

  useEffect(() => {
    if (!isClosing) {
      return undefined;
    }

    const dismissTimeout = window.setTimeout(onDismiss, EXIT_ANIMATION_DURATION);
    return () => window.clearTimeout(dismissTimeout);
  }, [isClosing, onDismiss]);

  return (
    <div className="toast-region">
      <div className={`toast toast--success${isClosing ? ' toast--closing' : ''}`}>
        <div className="toast__status" role="status" aria-live="polite" aria-atomic="true">
          <span className="toast__icon" aria-hidden="true">✓</span>
          <span className="toast__message">{message}</span>
        </div>
        <button
          className="toast__close"
          type="button"
          onClick={() => setIsClosing(true)}
          aria-label="Fechar notificação"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Toast;
