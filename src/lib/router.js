// Detect current chat id from URL and notify on SPA route changes
export function getCurrentChatId(url = location.href) {
    // matches /c/<uuid>
    const m = url.match(/\/c\/([a-f0-9-]{16,})/i);
    return m ? m[1] : null;
  }
  
  // Simple url-change signal (supports pushState/replaceState + popstate)
  const LISTENERS = new Set();
  
  export function onUrlChange(cb) {
    LISTENERS.add(cb);
    return () => LISTENERS.delete(cb);
  }
  
  (function patchHistoryOnce() {
    if (window.__chatpin_hist_patched) return;
    window.__chatpin_hist_patched = true;
  
    const notify = () => {
      const url = location.href;
      for (const cb of LISTENERS) cb(url);
    };
  
    const wrap = (fnName) => {
      const orig = history[fnName];
      history[fnName] = function (...args) {
        const ret = orig.apply(this, args);
        // microtask to ensure location is updated
        Promise.resolve().then(notify);
        return ret;
      };
    };
  
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", notify);
    // also a small fallback timer in case sites mutate hash silently
    setInterval(() => {
      const now = location.href;
      if (now !== window.__chatpin_last_href) {
        window.__chatpin_last_href = now;
        notify();
      }
    }, 800);
  })();
  