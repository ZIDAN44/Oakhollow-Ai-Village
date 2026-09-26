// Tour scenes 2: the God panel: an event, the weather, a new villager, a new possibility, an election.
import { sleep } from '../director.mjs';

export async function event({ d, M, mid }) {
  M('ch:event');
  await d.click('.tab[data-tab="god"]', 700);
  await d.caption('Play god', 'Announce an event. Everyone hears it, and each person reacts in their own way.');
  await d.click('[data-event^="A fire"]', 600);
  await d.click('#eventBtn', 1200);
  await d.glide(mid.x, mid.y - 40);
  await d.wheel(mid.x, mid.y + 40, -450, 14, 40);
  await sleep(14000);
  await d.key('0', 1500);
}

export async function weather({ d, M }) {
  M('ch:weather');
  await d.caption('Weather', 'Change the weather. Rain and storms change where people go and how they feel.');
  await d.click('[data-weather="storm"]', 6500);
}

export async function villager({ d, M, mid }) {
  M('ch:villager');
  await d.caption('New villager', 'Write a person into the world. Jev runs them like everyone else.');
  await d.click('.card:has(#spName) > summary', 700);
  await d.reveal('#spName', 500);
  await d.fill('#spName', 'Wren');
  await d.fill('#spAge', '27');
  await d.fill('#spRole', 'travelling bard');
  await d.select('#spGender', 'nonbinary');
  await d.select('#spPronouns', 'they');
  await d.click('.spAttr[value="woman"]', 250);
  await d.reveal('#spPersonality', 400);
  await d.fill('#spPersonality', 'Warm, restless, collects stories');
  await d.fill('#spGoal', 'Write a song about Oakhollow');
  await d.fill('#spDream', 'playing for a king');
  M('hl:spawn');
  await d.click('#spawnBtn', 1500);
  await d.click('.tab[data-tab="people"]', 700);
  await d.click('#roster .chip:has-text("Wren")', 1200);
  await d.click('#followBtn', 800);
  await d.wheel(mid.x, mid.y, -600, 14, 40);
  await sleep(8000);
  await d.key('0', 300); await d.key('0', 800);
}

export async function possibility({ d, M }) {
  M('ch:possibility');
  await d.click('.tab[data-tab="god"]', 700);
  await d.click('[data-weather="clear"]', 500);
  await d.caption('New possibility', 'Describe a new thing people can do. The text model turns it into real game effects.');
  await d.click('.card:has(#actLabel) > summary', 700);
  await d.reveal('#actLabel', 500);
  await d.fill('#actLabel', 'Write a love letter');
  await d.fill('#actText', 'writes a love letter by candlelight');
  M('hl:design');
  await d.click('#actBtn', 600);
  await d.until(() => !document.getElementById('actBtn').disabled, 30000);
  M('hl:designed');
  await sleep(600);
  await d.reveal('#actList', 400);
  await d.hover('#actList li', 4500);
}

export async function election({ d, M, mid }) {
  M('ch:election');
  await d.caption('Politics', 'Force an election. Villagers campaign, vote, and the winner can pass laws.');
  await d.reveal('#electionBtn', 500);
  await d.click('#electionBtn', 1200);
  await d.glide(mid.x, mid.y);
  await sleep(9000);
}
