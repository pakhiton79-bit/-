'use strict';
const { evaluate } = require('./run.js');
const { dip6 } = require('./dip6.js');
const X = dip6({ id: 'diplomat', a: 3, H: 6, w: 1, kH: 4, K: 1 });
const rows = evaluate(X, { rounds: [100], noise: [0, 0.01, 0.05, 0.1, 0.2] });
for (const r of rows) console.log(`${r.f} R${r.R} e${r.e}: tour rank ${r.rank} score ${r.me.toFixed(4)} (best other ${r.bestId} ${(r.me - r.margin).toFixed(4)}) | evo rank ${r.evoRank} ${(r.evo * 100).toFixed(2)}% (best other ${r.evoBest} ${(r.evoBestV * 100).toFixed(2)}%)`);
