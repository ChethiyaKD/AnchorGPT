import React from "react";
import { scrollToMessage } from "../lib/dom.js";

export default function PinItem({ pin, onRemove, onClick }) {
  return (
    <div
      className="cgpt-pin-item"
      onClick={() => { scrollToMessage(pin.id); onClick?.(); }}
      title={pin.id}
    >
      <div style={{ fontSize:14, lineHeight:1 }}>📌</div>
      <div className="cgpt-pin-text">{pin.label}</div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove"
        style={{
          marginLeft: "auto",
          background: "transparent",
          color: "#fff",
          border: "1px solid rgba(255,255,255,.2)",
          borderRadius: 8,
          padding: "2px 6px",
          fontSize: 11,
          cursor: "pointer",
        }}
      >
        Remove
      </button>
    </div>
  );
}
