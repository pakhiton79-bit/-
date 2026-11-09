'use strict';
// Direct check of the SITE's own code (extracted from index.html) against brute-force enumeration
// with independently written history rules, plus the site's 200-round table against the bench.
const fs = require('fs');
const E = require('./engine.js');
const { H, brute } = require('./brute.js');
const { dip6, twin } = require('./dip6.js');
const html = fs.readFileSync(process.argv[2], 'utf8');
const eng = html.slice(html.indexOf('const C = 1, D = 0;'), html.indexOf('/* ---------- theme helpers'));
const r0 = html.indexOf('function replicator(');
const rep = html.slice(r0, html.indexOf('\nfunction ', r0 + 10));
const S = new Function(eng + '\n' + rep + '\nreturn { STRATS, expectedMatch, payoffMatrix, replicator };')();
const P = { a: 3, H: 6, w: 1, kH: 4, K: 1 };
const rule = id => id === 'diplomat' ? twin(P) : H[id];
const ids = S.STRATS.map(s => s.id);
console.log('site strategies:', ids.join(', '));
// 1) brute force vs site, R = 8
let worst = 0, pairs = 0;
for (const e of [0, 0.07, 0.2]) {
  for (let i = 0; i < ids.length; i++) for (let j = i; j < ids.length; j++) {
    const ex = S.expectedMatch(S.STRATS[i], S.STRATS[j], 8, e);
    const br = brute(rule(ids[i]), rule(ids[j]), 8, e);
    worst = Math.max(worst, Math.abs(ex.ea - br.ea), Math.abs(ex.eb - br.eb));
    pairs += i === j ? 1 : 2;
  }
}
console.log(`brute R8, noise 0/7%/20%: ordered pairs per noise ${pairs / 3}, max |site - brute| = ${worst.toExponential(2)}`);
// 2) the 200-round table: site payoffMatrix + replicator vs bench matrix + evolve
const X = dip6({ id: 'diplomat', ...P });
const benchById = id => id === 'diplomat' ? X : E.BASE.find(s => s.id === id);
const DEF = ['tft', 'allc', 'alld', 'grim', 'tf2t', 'pavlov', 'stft', 'detective', 'majority', 'joss', 'random', 'diplomat'];
let wM = 0, wX = 0;
for (const [name, set] of [['def', S.STRATS.filter(s => DEF.includes(s.id))], ['all', S.STRATS]]) {
  for (const e of [0, 0.01, 0.05, 0.1, 0.2]) {
    const Ms = S.payoffMatrix(set, 200, e);
    const Mb = E.matrix(set.map(s => benchById(s.id)), 200, e);
    for (let i = 0; i < set.length; i++) for (let j = 0; j < set.length; j++) wM = Math.max(wM, Math.abs(Ms[i][j] - Mb[i][j]));
    const xs = S.replicator(Ms, 150)[150], xb = E.evolve(Mb, 150);
    for (let i = 0; i < set.length; i++) wX = Math.max(wX, Math.abs(xs[i] - xb[i]));
    const n = set.length, sc = Ms.map(r => r.reduce((a, b) => a + b, 0) / n), me = sc[n - 1];
    const place = 1 + sc.slice(0, n - 1).filter(v => v > me + 1e-9).length;
    const eplace = 1 + xs.slice(0, n - 1).filter(v => v > xs[n - 1] + 1e-12).length;
    console.log(`${name} e${e}: site score ${me.toFixed(4)} place ${place} | share ${(xs[n - 1] * 100).toFixed(2)}% place ${eplace}`);
  }
}
console.log(`table R200: max |M site - M bench| = ${wM.toExponential(2)}, max |share site - share bench| = ${wX.toExponential(2)}`);
