import React, { useEffect, useState } from "react";
import Hotspot from "./Hotspot.jsx";
import PinList from "./PinList.jsx";
import Notes from "./Notes.jsx";
import { onTogglePin } from "../lib/bus.js";
import { loadPins, savePins, clearPins } from "../lib/storage.js";
import { loadNotes, clearNotes } from "../lib/notes.js";
import { getCurrentChatId, onUrlChange } from "../lib/router.js";


export default function Sidebar() {
  const [chatId, setChatId] = useState(getCurrentChatId());
  const [pins, setPins] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState("pins"); // "pins" or "notes"
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState(null);

  // load pins and notes for current chat
  const refreshData = async (id = chatId) => {
    if (!id) { 
      setPins([]); 
      setNotes([]); 
      return; 
    }
    const [pinsData, notesData] = await Promise.all([
      loadPins(id),
      loadNotes(id)
    ]);
    setPins(pinsData);
    setNotes(notesData);
  };

  useEffect(() => {
    refreshData();
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
    if (activeTab === "pins") {
      await clearPins(chatId);
      setPins([]);
    } else {
      await clearNotes(chatId);
      setNotes([]);
    }
  };

  const getEmptyState = () => {
    if (!chatId) {
      return "Open a chat to start pinning messages and adding notes.";
    }
    if (activeTab === "pins") {
      return "No pins yet. Click 📌 on any message.";
    } else {
      return "No notes yet. Add your first note above.";
    }
  };

  return (
    <>
      <Hotspot onEnter={() => setVisible(true)} />
      <div
        className={`cgpt-pin-sidebar ${visible ? "is-visible" : "peek"}`}
        onMouseEnter={() => { setVisible(true); if (timer) clearTimeout(timer); }}
        onMouseLeave={() => kickHide(600)}
      >
        <div className="cgpt-pin-header">
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              style={{
                background: activeTab === "pins" ? "rgba(255,255,255,0.15)" : "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: activeTab === "pins" ? "#fff" : "rgba(255,255,255,0.7)",
                borderRadius: "6px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "11px",
                transition: "all 0.2s ease",
                fontFamily: "inherit"
              }}
              onClick={() => setActiveTab("pins")}
            >
              📌 Pins
            </button>
            <button
              style={{
                background: activeTab === "notes" ? "rgba(255,255,255,0.15)" : "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: activeTab === "notes" ? "#fff" : "rgba(255,255,255,0.7)",
                borderRadius: "6px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "11px",
                transition: "all 0.2s ease",
                fontFamily: "inherit"
              }}
              onClick={() => setActiveTab("notes")}
            >
              📝 Notes
            </button>
          </div>
          <span>{chatId ? `· ${chatId.slice(0,8)}` : ""}</span>
          <button
            onClick={clearCurrent}
            style={{ fontSize:"11px", border:"1px solid rgba(255,255,255,.2)", background:"transparent", color:"#fff", borderRadius:8, padding:"4px 8px", cursor:"pointer" }}
            disabled={!chatId || (activeTab === "pins" ? pins.length === 0 : notes.length === 0)}
            title={!chatId ? "No chat detected" : `Clear ${activeTab} for this chat`}
          >
            Clear
          </button>
        </div>

        {activeTab === "pins" ? (
          pins?.length ? (
            <PinList
              pins={pins}
              setPins={(next) => { setPins(next); if (chatId) savePins(chatId, next); }}
              afterClick={() => kickHide(800)}
            />
          ) : (
            <div className="cgpt-pin-empty">{getEmptyState()}</div>
          )
        ) : (
          <Notes
            chatId={chatId}
            notes={notes}
            setNotes={setNotes}
            afterAction={() => kickHide(800)}
          />
        )}
      </div>
    </>
  );
}
