# How-to guides

Each section is a short recipe. Run `npm run verify` after any code change.

- [Use an OpenRouter key](#use-an-openrouter-key)
- [Change the speech models](#change-the-speech-models)
- [Change the starting world](#change-the-starting-world)
- [Add an activity](#add-an-activity)
- [Add a verb](#add-a-verb)
- [Add an effect type](#add-an-effect-type)
- [Change behaviour on purpose](#change-behaviour-on-purpose)
- [Update the generated docs](#update-the-generated-docs)

## Use an OpenRouter key

In `.env`:

```bash
TYPESAFE_API_KEY=sk-or-...
TYPESAFE_BASE_URL=https://openrouter.ai/api
```

Speech uses the same key automatically. Restart `npm start`. Never commit `.env`.

## Change the speech models

Set a comma-separated fallback chain in `.env`. Models are tried in order until one answers:

```bash
SPEECH_MODELS=google/gemma-4-31b-it:free,openai/gpt-6-luna
```

To use a different provider, set `SPEECH_BASE_URL` (an OpenAI-compatible `/v1` URL) and `SPEECH_API_KEY`.
To turn speech off for one session, open the game with `?nospeech`.

## Change the starting world

Edit the files in `public/src/data/`, then reload the page. Each page load starts a new world; a saved
world comes back only when you click **Load**. To change only the world description for the current
village, edit **World lore** in **God**.

| File            | Contains                                                                |
| --------------- | ----------------------------------------------------------------------- |
| `map.js`        | Places: position, size, type, resources, owners.                        |
| `people.js`     | Villagers, travellers who may arrive, names for children.               |
| `lore.js`       | The world description every mind is given, and beliefs about the Voice. |
| `activities.js` | Everyday activities.                                                    |
| `economy.js`    | Buildable things, businesses, base prices.                              |
| `civic.js`      | Laws a leader can decree, problems people can solve.                    |
| `skills.js`     | Skills and the roles children can choose.                               |

The current contents are listed in [world data](reference/world.md).

## Add an activity

Most new activities need data only. Add an entry to `public/src/data/activities.js`:

```js
{ label: 'Sketch the ruins', text: 'sketches the ruins in charcoal', where: 'ruins', skill: 'scholarship',
  minutes: 40, fx: [{ type: 'mood', who: 'self', amount: 0.5 }, { type: 'skill', who: 'self', skill: 'scholarship', amount: 1 }] },
```

`where` is a place name or type (optional), `needs` is items used up (optional), and `fx` is a list of
[effect types](reference/effects.md).

## Add a verb

Use a verb when an action needs its own logic.

1. Write the verb in the matching file in `public/src/actions/verbs/` and register it at the end of that file:

   ```js
   export function verbPray(npc, act, { here, t, target }) {
     npc.action = {
       type: "do",
       until: t + 30,
       text: "prays quietly",
       effect: "calm",
     };
   }

   defineVerbs({ /* ...existing verbs... */ pray: verbPray });
   ```

2. Offer it as an option in `public/src/ai/options/`, inside the provider that fits:

   ```js
   if (here?.type === "graveyard")
     add("Pray for the dead", "Say a quiet prayer.", { type: "pray" });
   ```

   The key (`'Pray for the dead'`) is what Jev chooses between; the description is what it reads.

3. If the action finishes with a result, add a handler to `OUTCOMES` in `public/src/actions/outcomes.js`
   (for `do` actions) or to `ON_FINISH` in `public/src/actions/finish.js`.

`tests/architecture.test.mjs` fails if an option uses a verb that isn't registered.

## Add an effect type

Effects are what inventions and activities are built from. Add a `defineEffect` call to the file in
`public/src/effects/types/` that fits:

```js
defineEffect("fame", {
  doc: '{"type":"fame","who":"self","amount":5}   village-wide reputation, -10..10',
  validate: (e) => ({
    type: "fame",
    who: e.who,
    amount: int(e.amount, -10, 10),
  }),
  apply(e, { npc }) {
    /* change the world */
  },
  describe: (e) => `fame ${e.amount > 0 ? "+" : ""}${e.amount}`,
});
```

- `doc` is shown to the text model, so write it as an example plus its limits.
- `validate` receives untrusted JSON. Return a clean effect or `null`, and clamp every number.
- Add a case to `tests/effects.test.mjs`, then run `npm run docs:build` to update the reference.

## Change behaviour on purpose

The golden master test (`tests/golden.test.mjs`) fails when the simulation behaves differently. That is
intended for refactors. When the change is deliberate:

```bash
npm run test:update-golden
```

Then commit the new `tests/golden.json` and say in the commit message that behaviour changed.

## Update the generated docs

```bash
npm run docs:build
```

This rewrites `docs/reference/effects.md`, `verbs.md` and `world.md` from the code.
