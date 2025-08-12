const STORAGE_ROOT = "chatgpt_conversation_pins_v1"; // array of pinned conversation IDs

async function readPinnedConversations() {
  try {
    const { [STORAGE_ROOT]: data } = await chrome.storage.sync.get(STORAGE_ROOT);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writePinnedConversations(pinnedIds) {
  try {
    await chrome.storage.sync.set({ [STORAGE_ROOT]: pinnedIds });
  } catch {}
}

export async function getPinnedConversations() {
  return await readPinnedConversations();
}

export async function addPinnedConversation(conversationId) {
  const pinned = await readPinnedConversations();
  if (!pinned.includes(conversationId)) {
    pinned.unshift(conversationId); // Add to beginning
    await writePinnedConversations(pinned);
  }
  return pinned;
}

export async function removePinnedConversation(conversationId) {
  const pinned = await readPinnedConversations();
  const filtered = pinned.filter(id => id !== conversationId);
  await writePinnedConversations(filtered);
  return filtered;
}

export async function isConversationPinned(conversationId) {
  const pinned = await readPinnedConversations();
  return pinned.includes(conversationId);
}

export async function reorderPinnedConversations(conversationIds) {
  await writePinnedConversations(conversationIds);
}
