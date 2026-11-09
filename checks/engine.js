'use strict';
// Same strategies and exact engine as the site (repo/index.html), parameterised by payoffs.
const C = 1, D = 0;
const MAJ = 600;

const BASE = [
  { id: 'tft', name: 'Око за око', size: 2, init: C, p: s => s, next: (s, my, op) => op },
  { id: 'allc', name: 'Добряк', size: 1, init: 0, p: () => 1, next: () => 0 },
  { id: 'alld', name: 'Эгоист', size: 1, init: 0, p: () => 0, next: () => 0 },
  { id: 'grim', name: 'Злопамятный', size: 2, init: 0, p: s => s ? 0 : 1, next: (s, my, op) => (s || op === D) ? 1 : 0 },
  { id: 'tf2t', name: 'Око за два ока', size: 3, init: 0, p: s => s >= 2 ? 0 : 1, next: (s, my, op) => op === D ? Math.min(s + 1, 2) : 0 },
  { id: 'gtft', name: 'Великодушный', size: 2, init: C, p: s => s ? 1 : 0.3, next: (s, my, op) => op },
  { id: 'pavlov', name: 'Павлов', size: 2, init: 1, p: s => s, next: (s, my, op) => my === op ? 1 : 0 },
  { id: 'stft', name: 'Подозрительный', size: 2, init: D, p: s => s, next: (s, my, op) => op },
  { id: 'detective', name: 'Детектив', size: 11, init: 0,
    p: s => s < 8 ? [C, D, C, C][s >> 1] : s < 10 ? s - 8 : 0,
    next: (s, my, op) => {
      if (s >= 8) return s < 10 ? 8 + op : 10;
      const t = (s >> 1) + 1, f = (s & 1) | (op === D ? 1 : 0);
      return t < 4 ? t * 2 + f : (f ? 8 + op : 10);
    } },
  { id: 'majority', name: 'Большинство', size: 2 * MAJ + 1, init: MAJ, p: s => s >= MAJ ? 1 : 0, next: (s, my, op) => s + (op === C ? 1 : -1) },
  { id: 'joss', name: 'Хитрец', size: 2, init: C, p: s => s ? 0.9 : 0, next: (s, my, op) => op },
  { id: 'random', name: 'Монетка', size: 1, init: 0, p: () => 0.5, next: () => 0 },
];

function tables(S) {
  if (!S._tab) {
    const P = new Float64Array(S.size), N = new Int32Array(S.size * 4);
    for (let s = 0; s < S.size; s++) {
      P[s] = S.p(s);
      for (let my = 0; my <= 1; my++) for (let op = 0; op <= 1; op++) {
        N[s * 4 + my * 2 + op] = Math.min(S.size - 1, Math.max(0, S.next(s, my, op)));
      }
    }
    S._tab = { P, N };
  }
  return S._tab;
}

function expectedMatch(a, b, rounds, noise, pay) {
  const { P: PA, N: NA } = tables(a), { P: PB, N: NB } = tables(b);
  const nB = b.size;
  let cur = new Float64Array(a.size * nB), nxt = new Float64Array(a.size * nB);
  cur[a.init * nB + b.init] = 1;
  let loA = a.init, hiA = a.init, loB = b.init, hiB = b.init;
  const QA = PA.map(p => p * (1 - noise) + (1 - p) * noise), QB = PB.map(p => p * (1 - noise) + (1 - p) * noise);
  const UA = [pay.P, pay.T, pay.S, pay.R], UB = [pay.P, pay.S, pay.T, pay.R];
  let ea = 0, eb = 0;
  for (let t = 0; t < rounds; t++) {
    let nLoA = Infinity, nHiA = -1, nLoB = Infinity, nHiB = -1;
    for (let sa = loA; sa <= hiA; sa++) {
      const qa = QA[sa], row = sa * nB;
      for (let sb = loB; sb <= hiB; sb++) {
        const w = cur[row + sb];
        if (w === 0) continue;
        cur[row + sb] = 0;
        const qb = QB[sb];
        for (let ma = 0; ma <= 1; ma++) {
          const pa = ma ? qa : 1 - qa;
          if (pa === 0) continue;
          for (let mb = 0; mb <= 1; mb++) {
            const pb = mb ? qb : 1 - qb;
            if (pb === 0) continue;
            const pr = w * pa * pb, k = ma * 2 + mb;
            ea += pr * UA[k];
            eb += pr * UB[k];
            const na = NA[sa * 4 + k], nb = NB[sb * 4 + mb * 2 + ma];
            nxt[na * nB + nb] += pr;
            if (na < nLoA) nLoA = na;
            if (na > nHiA) nHiA = na;
            if (nb < nLoB) nLoB = nb;
            if (nb > nHiB) nHiB = nb;
          }
        }
      }
    }
    [cur, nxt] = [nxt, cur];
    loA = nLoA; hiA = nHiA; loB = nLoB; hiB = nHiB;
  }
  return { ea: ea / rounds, eb: eb / rounds };
}

const PAY = { T: 5, R: 3, P: 1, S: 0 };
const cache = new Map();
function match(a, b, rounds, noise, pay = PAY) {
  // cache only pairs of built-in strategies; candidates change between runs
  const cacheable = !a.cand && !b.cand;
  const key = [a.id, b.id, rounds, noise, pay.T, pay.R, pay.P, pay.S].join('|');
  if (cacheable && cache.has(key)) return cache.get(key);
  const r = expectedMatch(a, b, rounds, noise, pay);
  if (cacheable) cache.set(key, r);
  return r;
}

function matrix(list, rounds, noise, pay = PAY) {
  const n = list.length;
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    const { ea, eb } = match(list[i], list[j], rounds, noise, pay);
    if (i === j) M[i][i] = (ea + eb) / 2; else { M[i][j] = ea; M[j][i] = eb; }
  }
  return M;
}

function evolve(M, gens) {
  const n = M.length;
  let x = Array(n).fill(1 / n);
  for (let g = 0; g < gens; g++) {
    const fit = x.map((_, i) => M[i].reduce((s, m, j) => s + m * x[j], 0));
    const mean = fit.reduce((s, f, i) => s + f * x[i], 0);
    if (mean <= 0) break;
    x = x.map((v, i) => v * fit[i] / mean);
  }
  return x;
}

// Build an automaton from a readable state machine: states are plain objects,
// intent(s) = probability of C, update(s, my, op, intent) -> next state (realized moves).
function automaton({ id, name, init, intent, update, maxStates = 20000 }) {
  const ids = new Map(), states = [];
  const add = s => {
    const k = JSON.stringify(s);
    if (!ids.has(k)) { ids.set(k, states.length); states.push(s); }
    return ids.get(k);
  };
  add(init);
  const N = [];
  for (let i = 0; i < states.length; i++) {
    const s = states[i], pi = intent(s);
    for (let my = 0; my <= 1; my++) for (let op = 0; op <= 1; op++) N[i * 4 + my * 2 + op] = add(update(s, my, op, pi));
    if (states.length > maxStates) throw new Error(id + ': too many states');
  }
  const P = states.map(intent);
  return { id, name: name || id, cand: true, size: states.length, init: 0, p: s => P[s], next: (s, my, op) => N[s * 4 + my * 2 + op], states };
}

module.exports = { C, D, BASE, PAY, expectedMatch, match, matrix, evolve, automaton };
