// A tiny stand-in for the browser DOM and canvas, so UI code can run headless in tests.
// The canvas context records every call and flags non-finite numbers (a NaN coordinate is a drawing bug).

export function fakeCanvasContext() {
  const state = {};
  const log = { calls: 0, badArgs: [] };
  const special = {
    measureText: text => ({ width: String(text).length * 6 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop === '__log') return log;
      if (prop in target) return target[prop];
      return (...args) => {
        log.calls++;
        if (args.some(a => typeof a === 'number' && !Number.isFinite(a))) log.badArgs.push(`${String(prop)}(${args.join(', ')})`);
        return special[prop]?.(...args);
      };
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  return ctx;
}

function fakeElement(id, ctx) {
  return {
    id, innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, children: [],
    width: 1200, height: 800,
    classList: { contains: () => true, add() {}, remove() {}, toggle() {} },
    parentElement: { getBoundingClientRect: () => ({ width: 1200, height: 800 }) },
    getContext: () => ctx,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {},
    focus() {},
  };
}

// Installs `document`, `window` and friends on globalThis. Returns the canvas context and element lookup.
export function installFakeDom() {
  const ctx = fakeCanvasContext();
  const els = new Map();
  const get = id => { if (!els.has(id)) els.set(id, fakeElement(id, ctx)); return els.get(id); };
  globalThis.document = {
    getElementById: get,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: tag => fakeElement(tag, ctx),
  };
  globalThis.window = globalThis;
  globalThis.devicePixelRatio = 1;
  globalThis.requestAnimationFrame ??= () => 0;
  return { ctx, get };
}
