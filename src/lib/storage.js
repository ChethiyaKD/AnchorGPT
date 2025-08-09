const STORAGE_ROOT = "chatgpt_pins_v2"; // map: { [chatId]: Pin[] }

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

export async function loadPins(chatId) {
  const root = await readRoot();
  return Array.isArray(root[chatId]) ? root[chatId] : [];
}

export async function savePins(chatId, pins) {
  const root = await readRoot();
  root[chatId] = pins;
  await writeRoot(root);
}

export async function clearPins(chatId) {
  const root = await readRoot();
  delete root[chatId];
  await writeRoot(root);
}
