export const BUS_EVENT = "chatgpt-pin-toggle";

export function emitTogglePin(detail) {
  window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail }));
}

export function onTogglePin(handler) {
  window.addEventListener(BUS_EVENT, handler);
  return () => window.removeEventListener(BUS_EVENT, handler);
}
