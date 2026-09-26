import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fill, FIRST, SECOND, P, canConceive, carrierOf, attractedTo, orientationWord, randomIdentity } from '../public/src/identity/identity.js';

const person = (o) => ({ age: 30, pregnancy: null, ...o });

test('pronouns fill correctly for every pronoun set', () => {
  const t = '{They} fear{s} {they} {are} losing {their} mind';
  assert.equal(fill(t, { pronouns: 'she' }), 'She fears she is losing her mind');
  assert.equal(fill(t, { pronouns: 'he' }), 'He fears he is losing his mind');
  assert.equal(fill(t, { pronouns: 'they' }), 'They fear they are losing their mind');
  assert.equal(fill(t, FIRST), 'I fear I am losing my mind');
  assert.equal(fill(t, SECOND), 'You fear you are losing your mind');
  assert.equal(P(undefined).they, 'they', 'unknown people default to they/them');
});

test('conception needs one partner who can carry and one who can sire', () => {
  const carry = person({ canCarry: true, canSire: false });
  const sire = person({ canCarry: false, canSire: true });
  assert.equal(canConceive(carry, sire), true);
  assert.equal(carrierOf(carry, sire), carry);
  assert.equal(canConceive(carry, person({ canCarry: true, canSire: false })), false, 'two carriers adopt instead');
  assert.equal(canConceive(person({ canCarry: true, canSire: false, age: 50 }), sire), false, 'too old to carry');
});

test('attraction is one-directional and respects orientation', () => {
  const elena = { gender: 'woman', attractedTo: ['woman'] };
  const bram = { gender: 'man', attractedTo: ['woman'] };
  assert.equal(attractedTo(bram, elena), true);
  assert.equal(attractedTo(elena, bram), false);
  assert.equal(orientationWord({ attractedTo: [] }), 'not romantically attracted to anyone');
});

test('random identities are always consistent', () => {
  for (let i = 0; i < 500; i++) {
    const id = randomIdentity();
    assert.ok(['woman', 'man', 'nonbinary'].includes(id.gender));
    assert.ok(['she', 'he', 'they'].includes(id.pronouns));
    assert.notEqual(id.canCarry, id.canSire);
  }
});
