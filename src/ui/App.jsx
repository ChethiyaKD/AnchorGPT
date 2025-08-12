import React, { useEffect } from "react";
import Sidebar from "./Sidebar.jsx";
import ConversationPinner from "./ConversationPinner.jsx";
import { startMessageObserver } from "../lib/observer.js";
import { injectShadowStyles } from "../lib/styles.js";

export default function App({ shadowRoot }) {
  useEffect(() => {
    const remove = injectShadowStyles(shadowRoot);
    const observer = startMessageObserver();
    return () => {
      remove?.();
      observer?.disconnect?.();
    };
  }, [shadowRoot]);

  return (
    <>
      <Sidebar />
      <ConversationPinner />
    </>
  );
}
