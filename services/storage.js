import { seedCategories, seedPrompts, defaultSettings } from '../data/seed-data.js';

export const SCHEMA_VERSION = 1;

const KEYS = ['schemaVersion', 'categories', 'prompts', 'settings'];

function migrate(root) {
  // No migrations yet; establishes the pattern for future schema bumps.
  if (root.schemaVersion === SCHEMA_VERSION) return root;
  return { ...root, schemaVersion: SCHEMA_VERSION };
}

export async function initializeStorage() {
  const root = {
    schemaVersion: SCHEMA_VERSION,
    categories: seedCategories,
    prompts: seedPrompts,
    settings: defaultSettings,
  };
  await chrome.storage.local.set(root);
  return root;
}

export async function getAll() {
  const root = await chrome.storage.local.get(KEYS);
  if (!root.schemaVersion) {
    return initializeStorage();
  }
  return migrate(root);
}

export async function getPrompts() {
  const { prompts } = await getAll();
  return prompts;
}

export async function getCategories() {
  const { categories } = await getAll();
  return categories;
}

export async function getSettings() {
  const { settings } = await getAll();
  return settings;
}

export async function savePrompt(prompt) {
  const root = await getAll();
  root.prompts = [...root.prompts, prompt];
  await chrome.storage.local.set({ prompts: root.prompts });
  return root.prompts;
}

export async function updatePrompt(id, patch) {
  const root = await getAll();
  root.prompts = root.prompts.map((p) => (p.id === id ? { ...p, ...patch } : p));
  await chrome.storage.local.set({ prompts: root.prompts });
  return root.prompts;
}

export async function deletePrompt(id) {
  const root = await getAll();
  root.prompts = root.prompts.filter((p) => p.id !== id);
  await chrome.storage.local.set({ prompts: root.prompts });
  return root.prompts;
}

export async function saveCategory(category) {
  const root = await getAll();
  root.categories = [...root.categories, category];
  await chrome.storage.local.set({ categories: root.categories });
  return root.categories;
}

// Renames a category and rewrites the denormalised `categoryName` on its
// prompts in the same write, so the two can't drift apart on disk.
export async function renameCategory(id, name) {
  const root = await getAll();
  root.categories = root.categories.map((c) => (c.id === id ? { ...c, name } : c));
  root.prompts = root.prompts.map((p) => (p.categoryId === id ? { ...p, categoryName: name } : p));
  await chrome.storage.local.set({ categories: root.categories, prompts: root.prompts });
  return root;
}

// Repairs prompts whose `categoryName` no longer matches their category
// (left behind by renames made before renameCategory persisted it).
// Writes only when something actually changed.
export async function syncCategoryNames() {
  const root = await getAll();
  const names = new Map(root.categories.map((c) => [c.id, c.name]));
  let changed = false;
  root.prompts = root.prompts.map((p) => {
    const name = names.get(p.categoryId);
    if (name && p.categoryName !== name) {
      changed = true;
      return { ...p, categoryName: name };
    }
    return p;
  });
  if (changed) await chrome.storage.local.set({ prompts: root.prompts });
  return root;
}

export async function deleteCategory(id, { reassignToId = null } = {}) {
  const root = await getAll();
  root.categories = root.categories.filter((c) => c.id !== id);
  root.prompts = root.prompts.map((p) =>
    p.categoryId === id
      ? {
          ...p,
          categoryId: reassignToId,
          categoryName: reassignToId
            ? root.categories.find((c) => c.id === reassignToId)?.name || 'Uncategorized'
            : 'Uncategorized',
        }
      : p
  );
  await chrome.storage.local.set({ categories: root.categories, prompts: root.prompts });
  return root;
}

export async function renameTag(oldName, newName) {
  const root = await getAll();
  root.prompts = root.prompts.map((p) =>
    (p.tags || []).includes(oldName)
      ? { ...p, tags: [...new Set(p.tags.map((t) => (t === oldName ? newName : t)))] }
      : p
  );
  await chrome.storage.local.set({ prompts: root.prompts });
  return root.prompts;
}

export async function deleteTag(name) {
  const root = await getAll();
  root.prompts = root.prompts.map((p) =>
    (p.tags || []).includes(name) ? { ...p, tags: p.tags.filter((t) => t !== name) } : p
  );
  await chrome.storage.local.set({ prompts: root.prompts });
  return root.prompts;
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
  return settings;
}

export async function replaceAll(root) {
  const next = migrate({ ...root, schemaVersion: root.schemaVersion || SCHEMA_VERSION });
  await chrome.storage.local.set(next);
  return next;
}

export const storage = {
  getAll,
  getPrompts,
  savePrompt,
  updatePrompt,
  deletePrompt,
  getCategories,
  saveCategory,
  renameCategory,
  syncCategoryNames,
  deleteCategory,
  renameTag,
  deleteTag,
  getSettings,
  saveSettings,
  replaceAll,
  initializeStorage,
};
