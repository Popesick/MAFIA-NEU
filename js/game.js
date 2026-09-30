/* ============================================================
   Spielzustand, Zugablauf, Stadtrundgang, Setup, Speichern
   (Logik 1:1 nach dem dekompilierten Original-P-Code)
   ============================================================ */

let S = null;                       // aktueller Spielstand
const SAVE_KEY = 'mafia-neu-save-v1';
const TRAINER_CASH = 999999999;
const PCOL = ['', '#e3a94f', '#5fb0e6', '#c86ad8', '#6fd08a'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const cur = () => S.players[S.sp];
const yearOf = m => 1925 + Math.floor(m / 12);
const dateStr = m => `${MONTHS[m % 12]} ${yearOf(m)}`;
const isTrainerName = n => /^\s*trainer\s*$/i.test(n);

/* ---------- Geld & Punkte ---------- */
function earn(p, x) { if (!p.trainer) p.cash += x; }
function spend(p, x) { if (!p.trainer) p.cash -= x; }
function canPay(p, x) { return p.trainer || p.cash >= x; }
function effCash(p) { return p.trainer ? 20000 : p.cash; }       // Berechnungsgrundlage für Plünderungen
/** Original L2B1B: Punkte = Punkte + X · Bewertungsfaktor, begrenzt auf 0…100; Rang = INT(Punkte/11.1)+1 */
function addScore(p, x) {
  p.score = clamp(p.score + x * S.rating, 0, 100);
  p.newRank = Math.floor(p.score / 11.1) + 1;
}
const boss = p => p.gangsters[0];

function newPlayer(idx, name, gang, attrs) {
  const trainer = isTrainerName(name);
  const p = {
    idx, name, gang, trainer,
    cash: trainer ? TRAINER_CASH : rnd(5) * 500 + 5000,
    score: trainer ? 55 : 0, rank: trainer ? 5 : 1, newRank: trainer ? 5 : 1,
    pos: CELL_START,
    gangsters: [{ gid: 0, name, weapon: 0, en: 5, pow: attrs.pow, int: attrs.int, brut: attrs.brut }],
    vehicle: 0, barrels: 0, items: 0,
    rentMonths: 0, bribe: 0, jail: 0, tip: 0, safeBonus: 0,
    debt: 0, debtMonths: 0, creditShop: 0, creditDeposit: 0,
    job: 0, jobLeft: 0, jobPay: 0, lastPlace: 0, raid: false, mayor: false,
  };
  return p;
}

/* ============================================================
   Anzeige: HUD, Seitenleiste, Ansichten
   ============================================================ */
function renderHud() {
  const p = S && cur(); if (!p) return;
  $('#hud').style.setProperty('--pc', PCOL[p.idx]);
  $('#hud-name').textContent = p.name + (p.trainer ? ' 🛠' : '');
  $('#hud-gang').textContent = p.gang;
  $('#hud-cash').textContent = money(p.cash);
  $('#hud-date').textContent = dateStr(S.month);
  $('#hud-rank').textContent = RANKS[p.rank];
  $('#hud-score-num').textContent = p.score.toFixed(1).replace('.', ',') + ' Pkt.';
  $('#hud-score-fill').style.width = p.score + '%';
  $('#hud-veh').textContent = VEHICLES[p.vehicle].icon + ' ' + VEHICLES[p.vehicle].name;
  $('#hud-ms').textContent = Math.max(0, S.ms);
  $('#hud-ms-fill').style.width = clamp(S.ms / Math.max(1, VEHICLES[p.vehicle].speed) * 100, 0, 100) + '%';
  $('#map-ms').textContent = Math.max(0, S.ms);
  const trainerBtn = $('#btn-trainer'); if (trainerBtn) trainerBtn.classList.toggle('hidden', !p.trainer);
  const tag = S.players.slice(1).map(q => `<span class="ptag ${q === p ? 'on' : ''}" style="--c:${PCOL[q.idx]}">${esc(q.name)}</span>`).join('');
  $('#hud-players').innerHTML = tag;
}
function inventoryChips(p) {
  const chips = [];
  const add = (icon, text, cls = '') => chips.push(`<span class="chip-info ${cls}">${icon} ${text}</span>`);
  add('🛢️', `${p.barrels} / ${VEHICLES[p.vehicle].cap} Fässer`);
  if (p.items & ITEM_DOCS) add('🪪', 'Ausweis');
  if (p.items & ITEM_FAKE) add('💵', 'Falschgeld', 'warn');
  if (p.debt > 0) add('📉', `Schulden ${money(p.debt)} (${p.debtMonths} Mon.)`, 'bad');
  if (p.rentMonths > 0) add('🏠', `Miete ${p.rentMonths} Mon.`);
  if (p.bribe > 0) add('🤝', `Kommissar bestochen ${p.bribe} Mon.`);
  if (p.creditShop) add('🏦', `Kreditbüro (Einlage ${money(p.creditDeposit)})`);
  if (p.jail > 0) add('⛓️', `Haft ${p.jail} Mon.`, 'bad');
  if (p.job) add('💼', ['', 'Türsteher', 'Croupier', 'Portier', 'Killer'][p.job] + ` (${p.jobLeft} Mon.)`);
  if (p.tip) add('🕵️', ['', 'Postzug-Tipp', 'Gold in Bank Nr. 2', 'Geldtransporter unterwegs', 'Waffenschmuggel-Deal', 'Bürgermeister-Auftrag'][p.tip]);
  if (p.safeBonus > 0) add('📕', 'Tresorknacker-Handbuch');
  return chips.join('');
}
function renderSide() {
  const p = S && cur(); if (!p) return;
  const box = $('#roster'); box.innerHTML = '';
  p.gangsters.forEach((g, i) => box.append(gangsterCard(g, i + 1, p)));
  $('#inventory').innerHTML = inventoryChips(p);
}
function refresh() { renderHud(); renderSide(); }

function showView(name) {
  ['menu', 'map', 'battle'].forEach(v => $('#view-' + v).classList.toggle('hidden', v !== name));
  MapView.setVisible(name === 'map'); Arena.setVisible(name === 'battle');
  $('#game-side').classList.toggle('collapsed', name === 'battle');
}
function showScreen(name) {
  ['title', 'setup', 'game'].forEach(v => $('#screen-' + v).classList.toggle('hidden', v !== name));
  if (name === 'title') Music.playTitle();
  else if (name === 'game') Music.playGame();
}

/* ============================================================
   Setup
   ============================================================ */
async function runSetup() {
  showScreen('setup');
  const root = $('#setup-body'); root.innerHTML = '';
  // Schritt 1: Regeln
  const rules = await new Promise(res => {
    const yearIn = el('input', { type: 'range', min: 1928, max: 1978, value: 1930, id: 'in-year' });
    const yearOut = el('output', {}, '1930');
    yearIn.addEventListener('input', () => yearOut.textContent = yearIn.value);
    const rateIn = el('input', { type: 'range', min: 0.1, max: 2, step: 0.1, value: 1, id: 'in-rate' });
    const rateOut = el('output', {}, '1,0');
    rateIn.addEventListener('input', () => rateOut.textContent = Number(rateIn.value).toFixed(1).replace('.', ','));
    let n = 1;
    const seg = el('div', { class: 'seg' });
    [1, 2, 3, 4].forEach(k => seg.append(el('button', { type: 'button', class: k === 1 ? 'on' : '', onclick: e => { n = k; $$('button', seg).forEach(b => b.classList.toggle('on', b === e.currentTarget)); Sfx.play('click'); } }, String(k))));
    root.append(el('div', { class: 'setup-card' },
      el('div', { class: 'kicker' }, 'Schritt 1 · Spielregeln'),
      el('h2', {}, 'Wie lange dauert der Krieg um Chicago?'),
      el('label', { class: 'field' }, el('span', {}, 'Spielende (Jahr)'), yearIn, yearOut),
      el('p', { class: 'hint' }, 'Das Spiel endet zu Jahresbeginn des gewählten Jahres. Es gewinnt, wer dann die meisten Punkte hat – oder wer vorher „König der Unterwelt“ wird und Geldtransporter wie Bürgermeister erledigt hat.'),
      el('label', { class: 'field' }, el('span', {}, 'Punktebewertung (0,1 – 2)'), rateIn, rateOut),
      el('p', { class: 'hint' }, 'Faktor für alle Punktegewinne und -verluste: niedrig = langsamer Aufstieg, hoch = schneller Aufstieg.'),
      el('div', { class: 'field' }, el('span', {}, 'Anzahl Spieler'), seg),
      el('div', { class: 'actions' }, el('button', { class: 'btn ghost', onclick: () => { showScreen('title'); res(null); } }, 'Zurück'),
        el('button', { class: 'btn primary', onclick: () => { Sfx.play('ok'); res({ endYear: +yearIn.value, rating: +rateIn.value, n }); } }, 'Weiter'))));
  });
  if (!rules) return null;
  const players = [null];
  for (let i = 1; i <= rules.n; i++) {
    const p = await setupPlayer(i, rules.n);
    if (!p) return null;
    players.push(p);
  }
  return { rules, players };
}

function setupPlayer(i, total) {
  return new Promise(res => {
    const root = $('#setup-body'); root.innerHTML = '';
    const nameIn = el('input', { type: 'text', maxlength: 14, placeholder: 'Spieler ' + i, value: '', autocomplete: 'off' });
    const gangIn = el('input', { type: 'text', maxlength: 22, placeholder: 'Name deiner Bande', value: '', autocomplete: 'off' });
    const hintTr = el('p', { class: 'hint trainer-hint hidden' }, '🛠 Trainer-Modus: unendlich Geld, Startrang „Halunke“ und ein Trainer-Panel zum schnellen Testen.');
    nameIn.addEventListener('input', () => hintTr.classList.toggle('hidden', !isTrainerName(nameIn.value)));
    const rolls = [{ k: 'pow', l: 'Kraft', v: 10 }, { k: 'int', l: 'Intelligenz', v: 10 }, { k: 'brut', l: 'Brutalität', v: 10 }];
    let step = 0, timer = 0;
    const rows = rolls.map(r => {
      const out = el('div', { class: 'roll-val' }, '–'); const bar = el('i', {});
      const btn = el('button', { type: 'button', class: 'btn small' }, 'Stopp');
      return { r, out, bar, btn, node: el('div', { class: 'roll-row' }, el('span', { class: 'roll-l' }, r.l), el('span', { class: 'roll-bar' }, bar), out, btn) };
    });
    const startBtn = el('button', { class: 'btn primary', type: 'button', disabled: true }, i < total ? 'Nächster Spieler' : 'Spiel starten');
    const info = el('p', { class: 'hint' }, 'Drück bei jedem Wert rechtzeitig auf „Stopp“ – wie im Original bestimmt dein Timing die Attribute. Energie startet bei 5. Die Intelligenz wird wie im Original mit 30 verodert (Mindestwert 30).');
    const spin = () => {
      clearInterval(timer);
      timer = setInterval(() => {
        const row = rows[step]; if (!row) return;
        row.r.v = rnd(9) * 5 + 10; row.out.textContent = row.r.v; row.bar.style.width = (row.r.v / 50 * 100) + '%';
      }, 55);
    };
    rows.forEach((row, k) => {
      row.btn.disabled = k !== 0;
      row.btn.addEventListener('click', () => {
        if (k !== step) return;
        Sfx.play('lock');
        if (k === 1) row.r.v = row.r.v | 30;                       // Original: IN = X OR 30
        row.out.textContent = row.r.v; row.bar.style.width = clamp(row.r.v, 0, 100) + '%';
        row.node.classList.add('locked'); row.btn.disabled = true;
        step++;
        if (step < 3) { rows[step].btn.disabled = false; } else { clearInterval(timer); startBtn.disabled = false; startBtn.focus(); }
      });
    });
    startBtn.addEventListener('click', () => {
      clearInterval(timer); Sfx.play('ok');
      let name = nameIn.value.trim() || 'Spieler ' + i, gang = gangIn.value.trim() || 'Bande ' + i;
      res({ name, gang, attrs: { pow: rolls[0].v, int: rolls[1].v, brut: rolls[2].v } });
    });
    root.append(el('div', { class: 'setup-card' },
      el('div', { class: 'kicker' }, `Schritt 2 · Spieler ${i} von ${total}`),
      el('h2', {}, 'Wer bist du?'),
      el('div', { class: 'field2' }, el('label', {}, el('span', {}, 'Dein Name'), nameIn), el('label', {}, el('span', {}, 'Name deiner Bande'), gangIn)),
      hintTr,
      el('h3', {}, 'Attribute auswürfeln'),
      ...rows.map(r => r.node), info,
      el('div', { class: 'actions' }, el('button', { class: 'btn ghost', type: 'button', onclick: () => { clearInterval(timer); showScreen('title'); res(null); } }, 'Abbrechen'), startBtn)));
    spin(); nameIn.focus();
  });
}

async function newGame() {
  const cfg = await runSetup();
  if (!cfg) return;
  S = {
    v: 1, endYear: cfg.rules.endYear, rating: cfg.rules.rating, n: cfg.rules.n,
    players: [null, ...cfg.players.slice(1).map((c, i) => newPlayer(i + 1, c.name, c.gang, c.attrs))],
    month: 0, sp: 1, ms: 0,
    flats: [0, 0, 0, 0, 0, 0],            // UK(1..5): wer wohnt in welcher Wohnung
    recruited: new Array(31).fill(false), // SG(1..30)
    started: true,
  };
  Log.clear();
  showScreen('game'); showView('menu');
  Log.add(`Chicago, Januar 1925. ${S.n} Bande${S.n > 1 ? 'n kämpfen' : ' kämpft'} um die Stadt – Spielende ${S.endYear}.`);
  await UI.scene({
    art: { key: 'titel', icon: '🌃', hue: 35, label: 'Chicago, 1925' }, kicker: 'Es beginnt', title: 'Chicago, 1925 …',
    body: [`Die Prohibition macht Schnaps zu Gold, und die Straßen gehören dem, der am härtesten zuschlägt. ` +
      `${S.n > 1 ? 'Ihr baut' : 'Du baust'} eine Bande auf – vom kleinen Rowdy bis zum <b>König der Unterwelt</b>.`,
      S.players.slice(1).some(p => p.trainer) ? '<span class="trainer-hint">🛠 Trainer-Modus aktiv – unendlich Geld.</span>' : ''],
    actions: [{ label: 'Los geht’s', value: true, kind: 'primary', key: ['Enter', ' '] }],
  });
  await safeRun(gameLoop);
}

/* ============================================================
   Speichern / Laden
   ============================================================ */
function saveGame() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, savedAt: Date.now() })); } catch (e) { }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
async function loadGame() {
  try {
    S = JSON.parse(localStorage.getItem(SAVE_KEY));
    S.players.forEach(p => { if (p && p.trainer) p.cash = TRAINER_CASH; });
    Log.clear(); showScreen('game'); showView('menu');
    Log.add('Spielstand geladen.');
    await safeRun(gameLoop);
  } catch (e) { toast('Spielstand konnte nicht geladen werden.', 'bad'); }
}

/* ============================================================
   Hauptschleife (Original L28B6 ff.)
   ============================================================ */
async function gameLoop() {
  for (;;) {
    const p = cur();
    saveGame();
    const res = await playTurn(p);
    if (res === 'end') return;
    S.sp++;
    if (S.sp > S.n) {
      S.sp = 1;
      await showRanking();
      S.month++;
      if (yearOf(S.month) === S.endYear && S.month % 12 === 0) { await finishGame(); return; }
    }
  }
}

async function playTurn(p) {
  refresh(); showView('menu');
  await turnSplash(p);
  await startOfTurn(p);
  // Sieg: Rang 10 + Geldtransporter + Bürgermeister
  if (p.rank === 10 && p.raid && p.mayor) {
    await UI.scene({ art: { key: 'sieg', icon: '👑', hue: 45, label: 'König der Unterwelt' }, mood: 'good', kicker: 'Sieg!', title: `${p.name} ist der König der Unterwelt!`,
      body: ['Der Geldtransporter ist ausgeraubt, der Bürgermeister beseitigt – Chicago gehört dir. Niemand kann dir mehr das Wasser reichen.'], actions: [{ label: 'Endstand ansehen', value: true, kind: 'primary', key: ['Enter'] }] });
    Sfx.play('fanfare');
    await finishGame(); return 'end';
  }
  S.ms = VEHICLES[p.vehicle].speed; p.newRank = p.rank; p.lastPlace = 0;
  refresh();
  if (p.job) { await doJob(p); return; }
  p.score = Math.floor(p.score * 100) / 100;
  if (p.jail > 0) { await jailTurn(p); return; }
  for (;;) {
    const c = await turnMenu(p);
    if (c === 4) break;
    if (c === 1) await overview(p);
    if (c === 2) await walkCity(p);
    if (c === 3) await gangWar(p);
    refresh();
    if (S.ms <= 0) { await UI.say('Der Monat ist zu Ende', ['Du hast keine Bewegungspunkte mehr. Der nächste Spieler ist dran.']); break; }
  }
}

async function turnSplash(p) {
  Sfx.play('turn');
  const isFirst = S.month === 0 && S.sp === 1;
  await UI.scene({
    kicker: dateStr(S.month), title: `Spieler ${p.idx}: ${esc(p.name)}`, mood: 'splash',
    body: [`<div class="splash-line">Du bist dran …</div><div class="splash-sub">${esc(p.gang)}</div>`],
    actions: [{ label: isFirst ? 'Los' : 'Zug beginnen', value: true, kind: 'primary', key: ['Enter', ' '] }],
    onMount: (sheet, done) => { if (S.n === 1) setTimeout(() => { if (sheet.isConnected) done(true); }, 900); },
  });
}

/* Was zu Monatsbeginn passiert (Original L31AC) */
async function startOfTurn(p) {
  // Energie regenerieren
  p.gangsters.forEach(g => {
    g.en = g.en + Math.floor(g.pow / 10) + 1;
    const cap = maxEnergy(g);
    if (g.en > cap) g.en = cap;
  });
  refresh();
  if (p.rank !== p.newRank) { p.rank = p.newRank; await wantedPoster(p); }
  if (p.debt > 0 && p.jail <= 0) await loanSharkMonth(p);
  if (p.creditShop && p.creditDeposit) await creditIncome(p);
  if (p.rentMonths > 0) {
    p.rentMonths--;
    if (p.rentMonths <= 0) { p.rentMonths = 1; await rentDue(p); }
  }
  if (p.bribe > 0) p.bribe--;
  if (rnd(8) === 0 && (p.items & ITEM_DOCS)) { p.items &= ~ITEM_DOCS; Log.add('🪪 Dein Ausweis ist inzwischen wertlos.', 'warn'); }
  if (rnd(8) === 0 && (p.items & ITEM_FAKE)) { p.items &= ~ITEM_FAKE; Log.add('💵 Dein Falschgeld ist aufgebraucht bzw. aufgeflogen.', 'warn'); }
  if (p.tip === 4) await gunRunning(p);
  refresh();
}

/* Fahndungsplakat bei Rangänderung (Original L32D8) */
async function wantedPoster(p) {
  Sfx.play(p.rank >= 1 ? 'fanfare' : 'error');
  const poster = el('div', { class: 'wanted' },
    el('div', { class: 'w-top' }, 'GESUCHT'),
    artEl('boss-' + ((p.idx - 1) % 4 + 1), { icon: '🎩', hue: 40 + p.idx * 60, label: '', portrait: true, cls: 'wport' }),
    el('div', { class: 'w-name' }, p.name),
    el('div', { class: 'w-gang' }, p.gang),
    el('div', { class: 'w-rank' }, 'Rang: ' + RANKS[p.rank]),
    el('div', { class: 'w-pts' }, p.score.toFixed(1).replace('.', ',') + ' Punkte'));
  await UI.scene({ kicker: 'Neuer Rang', title: RANKS[p.rank], body: [poster, `<p>Die Polizei hat ein neues Fahndungsplakat gedruckt.</p>`], actions: [{ label: 'Weiter', value: true, kind: 'primary', key: ['Enter', ' '] }] });
}

/* ---------- Monatsereignisse ---------- */
async function loanSharkMonth(p) {
  p.debtMonths = Math.max(0, p.debtMonths - 1);
  if (p.debtMonths > 0) {
    await UI.say(`${esc(p.name)}!`, [`Du hast ${money(p.debt)} Schulden. Du hast noch <b>${p.debtMonths + 1} Monate</b> Zeit, sie zurückzuzahlen!`], { art: { key: 'loc-kredit', icon: '💰', hue: 48 }, mood: 'bad', kicker: 'Kredithai' });
    return;
  }
  await UI.say('Die Schläger des Kredithais', ['Der Kredithai schickt seine Schläger, um dich zu besuchen.'], { art: { key: 'loc-kredit', icon: '💰', hue: 48 }, mood: 'bad' });
  const won = await fight({ name: 'Schläger', count: 5, weapon: 3, energy: 30, arena: 'strasse', title: 'Die Schläger des Kredithais' });
  if (won) return;
  await UI.say('Ausgeplündert', ['Die Kerle nehmen dir dein ganzes Geld ab und verschwinden …'], { mood: 'bad' });
  if (!p.trainer) p.cash = 0;
  p.debt = 0; p.debtMonths = 0;
}
async function creditIncome(p) {
  if (rnd(3) === 0) { await UI.say('Kreditgeschäft', ['Dein Kreditgeschäft läuft miserabel.'], { art: { key: 'loc-kredit', icon: '💰', hue: 48 } }); return; }
  const k = p.creditDeposit;
  const gain = Math.floor(Math.random() * k / 20 + k / 10);
  earn(p, gain); Sfx.play('coin');
  await UI.say('Kreditgeschäft', [`Dein Kreditgeschäft blüht! Du verdienst ${money(gain)}.`], { art: { key: 'loc-kredit', icon: '💰', hue: 48 }, mood: 'good' });
}
async function rentDue(p) {
  let P = rnd(100) + 200;
  if (P > effCash(p)) { P = effCash(p); }
  if (P <= 0 && !p.trainer) {
    p.gangsters = [p.gangsters[0]];
    p.rentMonths = 0; S.flats = S.flats.map(o => o === p.idx ? 0 : o);
    await UI.say('Rausgeschmissen!', ['Du wurdest aus deiner Wohnung geworfen! Deine Gangster schließen sich einem anderen Boss an.'], { art: { key: 'loc-motel', icon: '🏨', hue: 28 }, mood: 'bad' });
    return;
  }
  spend(p, P); Sfx.play('error');
  await UI.say('Miete nicht gezahlt', [`Du hast deine Miete nicht rechtzeitig bezahlt. Möbel im Wert von <b>${money(P)}</b> wurden gepfändet!`], { art: { key: 'loc-motel', icon: '🏨', hue: 28 }, mood: 'bad' });
}
async function gunRunning(p) {
  p.tip = 0;
  if (rnd(5) === 0) {
    await UI.say('Waffenschmuggel', ['Die Schmuggler, denen du 5000 $ gegeben hast, sind aufgeflogen!'], { mood: 'bad' });
    return;
  }
  const P = rnd(9500) + 5500;
  earn(p, P); Sfx.play('coin');
  await UI.say('Waffenschmuggel', [`Deine Investition in den Waffenschmuggel bringt dir <b>${money(P)}</b>!`], { mood: 'good' });
}

/* ---------- Monatliche Rangliste ---------- */
async function showRanking(final = false) {
  const rows = S.players.slice(1).map(p => `<tr><td>${esc(p.name)}<small>${esc(p.gang)}</small></td><td class="r">${money(p.cash)}</td><td class="r">${p.score.toFixed(1).replace('.', ',')}</td><td>${RANKS[p.rank]}</td></tr>`).join('');
  const html = `<table class="tbl"><thead><tr><th>Spieler</th><th class="r">Kapital</th><th class="r">Punkte</th><th>Rang</th></tr></thead><tbody>${rows}</tbody></table>`;
  await UI.scene({ kicker: dateStr(S.month), title: final ? 'Endstand' : 'Rangliste', body: [html], actions: [{ label: 'Weiter', value: true, kind: 'primary', key: ['Enter', ' '] }], wide: true });
}

async function finishGame() {
  clearSave();
  let best = -1, winners = [];
  S.players.slice(1).forEach(p => { if (p.score > best) { best = p.score; winners = [p]; } else if (p.score === best) winners.push(p); });
  await showRanking(true);
  Sfx.play('fanfare');
  const text = winners.length === 1
    ? [`<b>${esc(winners[0].name)}</b> hat gewonnen!`, 'Du bist der Beste, Gemeinste, Klügste und Gewalttätigste!']
    : ['Diesmal haben mehrere Spieler gleich viele Punkte:', ...winners.map(w => `<b>${esc(w.name)}</b>`), 'Jeder Gangster war gleich gemein!'];
  await UI.scene({ art: { key: 'sieg', icon: '👑', hue: 45, label: 'Sieger' }, mood: 'good', kicker: 'Spielende', title: winners.length === 1 ? 'Und der Sieger ist …' : 'Unentschieden!', body: text,
    actions: [{ label: 'Zum Titelbild', value: true, kind: 'primary', key: ['Enter'] }] });
  S = null; showScreen('title'); refreshTitle();
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

/* ============================================================
   Zugmenü (Original L2949)
   ============================================================ */
function turnMenu(p) {
  showView('menu'); refresh();
  const view = $('#view-menu');
  const canWar = S.n > 1;
  view.innerHTML = '';
  const tile = (n, icon, title, sub, disabled) => el('button', { class: 'tile', type: 'button', 'data-n': n, disabled: disabled ? true : null },
    el('span', { class: 'tile-n' }, n), el('span', { class: 'tile-icon' }, icon), el('span', { class: 'tile-title' }, title), el('span', { class: 'tile-sub' }, sub));
  const grid = el('div', { class: 'tiles' },
    tile(1, '📋', 'Übersicht', 'Bande, Besitz, Notizen'),
    tile(2, '🗺️', 'Stadtrundgang', `${Math.max(0, S.ms)} Bewegungspunkte übrig`),
    tile(3, '⚔️', 'Bandenkrieg', canWar ? 'Eine andere Bande überfallen' : 'Nur mit mehreren Spielern'),
    tile(4, '⏭️', 'Nächster Spieler', 'Zug beenden'));
  view.append(
    el('div', { class: 'menu-head' },
      el('div', { class: 'kicker' }, dateStr(S.month)),
      el('h1', {}, `Dein Zug, ${p.name}`),
      el('p', {}, `${esc(p.gang)} · ${RANKS[p.rank]} · ${money(p.cash)}`)),
    grid);
  return new Promise(res => {
    const done = n => { document.removeEventListener('keydown', onKey); Sfx.play('click'); res(n); };
    const onKey = e => {
      if ($('#modal-root .modal') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); done(+e.key); }
    };
    $$('.tile', grid).forEach(b => b.addEventListener('click', () => done(+b.dataset.n)));
    document.addEventListener('keydown', onKey);
  });
}

/* Übersicht (Original L2B76) */
async function overview(p) {
  const rows = [
    ['Punkte', p.score.toFixed(1).replace('.', ',') + ' / 100'], ['Rang', RANKS[p.rank]],
    ['Fahrzeug', `${VEHICLES[p.vehicle].icon} ${VEHICLES[p.vehicle].name} · ${Math.max(0, S.ms)} Bewegungspunkte`],
    ['Alkohol', `${p.barrels} Fässer (max. ${VEHICLES[p.vehicle].cap})`],
    ['Gegenstände', [p.items & 1 ? 'Ausweis' : '', p.items & 2 ? 'Falschgeld' : ''].filter(Boolean).join(', ') || '–'],
    ['Bestechung', p.bribe > 0 ? p.bribe + ' Monat(e)' : '–'], ['Miete bezahlt', p.rentMonths > 0 ? p.rentMonths + ' Monat(e)' : '–'],
    ['Schulden', p.debt > 0 ? `${money(p.debt)} (noch ${p.debtMonths + 1} Mon.)` : '–'],
  ];
  const tips = ['', 'Postzug am Bahnhof', 'Gold in Bank Nr. 2', 'Geldtransporter (blaues Auto)', 'Waffenschmuggel (bezahlt)', 'Bürgermeister (Auftrag)'];
  rows.push(['Notizbuch', p.tip ? tips[p.tip] : '–']);
  const tbl = `<table class="tbl kv">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>`;
  const grid = el('div', { class: 'gpick small' });
  p.gangsters.forEach((g, i) => grid.append(gangsterCard(g, i + 1, p)));
  await UI.scene({ kicker: 'Übersicht', title: `${p.name} · ${p.gang}`, body: [tbl, el('h3', {}, `Gangster (${p.gangsters.length}/10)`), grid], wide: true, actions: [{ label: 'Schließen', value: true, kind: 'primary', key: ['Enter', 'Escape', ' '] }] });
}

/* Haft-Monat (Original L2E26) */
async function jailTurn(p) {
  p.jail--;
  Sfx.play('jail');
  await UI.scene({ art: { key: 'gefaengnis', icon: '⛓️', hue: 220, label: 'Hinter Gittern' }, mood: 'bad', kicker: 'Gefängnis', title: 'Du sitzt im Gefängnis',
    body: [`Noch <b>${p.jail + 1} Monat(e)</b> abzusitzen …`], actions: [{ label: 'Weiter', value: true, kind: 'primary', key: ['Enter', ' '] }] });
}

/* ============================================================
   Stadtrundgang (Original L2E75)
   ============================================================ */
function modalOpen() { return !!$('#modal-root .modal'); }
let walkCancel = false;

async function walkCity(p) {
  showView('map'); MapView.player = p; MapView.path = [];
  while (S.ms > 0) {
    refresh();
    MapView.walking = false;
    const inp = await MapView.nextInput();
    if (inp.exit) break;
    let steps;
    if (inp.click != null) {
      const path = MapView.findPath(p.pos, inp.click, p);
      if (!path) { toast('Dorthin führt kein Weg.', 'warn'); continue; }
      steps = path;
    } else steps = [p.pos + inp.dir];
    walkCancel = false; MapView.walking = true; MapView.path = steps.length > 1 ? steps.slice() : [];
    for (let k = 0; k < steps.length; k++) {
      if (S.ms <= 0 || walkCancel) break;
      const r = await stepInto(p, steps[k]);
      MapView.path = steps.slice(k + 1);
      if (r !== 'moved') break;
      refresh();
      if (steps.length > 1) await sleep(75);
    }
    MapView.path = []; MapView.walking = false;
  }
  MapView.player = null;
  showView('menu');
}

const adjacentCells = (a, b) => (Math.abs(a - b) === COLS) || (Math.abs(a - b) === 1 && Math.floor(a / COLS) === Math.floor(b / COLS));

async function stepInto(p, cell) {
  if (cell < 0 || cell >= COLS * ROWS || !adjacentCells(p.pos, cell)) return 'blocked';
  if (CityMap.walkable(cell, p)) {
    p.pos = cell; S.ms -= 1; Sfx.play('step');
    // alle 20 Bewegungspunkte: 20 % Straßensperre (ab Rang 4)
    if (S.ms % 20 === 0 && rnd(5) === 0 && p.rank > 3) {
      refresh(); await roadblock(p); S.ms -= 5; return 'event';
    }
    return 'moved';
  }
  const t = CityMap.target(cell, p);
  if (!t) { Sfx.play('error'); return 'blocked'; }
  refresh();
  MapView.walking = false;
  await enterBuilding(p, t.la, t.ln);
  if (t.la <= 12) p.lastPlace = 20 * t.la + t.ln;
  S.ms -= 5;
  return 'event';
}

/* Tastatur & Buttons für den Stadtplan */
function initMapInput() {
  document.addEventListener('keydown', e => {
    if (!MapView.player || modalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (MapView.walking && (k in KEYDIR || k === 'escape')) { walkCancel = true; return; }
    if (!MapView.pending) return;
    if (k in KEYDIR) { e.preventDefault(); MapView.pending.resolve({ dir: KEYDIR[k] }); }
    else if (k === 'escape' || k === '_' || k === '←') { e.preventDefault(); MapView.pending.resolve({ exit: true }); }
  });
  $('#map-exit').addEventListener('click', () => { if (MapView.pending) MapView.pending.resolve({ exit: true }); else walkCancel = true; });
  $$('#map-dpad button').forEach(b => b.addEventListener('click', () => { if (MapView.pending) MapView.pending.resolve({ dir: DIRS[b.dataset.d] }); }));
  const orig = MapView.onClick.bind(MapView);
  MapView.onClick = cell => { if (MapView.walking) { walkCancel = true; return; } orig(cell); };
}

/* Gebäude betreten (Original L3000) */
async function enterBuilding(p, la, ln) {
  if (la === 13) { await raidTransport(p); return; }
  if (la === 14) { await raidMayor(p); return; }
  const b = BUILDINGS[la];
  Log.add(`${b.icon} ${esc(b.name)}`);
  const art = { key: 'loc-' + b.key, icon: b.icon, hue: b.hue, label: b.name };
  const idx = await UI.menu(b.title, [`<i>${b.greet}</i>`], b.opts, { art, escLast: true, kicker: b.name !== b.title ? b.name : undefined });
  if (!idx) return;
  if (idx === b.opts.length) { S.ms -= 5; return; }        // „Verlassen“ kostet zusätzlich 5 Bewegungspunkte (wie im Original)
  const H = PLACES[la];
  await H(p, idx, ln, art);
}

/* ---------- gemeinsame Bausteine der Gebäude ---------- */
const PLACES = {};                                  // wird in places.js gefüllt
async function notEnough() { Sfx.play('error'); await UI.say('Nicht genug Geld!', ['Dafür fehlt dir das nötige Kleingeld.'], { mood: 'bad' }); }
async function pickGangster(p, title, opts = {}) {
  if (p.gangsters.length === 1 && !opts.alwaysAsk) return { i: 1, g: p.gangsters[0] };
  const i = await UI.pickGangster(p, title, opts);
  return i ? { i, g: p.gangsters[i - 1] } : null;
}

/** Fängt unerwartete Fehler ab, damit das Spiel nicht stumm hängen bleibt */
async function safeRun(fn) {
  try { await fn(); }
  catch (e) {
    console.error(e);
    try { UI._close(); } catch (x) { }
    await UI.say('Interner Fehler', [`<code>${esc(e && e.message || e)}</code>`, 'Der Spielstand vom Zugbeginn ist gespeichert – „Spiel fortsetzen“ im Titelbild lädt ihn.'], { mood: 'bad' });
    showScreen('title'); refreshTitle();
  }
}
