import React, { useEffect } from "react";
import { getPinnedConversations } from "../lib/conversationPins.js";

export default function ConversationMirror() {
  useEffect(() => {
    let mounted = true;
    let observer = null;
    let timeout = null;

    const init = () => {
      if (!mounted) return;
      setupObserver();
      runIdle(processMirrors);
    };

    timeout = setTimeout(init, 600);

    return () => {
      mounted = false;
      if (observer) observer.disconnect();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return null;
}

/* =========================
   Module-scope helpers
========================= */

const mirrors = new WeakMap(); // containerEl -> { mirrorEl, labelEl }

const runIdle = (fn) => {
  if ("requestIdleCallback" in window) {
    return requestIdleCallback(fn, { timeout: 1000 });
  }
  return setTimeout(fn, 250);
};

const setupObserver = () => {
  const observer = new MutationObserver(() => {
    clearTimeout(window.mirrorTimeout);
    window.mirrorTimeout = setTimeout(() => {
      runIdle(processMirrors);
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
};

const processMirrors = async () => {
  // Group by real list container and rebuild mirrors
  const containerToLinks = new Map();
  const allLinks = queryAllConversationLinks();
  
  for (const link of allLinks) {
    const container = findListContainer(link);
    if (!container) continue;
    let arr = containerToLinks.get(container);
    if (!arr) {
      arr = [];
      containerToLinks.set(container, arr);
    }
    arr.push(link);
  }

  const pinnedIds = await getPinnedConversations();
  for (const [container, links] of containerToLinks) {
    rebuildMirrorForContainer(container, links, pinnedIds);
  }
};

const getOrCreateMirror = (container) => {
  const cached = mirrors.get(container);
  if (cached && cached.mirrorEl?.isConnected) return cached;

  // Reuse adjacent mirror if present
  let mirrorEl = null;
  const toRemove = [];
  let sib = container.previousSibling;
  while (
    sib &&
    sib.nodeType === Node.ELEMENT_NODE &&
    sib.classList?.contains("pinned-mirror")
  ) {
    if (!mirrorEl) mirrorEl = sib;
    else toRemove.push(sib);
    sib = sib.previousSibling;
  }
  toRemove.forEach((n) => n.remove());

  if (!mirrorEl) {
    mirrorEl = document.createElement("div");
    mirrorEl.className = "pinned-mirror";
    mirrorEl.style.cssText = `
      border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));
      margin-bottom: 6px; padding-bottom: 6px;
    `;
    const parent = container.parentElement || container;
    parent.insertBefore(mirrorEl, container);
  }

  let labelEl = mirrorEl.querySelector(":scope > .pinned-mirror-label");
  if (!labelEl) {
    labelEl = document.createElement("div");
    labelEl.className = "pinned-mirror-label";
    labelEl.textContent = "Pinned";
    labelEl.style.cssText = "font-size:12px; opacity:0.7; margin:8px 0; margin-left: 14px";
    mirrorEl.insertBefore(labelEl, mirrorEl.firstChild);
  }

  const entry = { mirrorEl, labelEl };
  mirrors.set(container, entry);
  return entry;
};

const clearMirrorContent = (mirrorEl) => {
  const children = [...mirrorEl.children];
  for (let i = 1; i < children.length; i++) children[i].remove();
};

const rebuildMirrorForContainer = (container, linksInContainer, pinnedIds) => {
  const { mirrorEl } = getOrCreateMirror(container);
  clearMirrorContent(mirrorEl);

  if (!Array.isArray(pinnedIds) || pinnedIds.length === 0) {
    mirrorEl.style.display = "none";
    return;
  }

  const byId = new Map();
  for (const link of linksInContainer) {
    const id = extractConversationId(link.getAttribute("href"));
    if (id) byId.set(id, link);
  }

  let added = 0;
  for (const id of pinnedIds) {
    const original = byId.get(id);
    if (!original) continue;

    const clone = original.cloneNode(true);
    clone.setAttribute("data-pinned-clone", "true");
    
    // Strip stale UI elements
    clone
      .querySelectorAll(".pin-icon, .conv-color-indicator, .conv-color-trigger, .conv-color-palette")
      .forEach((n) => n.remove());
    
    // Rebuild clean UI (pin and color)
    rebuildCloneUI(clone, id);

    mirrorEl.appendChild(clone);
    added++;
  }

  mirrorEl.style.display = added > 0 ? "" : "none";
};

const rebuildCloneUI = (clone, conversationId) => {
  // Add pin icon to clone
  const titleContainer = clone.querySelector(".truncate") ||
                        clone.querySelector('[dir="auto"]') ||
                        clone.querySelector("span") ||
                        clone;

  if (titleContainer) {
    // Add pin icon (always pinned in mirror)
    const pinWrapper = document.createElement("div");
    pinWrapper.className = "pin-icon";
    pinWrapper.style.cssText = "display:inline-flex;align-items:center;margin-right:6px;";

    const pinElement = document.createElement("div");
    pinElement.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      width:16px;height:16px;cursor:pointer;
      opacity:1; transition:opacity .15s ease; color:#22d3ee;
    `;

    pinElement.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24"
        fill="currentColor" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
    pinElement.title = "Pinned conversation";

    pinWrapper.appendChild(pinElement);
    titleContainer.insertBefore(pinWrapper, titleContainer.firstChild);

    // Add color indicator if exists
    const savedColor = getConversationColor(conversationId);
    if (savedColor) {
      const indicator = document.createElement("span");
      indicator.className = "conv-color-indicator";
      indicator.dataset.convId = conversationId;
      indicator.style.cssText = `
        display:none;margin-right:6px;width:10px;height:10px;border-radius:50%;
        border:1px solid rgba(0,0,0,.25); vertical-align:middle;
        background: ${savedColor};
      `;
      titleContainer.insertBefore(
        indicator,
        titleContainer.firstChild?.nextSibling || null
      );
    }
  }
};

/* =========================
   Utilities
========================= */

const queryAllConversationLinks = () => {
  const links = document.querySelectorAll('a[href^="/c/"]');
  return [...links].filter(a => !a.closest(".pinned-mirror") && !a.hasAttribute("data-pinned-clone"));
};

const findListContainer = (link) => {
  let el = link.parentElement;
  for (let i = 0; i < 8 && el; i++) {
    if (!el.closest(".pinned-mirror")) {
      const count = countConversationLinks(el);
      if (count >= 2) return el;
    }
    el = el.parentElement;
  }
  return null;
};

const countConversationLinks = (root) => {
  const links = root.querySelectorAll('a[href^="/c/"]');
  let count = 0;
  for (const a of links) {
    if (!a.closest(".pinned-mirror") && !a.hasAttribute("data-pinned-clone"))
      count++;
  }
  return count;
};

const extractConversationId = (href) => {
  if (!href) return null;
  const m = href.match(/\/c\/([a-f0-9-]+)/i);
  return m ? m[1] : null;
};

const getConversationColor = (id) => {
  const saved = JSON.parse(localStorage.getItem("conversationColors") || "{}");
  return saved[id] || "";
};
