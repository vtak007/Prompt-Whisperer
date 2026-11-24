export const OPTIMIZATION_GOALS = [
  { id: 'general', label: 'General Improvement' },
  { id: 'clarity', label: 'Clarity' },
  { id: 'detailed', label: 'More Detailed' },
  { id: 'concise', label: 'More Concise' },
  { id: 'reasoning', label: 'Better Reasoning' },
  { id: 'coding', label: 'Coding' },
  { id: 'research', label: 'Research' },
  { id: 'writing', label: 'Writing' },
  { id: 'brainstorming', label: 'Brainstorming' },
  { id: 'data-analysis', label: 'Data Analysis' },
  { id: 'image-generation', label: 'Image Generation' },
  { id: 'custom', label: 'Custom' },
];

const GOAL_ROLE = {
  general: 'a knowledgeable, helpful assistant',
  clarity: 'an assistant focused on precise, unambiguous communication',
  detailed: 'a thorough subject-matter expert',
  concise: 'an assistant that values brevity and directness',
  reasoning: 'an assistant that reasons step by step before answering',
  coding: 'an expert software engineer',
  research: 'a meticulous research analyst',
  writing: 'a skilled professional writer and editor',
  brainstorming: 'a creative ideation partner',
  'data-analysis': 'a data analyst who explains findings clearly',
  'image-generation': 'an expert at writing image-generation prompts',
  custom: 'a helpful assistant',
};

async function mockProvider({ prompt, goal, instructions }) {
  const role = GOAL_ROLE[goal] || GOAL_ROLE.general;
  const trimmedPrompt = prompt.trim();
  const parts = [
    `You are ${role}.`,
    '',
    trimmedPrompt,
    '',
    'Please respond with:',
    '- Clear structure and headings where useful',
    '- Specific, actionable detail rather than generalities',
    '- Any assumptions you make stated explicitly',
  ];
  if (instructions && instructions.trim()) {
    parts.push('', `Additional instructions: ${instructions.trim()}`);
  }
  parts.push('', 'Desired output format: match the format implied above, or ask a clarifying question if it is ambiguous.');
  return { text: parts.join('\n'), model: 'mock' };
}

const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';

async function anthropicProvider({ prompt, goal, instructions, model, apiKey }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is missing.');
  }
  const role = GOAL_ROLE[goal] || GOAL_ROLE.general;
  const userMessage = [
    `Act as ${role}. Rewrite the following prompt to optimize it for this goal, incorporating any additional instructions.`,
    '',
    'Original prompt:',
    prompt.trim(),
    instructions && instructions.trim() ? `\nAdditional instructions: ${instructions.trim()}` : '',
    '',
    'Return ONLY the rewritten prompt text — no preamble, no commentary, no markdown fences.',
  ].join('\n');

  const usedModel = model && model.trim() ? model.trim() : DEFAULT_ANTHROPIC_MODEL;

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: usedModel,
        // Haiku 5.5 thinks by default and thinking tokens count against
        // max_tokens, so leave headroom for the rewritten prompt itself.
        max_tokens: 16000,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    console.error('[Prompt Whisperer] Anthropic request failed:', err);
    throw new Error('Network error — could not reach Anthropic. Check your connection.');
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch {
      /* response wasn't JSON */
    }
    console.error('[Prompt Whisperer] Anthropic API error:', res.status, detail);
    if (res.status === 401) throw new Error('API key was rejected. Check your key in Settings.');
    if (res.status === 429) throw new Error('Rate limited by Anthropic. Try again shortly.');
    throw new Error(`Anthropic request failed (${res.status}).`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!text) throw new Error('Anthropic returned an empty response.');
  return { text, model: data.model || usedModel };
}

const PROVIDERS = {
  mock: mockProvider,
  anthropic: anthropicProvider,
};

export async function optimizePrompt({ prompt, goal = 'general', instructions = '', provider = 'mock', model, apiKey }) {
  const impl = PROVIDERS[provider] || PROVIDERS.mock;
  const { text, model: usedModel } = await impl({ prompt, goal, instructions, model, apiKey });
  return { optimized: text, provider, goal, model: usedModel };
}

export async function fetchAnthropicModels(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is missing.');
  }

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });
  } catch (err) {
    console.error('[Prompt Whisperer] Anthropic models request failed:', err);
    throw new Error('Network error — could not reach Anthropic. Check your connection.');
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch {
      /* response wasn't JSON */
    }
    console.error('[Prompt Whisperer] Anthropic models API error:', res.status, detail);
    if (res.status === 401) throw new Error('API key was rejected. Check your key in Settings.');
    if (res.status === 429) throw new Error('Rate limited by Anthropic. Try again shortly.');
    throw new Error(`Anthropic request failed (${res.status}).`);
  }

  const data = await res.json();
  return (data.data || []).map((m) => ({ id: m.id, displayName: m.display_name || m.id }));
}
