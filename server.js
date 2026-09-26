// Tiny zero-dependency server: serves the game and forwards NPC decisions to Jev
// (TypeSafe AI's System One model). Your API key stays here; the browser never sees it.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

loadEnv(path.join(ROOT, '.env'));

const cfg = {
  apiKey: process.env.TYPESAFE_API_KEY || '',
  baseUrl: (process.env.TYPESAFE_BASE_URL || 'https://api.typesafe.ai').replace(/\/+$/, ''),
  model: process.env.TYPESAFE_DEFAULT_MODEL || 'jev-latest',
  port: Number(process.env.PORT) || 3000,
};

// Free-form speech comes from a cheap text model (via OpenRouter by default).
// SPEECH_MODELS is a fallback chain: OpenRouter tries each in order (free first, then paid).
const speech = {
  apiKey: process.env.SPEECH_API_KEY || (cfg.baseUrl.includes('openrouter') ? cfg.apiKey : ''),
  baseUrl: (process.env.SPEECH_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
  models: (process.env.SPEECH_MODELS || 'google/gemma-4-31b-it:free,openai/gpt-6-luna').split(',').map(s => s.trim()).filter(Boolean),
};

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// POST /v1/systemone with { state, model, questions } -> { model, answers, usage }
async function askJev(state, questions) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${cfg.baseUrl}/v1/systemone`, {
      method: 'POST',
      signal: AbortSignal.timeout(20000),
      headers: {
        authorization: `Bearer ${cfg.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ state, model: cfg.model, questions }),
    });
    // Rate limited or overloaded: back off and retry a few times.
    if ((res.status === 429 || res.status === 529) && attempt < 3) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = data?.detail;
      const detail = d?.message || (d ? JSON.stringify(d) : data?.error?.message || data?.message);
      throw new Error(`Jev HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return data;
  }
}

// One short line of dialogue. Returns { text, model, cost }.
async function askSpeech(system, prompt, { maxTokens = 90, json = false } = {}) {
  const body = {
    max_tokens: Math.min(900, maxTokens),
    temperature: 0.9,
    reasoning: { enabled: false },
    messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
  };
  // OpenRouter falls back through `models` on rate limits and errors; other APIs get one model.
  if (json) body.response_format = { type: 'json_object' };
  if (speech.baseUrl.includes('openrouter') && speech.models.length > 1) body.models = speech.models;
  else body.model = speech.models[0];
  const res = await fetch(`${speech.baseUrl}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(12000),
    headers: { authorization: `Bearer ${speech.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return { text: data.choices?.[0]?.message?.content || '', model: data.model, cost: data.usage?.cost || 0 };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 500_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > limit) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/status') {
    return sendJSON(res, 200, { ai: Boolean(cfg.apiKey), model: cfg.model, speech: Boolean(speech.apiKey), speechModels: speech.models });
  }

  if (url.pathname === '/api/jev' && req.method === 'POST') {
    if (!cfg.apiKey) return sendJSON(res, 503, { error: 'TYPESAFE_API_KEY is not set' });
    try {
      const { state, questions } = JSON.parse(await readBody(req));
      return sendJSON(res, 200, await askJev(state, questions));
    } catch (err) {
      console.error('[jev]', err.message);
      return sendJSON(res, 502, { error: err.message });
    }
  }

  if ((url.pathname === '/api/speak' || url.pathname === '/api/text') && req.method === 'POST') {
    if (!speech.apiKey) return sendJSON(res, 503, { error: 'No speech model configured' });
    try {
      const { system, prompt, maxTokens, json } = JSON.parse(await readBody(req));
      return sendJSON(res, 200, await askSpeech(String(system || ''), String(prompt || ''), { maxTokens: Number(maxTokens) || 90, json: Boolean(json) }));
    } catch (err) {
      console.error('[speak]', err.message);
      return sendJSON(res, 502, { error: err.message });
    }
  }

  // Static files
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return sendJSON(res, 403, { error: 'Forbidden' });
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    sendJSON(res, 404, { error: 'Not found' });
  }
});

server.listen(cfg.port, '127.0.0.1', () => {
  console.log(`\n  Oakhollow is running at http://localhost:${cfg.port}\n`);
  console.log(cfg.apiKey
    ? `  NPC minds: Jev (${cfg.model})`
    : '  NPC minds: offline rule-based mode (put TYPESAFE_API_KEY in .env to use Jev)');
  console.log(speech.apiKey ? `  NPC speech: ${speech.models.join(' -> ')}` : '  NPC speech: built-in phrases (set SPEECH_API_KEY for free-form speech)');
  console.log();
});
