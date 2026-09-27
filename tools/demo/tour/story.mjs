// The story tour: whisper to villagers, start a fire, call an election, bring in a stranger, watch night fall.
// Unlike the feature tour it shows no captions: the story is told later, by narration cut to what happened.
import { sleep } from '../director.mjs';

const chip = name => `#roster .chip:has-text("${name}")`;
const WHISPERS = [
  ['Sera', 'Sing for me tonight, and I will tell you a secret.'],
  ['Bram', 'Can you hear me, Bram? What do you want most?'],
  ['Elena', 'I am the one you lost. I never left.'],
];

export async function open({ d, M, mid }) {
  M('ch:open');
  await d.hideCard();
  await d.glide(mid.x, mid.y);
  await sleep(3000);
}

async function whisperTo(d, M, name, text) {
  await d.click(chip(name), 700);
  await d.reveal('#whisperText', 400);
  await d.fill('#whisperText', text);
  M(`beat:whisper:${name}`);
  await d.click('#whisperBtn', 1200);
}

// Whisper to a few villagers, then follow whoever answers first. Nobody has to: the villagers decide.
export async function whispers({ d, M, page, mid }) {
  M('ch:whisper');
  for (const [name, text] of WHISPERS) if (await page.locator(chip(name)).count()) await whisperTo(d, M, name, text);
  await d.click(chip(WHISPERS[0][0]), 600);
  await d.key('f', 300);
  await d.wheel(mid.x, mid.y, -700, 16, 40);
  if (await d.until(() => window.oakhollow.voiceMessages.length > 0, 75000)) {
    const who = await d.sim(() => window.oakhollow.voiceMessages[0].from);
    M(`beat:reply:${who}`);
    await d.key('Escape', 200); // stop following first: F toggles
    await d.click(chip(who), 500);
    await d.key('f', 300);
    await sleep(4000);
    await d.click('.tab[data-tab="voices"]', 1000);
    await d.hover('#voices li', 5000);
  }
  await d.key('0', 300); await d.key('0', 800);
}

export async function fire({ d, M, mid }) {
  M('ch:fire');
  await d.click('.tab[data-tab="god"]', 600);
  await d.click('[data-event^="A fire"]', 500);
  M('beat:fire');
  await d.click('#eventBtn', 900);
  await d.wheel(mid.x + 90, mid.y + 20, -500, 14, 40);
  await sleep(18000);
  await d.key('0', 1200);
}

export async function election({ d, M, mid }) {
  M('ch:election');
  await d.reveal('#electionBtn', 400);
  M('beat:election');
  await d.click('#electionBtn', 800);
  await d.glide(mid.x, mid.y);
  await d.key('3', 300); // 4x while the village votes
  if (await d.until(() => window.oakhollow.log.some(e => /wins the election|Nobody voted/.test(e.text)), 90000)) M('beat:elected');
  await d.key('2', 300);
  await d.click('.tab[data-tab="village"]', 4500);
}

export async function stranger({ d, M, mid }) {
  M('ch:stranger');
  await d.click('.tab[data-tab="god"]', 600);
  await d.click('.card:has(#spName) > summary', 600);
  await d.reveal('#spName', 400);
  await d.fill('#spName', 'Wren');
  await d.fill('#spRole', 'travelling bard');
  await d.select('#spGender', 'nonbinary');
  await d.select('#spPronouns', 'they');
  M('beat:arrive');
  await d.click('#spawnBtn', 1200);
  await d.click('.tab[data-tab="people"]', 500);
  await d.click(chip('Wren'), 800);
  await d.key('f', 300);
  await d.wheel(mid.x, mid.y, -600, 14, 40);
  await sleep(12000);
  await d.key('0', 300); await d.key('0', 800);
}

// Speeds up until the light changes, then lingers on it.
export async function night({ d, M }) {
  M('ch:night');
  await d.click('.tab[data-tab="log"]', 400);
  await d.key('4', 500);
  const dark = await d.sim(() => window.oakhollow.isNight());
  await d.until(n => window.oakhollow.isNight() !== n, 95000, dark);
  M('beat:light');
  await sleep(9000);
  await d.key('2', 500);
}

export async function end({ d, M }) {
  M('ch:outro');
  await d.card('Oakhollow', 'What will your villagers do?<br>Run <code>npm start</code> and open <code>localhost:3000</code>', true);
  await sleep(6000);
  M('end');
}
