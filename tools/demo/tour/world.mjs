// Tour scenes 1: the opening card, the map, a villager's mind, following them, and whispers.
import { sleep } from '../director.mjs';

export async function intro({ d, M, mid }) {
  M('ch:intro');
  await sleep(3800);
  await d.hideCard();
  await sleep(900);
  await d.caption('Live mode', 'Jev chooses each villager\'s next action from everything they can do right now. A text model writes what they say.');
  await d.hover('#mode', 1600);
  await d.hover('#stats', 2200);
  await d.glide(mid.x, mid.y);
  await sleep(2500);
}

export async function map({ d, M, mid }) {
  M('ch:map');
  await d.caption('The map', 'Scroll to zoom, drag to pan. Speech bubbles show what people say to each other.');
  await d.wheel(mid.x, mid.y + 20, -900, 22, 40);
  await sleep(2200);
  await d.drag({ x: mid.x + 160, y: mid.y + 60 }, { x: -270, y: -120 });
  await sleep(4000);
  await d.wheel(mid.x, mid.y, 500, 16, 40);
  await sleep(3500);
}

export async function mind({ d, M, page, sideMid, state }) {
  M('ch:mind');
  state.who = await d.sim(() => window.oakhollow.leader || window.oakhollow.npcs[0].name);
  await d.caption('Inside a head', 'Pick anyone to see their needs, belongings, and the options Jev weighed for their last decision.');
  await d.click(`#roster .chip:has-text("${state.who}")`, 1200);
  await d.until(() => document.querySelector('#inspector .mind'), 15000);
  await d.hover('#inspector .who', 1800);
  await d.reveal('#inspector .mind', 900);
  await d.hover('#inspector .mind', 3800);
  await d.caption('Inside a head', 'Relationships keep their reasons. Memories and life events shape every later choice.');
  if (await page.locator('#inspector .rel').count()) { await d.reveal('#inspector .rel', 900); await d.hover('#inspector .rel', 3200); }
  await d.wheel(sideMid.x, sideMid.y, 900, 18, 45);
  await sleep(2600);
  await d.wheel(sideMid.x, sideMid.y, -2000, 18, 30);
  await sleep(800);
}

export async function follow({ d, M, mid }) {
  M('ch:follow');
  await d.caption('Follow', 'Press F to follow them around the village.');
  await d.click('#followBtn', 600);
  await d.wheel(mid.x, mid.y, -700, 16, 40);
  await sleep(7000);
}

// Each villager decides for themselves whether to answer, so whisper to a few of them.
const MORE_WHISPERS = [
  ['Bram', 'Can you hear me, Bram? What do you want most?'],
  ['Sera', 'Sing for me tonight, and I will tell you a secret.'],
];

export async function whisper({ d, M, page, state }) {
  M('ch:whisper');
  await d.caption('Whisper', 'Speak into someone\'s mind. They decide for themselves what the voice is, and some start talking back.');
  await d.reveal('#whisperText', 500);
  await d.fill('#whisperText', 'The old ruins are calling you. Go and look, but tell no one.');
  await d.click('#whisperBtn', 1500);
  await d.hover('#inspector .status', 2500);
  for (const [name, text] of MORE_WHISPERS) {
    const chip = `#roster .chip:has-text("${name}")`;
    if (name === state.who || !(await page.locator(chip).count())) continue;
    await d.click(chip, 700);
    await d.reveal('#whisperText', 400);
    await d.fill('#whisperText', text);
    await d.click('#whisperBtn', 1200);
  }
  await d.key('0', 300); await d.key('0', 600);
  await sleep(2500);
}
