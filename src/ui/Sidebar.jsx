import React, { useEffect, useState } from "react";
import Hotspot from "./Hotspot.jsx";
import PinList from "./PinList.jsx";
import { onTogglePin } from "../lib/bus.js";
import { loadPins, savePins, clearPins } from "../lib/storage.js";
import { getCurrentChatId, onUrlChange } from "../lib/router.js";


export default function Sidebar() {
  const [chatId, setChatId] = useState(getCurrentChatId());
  const [pins, setPins] = useState([]);
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState(null);

  // load pins for current chat
  const refreshPins = async (id = chatId) => {
    if (!id) { setPins([]); return; }
    const data = await loadPins(id);
    setPins(data);
  };

  useEffect(() => {
    refreshPins();
  }, [chatId]);

  // watch URL changes (switching chats)
  useEffect(() => {
    const off = onUrlChange((url) => {
      const id = getCurrentChatId(url);
      if (id !== chatId) {
        setChatId(id);
      }
    });
    // also handle first mount if we didn't have it
    setChatId(getCurrentChatId());
    return off;
  }, [chatId]);

  // when a pin button is clicked in-page
  useEffect(() => {
    const off = onTogglePin((e) => {
      const { id, label } = e.detail || {};
      if (!id) return;
      if (!chatId) return; // no chat context; ignore
      setVisible(true);
      setPins((prev) => {
        const exists = prev.some((p) => p.id === id);
        const next = exists ? prev.filter((p) => p.id !== id) : [{ id, label, ts: Date.now() }, ...prev];
        savePins(chatId, next);
        return next;
      });
    });
    return off;
  }, [chatId]);

  const kickHide = (delay = 1400) => {
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setVisible(false), delay);
    setTimer(t);
  };

  useEffect(() => {
    const onScroll = () => kickHide(900);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const clearCurrent = async () => {
    if (!chatId) return;
    await clearPins(chatId);
    setPins([]);
  };

  const emptyState = chatId
    ? "No pins yet. Click 📌 on any message."
    : "Open a chat to start pinning messages.";

  return (
    <>
      <Hotspot onEnter={() => setVisible(true)} />
      <div
        className={`cgpt-pin-sidebar ${visible ? "is-visible" : "peek"}`}
        onMouseEnter={() => { setVisible(true); if (timer) clearTimeout(timer); }}
        onMouseLeave={() => kickHide(600)}
      >
        <div className="cgpt-pin-header">
          <span>Pinned steps {chatId ? `· ${chatId.slice(0,8)}` : ""}</span>
          <button
            onClick={clearCurrent}
            style={{ fontSize:"11px", border:"1px solid rgba(255,255,255,.2)", background:"transparent", color:"#fff", borderRadius:8, padding:"4px 8px", cursor:"pointer" }}
            disabled={!chatId || pins.length === 0}
            title={!chatId ? "No chat detected" : "Clear pins for this chat"}
          >
            Clear
          </button>
        </div>

        {pins?.length ? (
          <PinList
            pins={pins}
            setPins={(next) => { setPins(next); if (chatId) savePins(chatId, next); }}
            afterClick={() => kickHide(800)}
          />
        ) : (
          <div className="cgpt-pin-empty">{emptyState}</div>
        )}
      </div>
    </>
  );
}
