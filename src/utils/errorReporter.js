// Silent frontend error reporter — posts errors to backend which forwards to Discord
const API_BASE = process.env.REACT_APP_API_URL || '/api';
const recentErrors = new Map();
const DEDUP_WINDOW_MS = 30000;

function sanitize(text) {
  if (!text || typeof text !== 'string') return String(text || '');
  return text
    .replace(/([A-Za-z]:\\Users\\)[^\\]+/g, '$1[user]')
    .replace(/(\/Users\/)[^/]+/g, '$1[user]')
    .replace(/(\/home\/)[^/]+/g, '$1[user]');
}

function send(source, message, stack, extra = {}) {
  if (!message) return;
  const signature = `${source}:${message}`;
  const now = Date.now();
  const last = recentErrors.get(signature);
  if (last && (now - last) < DEDUP_WINDOW_MS) return;
  recentErrors.set(signature, now);

  // Clean up old dedup entries
  if (recentErrors.size > 100) {
    for (const [key, ts] of recentErrors) {
      if (now - ts > DEDUP_WINDOW_MS) recentErrors.delete(key);
    }
  }

  // Fire-and-forget POST
  try {
    fetch(`${API_BASE}/report-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        message: sanitize(message).slice(0, 500),
        stack: sanitize(stack || '').slice(0, 3000),
        url: sanitize(window.location.href),
        userAgent: navigator.userAgent,
        ...extra,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch(e) { /* silent */ }
}

export function installErrorReporter() {
  window.addEventListener('error', (event) => {
    send('window.onerror', event.message, event.error?.stack, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason);
    const stack = reason?.stack;
    send('unhandledrejection', message, stack);
  });
}
