// Tiny general-purpose helpers.
import { sim } from './state.js';

export const uid = () => sim.nextId++;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
