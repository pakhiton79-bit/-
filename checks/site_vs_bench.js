'use strict';
const fs = require('fs');
const E = require('./engine.js');
const { dip6 } = require('./dip6.js');
const html = fs.readFileSync(process.argv[2], 'utf8');
const code = html.slice(html.indexOf('function buildAutomaton'), html.indexOf('const STRATS = ['));
const site = new Function('C', 'D', code + '; return diplomat();')(1, 0);
site.id = 'site-diplomat'; site.cand = true;
const bench = dip6({ id: 'bench', a: 3, H: 6, w: 1, kH: 4, K: 1 });
console.log('sizes', site.size, bench.size);
let worst = 0;
for (const R of [7, 50, 200]) for (const e of [0, 0.01, 0.05, 0.2]) {
  for (const B of [...E.BASE, 'self']) {
    const s = B === 'self' ? E.expectedMatch(site, site, R, e, E.PAY) : E.expectedMatch(site, B, R, e, E.PAY);
    const b = B === 'self' ? E.expectedMatch(bench, bench, R, e, E.PAY) : E.expectedMatch(bench, B, R, e, E.PAY);
    worst = Math.max(worst, Math.abs(s.ea - b.ea), Math.abs(s.eb - b.eb));
  }
}
console.log('max |site - bench| over 3 lengths x 4 noise x 13 opponents:', worst);
