// A tiny event bus (observer pattern). Lower layers announce things ("a scheduled effect is due",
// "someone broke a law") without importing the higher layers that react, which keeps the
// dependency graph one-directional.
const handlers = new Map();

export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, []);
  handlers.get(name).push(fn);
}

export function emit(name, ...args) {
  for (const fn of handlers.get(name) || []) fn(...args);
}
