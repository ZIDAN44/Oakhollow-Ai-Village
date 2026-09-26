// Buildings, business types and base prices.
// Things that can be built. Structures and houses become new places; businesses too.
export const BUILDABLES = [
  { kind: 'structure', name: 'Festival Stage', cost: { wood: 3 }, desc: 'A wooden stage built for the harvest festival.' },
  { kind: 'structure', name: 'Memorial Bench', cost: { wood: 3 }, desc: 'A carved bench in memory of someone loved.' },
  { kind: 'structure', name: 'Watchtower', cost: { wood: 4 }, desc: 'A lookout with a view of the ruins and the road.' },
  { kind: 'structure', name: 'Fishing Dock', cost: { wood: 3 }, desc: 'A small dock for fishing.' },
  { kind: 'structure', name: 'Campfire Circle', cost: { wood: 2 }, desc: 'Logs around a fire pit, for gathering at night.' },
  { kind: 'structure', name: 'Shrine to the Voice', cost: { wood: 3 }, desc: 'A small shrine to the mysterious Voice some villagers hear.', needsBelief: true },
  { kind: 'house', name: 'House', cost: { wood: 6 }, desc: 'A home of your own, with a bed.' },
  { kind: 'business', biz: 'bakery', name: 'Bakery', cost: { wood: 4, coins: 8 }, desc: 'Turns food into bread to sell. Bread is more filling.' },
  { kind: 'business', biz: 'smithy', name: 'Smithy', cost: { wood: 5, coins: 10 }, desc: 'Forges tools that make any work more productive.' },
  { kind: 'business', biz: 'apothecary', name: 'Apothecary', cost: { wood: 4, coins: 6 }, desc: 'Brews and sells remedies that cure sickness.' },
  { kind: 'business', biz: 'school', name: 'School', cost: { wood: 5, coins: 5 }, desc: 'Teach classes; students pay a coin and grow wiser.' },
  { kind: 'business', biz: 'clinic', name: 'Clinic', cost: { wood: 6, coins: 8 }, desc: 'Beds for the sick and a place to give birth safely. Patients recover faster here.' },
  { kind: 'business', biz: 'shop', name: 'General Store', cost: { wood: 4, coins: 10 }, desc: 'Buy goods cheaply, sell them at your own prices.' },
];

// What each business makes. Inputs come from the worker's pockets.
export const BUSINESS_TYPES = {
  tavern: { produce: 'Cook meals (1 food → 2 meals)', text: 'cooks a pot of stew', skill: 'cooking', in: { food: 1 }, out: { meal: 2 }, sells: ['meal'] },
  bakery: { produce: 'Bake bread (2 food → 3 bread)', text: 'kneads dough and bakes bread', skill: 'cooking', in: { food: 2 }, out: { bread: 3 }, sells: ['bread'] },
  smithy: { produce: 'Forge a tool (2 wood, 2 coins)', text: 'hammers out a tool at the forge', skill: 'crafting', in: { wood: 2, coins: 2 }, out: { tool: 1 }, sells: ['tool'] },
  apothecary: { produce: 'Brew remedies (2 herbs → 2 remedies)', text: 'brews remedies over a small flame', skill: 'herbalism', in: { herbs: 2 }, out: { remedy: 2 }, sells: ['remedy'] },
  clinic: { produce: 'Tend the patients (2 herbs)', text: 'tends to the patients in the clinic', skill: 'herbalism', in: { herbs: 2 }, out: { remedy: 1 }, sells: ['remedy'] },
  school: { produce: 'Teach a class', text: 'teaches a class', skill: 'scholarship', in: {}, out: {}, sells: [] },
  shop: { produce: 'Stock the shelves with your goods', text: 'stocks the shelves', skill: 'trade', in: {}, out: {}, sells: ['food', 'bread', 'wood', 'herbs', 'tool', 'remedy'] },
};

export const BASE_PRICES = { food: 3, bread: 4, meal: 3, wood: 2, herbs: 3, remedy: 8, tool: 10, water: 1 };
