'use strict';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function circleHit(a, b) { return distance(a, b) < a.r + b.r; }

const tests = [
  ['clamp caps low values', clamp(-4, 0, 10) === 0],
  ['clamp caps high values', clamp(14, 0, 10) === 10],
  ['distance is correct', Math.abs(distance({ x: 0, y: 0 }, { x: 3, y: 4 }) - 5) < 1e-9],
  ['circle collision detects overlap', circleHit({ x: 0, y: 0, r: 4 }, { x: 6, y: 0, r: 3 }) === true],
  ['circle collision rejects separation', circleHit({ x: 0, y: 0, r: 4 }, { x: 8, y: 0, r: 3 }) === false],
];

for (const [name, passed] of tests) {
  if (!passed) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
console.log(`All ${tests.length} game math tests passed.`);
