# Configuration

## Environment variables

Set these in `.env` (copy `.env.example`). The server reads `.env` at start; variables already set in the
shell take precedence.

| Variable                 | Default                                        | Purpose                                                                   |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------- |
| `TYPESAFE_API_KEY`       | empty                                          | Key for Jev. A TypeSafe key, or an OpenRouter key. Empty = offline brain. |
| `TYPESAFE_BASE_URL`      | `https://api.typesafe.ai`                      | Set to `https://openrouter.ai/api` for OpenRouter.                        |
| `TYPESAFE_DEFAULT_MODEL` | `jev-latest`                                   | Jev model name.                                                           |
| `SPEECH_API_KEY`         | the Jev key, if it is an OpenRouter key        | Key for the text model. Empty = built-in phrases.                         |
| `SPEECH_BASE_URL`        | `https://openrouter.ai/api/v1`                 | Any OpenAI-compatible chat completions API.                               |
| `SPEECH_MODELS`          | `google/gemma-4-31b-it:free,openai/gpt-6-luna` | Fallback chain, tried in order.                                           |
| `PORT`                   | `3000`                                         | HTTP port.                                                                |

## URL options

| Option      | Effect                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| `?offline`  | No API calls: the built-in brain decides and built-in phrases are spoken. |
| `?nospeech` | Jev decides; built-in phrases are spoken.                                 |

## Commands

Scripts are grouped by action with a colon (`lint:js`, `lint:md`), and each does one job.

| Command                      | What it does                                                            |
| ---------------------------- | ----------------------------------------------------------------------- |
| `npm start`                  | Start the server on `PORT`.                                             |
| `npm test`                   | All tests (Node's built-in test runner, offline, about 2 s).            |
| `npm run verify`             | `lint`, then `test`. Run before committing; the hook and CI run it too. |
| `npm run lint`               | All three lints below.                                                  |
| `npm run lint:arch`          | Architecture rules: file and function size, import cycles, layers.      |
| `npm run lint:js`            | ESLint.                                                                 |
| `npm run lint:md`            | Check that Markdown is formatted with Prettier.                         |
| `npm run format:md`          | Format all Markdown with Prettier.                                      |
| `npm run docs:build`         | Regenerate the generated reference pages.                               |
| `npm run docs:check`         | Fail if a generated page is out of date (also part of `test`).          |
| `npm run report:deps`        | Print module sizes and import cycles.                                   |
| `npm run test:update-golden` | Re-record the golden master after an intended behaviour change.         |
| `npm run setup:hooks`        | Use `.githooks/`, so `verify` runs before each commit. Once per clone.  |

## HTTP API

The server serves `public/` and keeps API keys out of the browser.

| Endpoint                            | Body                                  | Returns                                                                                                |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /api/status`                   |                                       | `{ ai, model, speech, speechModels }`                                                                  |
| `POST /api/jev`                     | `{ state, questions }`                | Jev's answers, forwarded from `{TYPESAFE_BASE_URL}/v1/systemone`. Retries up to 3 times on 429 or 529. |
| `POST /api/speak`, `POST /api/text` | `{ system, prompt, maxTokens, json }` | Text from the first speech model that answers.                                                         |

Errors return `{ error }` with status 502 (upstream failed) or 503 (no key configured).

## Saved games

**Save** stores the village in the browser's `localStorage` under `oakhollow-save-v2`. Nothing is stored on
the server.
