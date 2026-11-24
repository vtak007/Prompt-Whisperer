import { escapeHtml } from '../utils/dom.js';
import { formatDate } from '../utils/dates.js';

export function renderSettingsView(state) {
  const s = state.settings;
  const availableModels = s.optimization.availableModels || [];
  const modelOptions = availableModels
    .map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.displayName)}</option>`)
    .join('');
  return `
    <h2 class="section-heading">Appearance</h2>
    <div class="field">
      <select data-field="setting-appearance">
        <option value="dark" ${s.appearance === 'dark' ? 'selected' : ''}>Dark</option>
        <option value="light" ${s.appearance === 'light' ? 'selected' : ''}>Light</option>
        <option value="system" ${s.appearance === 'system' ? 'selected' : ''}>System</option>
      </select>
    </div>

    <h2 class="section-heading">Default Startup View</h2>
    <div class="field">
      <select data-field="setting-startup-view">
        <option value="library" ${s.defaultStartupView === 'library' ? 'selected' : ''}>Library</option>
        <option value="create" ${s.defaultStartupView === 'create' ? 'selected' : ''}>Create</option>
        <option value="optimize" ${s.defaultStartupView === 'optimize' ? 'selected' : ''}>Optimize Prompt</option>
        <option value="search" ${s.defaultStartupView === 'search' ? 'selected' : ''}>Search</option>
      </select>
    </div>

    <h2 class="section-heading">Prompt Click Behavior</h2>
    <div class="field">
      <select data-field="setting-click-behavior">
        <option value="open" ${s.promptClickBehavior === 'open' ? 'selected' : ''}>Open prompt</option>
        <option value="copy" ${s.promptClickBehavior === 'copy' ? 'selected' : ''}>Copy prompt</option>
        <option value="insert" ${s.promptClickBehavior === 'insert' ? 'selected' : ''}>Insert into active tab</option>
        <option value="ask" ${s.promptClickBehavior === 'ask' ? 'selected' : ''}>Ask each time</option>
      </select>
    </div>

    <h2 class="section-heading">Import / Export Preferences</h2>
    <div class="field">
      <label><input type="checkbox" data-field="setting-include-notes" ${s.importExport.includeNotes ? 'checked' : ''} /> Include notes</label>
      <label><input type="checkbox" data-field="setting-include-favorites" ${s.importExport.includeFavorites ? 'checked' : ''} /> Include favorites</label>
      <label><input type="checkbox" data-field="setting-pretty-print" ${s.importExport.prettyPrintJson ? 'checked' : ''} /> Pretty-print JSON</label>
    </div>

    <h2 class="section-heading">Optimization Settings</h2>
    <div class="field">
      <label for="setting-provider">AI Provider</label>
      <select id="setting-provider" data-field="setting-optimization-provider">
        <option value="mock" ${s.optimization.provider === 'mock' ? 'selected' : ''}>Mock (offline preview)</option>
        <option value="anthropic" ${s.optimization.provider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
      </select>
    </div>
    <div class="field">
      <label for="setting-model">Model</label>
      <div style="display:flex; gap:8px;">
        <input type="text" id="setting-model" data-field="setting-optimization-model" list="model-suggestions" value="${escapeHtml(s.optimization.model)}" placeholder="claude-haiku-5-5" autocomplete="off" style="flex:1;" />
        <button type="button" class="btn" data-action="refresh-models" ${state.modelsLoading ? 'disabled' : ''} title="Fetch the latest model list from Anthropic" aria-label="Refresh model list">
          ${state.modelsLoading ? '…' : '⟳'}
        </button>
      </div>
      <datalist id="model-suggestions">${modelOptions}</datalist>
      <div class="hint">
        ${
          s.optimization.modelsFetchedAt
            ? `Model list last updated ${formatDate(s.optimization.modelsFetchedAt)} (${availableModels.length} models). Click ⟳ to refresh.`
            : 'Click ⟳ to fetch the latest model list from Anthropic (requires an API key below). You can also type a model ID directly.'
        }
      </div>
    </div>
    <div class="field">
      <label for="setting-api-key">API Key</label>
      <input type="password" id="setting-api-key" data-field="setting-optimization-api-key" value="${escapeHtml(s.optimization.apiKey)}" autocomplete="new-password" />
      <div class="hint">Stored locally in this browser only, and sent directly to Anthropic's API when you click Optimize.</div>
    </div>

    <h2 class="section-heading">Data</h2>
    <div class="btn-row">
      <button type="button" class="btn btn-danger" data-action="reset-sample-data">Reset to sample data</button>
    </div>
  `;
}
