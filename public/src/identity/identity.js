// Gender, pronouns, attraction and fertility, kept separate (as in The Sims 4).
// Gender, pronouns, attraction and fertility, kept separate (as in The Sims 4):
// - gender: 'woman' | 'man' | 'nonbinary' (how they identify)
// - pronouns: 'she' | 'he' | 'they' (how others refer to them)
// - attractedTo: which genders they're romantically drawn to (any of the three; empty = aromantic)
// - canCarry / canSire: whether they can become pregnant / get someone pregnant
// Couples who can't conceive together can still adopt.

export const PRONOUNS = {
  she: { they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself', are: 'is', were: 'was', have: 'has', s: 's', label: 'she/her' },
  he: { they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself', are: 'is', were: 'was', have: 'has', s: 's', label: 'he/him' },
  i: { they: 'I', them: 'me', their: 'my', theirs: 'mine', themself: 'myself', are: 'am', were: 'was', have: 'have', s: '', label: 'I' },
  you: { they: 'you', them: 'you', their: 'your', theirs: 'yours', themself: 'yourself', are: 'are', were: 'were', have: 'have', s: '', label: 'you' },
  they: { they: 'they', them: 'them', their: 'their', theirs: 'theirs', themself: 'themself', are: 'are', were: 'were', have: 'have', s: '', label: 'they/them' },
};

export const P = n => PRONOUNS[n?.pronouns] || PRONOUNS.they;

export const FIRST = { pronouns: 'i' };

export const SECOND = { pronouns: 'you' };

// Fill {they} {them} {their} {theirs} {themself} {are} {have} (and capitalised {They} {Their}) for a person.
export function fill(text, n) {
  const p = P(n);
  return String(text || '').replace(/\{(they|them|their|theirs|themself|are|were|have|s|They|Them|Their)\}/g, (_, k) => {
    const v = p[k.toLowerCase()];
    return k[0] === k[0].toUpperCase() ? v.charAt(0).toUpperCase() + v.slice(1) : v;
  });
}

export function genderWord(n) {
  if (!n) return 'person';
  if (n.age < 16) return n.gender === 'woman' ? 'girl' : n.gender === 'man' ? 'boy' : 'child';
  return n.gender === 'nonbinary' ? 'nonbinary person' : n.gender || 'person';
}

// Romance needs attraction: a is drawn to b's gender.
export const attractedTo = (a, b) => Boolean(a?.attractedTo?.includes(b?.gender));

export const mutualAttraction = (a, b) => attractedTo(a, b) && attractedTo(b, a);

export function orientationWord(n) {
  const t = n.attractedTo || [];
  if (!t.length) return 'not romantically attracted to anyone';
  if (t.length === 3) return 'attracted to people of any gender';
  const names = t.map(g => (g === 'nonbinary' ? 'nonbinary people' : g === 'woman' ? 'women' : 'men'));
  return `attracted to ${names.join(' and ')}`;
}

// Can these two have a baby together? (Otherwise they can adopt.)
export function canConceive(a, b) {
  const ok = (c, s) => c.canCarry && c.age >= 16 && c.age <= 45 && !c.pregnancy && s.canSire && s.age >= 16 && s.age <= 70;
  return ok(a, b) || ok(b, a);
}

export function carrierOf(a, b) {
  const ok = (c, s) => c.canCarry && c.age >= 16 && c.age <= 45 && !c.pregnancy && s.canSire && s.age >= 16 && s.age <= 70;
  const opts = [ok(a, b) && a, ok(b, a) && b].filter(Boolean);
  return opts[Math.floor(Math.random() * opts.length)] || null;
}

// A plausible identity for someone new (travellers, babies). Roughly: most people are cisgender
// and straight, some are bi or gay, and a few are nonbinary.
export function randomIdentity(isBaby = false) {
  const r = Math.random();
  const sexF = Math.random() < 0.5;
  let gender = sexF ? 'woman' : 'man';
  if (!isBaby && r < 0.04) gender = 'nonbinary';
  const pronouns = gender === 'woman' ? 'she' : gender === 'man' ? 'he' : 'they';
  const o = Math.random();
  const other = gender === 'woman' ? 'man' : gender === 'man' ? 'woman' : null;
  let attracted;
  if (gender === 'nonbinary') attracted = o < 0.6 ? ['woman', 'man', 'nonbinary'] : [o < 0.8 ? 'woman' : 'man'];
  else if (o < 0.8) attracted = [other];
  else if (o < 0.92) attracted = ['woman', 'man', 'nonbinary'];
  else attracted = [gender];
  return { gender, pronouns, attractedTo: attracted, canCarry: sexF, canSire: !sexF };
}
