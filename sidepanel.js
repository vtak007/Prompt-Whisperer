import { getState, setState, setStateSilent, subscribe } from './store/store.js';
import * as actions from './store/actions.js';
import { initRouter, navigate as routerNavigate } from './router/router.js';
import { renderHeader } from './components/Header.js';
import { renderNavigation } from './components/Navigation.js';
import { renderFooter } from './components/Footer.js';
import { renderModal } from './components/Modal.js';
import { renderToast } from './components/Toast.js';
import { renderLibraryView } from './views/LibraryView.js';
import { renderCreateView } from './views/CreateView.js';
import { renderEditView } from './views/EditView.js';
import { renderOptimizeView } from './views/OptimizeView.js';
import { renderImportExportView } from './views/ImportExportView.js';
import { renderSearchView } from './views/SearchView.js';
import { renderSettingsView } from './views/SettingsView.js';
import { validatePrompt, validateCategoryName, validateTagName } from './utils/validation.js';
import { copyToClipboard } from './services/clipboard.js';
import { insertIntoActiveTab } from './services/promptInsertion.js';
import { optimizePrompt, fetchAnthropicModels } from './services/optimizer.js';
import { buildExport, downloadJson, defaultExportFilename, parseImportFile, buildImportPreview } from './services/importExport.js';
import { debounce, qs } from './utils/dom.js';

const headerEl = document.getElementById('app-header');
const navEl = document.getElementById('app-nav');
const viewEl = document.getElementById('app-view');
const footerEl = document.getElementById('app-footer');
const modalEl = document.getElementById('app-modal');
const toastEl = document.getElementById('app-toast');

let toastTimer = null;

function renderViewHtml(state) {
  switch (state.currentView) {
    case 'library':
      return renderLibraryView(state);
    case 'create':
      return renderCreateView(state);
    case 'edit':
      return renderEditView(state);
    case 'optimize':
      return renderOptimizeView(state);
    case 'import-export':
      return renderImportExportView(state);
    case 'search':
      return renderSearchView(state);
    case 'settings':
      return renderSettingsView(state);
    default:
      return renderLibraryView(state);
  }
}

function renderPreservingFocus(container, html) {
  const active = document.activeElement;
  let restore = null;
  if (active && container.contains(active)) {
    const selector = active.id
      ? `#${CSS.escape(active.id)}`
      : active.dataset && active.dataset.field
      ? `[data-field="${active.dataset.field}"]`
      : null;
    if (selector) {
      restore = { selector, start: active.selectionStart, end: active.selectionEnd };
    }
  }
  container.innerHTML = html;
  if (restore) {
    const el = container.querySelector(restore.selector);
    if (el) {
      el.focus();
      if (typeof restore.start === 'number' && el.setSelectionRange) {
        try {
          el.setSelectionRange(restore.start, restore.end);
        } catch {
          /* not a text-selectable input */
        }
      }
    }
  }
}

let lastRenderedView = null;

function render(state) {
  document.documentElement.dataset.theme = state.settings.appearance || 'light';
  headerEl.innerHTML = renderHeader();
  navEl.innerHTML = renderNavigation(state);
  renderPreservingFocus(viewEl, renderViewHtml(state));
  footerEl.innerHTML = renderFooter();
  modalEl.innerHTML = renderModal(state);
  toastEl.innerHTML = renderToast(state);

  if (state.currentView !== lastRenderedView) {
    lastRenderedView = state.currentView;
    viewEl.scrollTop = 0;
  }

  if (state.toast) {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => actions.clearToast(), 2200);
  }
}

subscribe(render);

// --- form draft helpers ---

function syncDraftFromForm(formEl, extra = {}) {
  const state = getState();
  const patch = { ...extra };
  const title = qs(formEl, '[data-field="title"]');
  const content = qs(formEl, '[data-field="content"]');
  const notes = qs(formEl, '[data-field="notes"]');
  const categoryId = qs(formEl, '[data-field="categoryId"]');
  if (title) patch.title = title.value;
  if (content) patch.content = content.value;
  if (notes) patch.notes = notes.value;
  if (categoryId) patch.categoryId = categoryId.value;
  setStateSilent({ formDraft: { ...state.formDraft, ...patch } });
}

function resetFormDraft() {
  setStateSilent({ formDraft: { title: '', categoryId: '', tags: [], content: '', notes: '', errors: {} } });
}

function populateFormDraftFromPrompt(prompt) {
  setStateSilent({
    formDraft: {
      title: prompt.title,
      categoryId: prompt.categoryId,
      tags: [...(prompt.tags || [])],
      content: prompt.content,
      notes: prompt.notes || '',
      errors: {},
    },
  });
}

function handlePromptClickBehavior(id, behavior) {
  const prompt = getState().prompts.find((p) => p.id === id);
  if (!prompt) return;
  if (behavior === 'copy') return doCopy(id);
  if (behavior === 'insert') return doInsert(id);
  if (behavior === 'ask') {
    actions.openModal({ type: 'ask-prompt-action', id, title: prompt.title });
    return;
  }
  // 'open' (default)
  populateFormDraftFromPrompt(prompt);
  setStateSilent({ formDirty: false });
  routerNavigate('edit', id);
}

async function doCopy(id) {
  const prompt = getState().prompts.find((p) => p.id === id);
  if (!prompt) return;
  const ok = await copyToClipboard(prompt.content);
  actions.showToast(ok ? 'Prompt copied' : 'Could not copy prompt', ok ? 'info' : 'error');
}

async function runOptimize({ prompt, goal, instructions }) {
  const { provider, model, apiKey } = getState().settings.optimization;
  setState({ optimizeLoading: true });
  try {
    const result = await optimizePrompt({ prompt, goal, instructions, provider, model, apiKey });
    setState({
      optimizeResult: { original: prompt, optimized: result.optimized, provider: result.provider, model: result.model },
      optimizeLoading: false,
    });
  } catch (err) {
    console.error('[Prompt Whisperer] Optimize failed:', err.message);
    setState({ optimizeLoading: false });
    actions.showToast(err.message || 'Optimization failed.', 'error');
  }
}

async function doInsert(id) {
  const prompt = getState().prompts.find((p) => p.id === id);
  if (!prompt) return;
  const result = await insertIntoActiveTab(prompt.content);
  if (result.ok) {
    actions.showToast('Prompt inserted');
  } else if (result.reason === 'tab-unavailable') {
    actions.showToast('Active tab cannot be accessed.', 'error');
  } else {
    actions.showToast('No editable text field was detected on the active page.', 'error');
  }
}

// --- click delegation ---

document.getElementById('app').addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]');

  // Overlay click-to-close: only when the overlay itself (not its children) is the target.
  if (event.target.matches('[data-action="modal-overlay"]')) {
    actions.closeModal();
    return;
  }

  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;
  const state = getState();

  switch (action) {
    case 'navigate': {
      const view = el.dataset.view;
      if (view === 'create') resetFormDraft();
      setStateSilent({ formDirty: false });
      routerNavigate(view);
      break;
    }
    case 'open-settings':
      routerNavigate('settings');
      break;
    case 'open-help':
      actions.openModal({ type: 'help' });
      break;
    case 'close-modal':
      actions.closeModal();
      break;

    // Library
    case 'toggle-categories':
      actions.toggleCategoriesExpanded();
      break;
    case 'toggle-tags':
      actions.toggleTagsExpanded();
      break;
    case 'toggle-favorites':
      actions.toggleFavoritesExpanded();
      break;
    case 'add-category':
      actions.openModal({ type: 'new-category', context: state.currentView === 'library' ? 'library' : 'form' });
      break;
    case 'edit-category': {
      const category = state.categories.find((c) => c.id === id);
      if (category) actions.openModal({ type: 'edit-category', id, name: category.name });
      break;
    }
    case 'delete-category': {
      const category = state.categories.find((c) => c.id === id);
      if (category) {
        actions.openModal({
          type: 'confirm-delete-category',
          id,
          name: category.name,
          otherCategories: state.categories.filter((c) => c.id !== id),
        });
      }
      break;
    }
    case 'confirm-delete-category': {
      const select = qs(modalEl, '#reassign-category');
      const reassignTo = select && select.value ? select.value : null;
      await actions.removeCategory(id, reassignTo);
      actions.closeModal();
      actions.showToast('Category deleted');
      break;
    }
    case 'select-all-prompts':
      actions.setLibraryFilter({ type: 'all', value: null });
      break;
    case 'select-category':
      actions.setLibraryFilter({ type: 'category', value: id });
      break;
    case 'select-tag':
      actions.setLibraryFilter({ type: 'tag', value: el.dataset.tag });
      break;
    case 'edit-tag':
      actions.openModal({ type: 'edit-tag', tag: el.dataset.tag });
      break;
    case 'delete-tag':
      actions.openModal({ type: 'confirm-delete-tag', tag: el.dataset.tag });
      break;
    case 'confirm-delete-tag': {
      const tag = el.dataset.tag;
      await actions.removeTag(tag);
      actions.closeModal();
      actions.showToast('Tag deleted');
      break;
    }

    // Prompt card actions
    case 'toggle-favorite':
      await actions.toggleFavorite(id);
      break;
    case 'copy-prompt':
      await doCopy(id);
      break;
    case 'insert-prompt':
      await doInsert(id);
      break;
    case 'open-prompt':
      handlePromptClickBehavior(id, state.settings.promptClickBehavior || 'open');
      break;
    case 'ask-open':
      actions.closeModal();
      handlePromptClickBehavior(id, 'open');
      break;
    case 'ask-copy':
      actions.closeModal();
      await doCopy(id);
      break;
    case 'ask-insert':
      actions.closeModal();
      await doInsert(id);
      break;
    case 'edit-prompt': {
      const prompt = state.prompts.find((p) => p.id === id);
      if (prompt) {
        populateFormDraftFromPrompt(prompt);
        setStateSilent({ formDirty: false });
        routerNavigate('edit', id);
      }
      break;
    }
    case 'duplicate-prompt':
      await actions.duplicatePrompt(id);
      actions.showToast('Prompt duplicated');
      break;
    case 'optimize-prompt': {
      const prompt = state.prompts.find((p) => p.id === id);
      if (prompt) {
        setStateSilent({
          optimizeSourceId: id,
          optimizeDraft: { prompt: prompt.content, goal: 'general', instructions: '' },
          optimizeResult: null,
        });
        routerNavigate('optimize');
      }
      break;
    }
    case 'delete-prompt': {
      const prompt = state.prompts.find((p) => p.id === id);
      if (prompt) actions.openModal({ type: 'confirm-delete-prompt', id, title: prompt.title });
      break;
    }
    case 'confirm-delete-prompt':
      await actions.deletePromptById(id);
      actions.closeModal();
      actions.showToast('Prompt deleted');
      break;

    // Create/Edit form
    case 'cancel-form':
      resetFormDraft();
      setStateSilent({ formDirty: false });
      routerNavigate('library');
      render(getState());
      break;
    case 'remove-tag': {
      const form = event.target.closest('form');
      if (form) syncDraftFromForm(form);
      const draft = getState().formDraft;
      setState({ formDraft: { ...draft, tags: draft.tags.filter((t) => t !== el.dataset.tag) } });
      break;
    }
    case 'add-tag':
      actions.openModal({ type: 'new-tag' });
      break;

    // Optimize
    case 'run-optimize': {
      const promptText = qs(viewEl, '[data-field="optimize-prompt"]')?.value || '';
      const goal = qs(viewEl, '[data-field="optimize-goal"]')?.value || 'general';
      const instructions = qs(viewEl, '[data-field="optimize-instructions"]')?.value || '';
      setState({ optimizeDraft: { prompt: promptText, goal, instructions } });
      await runOptimize({ prompt: promptText, goal, instructions });
      break;
    }
    case 're-optimize': {
      const editedText = qs(viewEl, '[data-field="optimize-result-text"]')?.value;
      const draft = getState().optimizeDraft;
      const promptText = editedText || draft.prompt;
      await runOptimize({ ...draft, prompt: promptText });
      break;
    }
    case 'copy-optimized': {
      const text = qs(viewEl, '[data-field="optimize-result-text"]')?.value || '';
      const ok = await copyToClipboard(text);
      actions.showToast(ok ? 'Prompt copied' : 'Could not copy prompt', ok ? 'info' : 'error');
      break;
    }
    case 'replace-original': {
      const sourceId = getState().optimizeSourceId;
      const text = qs(viewEl, '[data-field="optimize-result-text"]')?.value || '';
      if (sourceId) {
        await actions.editPrompt(sourceId, {
          ...getState().prompts.find((p) => p.id === sourceId),
          content: text,
        });
        actions.showToast('Original prompt updated');
      }
      break;
    }
    case 'save-as-new': {
      const text = qs(viewEl, '[data-field="optimize-result-text"]')?.value || '';
      const sourceId = getState().optimizeSourceId;
      const source = sourceId ? getState().prompts.find((p) => p.id === sourceId) : null;
      setStateSilent({ pendingOptimizedText: text });
      actions.openModal({
        type: 'save-as-new',
        title: source ? `${source.title} (Optimized)` : '',
        categoryId: source ? source.categoryId : '',
        categories: getState().categories,
      });
      break;
    }

    // Import/Export
    case 'do-export': {
      const scopeSelect = qs(viewEl, '[data-field="export-scope"]');
      const categorySelect = qs(viewEl, '[data-field="export-category"]');
      const notesCheckbox = qs(viewEl, '[data-field="export-notes"]');
      const scopeType = scopeSelect ? scopeSelect.value : 'all';
      const scope = scopeType === 'category' ? { type: 'category', categoryId: categorySelect?.value } : { type: scopeType };
      const json = buildExport(state, {
        scope,
        includeNotes: notesCheckbox ? notesCheckbox.checked : true,
        prettyPrint: state.settings.importExport?.prettyPrintJson !== false,
      });
      downloadJson(json, defaultExportFilename());
      actions.showToast('Library exported');
      break;
    }
    case 'confirm-import': {
      const strategySelect = qs(modalEl, '#duplicate-strategy');
      const strategy = strategySelect ? strategySelect.value : 'skip';
      const data = getState().importParsedData;
      if (data) await actions.mergeImport(data, strategy);
      actions.closeModal();
      setStateSilent({ importParsedData: null, importPreview: null });
      actions.showToast('Import complete');
      break;
    }

    // Settings
    case 'reset-sample-data':
      actions.openModal({ type: 'confirm-reset-sample' });
      break;
    case 'confirm-reset-sample':
      await actions.resetToSampleData();
      actions.closeModal();
      actions.showToast('Library reset to sample data');
      break;
    case 'refresh-models': {
      const apiKey = state.settings.optimization.apiKey;
      if (!apiKey || !apiKey.trim()) {
        actions.showToast('Add an API key first.', 'error');
        break;
      }
      setState({ modelsLoading: true });
      try {
        const models = await fetchAnthropicModels(apiKey);
        await actions.updateSettings({
          optimization: { ...getState().settings.optimization, availableModels: models, modelsFetchedAt: new Date().toISOString() },
        });
        actions.showToast(`Model list updated (${models.length} models).`);
      } catch (err) {
        console.error('[Prompt Whisperer] Refresh models failed:', err.message);
        actions.showToast(err.message || 'Could not fetch model list.', 'error');
      } finally {
        setState({ modelsLoading: false });
      }
      break;
    }

    default:
      break;
  }
});

// --- change delegation (selects/checkboxes) ---

document.getElementById('app').addEventListener('change', async (event) => {
  const el = event.target;
  const field = el.dataset.field;
  if (!field) return;
  const state = getState();

  switch (field) {
    case 'categoryId': {
      const form = el.closest('form');
      if (form) syncDraftFromForm(form);
      break;
    }
    case 'export-scope': {
      const wrapper = document.querySelector('[data-export-category-field]');
      if (wrapper) wrapper.style.display = el.value === 'category' ? '' : 'none';
      break;
    }
    case 'search-category':
      actions.setSearchFilters({ categoryId: el.value });
      break;
    case 'search-tag':
      actions.setSearchFilters({ tagId: el.value });
      break;
    case 'import-file': {
      const file = el.files && el.files[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parseImportFile(text);
      if (!parsed.valid) {
        actions.showToast(parsed.error, 'error');
        el.value = '';
        return;
      }
      const preview = buildImportPreview(parsed.data, state.prompts);
      setState({ importParsedData: parsed.data, importPreview: preview });
      actions.openModal({ type: 'confirm-import', preview });
      break;
    }
    case 'setting-appearance':
      await actions.updateSettings({ appearance: el.value });
      break;
    case 'setting-startup-view':
      await actions.updateSettings({ defaultStartupView: el.value });
      break;
    case 'setting-click-behavior':
      await actions.updateSettings({ promptClickBehavior: el.value });
      break;
    case 'setting-include-notes':
      await actions.updateSettings({ importExport: { ...state.settings.importExport, includeNotes: el.checked } });
      break;
    case 'setting-include-favorites':
      await actions.updateSettings({ importExport: { ...state.settings.importExport, includeFavorites: el.checked } });
      break;
    case 'setting-pretty-print':
      await actions.updateSettings({ importExport: { ...state.settings.importExport, prettyPrintJson: el.checked } });
      break;
    case 'setting-optimization-provider':
      await actions.updateSettings({ optimization: { ...state.settings.optimization, provider: el.value } });
      break;
    case 'setting-optimization-model':
      await actions.updateSettings({ optimization: { ...state.settings.optimization, model: el.value } });
      break;
    case 'setting-optimization-api-key':
      await actions.updateSettings({ optimization: { ...state.settings.optimization, apiKey: el.value } });
      break;
    default:
      break;
  }
});

// --- input delegation (text fields) ---

const debouncedSearch = debounce((value) => {
  actions.setSearchFilters({ keyword: value });
}, 150);

document.getElementById('app').addEventListener('input', (event) => {
  const el = event.target;
  const field = el.dataset.field;

  if (el.closest('form[data-form="prompt-form"]')) {
    setStateSilent({ formDirty: true });
  }

  if (field === 'search-keyword') {
    debouncedSearch(el.value);
  }
});

// --- change: tag select + global shortcuts ---

document.getElementById('app').addEventListener('change', (event) => {
  const el = event.target;
  if (el.dataset && el.dataset.field === 'tag-select') {
    const tag = el.value;
    if (!tag) return;
    const form = el.closest('form');
    if (form) syncDraftFromForm(form);
    const draft = getState().formDraft;
    if (!draft.tags.includes(tag)) {
      setState({ formDraft: { ...draft, tags: [...draft.tags, tag] } });
    } else {
      render(getState());
    }
  }
});

document.addEventListener('keydown', (event) => {
  const isEditable = /^(input|textarea|select)$/i.test(event.target.tagName) || event.target.isContentEditable;
  const mod = event.ctrlKey || event.metaKey;

  if (mod && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    resetFormDraft();
    setStateSilent({ formDirty: false });
    routerNavigate('create');
    render(getState());
    return;
  }
  if (mod && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    routerNavigate('search');
    render(getState());
    setTimeout(() => qs(viewEl, '[data-field="search-keyword"]')?.focus(), 0);
    return;
  }
  if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault();
    const form = qs(viewEl, 'form[data-form="prompt-form"]');
    if (form) form.requestSubmit();
    return;
  }
  if (event.key === 'Escape') {
    if (getState().activeModal) actions.closeModal();
    return;
  }
  if (event.key === '/' && !isEditable) {
    event.preventDefault();
    routerNavigate('search');
    render(getState());
    setTimeout(() => qs(viewEl, '[data-field="search-keyword"]')?.focus(), 0);
  }
});

// --- submit delegation ---

document.getElementById('app').addEventListener('submit', async (event) => {
  const form = event.target;
  event.preventDefault();

  if (form.dataset.form === 'prompt-form') {
    syncDraftFromForm(form);
    const draft = getState().formDraft;
    const { valid, errors } = validatePrompt(draft);
    if (!valid) {
      setState({ formDraft: { ...draft, errors } });
      return;
    }
    const isEdit = getState().currentView === 'edit';
    if (isEdit) {
      await actions.editPrompt(getState().editingPromptId, draft);
      actions.showToast('Prompt updated');
    } else {
      await actions.createPrompt(draft);
      actions.showToast('Prompt saved');
    }
    resetFormDraft();
    setStateSilent({ formDirty: false });
    routerNavigate('library');
    render(getState());
    return;
  }

  if (form.dataset.modalForm === 'new-category') {
    const name = qs(form, '[name="name"]').value;
    const { valid, error, name: cleanName } = validateCategoryName(name, getState().categories);
    if (!valid) {
      qs(form, '[data-error-for="name"]').textContent = error;
      return;
    }
    const category = await actions.createCategory(cleanName);
    const modal = getState().activeModal;
    if (modal && modal.context === 'form') {
      const formEl = qs(viewEl, 'form[data-form="prompt-form"]');
      if (formEl) syncDraftFromForm(formEl, { categoryId: category.id });
    }
    actions.closeModal();
    return;
  }

  if (form.dataset.modalForm === 'new-tag') {
    const name = qs(form, '[name="name"]').value;
    const draft = getState().formDraft;
    const { valid, error, name: cleanName } = validateTagName(name, draft.tags);
    if (!valid) {
      qs(form, '[data-error-for="name"]').textContent = error;
      return;
    }
    const formEl = qs(viewEl, 'form[data-form="prompt-form"]');
    if (formEl) syncDraftFromForm(formEl);
    const currentDraft = getState().formDraft;
    setState({ formDraft: { ...currentDraft, tags: [...currentDraft.tags, cleanName] } });
    actions.closeModal();
    return;
  }

  if (form.dataset.modalForm === 'edit-category') {
    const id = form.dataset.id;
    const name = qs(form, '[name="name"]').value;
    const { valid, error, name: cleanName } = validateCategoryName(name, getState().categories, id);
    if (!valid) {
      qs(form, '[data-error-for="name"]').textContent = error;
      return;
    }
    await actions.renameCategory(id, cleanName);
    actions.closeModal();
    return;
  }

  if (form.dataset.modalForm === 'edit-tag') {
    const oldTag = form.dataset.tag;
    const name = qs(form, '[name="name"]').value;
    const allTags = [...new Set(getState().prompts.flatMap((p) => p.tags || []))];
    const { valid, error, name: cleanName } = validateTagName(name, allTags, oldTag);
    if (!valid) {
      qs(form, '[data-error-for="name"]').textContent = error;
      return;
    }
    await actions.renameTag(oldTag, cleanName);
    actions.closeModal();
    return;
  }

  if (form.dataset.modalForm === 'save-as-new') {
    const title = qs(form, '[name="title"]').value;
    const categoryId = qs(form, '[name="categoryId"]').value;
    const { valid, errors } = validatePrompt({ title, categoryId, content: getState().pendingOptimizedText || 'x' });
    if (!valid) {
      actions.showToast(errors.title || errors.categoryId, 'error');
      return;
    }
    await actions.createPrompt({
      title,
      categoryId,
      tags: [],
      content: getState().pendingOptimizedText || '',
      notes: '',
    });
    setStateSilent({ pendingOptimizedText: null });
    actions.closeModal();
    actions.showToast('Saved as new prompt');
  }
});

// --- boot ---

async function boot() {
  await actions.loadAll();
  const state = getState();
  if (!location.hash) {
    location.hash = `#/${state.settings.defaultStartupView || 'library'}`;
  }
  initRouter();
  render(getState());
}

boot();
