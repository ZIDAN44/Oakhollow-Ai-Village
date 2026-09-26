// Recording overlay, injected into the game page: a visible cursor, click ripples, captions and title cards.
// It never takes pointer events. Native tooltips are removed so they don't pop up wherever the cursor rests.
(() => {
  const css = `
  #demo-cursor { position: fixed; left: 0; top: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; will-change: transform; }
  #demo-cursor .ring { position: absolute; left: -19px; top: -19px; width: 38px; height: 38px; border-radius: 50%;
    background: oklch(80% 0.12 75 / 0.22); border: 1.5px solid oklch(84% 0.14 78 / 0.75); transition: transform 140ms ease, background 140ms ease; }
  #demo-cursor.down .ring { transform: scale(0.72); background: oklch(80% 0.12 75 / 0.42); }
  #demo-cursor svg { position: absolute; left: -2px; top: -1px; width: 26px; height: 26px; filter: drop-shadow(0 2px 3px rgb(0 0 0 / .5)); }
  .demo-ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%;
    border: 2px solid oklch(84% 0.14 78); animation: demo-ripple 520ms cubic-bezier(.2,.7,.2,1) forwards; }
  @keyframes demo-ripple { to { transform: scale(4.2); opacity: 0; } }
  #demo-caption { position: fixed; z-index: 2147483645; pointer-events: none; transform: translate(-50%, 12px); opacity: 0;
    transition: opacity 320ms ease, transform 420ms cubic-bezier(.2,.7,.2,1); max-width: 760px; text-align: center;
    padding: 12px 22px 14px; border-radius: 14px; background: oklch(18% 0.013 150 / 0.86); backdrop-filter: blur(10px);
    border: 1px solid oklch(40% 0.02 150 / 0.8); box-shadow: 0 10px 30px rgb(0 0 0 / .45); font-family: var(--font-ui); }
  #demo-caption.on { opacity: 1; transform: translate(-50%, 0); }
  #demo-caption .k { display: block; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); font-weight: 650; margin-bottom: 4px; }
  #demo-caption .t { font-size: 18px; line-height: 1.4; color: var(--text); }
  #demo-card { position: fixed; z-index: 2147483644; pointer-events: none; display: grid; place-items: center; opacity: 0; transition: opacity 500ms ease; }
  #demo-card.on { opacity: 1; }
  body.demo-full #demo-cursor { opacity: 0; }
  #demo-cursor { transition: opacity 300ms ease; }
  #demo-card.full { inset: 0; background: radial-gradient(ellipse at 50% 45%, oklch(22% 0.02 150 / .93), oklch(14% 0.012 150 / .97)); }
  #demo-card .box { text-align: center; padding: 26px 40px; border-radius: 18px; font-family: var(--font-ui); }
  #demo-card:not(.full) .box { background: oklch(18% 0.013 150 / 0.78); backdrop-filter: blur(8px); border: 1px solid oklch(40% 0.02 150 / .7); }
  #demo-card h2 { font-family: var(--font-display); font-weight: 600; font-size: 44px; margin: 6px 0 8px; color: var(--text); }
  #demo-card.full h2 { font-size: 72px; }
  #demo-card p { margin: 0; font-size: 19px; color: var(--text-2); max-width: 720px; line-height: 1.5; }
  #demo-card code { font-size: 18px; background: oklch(26% 0.015 150); padding: 2px 8px; border-radius: 6px; color: var(--accent-strong); }
  `;
  const arrow = '<svg viewBox="0 0 24 24"><path d="M3 2 L3 19 L7.6 14.9 L10.6 21.6 L13.4 20.4 L10.5 13.8 L16.8 13.8 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  const stageRect = () => document.querySelector('.stage')?.getBoundingClientRect() ?? { left: 0, top: 0, width: innerWidth, height: innerHeight, bottom: innerHeight };
  let cursor, caption, card, capTimer;

  function mount() {
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    cursor = Object.assign(document.createElement('div'), { id: 'demo-cursor', innerHTML: `<div class="ring"></div>${arrow}` });
    caption = Object.assign(document.createElement('div'), { id: 'demo-caption', innerHTML: '<span class="k"></span><span class="t"></span>' });
    card = Object.assign(document.createElement('div'), { id: 'demo-card', innerHTML: '<div class="box"><h2></h2><p></p></div>' });
    document.body.append(card, caption, cursor);
    cursor.style.transform = 'translate(-100px,-100px)';
    addEventListener('mousemove', e => { cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
    addEventListener('mousedown', e => {
      cursor.classList.add('down');
      const r = Object.assign(document.createElement('div'), { className: 'demo-ripple' });
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.append(r); setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener('mouseup', () => cursor.classList.remove('down'), true);
    // Native hover tooltips would pop up wherever the cursor rests; the video has captions instead.
    const strip = root => root.querySelectorAll?.('[title]').forEach(el => el.removeAttribute('title'));
    strip(document);
    new MutationObserver(ms => ms.forEach(m => { if (m.type === 'attributes') m.target.removeAttribute('title'); else m.addedNodes.forEach(n => { if (n.nodeType === 1) { n.removeAttribute('title'); strip(n); } }); }))
      .observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
  }

  window.__demo = {
    caption(kicker, text) {
      clearTimeout(capTimer);
      const show = () => {
        const s = stageRect();
        caption.style.left = `${s.left + s.width / 2}px`;
        caption.style.top = 'auto';
        caption.style.bottom = `${innerHeight - s.bottom + 58}px`;
        caption.querySelector('.k').textContent = kicker || '';
        caption.querySelector('.k').style.display = kicker ? '' : 'none';
        caption.querySelector('.t').textContent = text;
        caption.classList.add('on');
      };
      if (caption.classList.contains('on')) { caption.classList.remove('on'); capTimer = setTimeout(show, 340); } else show();
    },
    hideCaption() { clearTimeout(capTimer); caption.classList.remove('on'); },
    card(title, sub, full = false) {
      const s = stageRect();
      card.classList.toggle('full', full);
      Object.assign(card.style, full ? { left: '0', top: '0', width: '', height: '' } : { left: `${s.left}px`, top: `${s.top}px`, width: `${s.width}px`, height: `${s.height}px` });
      card.style.inset = full ? '0' : '';
      card.querySelector('h2').textContent = title;
      card.querySelector('p').innerHTML = sub || '';
      card.classList.add('on');
      document.body.classList.toggle('demo-full', full);
    },
    hideCard() { card.classList.remove('on'); document.body.classList.remove('demo-full'); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
