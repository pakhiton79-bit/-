'use strict';
// Out-of-sample opponents: strategies NOT on the site and NOT used while designing.
const { automaton, C, D } = require('./engine.js');
const { KNOWN, mem1 } = require('./cands.js');

function cycle(id, pattern) {
  return automaton({ id, init: { i: 0 }, intent: s => pattern[s.i], update: s => ({ i: (s.i + 1) % pattern.length }) });
}

const OOS = () => {
  const K = KNOWN();
  const pick = id => K.find(s => s.id === id);
  return [
    pick('ctft'), pick('gradual'), pick('prober'), pick('fbf'), pick('omega'),
    mem1('gtft10', 1, 1, 0.1, 1, 0.1),
    mem1('extort2', 1, 8 / 9, 1 / 2, 1 / 3, 0),      // Press & Dyson style extortioner (chi = 2)
    mem1('zdgtft2', 1, 1, 1 / 8, 1, 1 / 4),               // generous ZD
    mem1('rand30', 0.3, 0.3, 0.3, 0.3, 0.3),              // biased coin: C with prob 0.3
    mem1('rand70', 0.7, 0.7, 0.7, 0.7, 0.7),              // biased coin: C with prob 0.7
    cycle('alt', [C, D]),                                  // alternator
    cycle('ccd', [C, C, D]),                               // cycler CCD
    // Two tits for tat: defects twice after each defection
    automaton({ id: 'ttft', init: { r: 0 }, intent: s => s.r > 0 ? 0 : 1,
      update: (s, my, op) => ({ r: op === D ? 2 : Math.max(0, s.r - 1) }) }),
    // Hard TFT: defects if the opponent defected in any of the last 3 rounds
    automaton({ id: 'hardtft', init: { h: [1, 1, 1] }, intent: s => s.h.includes(0) ? 0 : 1,
      update: (s, my, op) => ({ h: [s.h[1], s.h[2], op] }) }),
    // Generous Pavlov: WSLS, but after (C,D) cooperates with prob 0.1
    mem1('gwsls', 1, 1, 0.1, 0, 1),
  ];
};
module.exports = { OOS };
