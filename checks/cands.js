'use strict';
const { automaton, C, D } = require('./engine.js');

// memory-1 helper: probabilities of C after (my,op) = CC, CD, DC, DD; first move p0
function mem1(id, p0, pCC, pCD, pDC, pDD) {
  const tab = { '11': pCC, '10': pCD, '01': pDC, '00': pDD };
  return automaton({ id, init: { f: 1 }, intent: s => s.f ? p0 : tab[s.k], update: (s, my, op) => ({ k: '' + my + op }) });
}

const KNOWN = () => [
  // Contrite TFT (standing, Sugden 1986 / Boyd 1989)
  automaton({ id: 'ctft', init: { me: 1, op: 1 },
    intent: s => (s.op || !s.me) ? 1 : 0,
    update: (s, my, op) => ({ me: my === C ? 1 : (s.op ? 0 : s.me), op: op === C ? 1 : (s.me ? 0 : s.op) }) }),
  mem1('fbf', 1, 1, 0, 1, 1),            // firm but fair
  mem1('gtft10', 1, 1, 0.1, 1, 0.1),
  mem1('gtft20', 1, 1, 0.2, 1, 0.2),
  mem1('gtft33', 1, 1, 1 / 3, 1, 1 / 3),
  // Gradual (Beaufils et al. 1996), defection count capped at 12
  automaton({ id: 'gradual', init: { n: 0, pun: 0, calm: 0 },
    intent: s => s.pun > 0 ? 0 : 1,
    update: (s, my, op) => {
      const n = Math.min(12, s.n + (op === D ? 1 : 0));
      if (s.pun > 0) return { n, pun: s.pun - 1, calm: s.pun === 1 ? 2 : 0 };
      if (s.calm > 0) return { n, pun: 0, calm: s.calm - 1 };
      if (op === D) return { n, pun: n, calm: 0 };
      return { n, pun: 0, calm: 0 };
    } }),
  // OmegaTFT (Slany & Kienreich 2007), as in the Axelrod library; randomness counter floored at -30
  automaton({ id: 'omega', init: { t: 0, rc: 0, dc: 0, pm: 1, po: 1, lm: 1, lo: 1, mv: 1 },
    intent: s => s.mv,
    update: (s, my, op) => {
      const t = Math.min(2, s.t + 1);
      let { rc, dc } = s, mv;
      const po = s.lo, lo = op;           // opponent's previous and last move
      if (t === 1) mv = op;               // second move: TFT
      else if (dc >= 3) { mv = C; dc = dc === 3 ? 4 : 0; }
      else {
        if (po === C && lo === C) rc--;
        if (po !== lo) rc++;
        if (my !== op) rc++;
        rc = Math.max(-30, Math.min(8, rc));
        if (rc >= 8) mv = D;
        else { mv = op; dc = po !== lo ? dc + 1 : 0; }
      }
      return { t, rc, dc, lo, mv };
    } }),
  // Prober: D,C,C; if opponent cooperated on moves 2 and 3 -> always D, else TFT
  automaton({ id: 'prober', init: { t: 0, ok: 1, lo: 1 },
    intent: s => s.t === 0 ? 0 : s.t < 3 ? 1 : s.ok === 2 ? 0 : s.lo,
    update: (s, my, op) => {
      const t = Math.min(3, s.t + 1);
      let ok = s.ok;
      if (s.t === 1 || s.t === 2) ok = ok && op === C ? 1 : 0;
      if (t === 3 && s.t === 2) ok = ok ? 2 : 0;
      return { t, ok, lo: op };
    } }),
];

// The family under design. Core: TFT. Options:
//  echo   — do not answer a defection that is a reply to my own defection after which
//           the opponent had cooperated (breaks C/D echoes, also acts as contrition)
//  rec    — reciprocity score: +plus when opponent's move repeats my previous move, -minus otherwise,
//           kept in [0, max]; while score <= thr the opponent is treated as unresponsive → D
//  ff     — forgive a defection on round 1
//  q      — generosity: forgive a non-echo defection with probability q
function dip(o) {
  const rec = o.rec;
  return automaton({ id: o.id, init: { k: 0, pm: 1, po: 1, lm: 1, lo: 1, sc: rec ? rec.start : 0 },
    intent: s => {
      if (s.k === 0) return C;
      if (rec && s.sc <= rec.thr) return D;
      if (s.lo === C) return C;
      if (o.ff && s.k === 1) return C;
      if (o.echo && s.k >= 2 && s.pm === D && s.po === C) return C;
      return o.q || 0;
    },
    update: (s, my, op) => {
      let sc = s.sc;
      if (rec && s.k >= 1) sc = op === s.lm ? Math.min(rec.max, sc + rec.plus) : Math.max(0, sc - rec.minus);
      return { k: Math.min(2, s.k + 1), pm: s.lm, po: s.lo, lm: my, lo: op, sc };
    } });
}

module.exports = { KNOWN, dip, mem1 };
