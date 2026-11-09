'use strict';
const E = require('./engine.js');
const { evaluate } = require('./run.js');
const { dip6 } = require('./dip6.js');
const { OOS } = require('./oos.js');
const which = process.argv[2];
const parse = s => { const m = s.match(/a(\d)H(\d)w(\d)kH(\d)K(\d)/); return { id: s, a: +m[1], H: +m[2], w: +m[3], kH: +m[4], K: +m[5] }; };
const cands = process.argv.slice(3).map(s => dip6(parse(s)));
if (which === 'short') {
  for (const X of cands) {
    const rows = evaluate(X, { rounds: [5, 10, 20, 100], noise: [0, 0.02, 0.05, 0.15, 0.2] });
    const bad = rows.filter(r => r.rank > 1 || r.evoRank > 1);
    console.log(`${X.id}: tour 1st ${rows.filter(r => r.rank === 1).length}/${rows.length}, evo 1st ${rows.filter(r => r.evoRank === 1).length}/${rows.length}`);
    bad.forEach(r => console.log(`   ${r.f} R${r.R} e${r.e}: tour rank ${r.rank} margin ${r.margin.toFixed(3)} vs ${r.bestId} | evo rank ${r.evoRank} ${(r.evo * 100).toFixed(1)}% vs ${r.evoBest} ${(r.evoBestV * 100).toFixed(1)}%`));
  }
} else {
  // out-of-sample field: 12 site strategies + 15 others never used in the design
  const extra = OOS().map(s => { delete s.cand; return s; });
  const field = [...E.BASE, ...extra];
  for (const R of [50, 200]) for (const e of [0, 0.01, 0.05, 0.1, 0.2]) {
    const out = [];
    for (const X of cands) {
      const list = [...field, X], n = list.length;
      const M = E.matrix(list, R, e);
      const sc = M.map(r => r.reduce((a, b) => a + b, 0) / n);
      const order = list.map((s, i) => i).sort((i, j) => sc[j] - sc[i]);
      const rank = 1 + sc.slice(0, n - 1).filter(v => v > sc[n - 1] + 1e-9).length;
      const x = E.evolve(M, 150);
      const er = 1 + x.slice(0, n - 1).filter(v => v > x[n - 1] + 1e-12).length;
      const eo = list.map((s, i) => i).sort((i, j) => x[j] - x[i]);
      out.push(`${X.id}: tour rank ${rank}/${n} (${sc[n - 1].toFixed(3)}; top: ${order.slice(0, 3).map(i => list[i].id + ' ' + sc[i].toFixed(3)).join(', ')}) | evo rank ${er} (${eo.slice(0, 3).map(i => list[i].id + ' ' + (x[i] * 100).toFixed(1) + '%').join(', ')})`);
    }
    console.log(`R${R} e${e}\n  ` + out.join('\n  '));
  }
}
