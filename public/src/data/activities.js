// Everyday activities anyone can choose.
// Things people can choose to do besides the basics. `where` = place type or name,
// `role` = only that role, `skill` = practising it improves that skill, `effect` runs when done.
export const ACTIVITIES = [
  { label: 'Play music for coins', text: 'plays a lively tune for anyone listening', where: 'tavern', skill: 'music', minutes: 45, effect: 'busk' },
  { label: 'Busk in the square', text: 'sings a song for passers-by', where: 'square', skill: 'music', minutes: 40, effect: 'busk' },
  { label: 'Pick herbs', text: 'searches the undergrowth for medicinal herbs', where: 'forest', skill: 'herbalism', minutes: 45, effect: 'herbs' },
  { label: 'Brew a remedy (2 herbs)', text: 'grinds herbs and brews a remedy', skill: 'herbalism', minutes: 40, effect: 'brew', needs: { herbs: 2 } },
  { label: 'Craft a tool (2 wood)', text: 'carves and binds a sturdy tool', skill: 'crafting', minutes: 60, effect: 'craftTool', needs: { wood: 2 } },
  { label: 'Carve a small wooden figure (1 wood)', text: 'carves a small wooden figure', skill: 'crafting', minutes: 40, needs: { wood: 1 }, fx: [{ type: 'item', who: 'self', item: 'carving', amount: 1 }] },
  { label: 'Tell an old story to anyone near', text: 'tells a long story from the old days', minutes: 30, effect: 'story' },
  { label: 'Pray quietly', text: 'bows {their} head in quiet prayer', minutes: 20, effect: 'calm' },
  { label: 'Watch the stars', text: 'lies back and watches the stars', night: true, minutes: 40, effect: 'calm' },
  { label: 'Sit and reflect alone', text: 'sits alone, lost in thought', minutes: 25, effect: 'calm' },
  { label: 'Train with a wooden sword', text: 'practises sword swings on a tree stump', skill: 'fighting', minutes: 40, fx: [{ type: 'need', who: 'self', need: 'energy', amount: -12 }, { type: 'skill', who: 'self', skill: 'fighting', amount: 2 }] },
  { label: 'Clean and tidy up', text: 'cleans and tidies up', where: 'house', minutes: 30, fx: [{ type: 'mood', who: 'self', amount: 0.5 }, { type: 'need', who: 'self', need: 'energy', amount: -5 }] },
  { label: 'Drink ale at the bar (2 coins)', text: 'nurses a mug of ale at the bar', where: 'tavern', minutes: 30, effect: 'ale', needs: { coins: 2 } },
  { label: 'Dance', text: 'dances without a care', minutes: 20, fx: [{ type: 'mood', who: 'everyone_near', amount: 0.5 }, { type: 'opinion', who: 'everyone_near', aff: 2, trust: 0, rom: 1, why: 'danced so joyfully' }, { type: 'need', who: 'self', need: 'energy', amount: -8 }] },
];
