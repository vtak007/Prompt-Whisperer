import { storage } from '../services/storage.js';
import { getState, setState } from './store.js';
import { newId, slugify } from '../utils/ids.js';
import { nowIso } from '../utils/dates.js';

export async function loadAll() {
  const root = await storage.syncCategoryNames();
  setState({ ...root, ready: true });
}

export function showToast(message, kind = 'info') {
  setState({ toast: { message, kind, id: newId() } });
}

export function clearToast() {
  setState({ toast: null });
}

export function openModal(modal) {
  setState({ activeModal: modal });
}

export function closeModal() {
  setState({ activeModal: null });
}

// --- Prompts ---

export async function createPrompt(data) {
  const state = getState();
  const category = state.categories.find((c) => c.id === data.categoryId);
  const prompt = {
    id: newId(),
    title: data.title.trim(),
    categoryId: data.categoryId,
    categoryName: category ? category.name : 'Uncategorized',
    tags: data.tags || [],
    content: data.content,
    notes: data.notes || '',
    isFavorite: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  };
  const prompts = await storage.savePrompt(prompt);
  setState({ prompts });
  return prompt;
}

export async function editPrompt(id, data) {
  const state = getState();
  const category = state.categories.find((c) => c.id === data.categoryId);
  const patch = {
    title: data.title.trim(),
    categoryId: data.categoryId,
    categoryName: category ? category.name : 'Uncategorized',
    tags: data.tags || [],
    content: data.content,
    notes: data.notes || '',
    updatedAt: nowIso(),
  };
  const prompts = await storage.updatePrompt(id, patch);
  setState({ prompts });
}

export async function deletePromptById(id) {
  const prompts = await storage.deletePrompt(id);
  setState({ prompts });
}

export async function duplicatePrompt(id) {
  const state = getState();
  const source = state.prompts.find((p) => p.id === id);
  if (!source) return;
  const copy = {
    ...source,
    id: newId(),
    title: `${source.title} (Copy)`,
    isFavorite: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const prompts = await storage.savePrompt(copy);
  setState({ prompts });
  return copy;
}

export async function toggleFavorite(id) {
  const state = getState();
  const prompt = state.prompts.find((p) => p.id === id);
  if (!prompt) return;
  const prompts = await storage.updatePrompt(id, { isFavorite: !prompt.isFavorite });
  setState({ prompts });
}

// --- Categories ---

export async function createCategory(name) {
  const state = getState();
  let id = slugify(name);
  if (state.categories.some((c) => c.id === id)) id = `${id}-${newId().slice(0, 6)}`;
  const category = { id, name: name.trim(), createdAt: nowIso() };
  const categories = await storage.saveCategory(category);
  setState({ categories });
  return category;
}

export async function renameCategory(id, name) {
  const { categories, prompts } = await storage.renameCategory(id, name.trim());
  setState({ categories, prompts });
}

export async function removeCategory(id, reassignToId = null) {
  const root = await storage.deleteCategory(id, { reassignToId });
  setState({ categories: root.categories, prompts: root.prompts });
}

// --- Tags ---

export async function renameTag(oldName, newName) {
  const prompts = await storage.renameTag(oldName, newName);
  const filter = getState().libraryFilter;
  const patch = { prompts };
  if (filter.type === 'tag' && filter.value === oldName) patch.libraryFilter = { type: 'tag', value: newName };
  setState(patch);
}

export async function removeTag(name) {
  const prompts = await storage.deleteTag(name);
  const filter = getState().libraryFilter;
  const patch = { prompts };
  if (filter.type === 'tag' && filter.value === name) patch.libraryFilter = { type: 'none', value: null };
  setState(patch);
}

// --- Settings ---

export async function updateSettings(patch) {
  const state = getState();
  const settings = { ...state.settings, ...patch };
  await storage.saveSettings(settings);
  setState({ settings });
}

export async function resetToSampleData() {
  const root = await storage.initializeStorage();
  setState({ ...root });
}

// --- Filters ---

export function setLibraryFilter(filter) {
  setState({ libraryFilter: filter });
}

export function toggleCategoriesExpanded() {
  const state = getState();
  const expanded = !state.categoriesExpanded;
  const patch = { categoriesExpanded: expanded };
  if (!expanded && (state.libraryFilter.type === 'all' || state.libraryFilter.type === 'category')) {
    patch.libraryFilter = { type: 'none', value: null };
  }
  setState(patch);
}

export function toggleTagsExpanded() {
  const state = getState();
  const expanded = !state.tagsExpanded;
  const patch = { tagsExpanded: expanded };
  if (!expanded && state.libraryFilter.type === 'tag') {
    patch.libraryFilter = { type: 'none', value: null };
  }
  setState(patch);
}

export function toggleFavoritesExpanded() {
  setState({ favoritesExpanded: !getState().favoritesExpanded });
}

export function setSearchFilters(patch) {
  setState({ searchFilters: { ...getState().searchFilters, ...patch } });
}

// --- Import ---

export async function mergeImport(parsed, strategy) {
  const state = getState();
  const existingIds = new Set(state.prompts.map((p) => p.id));
  const existingByTitleCat = new Set(state.prompts.map((p) => `${p.title.toLowerCase()}::${p.categoryId}`));

  let categories = [...state.categories];
  (parsed.categories || []).forEach((c) => {
    if (!categories.some((existing) => existing.id === c.id)) categories.push(c);
  });

  let prompts = [...state.prompts];
  (parsed.prompts || []).forEach((incoming) => {
    const isDuplicate =
      existingIds.has(incoming.id) || existingByTitleCat.has(`${incoming.title.toLowerCase()}::${incoming.categoryId}`);
    if (!isDuplicate) {
      prompts.push(incoming);
      return;
    }
    if (strategy === 'skip') return;
    if (strategy === 'replace') {
      prompts = prompts.filter((p) => p.id !== incoming.id);
      prompts.push(incoming);
      return;
    }
    if (strategy === 'keep-both') {
      prompts.push({ ...incoming, id: newId(), title: `${incoming.title} (Imported)` });
    }
  });

  const root = await storage.replaceAll({
    schemaVersion: state.schemaVersion,
    categories,
    prompts,
    settings: state.settings,
  });
  setState({ categories: root.categories, prompts: root.prompts });
}
