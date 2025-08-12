import React, { useEffect } from "react";

export default function ConversationColorizer() {
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
      closeColorPopover();
    };
  }, []);

  return null;
}

/* =========================
   Module-scope helpers
========================= */

const processedLinks = new WeakSet();
let currentPopover = null;

// Available colors palette
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

const setupObserver = () => {
  const observer = new MutationObserver(() => {
    clearTimeout(window.colorTimeout);
    window.colorTimeout = setTimeout(() => {
      runIdle(processConversations);
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
};

const processConversations = () => {
  const allLinks = queryAllConversationLinks();

  for (const link of allLinks) {
    if (processedLinks.has(link)) {
      // Re-apply color (in case it changed)
      const id = extractConversationId(link.getAttribute("href"));
      if (id) {
        const savedColor = getConversationColor(id);
        if (savedColor) applyColorStyles(link, savedColor);
      }
      continue;
    }

    const conversationId = extractConversationId(link.getAttribute("href"));
    if (!conversationId) continue;

    addColorUI(link, conversationId);
    
    // Apply stored color
    const savedColor = getConversationColor(conversationId);
    if (savedColor) applyColorStyles(link, savedColor);
    
    processedLinks.add(link);
  }
};

const addColorUI = (link, conversationId) => {
  // Find title container
  let titleContainer = link.querySelector(".truncate") ||
                      link.querySelector('[dir="auto"]') ||
                      link.querySelector("span") ||
                      link;

  if (!titleContainer) return;

  // Add color indicator dot
  // if (!titleContainer.querySelector(`.conv-color-indicator[data-conv-id="${conversationId}"]`)) {
  //   const indicator = document.createElement("span");
  //   indicator.className = "conv-color-indicator";
  //   indicator.dataset.convId = conversationId;
  //   indicator.style.cssText = `
  //     display:inline-block;margin-right:6px;width:10px;height:10px;border-radius:50%;
  //     border:1px solid rgba(255,255,255,.25); vertical-align:middle;
  //   `;
  //   const saved = getConversationColor(conversationId);
  //   if (saved) {
  //     indicator.style.background = saved;
  //     indicator.style.border = "1px solid rgba(0,0,0,.25)";
  //   }
  //   titleContainer.insertBefore(
  //     indicator,
  //     titleContainer.firstChild?.nextSibling || null
  //   );
  // }

  // Add color palette trigger
  if (!titleContainer.querySelector(`.conv-color-trigger[data-conv-id="${conversationId}"]`)) {
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
    
    // Simple palette icon (dots)
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

    // Place it after the indicator
    const after = titleContainer.querySelector(`.conv-color-indicator[data-conv-id="${conversationId}"]`);
    titleContainer.insertBefore(
      trigger,
      after?.nextSibling || titleContainer.firstChild
    );
  }
};

/* =========================
   Color storage & utilities
========================= */

const setConversationColor = (id, color) => {
  const saved = JSON.parse(localStorage.getItem("conversationColors") || "{}");
  saved[id] = color;
  localStorage.setItem("conversationColors", JSON.stringify(saved));
};

const getConversationColor = (id) => {
  const saved = JSON.parse(localStorage.getItem("conversationColors") || "{}");
  return saved[id] || "";
};

const hexToRgba = (hex, alpha = 0.5) => {
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
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return "";
};

const getConversationBgColor = (color, alpha = 0.45) => {
  if (!color || color === "#00000000") return "transparent";
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) return color;
  return hexToRgba(color, alpha);
};

const applyColorStyles = (el, color) => {
  el.style.backgroundColor = getConversationBgColor(color);
  el.style.borderRadius = el.style.borderRadius || "8px";
  el.style.transition = el.style.transition || "background-color .15s ease";
  if (!el.style.paddingInline) el.style.paddingInline = "10px";
};

const applyColorToAllInstances = (conversationId, color) => {
  setConversationColor(conversationId, color);

  // Apply to all conversation links
  const realLinks = queryAllConversationLinks();
  for (const link of realLinks) {
    const id = extractConversationId(link.getAttribute("href"));
    if (id === conversationId) applyColorStyles(link, color);
  }

  // Update indicator dots
  // document
  //   .querySelectorAll(`.conv-color-indicator[data-conv-id="${conversationId}"]`)
  //   .forEach((dot) => {
  //     dot.style.background = color || "transparent";
  //     dot.style.border = color
  //       ? "1px solid rgba(0,0,0,.25)"
  //       : "1px solid rgba(255,255,255,.25)";
  //   });
};

/* =========================
   Color popover
========================= */

const closeColorPopover = () => {
  if (currentPopover?.el?.isConnected) {
    currentPopover.el.remove();
  }
  currentPopover = null;

  // Remove global listeners
  window.removeEventListener("mousedown", handleGlobalClose, true);
  window.removeEventListener("scroll", handleGlobalClose, true);
  window.removeEventListener("resize", handleGlobalClose, true);
};

const handleGlobalClose = (e) => {
  if (!currentPopover) return;
  const { el, anchor } = currentPopover;
  if (!el.contains(e.target) && !anchor.contains(e.target)) {
    closeColorPopover();
  }
};

const openColorPopover = (conversationId, anchorEl) => {
  // Toggle if same anchor is clicked
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

  // Create color swatches
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
      // Subtle slash for "clear"
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

  // Position near anchor
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

  // Add close handlers
  setTimeout(() => {
    window.addEventListener("mousedown", handleGlobalClose, true);
    window.addEventListener("scroll", handleGlobalClose, true);
    window.addEventListener("resize", handleGlobalClose, true);
  }, 0);
};

/* =========================
   Utilities
========================= */

const queryAllConversationLinks = () => {
  const links = document.querySelectorAll('a[href^="/c/"]');
  return [...links].filter(a => !a.closest(".pinned-mirror"));
};

const extractConversationId = (href) => {
  if (!href) return null;
  const m = href.match(/\/c\/([a-f0-9-]+)/i);
  return m ? m[1] : null;
};
