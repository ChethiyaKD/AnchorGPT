const STORAGE_ROOT = "chatgpt_notes_v1"; // map: { [chatId]: Note[] }

async function readRoot() {
  try {
    const { [STORAGE_ROOT]: data } = await chrome.storage.sync.get(STORAGE_ROOT);
    return (data && typeof data === "object") ? data : {};
  } catch {
    return {};
  }
}

async function writeRoot(root) {
  try {
    await chrome.storage.sync.set({ [STORAGE_ROOT]: root });
  } catch {}
}

export async function loadNotes(chatId) {
  const root = await readRoot();
  return Array.isArray(root[chatId]) ? root[chatId] : [];
}

export async function saveNotes(chatId, notes) {
  const root = await readRoot();
  root[chatId] = notes;
  await writeRoot(root);
}

export async function addNote(chatId, note) {
  const notes = await loadNotes(chatId);
  const newNote = {
    id: Date.now().toString(),
    content: note,
    ts: Date.now(),
    ...note
  };
  const updatedNotes = [newNote, ...notes];
  await saveNotes(chatId, updatedNotes);
  return newNote;
}

export async function updateNote(chatId, noteId, content) {
  const notes = await loadNotes(chatId);
  const updatedNotes = notes.map(note => 
    note.id === noteId ? { ...note, content, ts: Date.now() } : note
  );
  await saveNotes(chatId, updatedNotes);
}

export async function deleteNote(chatId, noteId) {
  const notes = await loadNotes(chatId);
  const updatedNotes = notes.filter(note => note.id !== noteId);
  await saveNotes(chatId, updatedNotes);
}

export async function clearNotes(chatId) {
  const root = await readRoot();
  delete root[chatId];
  await writeRoot(root);
}
