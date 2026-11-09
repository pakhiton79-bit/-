'use strict';
const E = require('./engine.js');
const { dip6, twin } = require('./dip6.js');
const { verify } = require('./brute.js');
const P = { a: 3, H: 6, w: 1, kH: 4, K: 1 };
const X = dip6({ id: 'diplomat', ...P });
const mode = process.argv[2];
if (mode === 'brute') {
  for (const R of [6, 8, 10]) {
    const t = Date.now();
    console.log(`R${R}`, JSON.stringify(verify(X, twin(P), R, [0, 0.07, 0.2])), `${Date.now() - t}ms`);
  }
}
if (mode === 'pay') {
  const byId = id => E.BASE.find(s => s.id === id);
  const DEF = ['tft', 'allc', 'alld', 'grim', 'tf2t', 'pavlov', 'stft', 'detective', 'majority', 'joss', 'random'].map(byId);
  for (const pay of [{ T: 4, R: 3, P: 1, S: 0 }, { T: 6, R: 3, P: 1, S: 0 }, { T: 5, R: 3, P: 2, S: 0 }, { T: 5, R: 4, P: 1, S: 0 }, { T: 7, R: 3, P: 1, S: 0 }]) {
    for (const [f, base] of [['def', DEF], ['all', E.BASE]]) for (const e of [0, 0.05, 0.2]) {
      const list = [...base, X], n = list.length;
      const M = E.matrix(list, 200, e, pay);
      const sc = M.map(r => r.reduce((a, b) => a + b, 0) / n);
      const rank = 1 + sc.slice(0, n - 1).filter(v => v > sc[n - 1] + 1e-9).length;
      let bi = 0; for (let i = 0; i < n - 1; i++) if (sc[i] > sc[bi]) bi = i;
      const x = E.evolve(M, 150);
      const er = 1 + x.slice(0, n - 1).filter(v => v > x[n - 1] + 1e-12).length;
      console.log(`T${pay.T}R${pay.R}P${pay.P}S${pay.S} ${f} e${e}: tour rank ${rank} (${sc[n - 1].toFixed(3)} vs best other ${list[bi].id} ${sc[bi].toFixed(3)}) evo rank ${er} ${(x[n - 1] * 100).toFixed(1)}%`);
    }
  }
}
