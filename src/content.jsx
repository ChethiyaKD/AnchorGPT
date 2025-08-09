/* global chrome */
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App.jsx";
import { ensureGlobalHighlightStyle } from "./lib/styles.js";

const APP_ROOT_ID = "chatgpt-pin-root";

function ensureAppRoot() {
  let host = document.getElementById(APP_ROOT_ID);
  if (host) return host;

  host = document.createElement("div");
  host.id = APP_ROOT_ID;
  document.documentElement.appendChild(host);

  // Shadow root to keep styles isolated
  const shadow = host.attachShadow({ mode: "open" });

  const mount = document.createElement("div");
  shadow.appendChild(mount);

  const root = createRoot(mount);
  root.render(<App shadowRoot={shadow} />);

  return host;
}

(async function bootstrap() {
  for (let i = 0; i < 5 && !document.body; i++) await new Promise(r => setTimeout(r, 200));
  ensureGlobalHighlightStyle(); // highlight outside shadow
  ensureAppRoot();
})();
