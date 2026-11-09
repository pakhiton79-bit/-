'use strict';
const E = require('./engine.js');
const byId = id => E.BASE.find(s => s.id === id);
const DEFAULT_ON = ['tft', 'allc', 'alld', 'grim', 'tf2t', 'pavlov', 'stft', 'detective', 'majority', 'joss', 'random'];
const FIELDS = { def: DEFAULT_ON.map(byId), all: E.BASE };

const ROUNDS = [50, 200, 500];
const NOISE = [0, 0.01, 0.05, 0.1, 0.2];

function evaluate(X, opts = {}) {
  const rounds = opts.rounds || ROUNDS, noise = opts.noise || NOISE, fields = opts.fields || ['def', 'all'];
  const rows = [];
  for (const f of fields) for (const R of rounds) for (const e of noise) {
    const list = [...FIELDS[f], X];
    const M = E.matrix(list, R, e);
    const n = list.length;
    const sc = M.map(r => r.reduce((a, b) => a + b, 0) / n);
    const me = sc[n - 1];
    let best = -Infinity, bestId = '';
    for (let i = 0; i < n - 1; i++) if (sc[i] > best) { best = sc[i]; bestId = list[i].id; }
    const rank = 1 + sc.slice(0, n - 1).filter(v => v > me + 1e-9).length;
    const x = E.evolve(M, opts.gens || 150);
    const evoRank = 1 + x.slice(0, n - 1).filter(v => v > x[n - 1] + 1e-12).length;
    let evoBest = '', evoBestV = -1;
    for (let i = 0; i < n - 1; i++) if (x[i] > evoBestV) { evoBestV = x[i]; evoBest = list[i].id; }
    rows.push({ f, R, e, me, margin: me - best, bestId, rank, evo: x[n - 1], evoRank, evoBest, evoBestV });
  }
  return rows;
}

function summary(X, rows) {
  const firsts = rows.filter(r => r.rank === 1).length;
  const mm = Math.min(...rows.map(r => r.margin));
  const avgm = rows.reduce((a, r) => a + r.margin, 0) / rows.length;
  const evo = rows.reduce((a, r) => a + r.evo, 0) / rows.length;
  const evoMin = Math.min(...rows.map(r => r.evo));
  return `${X.id.padEnd(14)} size ${String(X.size).padStart(4)} | 1st ${firsts}/${rows.length} | margin avg ${avgm.toFixed(3)} min ${mm.toFixed(3)} | evo avg ${(evo * 100).toFixed(1)}% min ${(evoMin * 100).toFixed(1)}%`;
}

function detail(rows) {
  return rows.map(r => `${r.f} R${r.R} e${r.e}: score ${r.me.toFixed(3)} rank ${r.rank} margin ${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(3)} (vs ${r.bestId}) evo ${(r.evo * 100).toFixed(1)}%`).join('\n');
}

module.exports = { evaluate, summary, detail, FIELDS, DEFAULT_ON, byId };

if (require.main === module) {
  const { KNOWN, dip } = require('./cands.js');
  const cands = [
    ...KNOWN(),
    dip({ id: 'tft+echo', echo: true }),
    dip({ id: 'tft+echo+ff', echo: true, ff: true }),
    dip({ id: 'echo+rec', echo: true, rec: { max: 6, start: 4, plus: 1, minus: 2, thr: 0 } }),
    dip({ id: 'echo+rec8', echo: true, rec: { max: 8, start: 6, plus: 1, minus: 3, thr: 0 } }),
    dip({ id: 'echo+q.1', echo: true, q: 0.1 }),
    dip({ id: 'echo+rec+q.1', echo: true, q: 0.1, rec: { max: 6, start: 4, plus: 1, minus: 2, thr: 0 } }),
  ];
  for (const X of cands) {
    const t0 = Date.now();
    const rows = evaluate(X);
    console.log(summary(X, rows), `${Date.now() - t0}ms`);
  }
}
