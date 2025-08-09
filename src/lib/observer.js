import { extractMessageInfo, getAllAssistantMessageEls, isUserAuthoredMessage, MESSAGE_SELECTOR } from "./dom.js";
import { emitTogglePin } from "./bus.js";

/** Create or reuse a small 📌 button on a message element */
function ensurePinButton(el) {
  if (isUserAuthoredMessage(el)) return;
  if (el.querySelector(":scope .chatgpt-pin-btn")) return;

  const btn = document.createElement("button");
  btn.className = "chatgpt-pin-btn";
  btn.title = "Pin this message";
  btn.type = "button";
  btn.innerHTML = "📌";

  Object.assign(btn.style, {
    position: "absolute",
    top: "-8px",
    right: "-18px",
    zIndex: "10",
    width: "24px",
    height: "24px",
    borderRadius: "999px",
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "saturate(1.2) blur(2px)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontSize: "14px",
    lineHeight: "1",
  });

  const computed = window.getComputedStyle(el);
  if (computed.position === "static") el.style.position = "relative";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    emitTogglePin(extractMessageInfo(el));
  });

  el.appendChild(btn);
}

export function startMessageObserver() {
  // initial pass
  getAllAssistantMessageEls().forEach(ensurePinButton);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes &&
        Array.from(m.addedNodes).forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches?.(MESSAGE_SELECTOR) && !isUserAuthoredMessage(node)) {
            ensurePinButton(node);
          } else {
            node
              .querySelectorAll?.(MESSAGE_SELECTOR)
              .forEach((el) => !isUserAuthoredMessage(el) && ensurePinButton(el));
          }
        });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // periodic rescan as a safety net
  const tick = setInterval(() => {
    getAllAssistantMessageEls().forEach(ensurePinButton);
  }, 1500);

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
    clearInterval(tick);
  });

  return observer;
}
