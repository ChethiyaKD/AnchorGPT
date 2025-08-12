import React, { useState } from "react";
import TextInput from "./TextInput.jsx";

const noteItemStyles = {
  container: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: "8px",
    padding: "8px",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  content: {
    fontSize: "12px",
    lineHeight: "1.4",
    marginBottom: "6px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: "#fff"
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "10px",
    opacity: "0.7"
  },
  time: {
    color: "rgba(255,255,255,0.6)"
  },
  actions: {
    display: "flex",
    gap: "4px"
  },
  actionButton: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "rgba(255,255,255,0.8)",
    borderRadius: "4px",
    padding: "2px 6px",
    cursor: "pointer",
    fontSize: "10px",
    transition: "all 0.2s ease",
    fontFamily: "inherit"
  },
  actionButtonHover: {
    background: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.3)"
  },
  editContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  editTextarea: {
    width: "100%",
    minHeight: "60px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "6px",
    color: "#fff",
    padding: "6px",
    fontSize: "12px",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box"
  },
  editTextareaFocus: {
    borderColor: "rgba(34, 211, 238, 0.6)",
    background: "rgba(255,255,255,0.1)"
  },
  editActions: {
    display: "flex",
    gap: "4px",
    justifyContent: "flex-end"
  },
  saveButton: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.4)",
    color: "#22c55e",
    borderRadius: "4px",
    padding: "2px 6px",
    cursor: "pointer",
    fontSize: "10px",
    fontFamily: "inherit"
  },
  cancelButton: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#ef4444",
    borderRadius: "4px",
    padding: "2px 6px",
    cursor: "pointer",
    fontSize: "10px",
    fontFamily: "inherit"
  }
};

export default function NoteItem({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isFocused, setIsFocused] = useState(false);

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(note.id, editContent.trim());
      setIsEditing(false);
      setEditContent(note.content);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(note.content);
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleString();
  };

  if (isEditing) {
    return (
      <div style={noteItemStyles.container}>
        <div style={noteItemStyles.editContainer}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              ...noteItemStyles.editTextarea,
              ...(isFocused && noteItemStyles.editTextareaFocus)
            }}
            autoFocus
          />
          <div style={noteItemStyles.editActions}>
            <button onClick={handleSave} style={noteItemStyles.saveButton}>
              Save
            </button>
            <button onClick={handleCancel} style={noteItemStyles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={noteItemStyles.container}>
      <div style={noteItemStyles.content}>{note.content}</div>
      <div style={noteItemStyles.meta}>
        <span style={noteItemStyles.time}>{formatTime(note.ts)}</span>
        <div style={noteItemStyles.actions}>
          <button 
            onClick={() => setIsEditing(true)}
            style={noteItemStyles.actionButton}
            onMouseEnter={(e) => {
              e.target.style.background = noteItemStyles.actionButtonHover.background;
              e.target.style.borderColor = noteItemStyles.actionButtonHover.borderColor;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            Edit
          </button>
          <button 
            onClick={() => onDelete(note.id)}
            style={noteItemStyles.actionButton}
            onMouseEnter={(e) => {
              e.target.style.background = noteItemStyles.actionButtonHover.background;
              e.target.style.borderColor = noteItemStyles.actionButtonHover.borderColor;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
