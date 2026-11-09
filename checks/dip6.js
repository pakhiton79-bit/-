'use strict';
const { automaton, C, D } = require('./engine.js');
/*
 Spec («Дипломат», parameters a, H, w, kH, K):
 Decision, in order:
  1. second move of a peace offer -> C
  2. hostile: if off < K and streak >= kH -> C (start offer) else D
  3. off < K and streak >= w -> C (start offer)
  4. C if the opponent is in good standing or I am in bad standing, else D
 Update with realized moves (my, o):
  a. my != intended -> noise seen (nz)
  b. after the 2nd offer move: accepted = (o == C); off = accepted ? 0 : min(K, off+1);
     accepted while hostile -> not hostile, b = 0, both standings good
  c. not hostile, no noise seen, my previous move C -> b = o==D ? b+a : max(0,b-1); b >= H -> hostile
  d. standing: me good iff I cooperated, or I defected against an opponent in bad standing while good;
     opponent bad if it defected while I was good, unless my previous move was D and its previous move C (echo)
  e. streak of mutual defections; it restarts with a peace offer
*/
function spec(o) {
  const { a, H, w, kH, K } = o;
  const type = s => {
    if (s.step) return 'offer2';
    if (s.hostile) return (s.off < K && s.streak >= kH) ? 'offer' : 'hostile';
    if (s.off < K && s.streak >= w) return 'offer';
    return (s.og || !s.mg) ? 'coop' : 'retaliate';
  };
  const intent = s => (type(s) === 'hostile' || type(s) === 'retaliate') ? 0 : 1;
  const update = (s, my, op) => {
    const t = type(s);
    const n = { ...s };
    if (my !== intent(s)) n.nz = 1;
    let peace = false;
    if (t === 'offer2') {
      const ok = op === C;
      n.off = ok ? 0 : Math.min(K, s.off + 1);
      if (ok && s.hostile) { n.hostile = 0; n.b = 0; peace = true; }
    }
    if (!n.hostile && !n.nz && s.lm === C) {
      n.b = op === D ? n.b + a : Math.max(0, n.b - 1);
      if (n.b >= H) { n.hostile = 1; n.b = H; }
    }
    n.mg = my === C ? 1 : (s.og ? 0 : s.mg);
    n.og = op === C ? 1 : ((s.mg && !s.ex) ? 0 : s.og);
    if (peace) { n.mg = 1; n.og = 1; }
    n.streak = t === 'offer' ? 0 : t === 'offer2' ? ((my === D && op === D) ? 1 : 0) : ((my === D && op === D) ? s.streak + 1 : 0);
    n.step = t === 'offer' ? 1 : 0;
    n.lm = my; n.ex = (my === D && op === C) ? 1 : 0;
    return n;
  };
  const init = { mg: 1, og: 1, lm: 1, ex: 0, streak: 0, step: 0, off: 0, b: 0, hostile: 0, nz: 0 };
  return { type, intent, update, init };
}

// Same rules, with fields that cannot influence future moves set to fixed values (fewer states, same behaviour)
function dip6(o) {
  if (!o.a) o = { ...o, H: Infinity };
  const S = spec(o);
  const canon = n => {
    const c = { ...n };
    if (c.hostile) { c.mg = 1; c.og = 0; c.ex = 0; c.b = o.H; }
    else if (c.nz) c.b = 0;
    if (c.off >= o.K) c.streak = 0;
    else c.streak = Math.min(c.streak, c.hostile ? o.kH : o.w);
    if (!o.a) { c.b = 0; c.nz = 0; }   // without a detector noise awareness is irrelevant
    return c;
  };
  const A = automaton({ id: o.id, init: S.init, intent: S.intent, update: (s, my, op) => canon(S.update(s, my, op)) });
  A.spec = S;
  return A;
}

// Independent twin: replays the whole history with plain variables, no automaton
function twin(o) {
  const { a, H, w, kH, K } = o;
  return (me, op) => {
    let mg = true, og = true, lastMy = 1, lastEx = false, streak = 0, step = false, off = 0, b = 0, hostile = false, nz = false;
    const decide = () => {
      if (step) return ['offer2', 1];
      if (hostile) return (off < K && streak >= kH) ? ['offer', 1] : ['hostile', 0];
      if (off < K && streak >= w) return ['offer', 1];
      return (og || !mg) ? ['coop', 1] : ['retaliate', 0];
    };
    for (let t = 0; t < me.length; t++) {
      const [kind, want] = decide();
      const my = me[t], o2 = op[t];
      if (my !== want) nz = true;
      let peace = false;
      if (kind === 'offer2') {
        if (o2 === 1) { off = 0; if (hostile) { hostile = false; b = 0; peace = true; } }
        else off = Math.min(K, off + 1);
      }
      if (!hostile && !nz && lastMy === 1) {
        if (o2 === 0) b += a; else b = Math.max(0, b - 1);
        if (b >= H) { hostile = true; b = H; }
      }
      const newMg = my === 1 ? true : (og ? false : mg);
      const newOg = o2 === 1 ? true : ((mg && !lastEx) ? false : og);
      mg = peace ? true : newMg; og = peace ? true : newOg;
      if (kind === 'offer') streak = 0;
      else if (kind === 'offer2') streak = (my === 0 && o2 === 0) ? 1 : 0;
      else streak = (my === 0 && o2 === 0) ? streak + 1 : 0;
      step = kind === 'offer';
      lastMy = my; lastEx = my === 0 && o2 === 1;
    }
    return decide()[1];
  };
}
module.exports = { dip6, twin, spec };
