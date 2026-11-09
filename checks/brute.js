'use strict';
// Independent check: strategies written as rules over the full move history (no automata),
// exact expectation by enumerating every outcome of a short match.
const E = require('./engine.js');
const last = h => h[h.length - 1];
// History rules: (me, op) are arrays of realized moves; return probability of C
const H = {
  tft: (me, op) => op.length ? last(op) : 1,
  allc: () => 1,
  alld: () => 0,
  grim: (me, op) => op.includes(0) ? 0 : 1,
  tf2t: (me, op) => (op.length >= 2 && last(op) === 0 && op[op.length - 2] === 0) ? 0 : 1,
  gtft: (me, op) => (!op.length || last(op) === 1) ? 1 : 0.3,
  pavlov: (me, op) => !me.length ? 1 : (last(me) === last(op) ? 1 : 0),
  stft: (me, op) => op.length ? last(op) : 0,
  detective: (me, op) => me.length < 4 ? [1, 0, 1, 1][me.length] : (op.slice(0, 4).includes(0) ? last(op) : 0),
  majority: (me, op) => op.filter(m => m === 1).length >= op.filter(m => m === 0).length ? 1 : 0,
  joss: (me, op) => (op.length && last(op) === 0) ? 0 : 0.9,
  random: () => 0.5,
};
const payoff = (a, b, pay) => a ? (b ? pay.R : pay.S) : (b ? pay.T : pay.P);

function brute(fa, fb, R, e, pay = E.PAY) {
  let ea = 0, eb = 0;
  (function rec(ha, hb, w) {
    if (ha.length === R) return;
    let pa = fa(ha, hb), pb = fb(hb, ha);
    pa = pa * (1 - e) + (1 - pa) * e; pb = pb * (1 - e) + (1 - pb) * e;
    for (const ma of [0, 1]) {
      const qa = ma ? pa : 1 - pa; if (!qa) continue;
      for (const mb of [0, 1]) {
        const qb = mb ? pb : 1 - pb; if (!qb) continue;
        const p = w * qa * qb;
        ea += p * payoff(ma, mb, pay); eb += p * payoff(mb, ma, pay);
        ha.push(ma); hb.push(mb); rec(ha, hb, p); ha.pop(); hb.pop();
      }
    }
  })([], [], 1);
  return { ea: ea / R, eb: eb / R };
}

// Compare automaton X with its history-rule twin hx against every base strategy (and itself)
function verify(X, hx, R = 8, noises = [0, 0.07, 0.2]) {
  let worst = 0, n = 0;
  for (const e of noises) {
    for (const B of [...E.BASE, X]) {
      const hb = B === X ? hx : H[B.id];
      const ex = E.expectedMatch(X, B, R, e, E.PAY), br = brute(hx, hb, R, e);
      worst = Math.max(worst, Math.abs(ex.ea - br.ea), Math.abs(ex.eb - br.eb));
      n++;
    }
  }
  return { pairs: n, worst };
}
module.exports = { H, brute, verify };
