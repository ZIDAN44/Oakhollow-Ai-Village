# Oakhollow documentation

The pages follow the [Diátaxis](https://diataxis.fr/) structure: each page is either a tutorial, a how-to
guide, reference or explanation, and doesn't mix them.

## Tutorial

- [Your first village](tutorial.md)

## How-to guides

- [How-to guides](how-to.md): API keys, models, changing the world, adding verbs and effects, tests.

## Reference

- [Configuration](reference/configuration.md): environment variables, URL options, commands, HTTP API.
- [Controls](reference/controls.md): mouse and keyboard controls for the map.
- [Architecture](reference/architecture.md): folders, layers and rules.
- [Effect types](reference/effects.md): the building blocks of inventions. Generated.
- [Verbs](reference/verbs.md): every action type. Generated.
- [World data](reference/world.md): starting places, people, buildings, laws. Generated.

Generated pages are built from the code by `npm run docs:build`. The tests fail if they are out of date.

## Explanation

- [How the minds work](explanation/minds.md): options, Jev's questions, memory, opinions, speech, inventions.
- [How life works](explanation/simulation.md): calendar, ageing, mortality, birth, disease, economy, movement.
