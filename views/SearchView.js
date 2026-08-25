import { escapeHtml } from '../utils/dom.js';
import { renderPromptCard } from '../components/PromptCard.js';
import { searchPrompts } from '../services/search.js';

function uniqueTags(prompts) {
  const set = new Set();
  prompts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

export function renderSearchView(state) {
  const { categories, prompts, searchFilters } = state;
  const results = searchPrompts(prompts, searchFilters);
  const tags = uniqueTags(prompts);

  const categoryOptions = [...categories]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `<option value="${c.id}" ${searchFilters.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
    .join('');
  const tagOptions = tags
    .map((t) => `<option value="${t}" ${searchFilters.tagId === t ? 'selected' : ''}>${escapeHtml(t)}</option>`)
    .join('');

  const resultsHtml = results.length
    ? results.map(renderPromptCard).join('')
    : `<div class="empty-state"><p>No prompts match your search.</p></div>`;

  return `
    <h2 class="section-heading">Search Prompts</h2>
    <div class="field">
      <label for="search-keyword">Keyword</label>
      <input type="search" id="search-keyword" data-field="search-keyword" placeholder="Search prompts..." value="${escapeHtml(searchFilters.keyword)}" autofocus />
    </div>
    <div class="field">
      <label for="search-category">Filter by Category</label>
      <select id="search-category" data-field="search-category">
        <option value="">All Categories</option>
        ${categoryOptions}
      </select>
    </div>
    <div class="field">
      <label for="search-tag">Filter by Tag</label>
      <select id="search-tag" data-field="search-tag">
        <option value="">All Tags</option>
        ${tagOptions}
      </select>
    </div>
    <div class="btn-row">
      <button type="button" class="btn" data-action="clear-search">Clear</button>
    </div>

    <div class="results-heading" style="margin-top: var(--space-5);">RESULTS (${results.length})</div>
    ${resultsHtml}
  `;
}
