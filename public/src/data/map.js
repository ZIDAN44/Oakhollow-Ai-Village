// The map: places and their resources.
// The starting world. Everything here is only a seed: people build, open businesses,
// marry, have children, die, elect leaders and rewrite the village as they live.

export const WORLD_W = 1200;

export const WORLD_H = 800;

// res: a natural resource that can run out and regrow. owner: private land.
// biz: a business with an owner, a till, stock for sale and employees.
export const DEFAULT_PLACES = [
  { name: 'Whisperwood Forest', type: 'forest', x: 30, y: 30, w: 320, h: 250,
    res: { item: 'wood', amount: 60, max: 60, regrow: 0.03, skill: 'woodcutting', extra: 'herbs' },
    desc: 'Dense old forest. Chop wood, pick herbs, forage berries and mushrooms (not in winter). Quiet, and a little eerie.' },
  { name: 'River', type: 'river', x: 890, y: 0, w: 70, h: 800, water: true,
    res: { item: 'food', amount: 20, max: 20, regrow: 0.025, skill: 'fishing' },
    desc: 'A slow cold river. You can drink here or fish for food.' },
  { name: 'Hale Farm', type: 'farm', x: 610, y: 70, w: 230, h: 170, owner: 'Mira',
    res: { item: 'food', amount: 40, max: 50, regrow: 0.045, skill: 'farming' },
    desc: "Mira's fields of wheat and vegetables. The main source of food in the village." },
  { name: 'Common Fields', type: 'farm', x: 990, y: 90, w: 190, h: 180,
    res: { item: 'food', amount: 35, max: 45, regrow: 0.04, skill: 'farming' },
    desc: 'Shared strips of farmland that any villager may work, as in the old open-field system. Across the bridge.' },
  { name: 'Village Hall', type: 'hall', x: 450, y: 215, w: 120, h: 75, books: true,
    desc: "Where meetings and votes are held. Has a shelf of old books anyone can study." },
  { name: 'Village Square', type: 'square', x: 470, y: 330, w: 170, h: 120,
    desc: 'The heart of the village, with a notice board. People gather and gossip here.' },
  { name: 'Village Well', type: 'well', x: 390, y: 290, w: 50, h: 50, water: true,
    desc: 'Clean drinking water for everyone.' },
  { name: 'The Crooked Mug Tavern', type: 'tavern', x: 690, y: 350, w: 130, h: 90, bed: true,
    biz: { kind: 'tavern', owner: 'Tobias', till: 15, stock: { meal: 6 }, employees: [], priceMult: 1 },
    desc: 'Warm, noisy tavern run by Tobias. Meals for sale. Rooms upstairs.' },
  { name: 'Market', type: 'market', x: 470, y: 510, w: 170, h: 80, market: true,
    desc: 'Open-air market. Sell your goods or buy what others have sold. Prices rise when goods are scarce.' },
  { name: 'Old Ruins', type: 'ruins', x: 50, y: 560, w: 190, h: 170,
    desc: 'Crumbling stone ruins older than the village. Strange blue lights appear here at night.' },
  { name: 'Graveyard', type: 'graveyard', x: 40, y: 320, w: 150, h: 110, graves: ['Anna Oakes', 'Edric Hale', 'Old Maud'],
    desc: 'A quiet graveyard. Bram\'s late wife Anna is buried here, beside Mira\'s father Edric.' },
  { name: 'Eastern Road', type: 'road', x: 990, y: 360, w: 190, h: 70,
    desc: 'The road out of Oakhollow, towards the distant capital. Travellers come and go here.' },
  { name: "Mira's House", type: 'house', x: 700, y: 520, w: 70, h: 55, bed: true, owner: 'Mira',
    desc: "Mira's small, tidy farmhouse." },
  { name: "Elena's House", type: 'house', x: 320, y: 440, w: 70, h: 55, bed: true, owner: 'Elena', books: true,
    desc: "Elena's house, full of drying herbs and old books." },
  { name: "Bram's Cabin", type: 'house', x: 370, y: 200, w: 70, h: 55, bed: true, owner: 'Bram',
    desc: "Bram's log cabin at the edge of the forest." },
  { name: "Hugo's Cottage", type: 'house', x: 280, y: 640, w: 70, h: 55, bed: true, owner: 'Hugo', books: true,
    desc: "Old Hugo's cottage, closest to the ruins." },
];
