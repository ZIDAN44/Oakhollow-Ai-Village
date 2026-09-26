// Laws a leader can decree and problems a village can face.
// Laws a leader can decree.
export const DECREES = {
  ban_ruins: 'No one may enter the Old Ruins.',
  curfew: 'Everyone must be indoors after dark.',
  tax: 'Every villager pays 2 coins to the village treasury each morning.',
  share_food: 'Those with plenty must share food with the hungry.',
  no_fighting: 'Fighting is forbidden. Brawlers will be fined 5 coins.',
  welcome: 'Newcomers are welcome to settle and build homes here.',
  festival: 'By order of the leader, the harvest festival will be held at the Village Square.',
};

// Problems people can work on together. `label` is the option, progress rises with `skill`.
export const PROBLEM_TYPES = {
  blue_lights: {
    title: 'The mystery of the blue lights', difficulty: 5, place: 'Old Ruins', skill: 'scholarship', label: 'Investigate the blue lights',
    desc: 'Strange blue lights appear at the Old Ruins at night. What are they?',
    clues: [
      'Old carvings on the stones show people bowing to a glowing figure.',
      'A fresh-looking seal of wax and iron, only decades old, covers a stone slab.',
      'The seal bears a mark: the letters H.A. Hugo Ashby?',
      'Under the slab is a sealed door, humming faintly. Something is behind it.',
    ],
  },
  festival: {
    title: 'Prepare the harvest festival', difficulty: 2.5, place: 'Village Square', skill: 'crafting', label: 'Help prepare the festival',
    desc: 'Decorations, food and a stage are needed before the evening of Day 4.',
  },
  bridge: {
    title: 'Repair the broken bridge', difficulty: 1.5, place: 'River', skill: 'crafting', label: 'Repair the bridge (1 wood)', needs: { wood: 1 },
    desc: 'The storm smashed the bridge. Crossing the river is slow and dangerous.',
  },
  wolves: {
    title: 'Drive off the wolves', difficulty: 2, place: 'Whisperwood Forest', skill: 'fighting', label: 'Hunt the wolves', danger: 0.25,
    desc: 'Wolves prowl the forest. Anyone gathering there risks being attacked.',
  },
  outbreak: {
    title: 'Find a cure for the sickness', difficulty: 3, place: null, skill: 'herbalism', label: 'Research a cure for the sickness',
    desc: 'A sickness is spreading through the village.',
  },
  robbery: {
    title: 'Who is the thief?', difficulty: 3, place: 'Village Square', skill: 'scholarship', label: 'Ask around about the thefts',
    desc: 'Someone has been stealing. Nobody knows who.',
  },
};
