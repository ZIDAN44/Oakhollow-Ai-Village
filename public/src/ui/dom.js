// Small DOM helpers and UI state.
export const $ = id => document.getElementById(id);

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const ui = { inspected: null, logFilter: 'all', voicesSeen: 0 };
