import React, { useState } from "react";
import { addNote, updateNote, deleteNote } from "../lib/notes.js";
import TextInput from "./TextInput.jsx";
import NoteItem from "./NoteItem.jsx";

const notesStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  header: {
    fontWeight: "600",
    fontSize: "14px",
    marginBottom: "4px",
    color: "#fff"
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "300px",
    overflowY: "auto"
  }
};

export default function Notes({ chatId, notes, setNotes, afterAction }) {
  const [newNote, setNewNote] = useState("");

  const handleAddNote = async () => {
    if (!newNote.trim() || !chatId) return;
    
    const note = await addNote(chatId, newNote.trim());
    setNotes(prev => [note, ...prev]);
    setNewNote("");
    afterAction?.();
  };

  const handleUpdateNote = async (noteId, content) => {
    await updateNote(chatId, noteId, content);
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, content, ts: Date.now() } : note
    ));
    afterAction?.();
  };

  const handleDeleteNote = async (noteId) => {
    await deleteNote(chatId, noteId);
    setNotes(prev => prev.filter(note => note.id !== noteId));
    afterAction?.();
  };

  return (
    <div style={notesStyles.container}>
      <div style={notesStyles.header}>
        <span>Notes</span>
      </div>
      
      <TextInput
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddNote();
          }
        }}
        onSubmit={handleAddNote}
        disabled={!chatId}
      />

      <div style={notesStyles.list}>
        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
          />
        ))}
      </div>
    </div>
  );
}
