// Sampling from Jev's probabilities (slightly sharpened), so the same moment can go different ways.
export function sample(probs, temperature = 0.7) {
  const entries = Object.entries(probs || {}).filter(([, p]) => p > 0.02);
  if (!entries.length) return null;
  const weights = entries.map(([k, p]) => [k, Math.pow(p, 1 / temperature)]);
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of weights) if ((r -= w) <= 0) return k;
  return weights[weights.length - 1][0];
}
export const topOf = probs => Object.entries(probs).sort((a, b) => b[1] - a[1]);
export const choose = ans => (ans?.probabilities ? sample(ans.probabilities) : ans?.choice) || null;
