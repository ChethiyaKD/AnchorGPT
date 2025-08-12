import React, { useEffect } from "react";
import {
  addPinnedConversation,
  removePinnedConversation,
  isConversationPinned,
  getPinnedConversations,
} from "../lib/conversationPins.js";

export default function ConversationPinner() {
  useEffect(() => {
    let mounted = true;
    let observer = null;
    let timeout = null;

    const init = () => {
      if (!mounted) return;
      setupObserver();
      runIdle(processConversations);
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

const processedLinks = new WeakSet();

const runIdle = (fn) => {
  if ("requestIdleCallback" in window) {
    return requestIdleCallback(fn, { timeout: 1000 });
  }
  return setTimeout(fn, 250);
};

const setupObserver = () => {
  const observer = new MutationObserver(() => {
    clearTimeout(window.pinTimeout);
    window.pinTimeout = setTimeout(() => {
      runIdle(processConversations);
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
};

const processConversations = async () => {
  const allLinks = queryAllConversationLinks();

  for (const link of allLinks) {
    if (processedLinks.has(link)) continue;

    const conversationId = extractConversationId(link.getAttribute("href"));
    if (!conversationId) continue;

    const pinned = await isConversationPinned(conversationId);
    addPinUI(link, conversationId, pinned);
    processedLinks.add(link);
  }
};

const addPinUI = (link, conversationId, isPinned) => {
  // Find title container
  let titleContainer = link.querySelector(".truncate") ||
                      link.querySelector('[dir="auto"]') ||
                      link.querySelector("span") ||
                      link;

  if (!titleContainer || titleContainer.querySelector(".pin-icon")) return;

  // Create pin icon wrapper
  const pinWrapper = document.createElement("div");
  pinWrapper.className = "pin-icon";
  pinWrapper.style.cssText = "display:inline-flex;align-items:center;margin-right:6px;";

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
    if (currentlyPinned) {
      await removePinnedConversation(conversationId);
    } else {
      await addPinnedConversation(conversationId);
    }

    const nowPinned = await isConversationPinned(conversationId);
    updatePinIconState(pinElement, nowPinned);

    // Trigger reordering
    runIdle(processConversations);
  });

  pinWrapper.appendChild(pinElement);
  titleContainer.insertBefore(pinWrapper, titleContainer.firstChild);
};

const updatePinIconState = (pinElement, isPinned) => {
  pinElement.style.opacity = isPinned ? "1" : "0.6";
  pinElement.style.color = isPinned ? "#22d3ee" : "currentColor";
  const svg = pinElement.querySelector("svg");
  if (svg) svg.setAttribute("fill", isPinned ? "currentColor" : "none");
  pinElement.title = isPinned ? "Unpin conversation" : "Pin conversation";
};

const queryAllConversationLinks = () => {
  const links = document.querySelectorAll('a[href^="/c/"]');
  return [...links].filter(a => !a.closest(".pinned-mirror"));
};

const extractConversationId = (href) => {
  if (!href) return null;
  const m = href.match(/\/c\/([a-f0-9-]+)/i);
  return m ? m[1] : null;
};
