// The world's lore and what people may believe about the Voice.
export const DEFAULT_LORE = `Oakhollow is a small village between the Whisperwood forest and a slow, cold river.
The harvest festival is in three days, and nobody has decided who will organise it.
Lately, strange blue lights have been seen at the Old Ruins after dark.
People trade with coins. Food comes from the farm or the river, wood from the forest, water from the well or river.
Anyone can do anything: work, trade, open a business, study, build, fight, steal, fall in love, marry, raise children, keep secrets, or change their life.`;

// Ways people can interpret the voice in their head (the player's whispers).
// How someone reacts right after a whisper. `mode` is the voice verb's mode (no mode: they don't answer);
// `label` is the decision the inspector shows.
export const VOICE_REACTIONS = {
  answer_in_thought: { desc: 'Answer the voice silently, in {their} head', label: 'Answer the Voice in thought', mode: 'think' },
  answer_aloud: { desc: 'Answer the voice out loud, where others may hear', label: 'Speak aloud to the Voice', mode: 'speak' },
  ask_for_sign: { desc: 'Ask the voice to prove it is real', label: 'Ask the Voice for a sign', mode: 'sign' },
  keep_quiet: { desc: 'Ignore it and say nothing', mode: null },
};

export const VOICE_BELIEFS = {
  imagination: { desc: 'It was just {their} imagination', line: 'It was probably nothing. Just my mind playing tricks.' },
  madness: { desc: '{They} fear{s} {they} {are} going mad', line: 'I think I might be losing my mind. I hear a voice.' },
  spirit: { desc: 'It is a spirit from the Old Ruins', line: 'There is a spirit speaking to me. I think it comes from the ruins.' },
  god: { desc: 'It is a god watching over the village', line: 'A god speaks to me. We are being watched over.' },
  lost_one: { desc: 'It is someone {they} lost, speaking from beyond', line: 'Someone I lost is speaking to me from beyond.' },
  watcher: { desc: 'Someone outside this world is watching; the world itself may not be real', line: 'I think our whole world is... watched. Maybe not even real.' },
};
