import React, { useEffect } from "react";
import {
  addPinnedConversation,
  removePinnedConversation,
  isConversationPinned,
  getPinnedConversations,
} from "../lib/conversationPins.js";

/**
 * ConversationPinner (mirrored pin ordering + popover color picker)
 *
 * - Star pin works in originals and mirrors
 * - Minimal UI: tiny color dot + small palette button (opens popover)
 * - Colors saved in localStorage; applied everywhere
 * - Mirrors deduped; clones ignored in scans; cloned items get live handlers
 */

export default function ConversationPinner() {
  useEffect(() => {
    let mounted = true;

    window.conversationPinnerObserver = undefined;
    window.conversationPinnerTimeout = undefined;

    const init = () => {
      if (!mounted) return;
      setupGlobalObserver();
      runIdle(processEverything);
    };

    window.conversationPinnerTimeout = setTimeout(init, 600);

    return () => {
      mounted = false;
      if (window.conversationPinnerObserver) {
        window.conversationPinnerObserver.disconnect();
      }
      if (window.conversationPinnerTimeout) {
        clearTimeout(window.conversationPinnerTimeout);
      }
      closeColorPopover();
    };
  }, []);

  return null;
}

/* =========================
   Module-scope helpers
========================= */

const processedLinks = new WeakSet();
const mirrors = new WeakMap(); // containerEl -> { mirrorEl, labelEl }
let observer = null;

// Palette: first is "clear"
const availableColors = [
  "#00000000", // clear
  "#fde047", // yellow
  "#fca5a5", // red
  "#86efac", // green
  "#93c5fd", // blue
  "#f9a8d4", // pink
  "#e5e7eb", // gray
];

const runIdle = (fn) => {
  if ("requestIdleCallback" in window) {
    return requestIdleCallback(fn, { timeout: 1000 });
  }
  return setTimeout(fn, 250);
};

const setupGlobalObserver = () => {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    clearTimeout(window.conversationPinnerTimeout);
    window.conversationPinnerTimeout = setTimeout(() => {
      runIdle(processEverything);
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.conversationPinnerObserver = observer;
};

/* =========================
   Color storage & apply
========================= */

function setConversationColor(id, color) {
  const saved = JSON.parse(localStorage.getItem("conversationColors") || "{}");
  saved[id] = color;
  localStorage.setItem("conversationColors", JSON.stringify(saved));
}

function getConversationColor(id) {
  const saved = JSON.parse(localStorage.getItem("conversationColors") || "{}");
  return saved[id] || "";
}

function hexToRgba(hex, alpha = 0.5) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return "";
    const h = hex.replace("#", "");
  
    // #RGB
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  
    // #RRGGBB or #RRGGBBAA
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      // ignore input alpha; we control bg transparency with `alpha`
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  
    return ""; // unknown format
  }
  
  // Faded background only for list items
  function getConversationBgColor(color, alpha = 0.45) {
    if (!color || color === "#00000000") return "transparent";
    if (color.startsWith("rgba(") || color.startsWith("rgb(")) return color; // already rgba
    return hexToRgba(color, alpha);
  }
  
  function applyColorStyles(el, color) {
    el.style.backgroundColor = getConversationBgColor(color);
    el.style.borderRadius = el.style.borderRadius || "8px";
    el.style.transition = el.style.transition || "background-color .15s ease";
    if (!el.style.paddingInline) el.style.paddingInline = "4px";
  }

function applyColorToAllInstances(conversationId, color) {
  setConversationColor(conversationId, color);

  // originals
  const realLinks = queryAllConversationLinks();
  for (const link of realLinks) {
    const id = extractConversationId(link.getAttribute("href"));
    if (id === conversationId) applyColorStyles(link, color);
  }

  // mirrors
  document
    .querySelectorAll('.pinned-mirror a[href^="/c/"]')
    .forEach((clone) => {
      const id = extractConversationId(clone.getAttribute("href"));
      if (id === conversationId) applyColorStyles(clone, color);
    });

  // indicator dots
  document
    .querySelectorAll(`.conv-color-indicator[data-conv-id="${conversationId}"]`)
    .forEach((dot) => {
      dot.style.background = color || "transparent";
      dot.style.border = color
        ? "1px solid rgba(0,0,0,.25)"
        : "1px solid rgba(255,255,255,.25)";
    });
}

/* =========================
   Color popover (single instance)
========================= */

let currentPopover = null; // { el, conversationId, anchor }

function closeColorPopover() {
  if (currentPopover?.el?.isConnected) {
    currentPopover.el.remove();
  }
  currentPopover = null;

  // remove global listeners if any
  window.removeEventListener("mousedown", handleGlobalClose, true);
  window.removeEventListener("scroll", handleGlobalClose, true);
  window.removeEventListener("resize", handleGlobalClose, true);
}

function handleGlobalClose(e) {
  if (!currentPopover) return;
  const { el, anchor } = currentPopover;
  if (!el.contains(e.target) && !anchor.contains(e.target)) {
    closeColorPopover();
  }
}

function openColorPopover(conversationId, anchorEl) {
  // toggle if same anchor is clicked
  if (currentPopover && currentPopover.anchor === anchorEl) {
    closeColorPopover();
    return;
  }

  closeColorPopover();

  const pop = document.createElement("div");
  pop.className = "conv-color-popover";
  pop.style.cssText = `
    position: fixed;
    z-index: 99999;
    display: flex; gap: 6px; align-items: center;
    padding: 8px; border-radius: 8px;
    background: var(--popover-bg, rgba(22,22,22,.98));
    color: var(--popover-fg, #fff);
    box-shadow: 0 6px 24px rgba(0,0,0,.35);
    border: 1px solid rgba(255,255,255,.08);
  `;

  // swatches
  availableColors.forEach((color, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = idx === 0 ? "Clear color" : `Set color ${color}`;
    btn.style.cssText = `
      width: 16px; height: 16px; border-radius: 4px; cursor: pointer;
      border: 1px solid rgba(0,0,0,.25); outline: none; padding: 0;
      background: ${color === "#00000000" ? "transparent" : color};
    `;
    if (idx === 0) {
      // subtle slash for "clear"
      btn.style.position = "relative";
      const slash = document.createElement("div");
      slash.style.cssText = `
        position:absolute; inset:0; pointer-events:none;
        background: linear-gradient(135deg, transparent 45%, rgba(255,255,255,.75) 48%, rgba(255,255,255,.75) 52%, transparent 55%);
        border-radius: 4px;
        opacity: .7;
      `;
      btn.appendChild(slash);
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const val = color === "#00000000" ? "" : color;
      applyColorToAllInstances(conversationId, val);
      closeColorPopover();
    });
    pop.appendChild(btn);
  });

  document.body.appendChild(pop);

  // position near anchor
  const rect = anchorEl.getBoundingClientRect();
  const padding = 6;
  const top = Math.min(
    window.innerHeight - pop.offsetHeight - padding,
    Math.max(padding, rect.bottom + 6)
  );
  const left = Math.min(
    window.innerWidth - pop.offsetWidth - padding,
    Math.max(padding, rect.left)
  );
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;

  currentPopover = { el: pop, conversationId, anchor: anchorEl };

  // close handlers
  setTimeout(() => {
    window.addEventListener("mousedown", handleGlobalClose, true);
    window.addEventListener("scroll", handleGlobalClose, true);
    window.addEventListener("resize", handleGlobalClose, true);
  }, 0);
}

/* =========================
   Main processing
========================= */

async function processEverything() {
  // 1) Inject pin + compact color UI into all conversation links
  const allLinks = queryAllConversationLinks();

  for (const link of allLinks) {
    if (processedLinks.has(link)) {
      // re-apply color (in case it changed)
      const id = extractConversationId(link.getAttribute("href"));
      if (id) {
        const savedColor = getConversationColor(id);
        if (savedColor) applyColorStyles(link, savedColor);
      }
      continue;
    }

    const conversationId = extractConversationId(link.getAttribute("href"));
    if (!conversationId) continue;

    const pinned = await isConversationPinned(conversationId);
    addPinAndColorUI(link, conversationId, pinned);

    // apply stored color
    const savedColor = getConversationColor(conversationId);
    if (savedColor) applyColorStyles(link, savedColor);

    processedLinks.add(link);
  }

  // 2) Group by real list container and rebuild mirrors
  const containerToLinks = new Map();
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

  if (observer) observer.disconnect();
  try {
    const pinnedIds = await getPinnedConversations();
    for (const [container, links] of containerToLinks) {
      rebuildMirrorForContainer(container, links, pinnedIds);
    }
  } finally {
    if (observer)
      observer.observe(document.body, { childList: true, subtree: true });
  }
}

/* =========================
   Mirrors per container
========================= */

function getOrCreateMirror(container) {
  const cached = mirrors.get(container);
  if (cached && cached.mirrorEl?.isConnected) return cached;

  // reuse adjacent mirror if present
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
    labelEl.style.cssText =
      "font-size:12px; opacity:0.7; margin:8px 0; margin-left: 14px";
    mirrorEl.insertBefore(labelEl, mirrorEl.firstChild);
  }

  const entry = { mirrorEl, labelEl };
  mirrors.set(container, entry);
  return entry;
}

function clearMirrorContent(mirrorEl) {
  const children = [...mirrorEl.children];
  for (let i = 1; i < children.length; i++) children[i].remove();
}

function rebuildMirrorForContainer(container, linksInContainer, pinnedIds) {
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
    // strip stale UI
    clone
      .querySelectorAll(
        ".pin-icon, .conv-color-indicator, .conv-color-trigger, .conv-color-palette"
      )
      .forEach((n) => n.remove());
    // rebuild clean UI
    addPinAndColorUI(clone, id, true);

    // color
    const savedColor = getConversationColor(id);
    if (savedColor) applyColorStyles(clone, savedColor);

    mirrorEl.appendChild(clone);
    added++;
  }

  mirrorEl.style.display = added > 0 ? "" : "none";
}

/* =========================
   Pin + Color (popover) UI
========================= */

function addPinAndColorUI(link, conversationId, isPinned) {
  // find title container
  let titleContainer =
    link.querySelector(".truncate") ||
    link.querySelector('[dir="auto"]') ||
    link.querySelector("span") ||
    link;

  if (!titleContainer) return;

  // --- Pin icon (left) ---
  if (!titleContainer.querySelector(".pin-icon")) {
    const pinWrapper = document.createElement("div");
    pinWrapper.className = "pin-icon";
    pinWrapper.style.cssText =
      "display:inline-flex;align-items:center;margin-right:6px;";

    const pinElement = document.createElement("div");
    pinElement.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      width:16px;height:16px;cursor:pointer;
      opacity:${isPinned ? "1" : "0.6"};
      transition:opacity .15s ease;
      color:${isPinned ? "#22d3ee" : "currentColor"};
    `;
    pinElement.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24"
        fill="${isPinned ? "currentColor" : "none"}"
        stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
    pinElement.title = isPinned ? "Unpin conversation" : "Pin conversation";

    pinElement.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentlyPinned = await isConversationPinned(conversationId);
      if (currentlyPinned) await removePinnedConversation(conversationId);
      else await addPinnedConversation(conversationId);

      const nowPinned = await isConversationPinned(conversationId);
      updatePinIconState(pinElement, nowPinned);
      runIdle(processEverything);
    });

    pinWrapper.appendChild(pinElement);
    titleContainer.insertBefore(pinWrapper, titleContainer.firstChild);
  }

  // --- Tiny color indicator (always visible) ---
  if (
    !titleContainer.querySelector(
      `.conv-color-indicator[data-conv-id="${conversationId}"]`
    )
  ) {
    const indicator = document.createElement("span");
    indicator.className = "conv-color-indicator";
    indicator.dataset.convId = conversationId;
    indicator.style.cssText = `
      display:inline-block;margin-right:6px;width:10px;height:10px;border-radius:50%;
      border:1px solid rgba(255,255,255,.25); vertical-align:middle;
    `;
    const saved = getConversationColor(conversationId);
    if (saved) {
      indicator.style.background = saved;
      indicator.style.border = "1px solid rgba(0,0,0,.25)";
    }
    titleContainer.insertBefore(
      indicator,
      titleContainer.firstChild?.nextSibling || null
    );
  }

  // --- Palette trigger (small icon) ---
  if (
    !titleContainer.querySelector(
      `.conv-color-trigger[data-conv-id="${conversationId}"]`
    )
  ) {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "conv-color-trigger";
    trigger.dataset.convId = conversationId;
    trigger.title = "Change color";
    trigger.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      width:16px;height:16px;margin-right:6px;cursor:pointer;
      background: transparent;border: none;outline: none;padding: 0;
      opacity:.8;
    `;
    // simple palette icon (dots)
    trigger.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="7" cy="8" r="1.5"></circle>
        <circle cx="12" cy="6.5" r="1.5"></circle>
        <circle cx="17" cy="8" r="1.5"></circle>
        <circle cx="9" cy="13.5" r="1.5"></circle>
      </svg>
    `;
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openColorPopover(conversationId, trigger);
    });

    // place it after the indicator
    const after = titleContainer.querySelector(
      `.conv-color-indicator[data-conv-id="${conversationId}"]`
    );
    titleContainer.insertBefore(
      trigger,
      after?.nextSibling || titleContainer.firstChild
    );
  }
}

function updatePinIconState(pinElement, isPinned) {
  pinElement.style.opacity = isPinned ? "1" : "0.6";
  pinElement.style.color = isPinned ? "#22d3ee" : "currentColor";
  const svg = pinElement.querySelector("svg");
  if (svg) svg.setAttribute("fill", isPinned ? "currentColor" : "none");
}

/* =========================
   Query & Utilities
========================= */

function queryAllConversationLinks() {
  const links = document.querySelectorAll('a[href^="/c/"]');
  return [...links].filter(
    (a) => !a.closest(".pinned-mirror") && !a.hasAttribute("data-pinned-clone")
  );
}

function findListContainer(link) {
  let el = link.parentElement;
  for (let i = 0; i < 8 && el; i++) {
    if (!el.closest(".pinned-mirror")) {
      const count = countConversationLinks(el);
      if (count >= 2) return el;
    }
    el = el.parentElement;
  }
  return null;
}

function countConversationLinks(root) {
  const links = root.querySelectorAll('a[href^="/c/"]');
  let count = 0;
  for (const a of links) {
    if (!a.closest(".pinned-mirror") && !a.hasAttribute("data-pinned-clone"))
      count++;
  }
  return count;
}

function extractConversationId(href) {
  if (!href) return null;
  const m = href.match(/\/c\/([a-f0-9-]+)/i);
  return m ? m[1] : null;
}
