import { HIGHLIGHT_CLASS } from "./dom.js";

/** Global (page) style so highlight works outside shadow */
export function ensureGlobalHighlightStyle() {
  if (document.getElementById("chatgpt-pin-global-style")) return;
  const s = document.createElement("style");
  s.id = "chatgpt-pin-global-style";
  s.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #22d3ee !important;
      outline-offset: 2px;
      transition: outline-color .3s ease;
    }
  `;
  document.head.appendChild(s);
}

/** Inject UI styles inside the shadow root */
export function injectShadowStyles(shadowRoot) {
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-pin-hotspot {
      position: fixed; top: 0; right: 0;
      width: 18px; height: 100vh;
      z-index: 2147483646;
    }
    .cgpt-pin-sidebar {
      position: fixed; top: 50%; right: 0;
      transform: translateY(-50%) translateX(100%);
      transition: transform .18s ease, opacity .18s ease;
      opacity: .2; pointer-events: none;
      width: 280px; max-height: 70vh; overflow: hidden auto;
      background: rgba(28,28,28,0.9); color: #fff;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px 0 0 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      padding: 10px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
      z-index: 2147483647;
    }
    .cgpt-pin-sidebar.is-visible { transform: translateY(-50%) translateX(0); opacity: 1; pointer-events: auto; }
    .cgpt-pin-sidebar.peek { transform: translateY(-50%) translateX(calc(100% - 6px)); opacity: .6; }

    .cgpt-pin-header { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; font-weight:600; font-size:14px; }
    .cgpt-pin-list { display:flex; flex-direction:column; gap:8px; }
    .cgpt-pin-item { display:flex; align-items:flex-start; gap:8px; padding:8px; border-radius:10px; background: rgba(255,255,255,0.06); cursor:pointer; }
    .cgpt-pin-item:hover { background: rgba(255,255,255,0.12); }
    .cgpt-pin-text { font-size:12px; line-height:1.4; }
    .cgpt-pin-empty { font-size:12px; opacity:0.8; padding:6px; }
  `;
  shadowRoot.appendChild(style);
  return () => style.remove();
}
