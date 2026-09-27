// The simulation's public API: everything a host (the browser UI, tests, tools) needs.
// Hosts import from here, never from internal modules, so internals can move freely.
import './effects/index.js'; // registers every effect type
export { sim } from './core/state.js';
export { updateSightings } from './core/knowledge.js';
export { resetWorld } from './world/setup.js';
export { tickLife } from './life/clock.js';
export { startPregnancy } from './life/family.js';
export { die } from './life/death.js';
export { arrive } from './life/arrivals.js';
export { startAction, stepNpc } from './actions/index.js';
export { think } from './ai/think.js';
export { buildQuestions } from './ai/questions.js';
export { buildOptions } from './ai/options/index.js';
export { separate } from './nav/crowd.js';
export { findPath, blockedAt } from './nav/nav.js';
export { validateEffects, applyEffects, describeEffects } from './effects/index.js';
export { makePromise, keepPromise } from './social/promises.js';
export { canRomance, opinion } from './social/relationships.js';
export { makeRequest } from './social/requests.js';
export { whisper } from './social/voice.js';
export { worldEventAll } from './core/memory.js';
export { P, fill, canConceive } from './identity/identity.js';
