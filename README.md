# Oakhollow

A village simulation in the browser. Nothing the villagers do is scripted: each decision is made by
[Jev](https://typesafe.ai), TypeSafe AI's decision model, from a list of everything the person can do at that
moment. A cheap text model writes what they say. Without an API key, a simple built-in brain runs instead.

Villagers work, trade, open businesses, study, court, marry, have children, fall sick, fight, steal, vote,
invent new activities, keep or break promises, and die.

## Run it

Requires Node 22 or newer.

```bash
cp .env.example .env    # optional: add an API key (see below)
npm start
```

Open http://localhost:3000. Add `?offline` to the URL to run without API calls.

For AI decisions, set `TYPESAFE_API_KEY` in `.env` to a TypeSafe key, or to an OpenRouter key together with
`TYPESAFE_BASE_URL=https://openrouter.ai/api`. With an OpenRouter key, speech uses the same key.
All settings: [configuration](docs/reference/configuration.md).

## Documentation

|                                           |                                                               |
| ----------------------------------------- | ------------------------------------------------------------- |
| [Tutorial](docs/tutorial.md)              | Start a village and try the main controls.                    |
| [How-to guides](docs/how-to.md)           | Change the world, add a verb or an effect, change the models. |
| [Reference](docs/README.md#reference)     | Configuration, architecture, effect types, verbs, world data. |
| [Explanation](docs/README.md#explanation) | How the minds decide, and the models behind the simulation.   |

## Develop

```bash
npm install       # dev tools only (ESLint, Prettier)
npm run verify        # all lints, then all tests
npm run setup:hooks   # run verify before every commit
```

Rules for contributors (human or AI) are in [CLAUDE.md](CLAUDE.md).
