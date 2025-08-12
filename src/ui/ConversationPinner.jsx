import React, { useEffect } from "react";
import {
  addPinnedConversation,
  removePinnedConversation,
  isConversationPinned,
  getPinnedConversations,
} from "../lib/conversationPins.js";

/**
 * ConversationPinner (multi-list, mirrored pin ordering) — fixed + mirror pin click
 *
 * - Excludes mirrors/clones from scans to avoid infinite mirrors
 * - Finds stable list containers via ancestor walk (>=2 links, not inside mirror)
 * - Reuses/DEDUPES adjacent mirrors
 * - Marks clones with data-pinned-clone
 * - IMPORTANT: Re-hydrates pin icon inside clones so Unpin works in the mirror
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
    };
  }, []);

  return null;
}

/* =========================
   Module-scope helpers
========================= */

const processedLinks = new WeakSet();
// Map: containerEl -> { mirrorEl, labelEl }
const mirrors = new WeakMap();
let observer = null;

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

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.conversationPinnerObserver = observer;
};

async function processEverything() {
  // 1) Inject pin icons into all conversation links (excluding mirrors/clones)
  const allLinks = queryAllConversationLinks();

  for (const link of allLinks) {
    if (processedLinks.has(link)) continue;
    const conversationId = extractConversationId(link.getAttribute("href"));
    if (!conversationId) continue;

    const pinned = await isConversationPinned(conversationId);
    addPinIconToConversation(link, conversationId, pinned);
    processedLinks.add(link);
  }

  // 2) Group links by their real list container (ancestor with ≥2 links, not inside mirror)
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

  // 3) Rebuild mirrors for each detected list container
  if (observer) observer.disconnect();
  try {
    const pinnedIds = await getPinnedConversations();
    for (const [container, links] of containerToLinks) {
      rebuildMirrorForContainer(container, links, pinnedIds);
    }
  } finally {
    if (observer) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
}

/* =========================
   Mirrors per container
========================= */

function getOrCreateMirror(container) {
  const cached = mirrors.get(container);
  if (cached && cached.mirrorEl?.isConnected) return cached;

  // Try to reuse an existing adjacent mirror (dedupe extras)
  let mirrorEl = null;
  const toRemove = [];
  let sib = container.previousSibling;
  while (sib && sib.nodeType === Node.ELEMENT_NODE && sib.classList?.contains("pinned-mirror")) {
    if (!mirrorEl) mirrorEl = sib; else toRemove.push(sib);
    sib = sib.previousSibling;
  }
  for (const extra of toRemove) extra.remove();

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
}

function clearMirrorContent(mirrorEl) {
  // Keep only the label (first child). Remove clones.
  const children = [...mirrorEl.children];
  for (let i = 1; i < children.length; i++) {
    children[i].remove();
  }
}

function rebuildMirrorForContainer(container, linksInContainer, pinnedIds) {
  const { mirrorEl } = getOrCreateMirror(container);
  clearMirrorContent(mirrorEl);

  if (!Array.isArray(pinnedIds) || pinnedIds.length === 0) {
    mirrorEl.style.display = "none";
    return;
  }

  // Build id -> original link for this container only
  const byId = new Map();
  for (const link of linksInContainer) {
    const id = extractConversationId(link.getAttribute("href"));
    if (id) byId.set(id, link);
  }

  let added = 0;
  for (const id of pinnedIds) {
    const original = byId.get(id);
    if (!original) continue;

    // Clone the link and hydrate a fresh, working pin icon
    const clone = original.cloneNode(true);
    clone.setAttribute("data-pinned-clone", "true");

    // Remove any stale pin icons that were cloned without listeners
    clone.querySelectorAll(".pin-icon").forEach((n) => n.remove());

    // Re-inject a fresh, functional pin icon into the clone
    addPinIconToConversation(clone, id, true);

    mirrorEl.appendChild(clone);
    added++;
  }

  mirrorEl.style.display = added > 0 ? "" : "none";
}

/* =========================
   Pin injection
========================= */

function addPinIconToConversation(link, conversationId, isPinned) {
  // find a stable title container across UIs
  let titleContainer =
    link.querySelector(".truncate") ||
    link.querySelector('[dir="auto"]') ||
    link.querySelector("span") ||
    link;

  if (!titleContainer) return;
  if (titleContainer.querySelector(".pin-icon")) return;

  const pinWrapper = document.createElement("div");
  pinWrapper.className = "pin-icon";
  pinWrapper.style.cssText =
    "display:inline-flex;align-items:center;margin-right:8px;";

  const pinElement = document.createElement("div");
  pinElement.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    width:16px;height:16px;cursor:pointer;
    opacity:${isPinned ? "1" : "0.7"};
    transition:opacity .2s ease;
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
    if (currentlyPinned) {
      await removePinnedConversation(conversationId);
    } else {
      await addPinnedConversation(conversationId);
    }

    const nowPinned = await isConversationPinned(conversationId);
    updatePinIconState(pinElement, nowPinned);

    // Rebuild mirrors and re-evaluate other lists
    runIdle(processEverything);
  });

  pinWrapper.appendChild(pinElement);
  titleContainer.insertBefore(pinWrapper, titleContainer.firstChild);
}

function updatePinIconState(pinElement, isPinned) {
  pinElement.style.opacity = isPinned ? "1" : "0.7";
  pinElement.style.color = isPinned ? "#22d3ee" : "currentColor";
  const svg = pinElement.querySelector("svg");
  if (svg) svg.setAttribute("fill", isPinned ? "currentColor" : "none");
}

/* =========================
   Query & Utilities
========================= */

/** Exclude mirrors/clones to prevent infinite mirror-of-mirror loops */
function queryAllConversationLinks() {
  const links = document.querySelectorAll('a[href^="/c/"]');
  return [...links].filter(
    (a) =>
      !a.closest(".pinned-mirror") && !a.hasAttribute("data-pinned-clone")
  );
}

/**
 * Walk up ancestors to find a stable list container:
 * - contains at least 2 conversation links (excluding mirrors/clones)
 * - is not inside a pinned mirror
 */
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
    if (!a.closest(".pinned-mirror") && !a.hasAttribute("data-pinned-clone")) {
      count++;
    }
  }
  return count;
}

function extractConversationId(href) {
  if (!href) return null;
  const match = href.match(/\/c\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
}
