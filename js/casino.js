/* ============================================================
   Spielhölle: Poker (Five-Card-Draw), Black Jack und Roulette als echte Minispiele.
   Das Geld läuft über spend()/earn() des Spielers (Trainer: unendlich).
   Grafiken sind Platzhalter: Bildplätze casino-poker, casino-blackjack,
   casino-roulette (Banner) und casino-kartenruecken (Kartenrückseite).
   ============================================================ */

const Casino = (() => {
  /* ---------- Karten ---------- */
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RLAB = { 11: 'B', 12: 'D', 13: 'K', 14: 'A' };
  const rlab = r => RLAB[r] || String(r);
  const isRedSuit = s => s === 1 || s === 2;

  function newDeck(n = 1) {
    const d = [];
    for (let k = 0; k < n; k++) for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }

  function cardEl(c, { hidden = false, mark = false, onclick } = {}) {
    const tag = onclick ? 'button' : 'div';
    const e = el(tag, { class: 'pcard' + (hidden ? ' back' : isRedSuit(c.s) ? ' red' : ' black') + (mark ? ' marked' : ''), type: onclick ? 'button' : null, onclick });
    if (!hidden) e.append(el('span', { class: 'pc-r' }, rlab(c.r)), el('span', { class: 'pc-s' }, SUITS[c.s]));
    return e;
  }

  /* ---------- Tisch-Rahmen (ein Fenster pro Spiel) ---------- */
  async function table(p, cfg, run) {
    const banner = artEl(cfg.key, { icon: cfg.icon, hue: cfg.hue, label: cfg.label, cls: 'hero cs-banner' });
    const cashEl = el('b', { class: 'gold' });
    const felt = el('div', { class: 'cs-felt ' + (cfg.feltClass || '') });
    const msg = el('div', { class: 'cs-msg' });
    const ctl = el('div', { class: 'cs-ctl' });
    const root = el('div', { class: 'cs' }, banner,
      el('div', { class: 'cs-top' }, el('div', {}, 'Dein Geld: ', cashEl), el('span', { class: 'muted', html: cfg.info })), felt, msg, ctl);
    Img.resolve('casino-kartenruecken').then(u => { if (u) root.style.setProperty('--cardback', `url("${u}") center/cover`); });
    let leave = null;
    const ctx = {
      p, felt, ctl,
      sync() { cashEl.textContent = p.trainer ? '$ ∞' : money(p.cash); try { refresh(); } catch (e) { } },
      say(t, kind = '') { msg.className = 'cs-msg ' + kind; msg.innerHTML = t; },
      busy(b) { if (leave) leave.disabled = b; },
      maxBet(div = 1) { return p.trainer ? 1000000 : Math.floor(p.cash / div); },
      ask(buttons) {
        return new Promise(res => {
          ctl.replaceChildren(...buttons.map(b => el('button', {
            class: 'btn ' + (b.kind || ''), type: 'button', disabled: !!b.disabled, title: b.title,
            onclick: () => { ctl.replaceChildren(); res(b.value); },
          }, b.label)));
        });
      },
      askBet({ max, min = 10, def = 100, step = 50, confirm = 'Einsatz setzen' }) {
        return new Promise(res => {
          max = Math.floor(max);
          if (max < min) { ctx.say(`Dir fehlt das Geld für den Mindesteinsatz von ${money(min)}. Steh lieber vom Tisch auf.`, 'bad'); ctl.replaceChildren(); return; }
          let v = clamp(def, min, max);
          const input = el('input', { class: 'num-input', type: 'number', min, max, step, value: v });
          const setV = x => { v = clamp(Math.round(Number(x) || 0), min, max); input.value = v; };
          input.addEventListener('change', () => setV(input.value));
          const ok = () => { setV(input.value); ctl.replaceChildren(); res(v); };
          input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); ok(); } });
          const chips = [50, 100, 500, 1000, 5000].filter(q => q >= min && q <= max)
            .map(q => el('button', { class: 'chip', type: 'button', onclick: () => { setV(q); Sfx.play('tick'); } }, String(q)));
          chips.push(el('button', { class: 'chip', type: 'button', onclick: () => { setV(max); Sfx.play('tick'); } }, 'Max'));
          ctl.replaceChildren(el('div', { class: 'num-row' },
            el('button', { class: 'btn small', type: 'button', onclick: () => { setV(v - step); Sfx.play('tick'); } }, '−'), input,
            el('button', { class: 'btn small', type: 'button', onclick: () => { setV(v + step); Sfx.play('tick'); } }, '+'),
            el('span', { class: 'unit' }, '$'), el('div', { class: 'chips' }, chips),
            el('button', { class: 'btn primary', type: 'button', onclick: ok }, confirm)));
          input.focus(); input.select();
        });
      },
    };
    ctx.sync();
    const scene = UI.scene({
      wide: true, title: cfg.title, body: [root], noFocus: true,
      actions: [{ label: 'Vom Tisch aufstehen', value: true, kind: 'ghost', key: ['Escape'] }],
      keyHook: e => (leave && leave.disabled && e.key === 'Escape') ? (e.preventDefault(), true) : false,
      onMount: sheet => {
        leave = sheet.querySelector('.actions .btn');
        run(ctx).catch(err => { console.error(err); ctx.say('Am Tisch ist etwas schiefgegangen: ' + esc(err.message), 'bad'); ctx.busy(false); });
      },
    });
    await scene;
    if (ctx.cleanup) ctx.cleanup();
    try { refresh(); } catch (e) { }
  }

  /* ============================================================
     Poker – Five-Card-Draw gegen zwei Gangster am Tisch
     ============================================================ */
  const HAND_NAMES = ['Hohe Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];

  function evalHand(cs) {
    const cnt = {};
    cs.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const ranks = groups.map(g => g[1]);
    const flush = cs.every(c => c.s === cs[0].s);
    const uniq = [...new Set(cs.map(c => c.r))].sort((a, b) => b - a);
    let straight = false, high = uniq[0];
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) straight = true;
      else if (uniq[0] === 14 && uniq[1] === 5) { straight = true; high = 5; }
    }
    if (straight && flush) return [8, high];
    if (groups[0][0] === 4) return [7, ...ranks];
    if (groups[0][0] === 3 && groups[1][0] === 2) return [6, ...ranks];
    if (flush) return [5, ...ranks];
    if (straight) return [4, high];
    if (groups[0][0] === 3) return [3, ...ranks];
    if (groups[0][0] === 2 && groups[1][0] === 2) return [2, ...ranks];
    if (groups[0][0] === 2) return [1, ...ranks];
    return [0, ...ranks];
  }
  function cmpHand(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; }
    return 0;
  }

  function aiDiscards(hand) {
    const ev = evalHand(hand);
    if (ev[0] >= 4 && ev[0] !== 3) return [];                    // Straße, Flush, Full House … bleibt stehen
    const cnt = {}; hand.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    if (Object.values(cnt).some(n => n >= 2)) return hand.map((c, i) => cnt[c.r] >= 2 ? -1 : i).filter(i => i >= 0);
    const order = hand.map((c, i) => i).sort((a, b) => hand[b].r - hand[a].r);
    const keep = hand[order[0]].r >= 11 ? order.slice(0, 2) : order.slice(0, 1);
    return hand.map((c, i) => i).filter(i => !keep.includes(i));
  }
  const aiCalls = (o, ev) => ev[0] >= 2 || (ev[0] === 1 && ev[1] + o.bold * 4 >= 10) || Math.random() < o.bold * 0.25;
  const aiBets = (o, ev) => ev[0] >= 2 || (ev[0] === 1 && ev[1] >= 11 && Math.random() < 0.6) || Math.random() < o.bold * 0.2;

  async function runPoker(ctx) {
    const p = ctx.p;
    const opp = [{ name: '„Fetter Sal“', bold: 0.3 }, { name: '„Lucky Lou“', bold: 0.65 }];
    ctx.say('Five-Card-Draw: Jeder zahlt den Einsatz in den Topf, du tauschst Karten, dann wird geboten. Das Haus behält 5 % vom Topf.');
    for (; ;) {
      ctx.busy(false);
      const bet = await ctx.askBet({ max: ctx.maxBet(2), min: 10, def: 100 });
      ctx.busy(true);
      spend(p, bet); ctx.sync(); Sfx.play('coin');
      let pot = bet * 3;
      const deck = newDeck();
      const hand = deck.splice(0, 5);
      opp.forEach(o => { o.hand = deck.splice(0, 5); o.folded = false; });
      const discard = new Set();
      let reveal = false, toggle = null;

      const render = () => {
        felt.replaceChildren(
          el('div', { class: 'cs-opps' }, opp.map(o => {
            const ev = evalHand(o.hand);
            return el('div', { class: 'cs-seat' + (o.folded ? ' folded' : '') },
              el('div', { class: 'cs-name' }, o.name + (o.folded ? ' – passt' : '')),
              el('div', { class: 'cs-hand' }, o.hand.map(c => cardEl(c, { hidden: !reveal || o.folded }))),
              reveal && !o.folded ? el('div', { class: 'cs-rank' }, HAND_NAMES[ev[0]]) : null);
          })),
          el('div', { class: 'cs-pot' }, 'Topf: ', el('b', { class: 'gold' }, money(pot))),
          el('div', { class: 'cs-seat me' },
            el('div', { class: 'cs-name' }, 'Du'),
            el('div', { class: 'cs-hand' }, hand.map((c, i) => cardEl(c, { mark: discard.has(i), onclick: toggle && (() => toggle(i)) }))),
            el('div', { class: 'cs-rank' }, HAND_NAMES[evalHand(hand)[0]])));
      };
      const felt = ctx.felt;
      render();
      Sfx.play('turn');

      /* Tauschrunde */
      const hasAce = () => hand.some((c, i) => !discard.has(i) && c.r === 14);
      await new Promise(res => {
        const btn = el('button', { class: 'btn primary', type: 'button' });
        const upd = () => { btn.textContent = discard.size ? `${discard.size} Karte${discard.size > 1 ? 'n' : ''} tauschen` : 'Keine Karten tauschen'; };
        toggle = i => { discard.has(i) ? discard.delete(i) : discard.add(i); Sfx.play('tick'); upd(); render(); };
        btn.onclick = () => {
          const max = hasAce() ? 4 : 3;
          if (discard.size > max) { ctx.say(`Du darfst höchstens ${max} Karten tauschen (4 nur, wenn du ein Ass behältst).`, 'bad'); Sfx.play('error'); return; }
          res();
        };
        upd(); render();
        ctx.ctl.replaceChildren(btn);
        ctx.say('Klicke die Karten an, die du abwerfen willst (höchstens 3, mit Ass 4).');
      });
      toggle = null;
      [...discard].forEach(i => { hand[i] = deck.shift(); });
      discard.clear();
      opp.forEach(o => { aiDiscards(o.hand).forEach(i => { o.hand[i] = deck.shift(); }); });
      Sfx.play('turn'); render();
      const mine = evalHand(hand);

      /* Bieterunde */
      ctx.say(`Du hast: <b>${HAND_NAMES[mine[0]]}</b>. Was tust du?`);
      const canBet = canPay(p, bet);
      const act = await ctx.ask([
        { label: 'Passen', value: 'fold' },
        { label: 'Schieben', value: 'check' },
        { label: `Erhöhen um ${money(bet)}`, value: 'raise', kind: 'primary', disabled: !canBet },
      ]);
      let out = false;
      const lines = [];
      if (act === 'fold') out = true;
      else if (act === 'raise') {
        spend(p, bet); pot += bet; ctx.sync(); Sfx.play('coin');
        opp.forEach(o => {
          if (aiCalls(o, evalHand(o.hand))) { pot += bet; lines.push(`${o.name} geht mit.`); }
          else { o.folded = true; lines.push(`${o.name} passt.`); }
        });
      } else {
        const b = opp.find(o => aiBets(o, evalHand(o.hand)));
        if (b) {
          pot += bet; render();
          ctx.say(`${b.name} erhöht um <b>${money(bet)}</b>. Gehst du mit?`, 'tense');
          const call = await ctx.ask([{ label: 'Passen', value: false }, { label: `Mitgehen (${money(bet)})`, value: true, kind: 'primary', disabled: !canBet }]);
          if (!call) out = true;
          else {
            spend(p, bet); pot += bet; ctx.sync(); Sfx.play('coin');
            opp.filter(o => o !== b).forEach(o => {
              if (aiCalls(o, evalHand(o.hand))) { pot += bet; lines.push(`${o.name} geht mit.`); }
              else { o.folded = true; lines.push(`${o.name} passt.`); }
            });
          }
        } else lines.push('Alle schieben.');
      }

      /* Ergebnis */
      if (out) {
        render();
        ctx.say(`Du passt. <b>${money(pot)}</b> bleiben im Topf – du hast deinen Einsatz verloren.`, 'bad'); Sfx.play('error');
      } else {
        const alive = opp.filter(o => !o.folded);
        if (!alive.length) {
          const win = Math.floor(pot * 0.95); earn(p, win); ctx.sync(); render(); Sfx.play('fanfare');
          ctx.say(`${lines.join(' ')} Alle passen – du nimmst den Topf: <b>${money(win)}</b>.`, 'good');
        } else {
          reveal = true; render();
          const cands = [{ you: true, ev: mine }, ...alive.map(o => ({ o, ev: evalHand(o.hand) }))];
          let best = cands[0].ev; cands.forEach(c => { if (cmpHand(c.ev, best) > 0) best = c.ev; });
          const winners = cands.filter(c => cmpHand(c.ev, best) === 0);
          const share = Math.floor(pot * 0.95 / winners.length);
          const names = winners.map(w => w.you ? 'Du' : w.o.name).join(' und ');
          const split = winners.length > 1;
          if (winners.some(w => w.you)) {
            earn(p, share); ctx.sync(); Sfx.play('fanfare');
            ctx.say(`${lines.join(' ')}<br>${split ? `${names} teilt euch den Topf` : 'Du gewinnst'} mit <b>${HAND_NAMES[best[0]]}</b>: <b>${money(share)}</b> wandern in deine Tasche.`, 'good');
          } else {
            Sfx.play('error');
            ctx.say(`${lines.join(' ')}<br>${names} ${split ? 'teilen sich den Topf' : 'gewinnt'} mit <b>${HAND_NAMES[best[0]]}</b>. Du verlierst deinen Einsatz.`, 'bad');
          }
        }
      }
      ctx.busy(false);
      await ctx.ask([{ label: 'Nächste Runde', value: true, kind: 'primary' }]);
    }
  }

  /* ============================================================
     Black Jack
     ============================================================ */
  const cardVal = c => Math.min(c.r, 10) === 10 ? 10 : (c.r === 14 ? 11 : c.r);
  function total(cards) {
    let t = 0, a = 0;
    cards.forEach(c => { t += cardVal(c); if (c.r === 14) a++; });
    while (t > 21 && a > 0) { t -= 10; a--; }
    return t;
  }
  const isBJ = cards => cards.length === 2 && total(cards) === 21;

  async function runBlackjack(ctx) {
    const p = ctx.p;
    let shoe = newDeck(4);
    ctx.say('Black Jack: Der Dealer steht bei 17. Black Jack zahlt 3 : 2, Verdoppeln und einmaliges Teilen sind erlaubt.');
    for (; ;) {
      ctx.busy(false);
      if (shoe.length < 40) { shoe = newDeck(4); Log.add('Der Dealer mischt neu.'); }
      const bet = await ctx.askBet({ max: ctx.maxBet(), min: 10, def: 100 });
      ctx.busy(true);
      spend(p, bet); ctx.sync(); Sfx.play('coin');
      const draw = () => shoe.shift();
      const dealer = [draw(), draw()];
      let hands = [{ cards: [draw(), draw()], bet, done: false }];
      let hideHole = true, cur = -1;

      const render = () => {
        ctx.felt.replaceChildren(
          el('div', { class: 'cs-seat dealer' },
            el('div', { class: 'cs-name' }, 'Dealer', el('span', { class: 'cs-total' }, hideHole ? String(cardVal(dealer[0])) : String(total(dealer)))),
            el('div', { class: 'cs-hand' }, dealer.map((c, i) => cardEl(c, { hidden: hideHole && i === 1 })))),
          el('div', { class: 'cs-hands' }, hands.map((h, i) => el('div', { class: 'cs-seat me' + (i === cur ? ' active' : '') },
            el('div', { class: 'cs-name' }, hands.length > 1 ? `Hand ${i + 1}` : 'Du', el('span', { class: 'cs-total' }, String(total(h.cards))), el('span', { class: 'cs-bet' }, money(h.bet))),
            el('div', { class: 'cs-hand' }, h.cards.map(c => cardEl(c)))))));
      };
      render(); Sfx.play('turn');
      await sleep(350);

      const settle = async () => {
        hideHole = false; cur = -1; render();
        const dt = total(dealer);
        const live = hands.some(h => total(h.cards) <= 21) && !(hands.length === 1 && isBJ(hands[0].cards));
        if (live) {
          while (total(dealer) < 17) { await sleep(600); dealer.push(draw()); Sfx.play('tick'); render(); }
        }
        const dT = total(dealer), dBJ = isBJ(dealer);
        let net = 0; const res = [];
        hands.forEach((h, i) => {
          const t = total(h.cards), nat = hands.length === 1 && isBJ(h.cards);
          let back = 0, txt;
          if (nat && !dBJ) { back = Math.floor(h.bet * 2.5); txt = 'Black Jack!'; }
          else if (t > 21) txt = 'Überkauft';
          else if (dBJ && !nat) txt = 'Dealer hat Black Jack';
          else if (dT > 21) { back = h.bet * 2; txt = 'Dealer überkauft'; }
          else if (t > dT) { back = h.bet * 2; txt = 'Gewonnen'; }
          else if (t === dT) { back = h.bet; txt = 'Unentschieden'; }
          else txt = 'Verloren';
          earn(p, back); net += back - h.bet;
          res.push((hands.length > 1 ? `Hand ${i + 1}: ` : '') + txt);
        });
        ctx.sync();
        const kind = net > 0 ? 'good' : net < 0 ? 'bad' : '';
        if (net > 0) Sfx.play('fanfare'); else if (net < 0) Sfx.play('error'); else Sfx.play('ok');
        ctx.say(`${res.join(' · ')} – ${net > 0 ? 'Gewinn' : net < 0 ? 'Verlust' : 'Bilanz'}: <b>${money(Math.abs(net))}</b>`, kind);
      };

      if (isBJ(hands[0].cards) || isBJ(dealer)) { await settle(); }
      else {
        for (let i = 0; i < hands.length; i++) {
          const h = hands[i]; cur = i;
          while (!h.done) {
            render();
            const t = total(h.cards);
            if (t >= 21) { h.done = true; break; }
            const first = h.cards.length === 2;
            const canSplit = first && hands.length === 1 && cardVal(h.cards[0]) === cardVal(h.cards[1]) && canPay(p, h.bet);
            ctx.say(`Du hast <b>${t}</b>${hands.length > 1 ? ` (Hand ${i + 1})` : ''}. Der Dealer zeigt <b>${cardVal(dealer[0])}</b>.`);
            const a = await ctx.ask([
              { label: 'Karte', value: 'hit', kind: 'primary' },
              { label: 'Halten', value: 'stand' },
              { label: 'Verdoppeln', value: 'double', disabled: !(first && canPay(p, h.bet)) },
              { label: 'Teilen', value: 'split', disabled: !canSplit },
            ]);
            if (a === 'hit') { h.cards.push(draw()); Sfx.play('tick'); }
            else if (a === 'stand') h.done = true;
            else if (a === 'double') { spend(p, h.bet); h.bet *= 2; ctx.sync(); Sfx.play('coin'); h.cards.push(draw()); h.done = true; }
            else if (a === 'split') {
              spend(p, h.bet); ctx.sync(); Sfx.play('coin');
              const h2 = { cards: [h.cards.pop()], bet: h.bet, done: false };
              h.cards.push(draw()); h2.cards.push(draw());
              hands.push(h2);
              if (h.cards[0].r === 14) { h.done = true; h2.done = true; }          // geteilte Asse bekommen nur je eine Karte
            }
            await sleep(150);
          }
        }
        await settle();
      }
      ctx.busy(false);
      await ctx.ask([{ label: 'Nächste Runde', value: true, kind: 'primary' }]);
    }
  }

  /* ============================================================
     Roulette (europäisch, eine Null)
     ============================================================ */
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const colorOf = n => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const BETS = {};
  range(0, 36).forEach(n => { BETS['n' + n] = { nums: [n], pay: 35, label: 'Zahl ' + n }; });
  Object.assign(BETS, {
    red: { nums: [...REDS], pay: 1, label: 'Rot' },
    black: { nums: range(1, 36).filter(n => !REDS.has(n)), pay: 1, label: 'Schwarz' },
    even: { nums: range(1, 36).filter(n => n % 2 === 0), pay: 1, label: 'Gerade' },
    odd: { nums: range(1, 36).filter(n => n % 2 === 1), pay: 1, label: 'Ungerade' },
    low: { nums: range(1, 18), pay: 1, label: '1–18' },
    high: { nums: range(19, 36), pay: 1, label: '19–36' },
    d1: { nums: range(1, 12), pay: 2, label: '1. Dutzend' }, d2: { nums: range(13, 24), pay: 2, label: '2. Dutzend' }, d3: { nums: range(25, 36), pay: 2, label: '3. Dutzend' },
    c1: { nums: range(1, 36).filter(n => n % 3 === 1), pay: 2, label: '1. Reihe' }, c2: { nums: range(1, 36).filter(n => n % 3 === 2), pay: 2, label: '2. Reihe' }, c3: { nums: range(1, 36).filter(n => n % 3 === 0), pay: 2, label: '3. Reihe' },
  });

  function drawWheel(cv, theta, ball) {
    const g = cv.getContext('2d'), W = cv.width, cx = W / 2, R = W / 2 - 4, step = Math.PI * 2 / WHEEL.length;
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(cx, cx); g.rotate(theta);
    WHEEL.forEach((n, k) => {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, k * step - Math.PI / 2, (k + 1) * step - Math.PI / 2); g.closePath();
      g.fillStyle = { red: '#a3261d', black: '#16130f', green: '#1f7a45' }[colorOf(n)]; g.fill();
      g.strokeStyle = '#c9a24d'; g.lineWidth = 1; g.stroke();
      g.save(); g.rotate((k + 0.5) * step - Math.PI / 2); g.translate(R * 0.82, 0); g.rotate(Math.PI / 2);
      g.fillStyle = '#f3e7c9'; g.font = `bold ${W / 22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 0, 0); g.restore();
    });
    g.beginPath(); g.arc(0, 0, R * 0.6, 0, Math.PI * 2); g.fillStyle = '#2a2117'; g.fill(); g.strokeStyle = '#c9a24d'; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.arc(0, 0, R * 0.12, 0, Math.PI * 2); g.fillStyle = '#c9a24d'; g.fill();
    g.restore();
    g.beginPath(); g.arc(cx, cx, R, 0, Math.PI * 2); g.strokeStyle = '#8a6a2a'; g.lineWidth = 4; g.stroke();
    if (ball) {
      g.beginPath(); g.arc(cx + ball.r * R * Math.cos(ball.a), cx + ball.r * R * Math.sin(ball.a), W / 40, 0, Math.PI * 2);
      g.fillStyle = '#f5f5f0'; g.shadowColor = '#000'; g.shadowBlur = 6; g.fill(); g.shadowBlur = 0;
    }
  }

  async function runRoulette(ctx) {
    const p = ctx.p;
    const bets = new Map();            // key → Betrag
    let last = null, chip = 100, history = [], spinResolve = null, spinning = false;
    const cells = {};
    const chipRow = el('div', { class: 'chips rl-chips' });
    const totalEl = el('b', { class: 'gold' }, '$0');
    const hist = el('div', { class: 'rl-hist' });
    const cv = el('canvas', { class: 'rl-wheel', width: 260, height: 260 });
    const board = el('div', { class: 'rl-board' });
    const side = el('div', { class: 'rl-side' }, cv, el('div', { class: 'rl-tot' }, 'Einsätze: ', totalEl), hist);
    ctx.felt.replaceChildren(el('div', { class: 'rl-wrap' }, side, el('div', { class: 'rl-main' }, chipRow, board)));
    drawWheel(cv, 0, null);

    const cell = (key, text, cls, col, row, span) => {
      const c = el('button', { class: 'rl-cell ' + cls, type: 'button', style: { gridColumn: span ? `${col} / span ${span}` : String(col), gridRow: String(row) }, onclick: () => place(key) },
        el('span', {}, text), el('i', { class: 'rl-chip hidden' }));
      cells[key] = c; board.append(c);
    };
    cell('n0', '0', 'green', 1, 1);
    cells.n0.style.gridRow = '1 / span 3';
    for (let n = 1; n <= 36; n++) cell('n' + n, String(n), colorOf(n), 1 + Math.ceil(n / 3), 3 - ((n - 1) % 3));
    cell('c3', '2:1', 'out', 14, 1); cell('c2', '2:1', 'out', 14, 2); cell('c1', '2:1', 'out', 14, 3);
    cell('d1', '1. Dutzend', 'out', 2, 4, 4); cell('d2', '2. Dutzend', 'out', 6, 4, 4); cell('d3', '3. Dutzend', 'out', 10, 4, 4);
    cell('low', '1–18', 'out', 2, 5, 2); cell('even', 'Gerade', 'out', 4, 5, 2); cell('red', 'Rot', 'out red', 6, 5, 2);
    cell('black', 'Schwarz', 'out black', 8, 5, 2); cell('odd', 'Ungerade', 'out', 10, 5, 2); cell('high', '19–36', 'out', 12, 5, 2);

    [10, 50, 100, 500, 1000, 5000].forEach(v => {
      const b = el('button', { class: 'chip' + (v === chip ? ' on' : ''), type: 'button', onclick: () => { chip = v; chipRow.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); Sfx.play('tick'); } }, String(v));
      chipRow.append(b);
    });

    const spinBtn = el('button', { class: 'btn primary', type: 'button', onclick: () => spinResolve && spinResolve() }, 'Kugel rollen lassen');
    const clearBtn = el('button', { class: 'btn', type: 'button', onclick: clearBets }, 'Einsätze zurück');
    const repBtn = el('button', { class: 'btn', type: 'button', onclick: repeat }, 'Letzte wiederholen');
    const sum = () => [...bets.values()].reduce((a, b) => a + b, 0);

    function paint() {
      Object.entries(cells).forEach(([k, c]) => {
        const v = bets.get(k), chipEl = c.querySelector('.rl-chip');
        chipEl.classList.toggle('hidden', !v); chipEl.textContent = v ? (v >= 1000 ? (v / 1000) + 'k' : v) : '';
      });
      totalEl.textContent = money(sum());
      spinBtn.disabled = spinning || !bets.size; clearBtn.disabled = spinning || !bets.size;
      repBtn.disabled = spinning || !last || bets.size > 0 || !canPay(p, [...last.values()].reduce((a, b) => a + b, 0));
      ctx.sync();
    }
    function place(key) {
      if (spinning) return;
      if (!canPay(p, chip)) { Sfx.play('error'); ctx.say('Dafür fehlt dir das Geld.', 'bad'); return; }
      spend(p, chip); bets.set(key, (bets.get(key) || 0) + chip); Sfx.play('coin'); paint();
    }
    function clearBets() {
      if (spinning) return;
      earn(p, sum()); bets.clear(); Sfx.play('tick'); paint();
    }
    function repeat() {
      if (spinning || !last) return;
      const t = [...last.values()].reduce((a, b) => a + b, 0);
      if (!canPay(p, t)) return;
      spend(p, t); last.forEach((v, k) => bets.set(k, v)); Sfx.play('coin'); paint();
    }
    ctx.ctl.replaceChildren(el('div', { class: 'rl-ctl' }, clearBtn, repBtn, spinBtn));
    ctx.cleanup = () => { if (!spinning && bets.size) { earn(p, sum()); bets.clear(); } };
    ctx.say('Wähle einen Jeton und klicke aufs Tableau: Zahl (35 : 1), Dutzend/Reihe (2 : 1), Rot/Schwarz, Gerade/Ungerade, 1–18/19–36 (1 : 1). Bei der Null verlieren alle Außenwetten.');
    paint();

    for (; ;) {
      await new Promise(r => { spinResolve = r; });
      spinResolve = null; spinning = true; ctx.busy(true); paint();
      Object.values(cells).forEach(c => c.classList.remove('hit'));
      const k = Math.floor(Math.random() * WHEEL.length), num = WHEEL[k];
      const step = Math.PI * 2 / WHEEL.length, pocket = (k + 0.5) * step - Math.PI / 2;
      const T = 4600, t0 = performance.now(), thetaEnd = 6 * Math.PI, turns = 10 * Math.PI;
      ctx.say('Die Kugel rollt …', 'tense');
      let lastTick = 0;
      await new Promise(res => {
        const frame = now => {
          const t = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - t, 3);
          const theta = thetaEnd * e;
          const a = thetaEnd + pocket - turns * (e - 1);
          const r = t < 0.7 ? 0.92 : 0.92 - 0.2 * ((t - 0.7) / 0.3);
          drawWheel(cv, theta, { a, r });
          if (now - lastTick > 90 + 260 * t) { Sfx.play('tick'); lastTick = now; }
          if (t < 1) requestAnimationFrame(frame); else res();
        };
        requestAnimationFrame(frame);
      });
      let back = 0;
      bets.forEach((amt, key) => { const b = BETS[key]; if (b.nums.includes(num)) { back += amt * (b.pay + 1); cells[key].classList.add('hit'); } });
      cells['n' + num].classList.add('hit');
      const staked = sum(), net = back - staked;
      earn(p, back);
      last = new Map(bets); bets.clear();
      history.unshift(num); history = history.slice(0, 12);
      hist.replaceChildren(...history.map(n => el('span', { class: 'rl-h ' + colorOf(n) }, String(n))));
      const cname = { red: 'Rot', black: 'Schwarz', green: 'Grün' }[colorOf(num)];
      if (!staked) { ctx.say('Die Kugel fällt auf <b>' + num + '</b>.'); }
      else if (net > 0) { Sfx.play('fanfare'); ctx.say(`Die Kugel fällt auf <b>${num} (${cname})</b>. Du gewinnst <b>${money(net)}</b>!`, 'good'); }
      else if (net === 0) { Sfx.play('ok'); ctx.say(`Die Kugel fällt auf <b>${num} (${cname})</b>. Du bekommst deinen Einsatz zurück.`); }
      else { Sfx.play('error'); ctx.say(`Die Kugel fällt auf <b>${num} (${cname})</b>. Du verlierst <b>${money(-net)}</b>.`, 'bad'); }
      spinning = false; ctx.busy(false); paint();
    }
  }

  return {
    poker: p => table(p, { key: 'casino-poker', icon: '♠️', hue: 140, label: 'Poker', title: 'Poker – Five-Card-Draw', info: 'Mindesteinsatz $10 · Tausch bis 3 Karten', feltClass: 'poker' }, runPoker),
    blackjack: p => table(p, { key: 'casino-blackjack', icon: '🃏', hue: 10, label: 'Black Jack', title: 'Black Jack', info: 'Mindesteinsatz $10 · Black Jack zahlt 3 : 2', feltClass: 'bj' }, runBlackjack),
    roulette: p => table(p, { key: 'casino-roulette', icon: '🎡', hue: 350, label: 'Roulette', title: 'Roulette', info: 'Europäisch, eine Null · Jetons ab $10', feltClass: 'rl' }, runRoulette),
    evalHand,
  };
})();
