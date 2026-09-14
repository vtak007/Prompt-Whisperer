import { escapeHtml } from '../utils/dom.js';
import { renderTagChip } from '../components/TagChip.js';

function uniqueTags(prompts) {
  const set = new Set();
  prompts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

export function renderPromptForm(state, { isEdit = false } = {}) {
  const { categories, prompts } = state;
  const draft = state.formDraft;
  const categoryOptions = [...categories]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `<option value="${c.id}" ${draft.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
    .join('');
  const tagChips = draft.tags.map((t) => renderTagChip(t, { removable: true })).join('');
  const tagOptions = uniqueTags(prompts)
    .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
    .join('');

  return `
    <h2 class="section-heading">${isEdit ? 'Edit Prompt' : 'Create Prompt'}</h2>
    <form data-form="prompt-form">
      <div class="field">
        <label for="prompt-title">Title <span class="required">*</span></label>
        <input type="text" id="prompt-title" name="title" data-field="title" value="${escapeHtml(draft.title)}" placeholder="Enter a title for your prompt..." />
        ${draft.errors.title ? `<div class="field-error">${draft.errors.title}</div>` : ''}
      </div>

      <div class="field">
        <label for="prompt-category">Category <span class="required">*</span></label>
        <select id="prompt-category" name="categoryId" data-field="categoryId">
          <option value="">Select a category...</option>
          ${categoryOptions}
        </select>
        ${draft.errors.categoryId ? `<div class="field-error">${draft.errors.categoryId}</div>` : ''}
        <button type="button" class="btn-link" data-action="add-category" style="margin-top:6px;">+ New Category</button>
      </div>

      <div class="field">
        <label for="prompt-tag-select">Tags</label>
        <div class="tag-input-row">${tagChips}</div>
        <select id="prompt-tag-select" data-field="tag-select">
          <option value="">Select a tag...</option>
          ${tagOptions}
        </select>
        <button type="button" class="btn-link" data-action="add-tag" style="margin-top:6px;">+ New Tag</button>
        <div class="hint">Add multiple tags to help organize</div>
      </div>

      <div class="field">
        <label for="prompt-content">Prompt Content <span class="required">*</span></label>
        <textarea id="prompt-content" name="content" data-field="content" rows="8" placeholder="Write or paste your prompt here...">${escapeHtml(draft.content)}</textarea>
        ${draft.errors.content ? `<div class="field-error">${draft.errors.content}</div>` : ''}
      </div>

      <div class="field">
        <label for="prompt-notes">Notes (optional)</label>
        <textarea id="prompt-notes" name="notes" data-field="notes" rows="3" placeholder="Add any additional notes...">${escapeHtml(draft.notes)}</textarea>
      </div>

      <div class="btn-row">
        <button type="button" class="btn" data-action="cancel-form">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Prompt</button>
      </div>
    </form>
  `;
}

export function renderCreateView(state) {
  return renderPromptForm(state, { isEdit: false });
}
