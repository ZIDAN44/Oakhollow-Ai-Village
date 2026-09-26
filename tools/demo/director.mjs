// Drives the page like a calm presenter: eased cursor moves, clicks, typing, smooth scrolling, captions.
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Smootherstep: starts and stops gently, so the cursor reads as a deliberate hand.
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);

export function director(page) {
  const pos = { x: 700, y: 480 };

  // Move along a slight arc; longer moves take longer, but never more than about a second.
  async function glide(x, y, ms) {
    const dx = x - pos.x, dy = y - pos.y, dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    ms ??= Math.min(1150, 380 + dist * 0.55);
    const bend = Math.min(60, dist * 0.08) * (dx > 0 ? 1 : -1);
    const nx = -dy / dist, ny = dx / dist;
    const t0 = Date.now(), from = { ...pos };
    for (let t = 0; t < 1;) {
      t = Math.min(1, (Date.now() - t0) / ms);
      const e = ease(t), arc = Math.sin(Math.PI * e) * bend;
      await page.mouse.move(from.x + dx * e + nx * arc, from.y + dy * e + ny * arc);
      if (t < 1) await sleep(12);
    }
    pos.x = x; pos.y = y;
  }

  async function box(sel) {
    const loc = page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout: 15000 });
    const b = await loc.boundingBox();
    return { loc, x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }

  async function press(dwell) {
    await sleep(140);
    await page.mouse.down(); await sleep(90); await page.mouse.up();
    await sleep(dwell);
  }

  const d = {
    pos, glide,
    async hover(sel, dwell = 500) { const { x, y } = await box(sel); await glide(x, y); await sleep(dwell); },
    async click(sel, dwell = 450) { const { x, y } = await box(sel); await glide(x, y); await press(dwell); },
    // Types at a human pace, with a little jitter and a pause between words.
    async type(text, delay = 42) {
      for (const ch of text) { await page.keyboard.type(ch); await sleep(delay + Math.random() * 38 + (ch === ' ' ? 30 : 0)); }
    },
    async fill(sel, text) { await d.click(sel, 150); await d.type(text); await sleep(250); },
    // Native dropdowns open outside the page, so point at the select and set it directly.
    async select(sel, value) { const { loc } = await box(sel); await d.hover(sel, 150); await page.mouse.down(); await page.mouse.up(); await loc.selectOption(value); await sleep(350); },
    async key(k, dwell = 400) { await page.keyboard.press(k); await sleep(dwell); },
    // Many small wheel notches instead of one jump.
    async wheel(x, y, dy, steps = 14, gap = 28) {
      await glide(x, y);
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(gap); }
    },
    async drag(from, by, steps = 30) {
      await glide(from.x, from.y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x + by.x * i / steps, from.y + by.y * i / steps); await sleep(16); }
      await page.mouse.up();
      pos.x = from.x + by.x; pos.y = from.y + by.y;
    },
    async reveal(sel, dwell = 700) {
      await page.locator(sel).first().evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await sleep(dwell);
    },
    caption: (kicker, text) => page.evaluate(([k, t]) => window.__demo.caption(k, t), [kicker, text]),
    hideCaption: () => page.evaluate(() => window.__demo.hideCaption()),
    card: (title, sub, full) => page.evaluate(([t, s, f]) => window.__demo.card(t, s, f), [title, sub, full]),
    hideCard: () => page.evaluate(() => window.__demo.hideCard()),
    sim: fn => page.evaluate(fn),
    // Waits for something in the live world, but never longer than `max` ms. Returns whether it happened.
    async until(fn, max = 20000, arg) {
      try { await page.waitForFunction(fn, arg, { timeout: max, polling: 250 }); return true; } catch { return false; }
    },
  };
  return d;
}
