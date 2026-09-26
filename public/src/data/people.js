// The starting villagers, travellers and names.
// Speech quirks so people sound like themselves.
export const DEFAULT_NPCS = [
  {
    name: 'Mira', age: 27, role: 'farmer', color: '#e9b44c', home: "Mira's House", start: 'Hale Farm',
    gender: 'woman', pronouns: 'she', attractedTo: ['man', 'woman'], canCarry: true, canSire: false,
    personality: 'Diligent, practical and warm, but quietly restless.',
    goal: 'Save 30 coins so she can leave Oakhollow and see the capital. She has told no one.',
    secret: "I'm saving every coin I can. One day I'm leaving Oakhollow for the capital.",
    dream: 'seeing the capital someday',
    skills: { farming: 60, cooking: 30, trade: 25 },
    voice: { open: ['Well,', 'Honestly,', ''], close: ['', '', ' Anyway, back to work.'] },
    inv: { food: 3, water: 1, coins: 8 },
    rel: { Bram: [35, 30], Elena: [20, 15], Hugo: [15, 15], Tobias: [10, 5] },
  },
  {
    name: 'Tobias', age: 45, role: 'tavern keeper', color: '#d1603d', home: 'The Crooked Mug Tavern', start: 'The Crooked Mug Tavern',
    gender: 'man', pronouns: 'he', attractedTo: ['woman'], canCarry: false, canSire: true,
    personality: 'Jovial, loves gossip, a little greedy, hates being left out.',
    goal: 'Host the harvest festival at his tavern and make it the most profitable night of the year.',
    secret: "I water down the ale when the tavern is busy. Don't tell a soul.",
    dream: 'throwing the best harvest festival this village has ever seen',
    skills: { cooking: 55, trade: 50, music: 15 },
    voice: { open: ['Ha!', 'Listen here,', 'Oh,'], close: ['', ' Mark my words.', ' Drinks are on me... almost.'] },
    inv: { food: 6, water: 4, coins: 30 },
    rel: { Hugo: [35, 30], Mira: [15, 10], Bram: [10, 10], Elena: [-5, 5] },
  },
  {
    name: 'Elena', age: 34, role: 'herbalist', color: '#6fb07f', home: "Elena's House", start: "Elena's House",
    gender: 'woman', pronouns: 'she', attractedTo: ['woman'], canCarry: true, canSire: false,
    personality: 'Curious, sceptical, bookish, blunt.',
    goal: 'Find out what the blue lights at the Old Ruins really are.',
    secret: 'I went to the ruins one night and saw a figure standing in the blue light.',
    dream: 'finding out what those lights really are',
    skills: { herbalism: 65, scholarship: 55, crafting: 15 },
    voice: { open: ['Hm.', 'Frankly,', 'Interesting.'], close: ['', ' Think about it.', ''] },
    inv: { food: 2, water: 1, coins: 15, herbs: 2, remedy: 1 },
    rel: { Mira: [20, 20], Bram: [15, 10], Tobias: [0, -5], Hugo: [10, -15] },
  },
  {
    name: 'Bram', age: 52, role: 'woodcutter', color: '#8c6a4f', home: "Bram's Cabin", start: 'Whisperwood Forest',
    gender: 'man', pronouns: 'he', attractedTo: ['woman'], canCarry: false, canSire: true,
    personality: 'Gruff and few words, kind underneath. A widower who is lonelier than he admits.',
    goal: 'Build something meaningful in memory of his late wife, Anna.',
    secret: 'I still talk to Anna every night, as if she could hear me.',
    dream: 'building something that would have made Anna proud',
    skills: { woodcutting: 70, crafting: 50, fighting: 40 },
    voice: { open: ['', 'Hmph.', 'Aye.'], close: ['', '', ''] },
    inv: { food: 2, water: 1, wood: 4, coins: 12 },
    rel: { Mira: [35, 30], Hugo: [20, 20], Tobias: [15, 10], Elena: [10, 10] },
  },
  {
    name: 'Sera', age: 19, role: 'wandering musician', color: '#b07fd6', home: 'The Crooked Mug Tavern', start: 'Eastern Road',
    gender: 'woman', pronouns: 'she', attractedTo: ['woman', 'man', 'nonbinary'], canCarry: true, canSire: false,
    personality: 'Charming, impulsive, playful, hides her past behind jokes.',
    goal: 'Find a place where she belongs, and make sure nobody learns she ran away from a noble family.',
    secret: "My real name is Seraphine Valcourt. I ran away from my family's estate.",
    dream: 'finding somewhere I truly belong',
    skills: { music: 65, trade: 20, scholarship: 30 },
    voice: { open: ['Oh!', 'Ooh,', 'Say,'], close: ['', ' ♪', ' Hehe.'] },
    inv: { food: 1, coins: 5 },
    stranger: true,
  },
  {
    name: 'Hugo', age: 78, role: 'village elder', color: '#7fa3d6', home: "Hugo's Cottage", start: 'Village Square',
    gender: 'man', pronouns: 'he', attractedTo: ['woman'], canCarry: false, canSire: true,
    personality: 'Wise, stubborn, a bit forgetful, fond of long stories.',
    goal: 'Keep everyone away from the Old Ruins. Decades ago he sealed something there, and he fears it waking. He will not say what.',
    secret: 'Fifty years ago I sealed something beneath the ruins. It must never be opened.',
    dream: 'keeping this village safe, whatever it takes',
    skills: { leadership: 60, scholarship: 50, herbalism: 20 },
    voice: { open: ['Ah,', 'In my day,', 'Mm,'], close: ['', ' Mark an old man\'s words.', ''] },
    inv: { food: 3, water: 2, coins: 20 },
    rel: { Tobias: [35, 30], Bram: [25, 20], Mira: [20, 20], Elena: [5, 0] },
    leader: true,
  },
];

export const NPC_COLORS = ['#e07a9b', '#4fb3bf', '#c9c955', '#f08a4b', '#9d8df1', '#63c78b', '#d4a373', '#e46c6c', '#79c2e0', '#b5d46a'];

// Travellers who might wander in along the Eastern Road.
export const TRAVELLERS = [
  { role: 'blacksmith', personality: 'Strong, proud, short-tempered but fair.', goal: 'Open a smithy and make a name for themselves.', secret: 'I killed a man in a duel back home and fled.', dream: 'running the finest forge in the land', skills: { crafting: 60, fighting: 50 } },
  { role: 'merchant', personality: 'Smooth-talking, shrewd, always counting coins.', goal: 'Open a shop and become the richest person in Oakhollow.', secret: "Half my goods are stolen, and I'm deep in debt.", dream: 'owning a trading company', skills: { trade: 70, scholarship: 30 } },
  { role: 'hunter', personality: 'Quiet, watchful, happiest outdoors.', goal: 'Find good hunting grounds and a quiet place to live.', secret: 'I once left my partner to die when a bear attacked.', dream: 'a cabin deep in the woods', skills: { fighting: 55, fishing: 40, woodcutting: 35 } },
  { role: 'scholar', personality: 'Curious, awkward, easily excited by old things.', goal: 'Study the Old Ruins and write a famous book about them.', secret: 'The royal academy sent me to find something in these ruins.', dream: 'being remembered as a great scholar', skills: { scholarship: 75, herbalism: 20 } },
  { role: 'pilgrim', personality: 'Gentle, devout, sees signs everywhere.', goal: 'Find holy places and help the needy.', secret: 'I have lost my faith and pretend otherwise.', dream: 'finding a true miracle', skills: { herbalism: 35, leadership: 30 } },
  { role: 'thief', cover: 'peddler', personality: 'Charming, nimble, never stays long anywhere.', goal: 'Make some quick coins and move on before anyone notices.', secret: 'I am a thief, wanted in three towns.', dream: 'one big score and then retiring', skills: { trade: 35, fighting: 30 } },
  { role: 'baker', personality: 'Cheerful, generous, a terrible liar.', goal: 'Open a bakery and feed the whole village.', secret: 'My last bakery burned down, and it was my fault.', dream: 'a bakery everyone loves', skills: { cooking: 65, trade: 30 } },
  { role: 'soldier', personality: 'Disciplined, haunted, protective of the weak.', goal: 'Find peace, and protect this village if it needs it.', secret: 'I deserted the army before the last battle.', dream: 'a quiet life with no more war', skills: { fighting: 75, leadership: 40 } },
];

export const TRAVELLER_NAMES = ['Garrick', 'Lysa', 'Oren', 'Maelis', 'Tamsin', 'Corwin', 'Ilse', 'Rowan', 'Dace', 'Wren', 'Ansel', 'Brigid', 'Fenn', 'Katrin', 'Joss'];

export const CHILD_NAMES = ['Pip', 'Lark', 'Tobin', 'Nell', 'Arlo', 'Ivy', 'Robin', 'Moss', 'Clover', 'Finch', 'Hazel', 'Bran', 'Poppy', 'Linden'];
