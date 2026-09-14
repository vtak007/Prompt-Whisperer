import { escapeHtml } from '../utils/dom.js';

export function renderModal(state) {
  const modal = state.activeModal;
  if (!modal) return '';

  if (modal.type === 'new-category') {
    return wrap(`
      <h2 class="modal-title">New Category</h2>
      <form data-modal-form="new-category">
        <div class="field">
          <label for="new-category-name">Category name</label>
          <input type="text" id="new-category-name" name="name" autofocus />
          <div class="field-error" data-error-for="name"></div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    `);
  }

  if (modal.type === 'new-tag') {
    return wrap(`
      <h2 class="modal-title">New Tag</h2>
      <form data-modal-form="new-tag">
        <div class="field">
          <label for="new-tag-name">Tag name</label>
          <input type="text" id="new-tag-name" name="name" autofocus />
          <div class="field-error" data-error-for="name"></div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </form>
    `);
  }

  if (modal.type === 'edit-category') {
    return wrap(`
      <h2 class="modal-title">Rename Category</h2>
      <form data-modal-form="edit-category" data-id="${modal.id}">
        <div class="field">
          <label for="edit-category-name">Category name</label>
          <input type="text" id="edit-category-name" name="name" value="${escapeHtml(modal.name)}" autofocus />
          <div class="field-error" data-error-for="name"></div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
  }

  if (modal.type === 'edit-tag') {
    return wrap(`
      <h2 class="modal-title">Rename Tag</h2>
      <form data-modal-form="edit-tag" data-tag="${escapeHtml(modal.tag)}">
        <div class="field">
          <label for="edit-tag-name">Tag name</label>
          <input type="text" id="edit-tag-name" name="name" value="${escapeHtml(modal.tag)}" autofocus />
          <div class="field-error" data-error-for="name"></div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
  }

  if (modal.type === 'confirm-delete-tag') {
    return wrap(`
      <h2 class="modal-title">Delete tag "${escapeHtml(modal.tag)}"?</h2>
      <p class="hint">This removes the tag from all prompts. Prompts themselves will not be deleted.</p>
      <div class="btn-row">
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
        <button type="button" class="btn btn-danger" data-action="confirm-delete-tag" data-tag="${escapeHtml(modal.tag)}">Delete</button>
      </div>
    `);
  }

  if (modal.type === 'ask-prompt-action') {
    return wrap(`
      <h2 class="modal-title">"${escapeHtml(modal.title)}"</h2>
      <div class="btn-row" style="flex-wrap: wrap;">
        <button type="button" class="btn" data-action="ask-open" data-id="${modal.id}">Open</button>
        <button type="button" class="btn" data-action="ask-copy" data-id="${modal.id}">Copy</button>
        <button type="button" class="btn" data-action="ask-insert" data-id="${modal.id}">Insert into active tab</button>
      </div>
    `);
  }

  if (modal.type === 'confirm-delete-prompt') {
    return wrap(`
      <h2 class="modal-title">Delete "${escapeHtml(modal.title)}"?</h2>
      <p class="hint">This action cannot be undone.</p>
      <div class="btn-row">
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
        <button type="button" class="btn btn-danger" data-action="confirm-delete-prompt" data-id="${modal.id}">Delete</button>
      </div>
    `);
  }

  if (modal.type === 'confirm-delete-category') {
    const options = modal.otherCategories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join('');
    return wrap(`
      <h2 class="modal-title">Delete "${escapeHtml(modal.name)}"?</h2>
      <p class="hint">Prompts in this category will not be deleted.</p>
      <div class="field">
        <label for="reassign-category">Move its prompts to</label>
        <select id="reassign-category" name="reassignTo">
          <option value="">Uncategorized</option>
          ${options}
        </select>
      </div>
      <div class="btn-row">
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
        <button type="button" class="btn btn-danger" data-action="confirm-delete-category" data-id="${modal.id}">Delete</button>
      </div>
    `);
  }

  if (modal.type === 'confirm-import') {
    return wrap(`
      <h2 class="modal-title">Import Preview</h2>
      <p>Prompts found: ${modal.preview.promptsFound}</p>
      <p>Categories found: ${modal.preview.categoriesFound}</p>
      <p>Duplicates found: ${modal.preview.duplicatesFound}</p>
      <p>New prompts: ${modal.preview.newPrompts}</p>
      ${
        modal.preview.duplicatesFound > 0
          ? `<div class="field">
              <label for="duplicate-strategy">How should duplicates be handled?</label>
              <select id="duplicate-strategy" name="strategy">
                <option value="skip">Skip</option>
                <option value="replace">Replace</option>
                <option value="keep-both">Keep Both</option>
              </select>
            </div>`
          : ''
      }
      <div class="btn-row">
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="confirm-import">Import</button>
      </div>
    `);
  }

  if (modal.type === 'save-as-new') {
    const categoryOptions = modal.categories
      .map((c) => `<option value="${c.id}" ${c.id === modal.categoryId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
      .join('');
    return wrap(`
      <h2 class="modal-title">Save as New Prompt</h2>
      <form data-modal-form="save-as-new">
        <div class="field">
          <label for="save-new-title">Title</label>
          <input type="text" id="save-new-title" name="title" value="${escapeHtml(modal.title || '')}" />
        </div>
        <div class="field">
          <label for="save-new-category">Category</label>
          <select id="save-new-category" name="categoryId">
            <option value="">Select a category...</option>
            ${categoryOptions}
          </select>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
  }

  if (modal.type === 'confirm-reset-sample') {
    return wrap(`
      <h2 class="modal-title">Reset to sample data?</h2>
      <p class="hint">This replaces your current library with the built-in sample prompts. This action cannot be undone.</p>
      <div class="btn-row">
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
        <button type="button" class="btn btn-danger" data-action="confirm-reset-sample">Reset</button>
      </div>
    `);
  }

  if (modal.type === 'help') {
    return wrap(`
      <h2 class="modal-title">Prompt Whisperer Help</h2>
      <p class="hint">Save, organize, and reuse your AI prompts. Click a prompt to copy or insert it into the active tab's text field.</p>
      <p class="hint">Shortcuts: Ctrl/Cmd+N new prompt · Ctrl/Cmd+F search · Ctrl/Cmd+S save · Esc close · "/" quick search.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" data-action="close-modal">Close</button>
      </div>
    `);
  }

  return '';
}

function wrap(inner) {
  return `<div class="modal-overlay" data-action="modal-overlay"><div class="modal-box" role="dialog" aria-modal="true">${inner}</div></div>`;
}
