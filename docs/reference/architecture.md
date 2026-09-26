# Architecture

Plain ES modules with no build step and no runtime dependencies. `server.js` is a small Node server;
all game code runs in the browser from `public/src/`.

## Layers

Each folder is a layer. A module may import only from its own layer or layers below it.

| #   | Folder                          | Contents                                                                                             |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 0   | `data/`                         | The starting world: map, people, activities, buildings, prices, laws, problems.                      |
| 1   | `core/`                         | Shared state (`sim`), calendar, memory stream, skills, sightings, event bus.                         |
| 2   | `identity/`, `nav/`, `economy/` | Gender and pronouns; A* pathfinding and crowd separation; market prices.                             |
| 3   | `social/`                       | Relationships, conversation, requests, the Voice, promises.                                          |
| 4   | `world/`, `life/`, `village/`   | World setup and weather; bodies, family, health, death, gatherings; problems, politics, storyteller. |
| 5   | `effects/`                      | Effect types used by inventions and activities.                                                      |
| 6   | `actions/`                      | Verbs, and what happens when actions finish.                                                         |
| 7   | `ai/`                           | Options, perception and questions for Jev; thinking; speech; inventing.                              |
| 8   | `ui/`                           | Map drawing and side panels.                                                                         |
| 9   | `app/`, `api.js`                | Boot, main loop, saving. `api.js` is the entry point for tests and tools.                            |

When a lower layer needs to trigger something above it, it emits an event (`core/events.js`) and the higher
layer listens. For example, `village/laws.js` emits `lawBroken` and `actions/crime.js` handles it.

## Registries

Behaviour is added by registering, not by editing a central `switch`:

| Registry         | Register with                             | Listed in                  |
| ---------------- | ----------------------------------------- | -------------------------- |
| Verbs            | `defineVerbs()` in `actions/registry.js`  | [verbs](verbs.md)          |
| Effect types     | `defineEffect()` in `effects/registry.js` | [effect types](effects.md) |
| Option providers | the list in `ai/options/index.js`         |                            |

## One decision, step by step

1. `app/loop.js` picks people who are due to think.
2. `ai/options/` lists what the person can do now; `ai/perception.js` describes what they know.
3. `ai/questions.js` builds the questions; `ai/think.js` sends one request to `/api/jev`, or asks
   `ai/offline.js` when there is no key.
4. `ai/judgements.js` applies moods, feelings, votes and reflection; the action is sampled from Jev's
   probabilities (`ai/sampling.js`).
5. `actions/registry.js` starts the action. Timed actions finish in `actions/finish.js`.

## Enforced rules

`npm run lint` (architecture rules in `tools/check.mjs` with limits in `tools/architecture.json`, ESLint,
and Prettier), the pre-commit hook and CI
all enforce:

- files at most 200 lines; functions at most 80 lines; complexity at most 25
- no import cycles (Tarjan's strongly connected components)
- imports only point down the layers
- no `eslint-disable` comments in game code
- Markdown formatted with Prettier (`npm run lint:md`)

## Tests

| File                                           | Covers                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `golden.test.mjs`                              | Two game days on fixed seeds must match `golden.json` exactly.                                    |
| `architecture.test.mjs`                        | The rules above; every option's verb is registered.                                               |
| `survival.test.mjs`                            | A week keeps invariants: nobody starves, no NaN, nobody off the map.                              |
| `ui.test.mjs`                                  | Map and panels render headless (fake canvas and DOM in `fake-dom.mjs`).                           |
| `config.test.mjs`                              | Every environment variable the server reads is in `.env.example` and the configuration reference. |
| `docs.test.mjs`                                | Generated docs are current; links resolve; no hype words.                                         |
| `identity`, `nav`, `effects`, `life`, `social` | Focused tests and regression tests.                                                               |

Tests run offline with a seeded random number generator (`tests/harness.mjs`).
