export const MESSAGE_SELECTOR = "[data-message-id]";
export const USER_MSG_SELECTOR = '[data-message-author-role="user"]';
export const HIGHLIGHT_CLASS = "chatgpt-pin-highlight";

export const getMessageElById = (id) =>
  document.querySelector(`${MESSAGE_SELECTOR}[data-message-id="${id}"]`);

export function isUserAuthoredMessage(element) {
  return (
    (element.matches && element.matches(USER_MSG_SELECTOR)) ||
    !!element.querySelector?.(USER_MSG_SELECTOR)
  );
}

export const getAllAssistantMessageEls = () =>
  Array.from(document.querySelectorAll(MESSAGE_SELECTOR)).filter(
    (el) => !isUserAuthoredMessage(el)
  );

export function extractMessageInfo(el) {
  const id = el.getAttribute("data-message-id");
  const text = (el.innerText || el.textContent || "")
    .trim()
    .replace(/\s+/g, " ");
  const label = text.length > 80 ? text.slice(0, 80) + "…" : text || id;
  return { id, label };
}

export function scrollToMessage(id) {
  const el = getMessageElById(id);
  if (!el) return;

  // Find nearest scrollable container; fallback to the page
  const getScrollableAncestor = (node) => {
    let current = node?.parentElement || null;
    while (current && current !== document.body && current !== document.documentElement) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const isScrollable =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        current.scrollHeight > current.clientHeight;
      if (isScrollable) return current;
      current = current.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  };

  const container = getScrollableAncestor(el);

  // Compute a single smooth scroll target with a fixed 150px offset
  const containerRect = container.getBoundingClientRect?.() || { top: 0 };
  const elRect = el.getBoundingClientRect();
  const currentScrollTop =
    container === (document.scrollingElement || document.documentElement)
      ? (window.pageYOffset || document.documentElement.scrollTop || 0)
      : container.scrollTop;
  const targetScrollTop = Math.max(
    0,
    currentScrollTop + (elRect.top - containerRect.top) - 50
  );

  const scrollOptions = { top: targetScrollTop, behavior: "smooth" };
  const isPageContainer =
    container === document.scrollingElement || container === document.documentElement || container === document.body;
  if (isPageContainer) {
    window.scrollTo(scrollOptions);
  } else if (typeof container.scrollTo === "function") {
    container.scrollTo(scrollOptions);
  } else {
    container.scrollTop = targetScrollTop;
  }

  el.classList.add(HIGHLIGHT_CLASS);
  setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), 1200);
}
