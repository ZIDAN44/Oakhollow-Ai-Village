# How the minds work

## Jev chooses; code lists the choices

Jev is a decision model. It doesn't write text: it returns choices, scores and yes/no answers ("nouls")
with probabilities. So the game never asks "what do you do?" in free text. Instead, for each decision:

1. Code lists everything the person can do right now, usually 50 to 120 options. Each option has a short
   key ("Talk to Bram") and a description Jev reads.
2. One request carries the person's state and several questions at once.
3. The action is sampled from Jev's probabilities, not taken from the top answer, so the same situation can
   go different ways.

Up to 5 people think at the same time; the rest wait in a queue.

## What Jev is told

The state includes the person's personality, goal, secret, dream, body, skills, family, belongings and
debts; the people nearby and how the person feels about each of them, with the reasons; where everyone else
was last seen; the village's leader, laws, problems and prices; open promises and requests; world events from
the last 12 game hours; and 14 memories.

Memories are recalled by recency, importance and relevance, following the memory stream in
[Generative Agents](https://arxiv.org/abs/2304.03442) (Park et al., 2023). Recency decays by 3% per game
hour; importance is 1 to 10; relevance counts shared keywords.

## The questions

| Question           | Type   | Asked when                                                  |
| ------------------ | ------ | ----------------------------------------------------------- |
| `action`           | choice | always                                                      |
| `mood`             | score  | always                                                      |
| `say_N`, `say_all` | choice | someone is nearby: which kind of line to say to them        |
| `feel_N`           | score  | someone is nearby: how the person feels about them          |
| `attract_N`        | noul   | someone nearby they have met and could be attracted to      |
| `news`             | choice | they know recent news: which item they would tell           |
| `topic_person`     | choice | they know at least two people: who is on their mind         |
| `vote`             | choice | an election is running                                      |
| `voice_belief`     | choice | the person was just whispered to                            |
| `voice_reaction`   | choice | the person was just whispered to: answer, ask, or ignore it |
| `event_reaction`   | choice | a world event names a place: go and help, keep away, or not |
| `role`             | choice | a child comes of age                                        |
| `keep`, `goal`     | choice | reflection: after important events add up, or on waking     |

In reflection, the person picks which recent moment becomes a lasting life memory and whether their goal
changes.

## Opinions

Relationships work like opinions in Crusader Kings: a slow-moving base plus reasons that fade with a
half-life, for example "hit me in a fight −30" or "shared a drink with me +5". Each reason has three values:
affection, trust and romance. Jev sees the reasons, not only the totals.

## Speech

Jev picks the kind of line (flirt, lie, confide a secret, threaten, answer a question). A text model then
writes it using the world lore, the speaker's personality, speech habits, mood, their relationship with the listener, the
conversation so far and any world event from the last few game hours. It returns JSON: the line, and a
promise if the line makes one. Promises are tracked and are kept or broken later.

If the text model fails, a built-in phrase for that kind of line is used.

## Inventions

About once a game day, each person over 12 imagines up to two new things to do. This follows
[Voyager](https://arxiv.org/abs/2305.16291) (Wang et al., 2023):

1. **Imagine.** The text model proposes ideas based on the person's goal, skills, belongings, life story and
   the village's problems, avoiding what already exists.
2. **Compile.** Each idea must be written with the [effect types](../reference/effects.md). Code validates
   and clamps every value, and a balance rule stops something coming from nothing. If an idea is invalid,
   the model is told what is wrong and gets one retry. If it still fails, it becomes a story beat (news and
   mood) without other effects.
3. **Criticise.** Jev judges whether the idea is plausible, fair and in character, and rejects the rest.
4. **Share.** Accepted ideas join a library. Each person is offered the ideas that best match their role,
   goal and location, and Jev decides whether they use them.

Possibilities added in **God** go through the same compiler.

## The offline brain

Without a key, `ai/offline.js` scores options with fixed rules (urgent needs first, answer people who
speak to you, sleep at night) and returns answers in the same shape as Jev. It keeps the village running
and is what the tests use; it isn't meant to produce interesting behaviour.

## Cost

Measured in September 2026 with 6 to 8 villagers: about 4,000 input tokens per Jev decision, roughly
$0.06 per game day, plus about $0.01 per game day for speech. The top bar shows the cost reported by the API.
