# Your first village

This tutorial starts a village without an API key, then shows the main controls. It takes about 10 minutes.

## 1. Start the game

```bash
npm start
```

Open http://localhost:3000/?offline. `?offline` uses the built-in brain, so nothing is sent to an API.

The map shows six villagers. At 1× speed, one game minute passes every half second, so a game day
lasts 12 real minutes. The buttons at the top set the speed: pause, 1×, 2×, 4× and 8×.
Scroll to zoom and drag to pan the map. The full list of controls is in
[Configuration](reference/controls.md).

## 2. Follow one person

1. Click a villager on the map, or pick one in the **People** tab.
2. The inspector shows their needs, skills, belongings, relationships and recent memories.
3. Hover a relationship to see the reasons behind it, for example "shared a drink with me +5".
4. A dashed line on the map shows where they are walking.
5. Press `F` to follow them with the camera. Press it again, or drag the map, to stop.

Important news, such as a birth, a crime or an event you announce, also pops up briefly at the top of the
map. Click it to open the **Chronicle**.

## 3. Read what happened

Open **Chronicle**. It lists events as they happen. Use the filters (Life, Events, Crime, Talk, Ideas,
Promises, The Voice) to narrow it down.

**Village** shows the leader, laws, open problems, prices, businesses, couples, feuds and the graveyard.

## 4. Speak to someone

In the inspector, type a message in the whisper box and send it. The villager hears a voice in their head
and decides what it is. Their replies to you appear in **Voices**.

## 5. Change the world

Open **God**:

- **Make something happen** announces an event, such as a fire or bandits, that everyone hears about.
- **Add a villager** brings a new person in by the Eastern Road.
- **Add a problem to solve** creates a task villagers can work on together.
- **Add a new possibility** adds an activity people can choose. With a text model configured, it is turned
  into real effects; see [effect types](reference/effects.md).
- **Rules of life** turns death, births, arrivals and the storyteller on or off, and sets how fast people age.
- **Save**, **Load** and **New world** store the village in the browser's local storage.

## 6. Turn on the AI

1. Copy `.env.example` to `.env` and set `TYPESAFE_API_KEY` (see [configuration](reference/configuration.md)).
2. Restart `npm start` and open http://localhost:3000 without `?offline`.
3. The top bar shows the models in use and the cost reported by the API.

Next: [how the minds work](explanation/minds.md).
