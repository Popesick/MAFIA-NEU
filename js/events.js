/* ============================================================
   Ereignisse: Kämpfe, Polizei, Prozess, Jobs, Bandenkrieg, Raubzüge
   ============================================================ */

let _viewBeforeFight = 'menu';
const currentView = () => ['menu', 'map', 'battle'].find(v => !$('#view-' + v).classList.contains('hidden')) || 'menu';

/** Kampf gegen NPC-Gruppe. Gibt true zurück, wenn der Spieler gewinnt (Original: S = 1) */
async function fight({ name, count, weapon, energy, arena, title, foes }) {
  const p = cur();
  const list = foes || Array.from({ length: count }, (_, i) => npcFighter(count > 1 ? `${name} ${i + 1}` : name, weapon, energy));
  _viewBeforeFight = currentView();
  const b = new Battle({
    arena, title: title || name,
    sides: [
      { name: p.name, human: true, members: p.gangsters.map(fighterOfGangster) },
      { name, human: false, members: list },
    ],
  });
  showView('battle'); refresh();
  const res = await b.run();
  const won = res.winner === 1;
  await battleSummary(b, res, won);
  showView(_viewBeforeFight); refresh();
  return won;
}

/** Bandenkrieg zwischen zwei Spielern: Seite 1 (Verteidiger) beginnt */
async function fightPlayers(defender, attacker, arena, title, opts = {}) {
  _viewBeforeFight = currentView();
  const mk = (pl, boss) => ({ name: pl.name, human: true, members: boss ? [fighterOfGangster(pl.gangsters[0])] : pl.gangsters.map(fighterOfGangster) });
  const b = new Battle({ arena, title, sides: [mk(defender, opts.defenderBossOnly), opts.npcAttacker || mk(attacker)] });
  showView('battle'); refresh();
  const res = await b.run();
  await battleSummary(b, res, res.winner === 1, true);
  showView(_viewBeforeFight); refresh();
  return res.winner;
}

async function battleSummary(b, res, won, pvp = false) {
  const [, l1, l2] = res.losses;
  const s1 = b.sides[1], s2 = b.sides[2];
  const head = pvp ? `Sieger: ${esc(res.winner === 1 ? s1.name : s2.name)}` : (won ? 'Sieg!' : 'Niederlage!');
  const lines = [`<b>${esc(s1.name)}</b>: ${l1} Ausfälle`, `<b>${esc(s2.name)}</b>: ${l2} Ausfälle`];
  if (res.conceded) lines.unshift('<i>Die Verlierer haben aufgegeben.</i>');
  Sfx.play(won || pvp ? 'fanfare' : 'jail');
  await UI.scene({ kicker: 'Kampf beendet', title: head, mood: pvp ? '' : (won ? 'good' : 'bad'), body: lines, actions: [{ label: 'Weiter', value: true, kind: 'primary', key: ['Enter', ' '] }] });
}

/* ============================================================
   Polizei
   ============================================================ */
/** Kampf gegen die Polizei (Original L6984): danach ggf. verhaftet */
async function policeFight(p, arena = 'strasse') {
  const n = 5 + Math.floor(Math.random() * p.rank / 2);
  const w = p.rank > 5 ? 7 : 5;
  const e = (20 + 2 * (p.rank - 1)) - rnd(21);
  const won = await fight({ name: 'Polizisten', count: n, weapon: w, energy: Math.max(1, e), arena, title: 'Die Polizei stellt dich!' });
  if (won) { addScore(p, 2); return true; }
  await caught(p);
  return false;
}

/** „Von der Polizei erwischt“ (Original L69D0) */
async function caught(p) {
  Sfx.play('alarm');
  const art = { key: 'verhaftung', icon: '🚔', hue: 225, label: 'Verhaftet' };
  const autoBribe = p.bribe > 0 && rnd(2) !== 0;
  let P = 0;
  if (autoBribe) {
    P = 500 + 250 * p.rank;
    await UI.say('Von der Polizei erwischt!', [`Dein bestochener Kommissar regelt das diskret – gegen eine Aufwandsentschädigung von <b>${money(P)}</b>.`], { art, mood: 'bad' });
  } else {
    const c = await UI.menu('Von der Polizei erwischt!', ['Was nun?'], ['Polizisten bestechen', 'Fluchtversuch', 'Aufgeben'], { art, mood: 'bad' });
    if (c === 1) {
      P = 500 + 500 * p.rank;
      const ok = await UI.yesno('Bestechung', [`Sie verlangen <b>${money(P)}</b>.`], { art, yes: 'Zahlen', no: 'Lieber nicht' });
      if (!ok) { addScore(p, 2); await trial(p); return; }
    } else if (c === 2) {
      const tr = VEHICLES[p.vehicle].speed;
      if (Math.floor(Math.random() * tr / 11) === 0) {
        addScore(p, -5);
        await UI.say('Zu langsam!', ['Die Polizisten sind schneller als du – du gibst auf.'], { art, mood: 'bad' });
        await trial(p); return;
      }
      addScore(p, 2);
      Sfx.play('ok');
      await UI.say('Geschafft!', ['Das war knapp! Aber du bist entkommen.'], { mood: 'good' });
      return;
    } else { await trial(p); return; }
  }
  if (!canPay(p, P)) { await notEnough(); await trial(p); return; }
  spend(p, P);
  if (rnd(5) === 0) { await UI.say('Bestechung gescheitert', ['Der Beamte nimmt das Geld – und verhaftet dich trotzdem.'], { mood: 'bad' }); await trial(p); return; }
  Sfx.play('ok');
  await UI.say('Laufen gelassen', ['Die Bullen lassen dich gehen!'], { mood: 'good' });
}

/** Prozess und Haft (Original L6B63) */
async function trial(p) {
  p.tip = 0;
  addScore(p, 2);
  p.jail = Math.floor(p.rank / 2 + 0.5);
  const art = { key: 'gericht', icon: '⚖️', hue: 30, label: 'Gericht' };
  let free = false;
  let text = null;
  if (p.rank >= 5) {
    const wantLawyer = await UI.yesno('Der Tag deines Prozesses …', ['Möchtest du dir einen Anwalt nehmen?'], { art });
    if (wantLawyer) {
      const fee = await UI.number('Anwaltshonorar', ['Wie viel bekommt er? Je mehr, desto besser seine Chancen.'], { min: 0, max: p.trainer ? 10000 : Math.min(10000, Math.floor(p.cash)), def: 1000, step: 500, quick: [1000, 3000, 5000, 10000], unit: '$', art });
      if (fee > 0) {
        spend(p, fee);
        const y = Math.floor(Math.random() * (fee / 1000 + 1)) + 1;
        p.jail = Math.max(0, p.jail - y);
        if (p.jail === 0) { free = true; }
        else text = `Dank deines Anwalts musst du nur <b>${p.jail} Monat(e)</b> ins Gefängnis.`;
      }
    }
  } else await UI.say('Der Tag deines Prozesses …', ['Du bist nicht besser dran als ein Anfänger mit Pflichtverteidiger.'], { art });
  if (free) {
    Sfx.play('ok');
    await UI.say('Freispruch!', ['Du wirst für <b>unschuldig</b> befunden.'], { art, mood: 'good' });
    S.ms = 0; return;
  }
  Sfx.play('jail');
  await UI.scene({ art: { key: 'gefaengnis', icon: '⛓️', hue: 220, label: 'Hinter Gittern' }, mood: 'bad', kicker: 'Urteil', title: `${p.jail} Monat(e) Gefängnis`,
    body: [text || `Du wirst ${p.jail} Monat(e) durch einen Zaun atmen.`, 'Deine Punkte sinken um 10 (× Bewertung).'], actions: [{ label: 'Weiter', value: true, kind: 'primary', key: ['Enter', ' '] }] });
  S.ms = 0; p.job = 0;
  addScore(p, -10);
  p.pos = CELL_JAIL_EXIT;
}

/** Straßensperre (Original L369E) */
async function roadblock(p) {
  Sfx.play('alarm');
  const art = { key: 'strassensperre', icon: '🚧', hue: 20, label: 'Straßensperre' };
  await UI.say('Straßensperre!', ['Ausweiskontrolle! Der Beamte möchte deine Papiere sehen.'], { art, mood: 'bad' });
  const say = (t, mood) => UI.say('Straßensperre', [t], { art, mood });
  if (rnd(3) === 0) { await say('Er hat nichts zu beanstanden.'); return; }
  if (p.items & ITEM_FAKE) { await say('Dein Falschgeld wurde entdeckt!', 'bad'); await caught(p); return; }
  if (p.barrels > 0) { p.barrels = 0; await say('Der Kerl hat deine Alkoholfässer entdeckt! Das war’s …', 'bad'); await caught(p); return; }
  if (p.items & ITEM_DOCS) { await say('Er hat nichts zu beanstanden.'); return; }
  await say('Er hat ein Fahndungsplakat von dir!', 'bad'); await caught(p);
}

/* ============================================================
   Jobs (Original L656B)
   ============================================================ */
async function doJob(p) {
  const JOBS = ['', 'Türsteher', 'Croupier', 'Portier', 'Killer'];
  const art = { key: 'loc-' + (p.job === 2 ? 'spiel' : p.job === 4 ? 'buergermeister' : 'pub'), icon: p.job === 2 ? '🎰' : p.job === 4 ? '🎯' : '🚪', hue: 30, label: JOBS[p.job] };
  const head = `${p.name}: Job als ${JOBS[p.job]}`;
  let ok = false;
  if (p.job === 1 || p.job === 3) {
    await UI.say(head, ['Du wartest, bis dein Boss dir das Zeichen gibt, einen unerwünschten Gast zu entfernen …'], { art });
    if (rnd(2) === 0) { await UI.say(head, ['Heute keine Vorfälle!'], { art }); ok = true; }
    else {
      await UI.say(head, ['Ein Kerl will Ärger machen. Wirf ihn raus!'], { art, mood: 'bad' });
      const r = rnd(3);
      const foe = r === 0 ? ['Fat-Fists-Freddy', 0, 30] : r === 1 ? ['Ape-Faced-Alf', 1, 20] : ['The Slaughter', 3, 20];
      ok = await fight({ name: foe[0], count: 1, weapon: foe[1], energy: foe[2], arena: 'kneipe', title: 'Ärger an der Tür' });
    }
  } else if (p.job === 2) {
    const x = await UI.menu(head, ['Natürlich soll das Kasino, dass du schummelst. Welchen Trick wendest du an?'], ['Versteckter Spiegel', 'Präparierte Karten', 'Roulette-Bremse'], { art });
    if (rnd(6 - x) === 0) {
      await UI.say(head, ['Ein Spieler hat bemerkt, dass du schummelst – und zieht ein Messer!'], { art, mood: 'bad' });
      ok = await fight({ name: 'Spieler', count: 1, weapon: 1, energy: 10, arena: 'kneipe', title: 'Ärger am Spieltisch' });
    } else {
      const P = rnd(100 * x) + 300; earn(p, P); Sfx.play('coin');
      await UI.say(head, [`Du machst deine Sache gut, das Kasino zahlt dir einen Bonus von <b>${money(P)}</b>.`], { art, mood: 'good' }); ok = true;
    }
  } else {
    await UI.say(head, ['Du hast den Mann auf dem Foto gefunden und lockst ihn in eine stille Gasse …'], { art, mood: 'bad' });
    ok = await fight({ name: 'Opfer', count: 1, weapon: 0, energy: 20, arena: 'gasse', title: 'Der Auftrag' });
  }
  if (!ok) {
    addScore(p, -2);
    p.job = 0;
    await UI.say(head, ['Du hast deinen Auftrag <b>nicht erledigt</b>!'], { art, mood: 'bad' });
    return;
  }
  p.jobLeft--;
  if (p.jobLeft !== 0) return;
  earn(p, p.jobPay); Sfx.play('coin');
  await UI.say(head, [`Du hast den Job erledigt und erhältst deinen Lohn: <b>${money(p.jobPay)}</b>!`], { art, mood: 'good' });
  addScore(p, 3 + 3 * (p.job === 2 ? -1 : 0));
  p.job = 0;
}

/* ============================================================
   Bandenkrieg (Original L6D0B)
   ============================================================ */
async function gangWar(p) {
  const art = { key: 'gangkrieg', icon: '⚔️', hue: 0, label: 'Bandenkrieg' };
  if (S.n === 1) { await UI.say('Bandenkrieg', ['Im Einzelspieler-Spiel nicht möglich.'], { art }); return; }
  if (S.month < 4) { await UI.say('Bandenkrieg', ['Vor Mai 1925 nicht möglich!'], { art }); return; }
  Sfx.play('alarm');
  const opts = S.players.slice(1).filter(q => q !== p).map(q => ({
    label: `${esc(q.gang)} <small>(${esc(q.name)})</small>`,
    sub: `${money(q.cash)} · ${q.gangsters.length} Gangster${q.jail > 0 ? ' · im Gefängnis' : ''}`, q,
  }));
  const c = await UI.menu('Bandenkrieg!', ['Wen willst du herausfordern?'], opts, { art, cancel: 'Doch nicht' });
  if (!c) return;
  const us = opts[c - 1].q;
  if (us.jail > 0) { await gangWarJail(p, us); return; }
  const winner = await fightPlayers(us, p, 'strasse', `Bandenkrieg: ${us.gang} gegen ${p.gang}`);
  const A = winner === 1 ? us : p, B = winner === 1 ? p : us;
  const P = Math.floor(Math.random() * effCash(B) / 6) + Math.floor(effCash(B) / 4);
  const lines = [`<b>${esc(A.name)}</b>, du entdeckst <b>${money(P)}</b>, als du deinen Gegner plünderst. Außerdem nimmst du seine Alkoholvorräte mit.`];
  let takeCar = false;
  if (B.vehicle !== 0) takeCar = await UI.yesno('Beute', [...lines, `Willst du auch seinen <b>${VEHICLES[B.vehicle].name}</b> mitnehmen?`], { art });
  else await UI.say('Beute', lines, { art });
  if (takeCar) { A.vehicle = B.vehicle; B.vehicle = 0; }
  earn(A, P); spend(B, P);
  A.items |= (B.items & ITEM_DOCS); B.items &= ~ITEM_DOCS;
  let x = VEHICLES[A.vehicle].cap - A.barrels; if (x > B.barrels) x = B.barrels;
  A.barrels += x; B.barrels -= x;
  const savedSP = S.sp;
  addScore(A, 3); addScore(B, -1);
  S.ms -= 10;
  Log.add(`⚔️ ${esc(A.name)} schlägt ${esc(B.name)} im Bandenkrieg und erbeutet ${money(P)}`, 'good');
  refresh();
}

/** Gegner sitzt im Gefängnis: Zellengenosse verprügelt ihn gegen $3000 (Original L6FA0) */
async function gangWarJail(p, us) {
  const art = { key: 'gefaengnis', icon: '⛓️', hue: 220, label: 'Gefängnis' };
  const ok = await UI.yesno(`${esc(us.name)} sitzt im Gefängnis`, [`Sein Zellengenosse bietet dir an, ihn gegen <b>${money(3000)}</b> ordentlich zu verprügeln.`], { art });
  if (!ok) return;
  if (!canPay(p, 3000)) { await notEnough(); return; }
  spend(p, 3000);
  await UI.say('Verteidige dich!', [`<b>${esc(us.name)}</b>, ein Schläger geht auf dich los!`], { art, mood: 'bad' });
  // Nur der Boss des Verhafteten kämpft, ohne Waffe, gegen Mr. Bonebreaker (Kette, Energie 50)
  const bossG = us.gangsters[0];
  const b = new Battle({ arena: 'knast', title: 'Gefängnis: Mr. Bonebreaker',
    sides: [{ name: us.name, human: true, members: [{ ...fighterOfGangster(bossG), weapon: 0 }] }, { name: 'Mr. Bonebreaker', human: false, members: [npcFighter('Mr. Bonebreaker', 3, 50)] }] });
  _viewBeforeFight = currentView(); showView('battle');
  const res = await b.run();
  await battleSummary(b, res, res.winner === 1, true);
  showView(_viewBeforeFight);
  if (res.winner === 2) { bossG.en = 0; await UI.say('Übel zugerichtet', [`<b>${esc(us.name)}</b> wurde ordentlich vermöbelt.`], { art, mood: 'good' }); }
  else {
    const x = rnd(2) + 1;
    us.jail += x;
    await UI.say(`${esc(us.name)}!`, [`Wegen dieser Schlägerei verlängert sich deine Haftstrafe um <b>${x} Monat(e)</b>!`], { art, mood: 'bad' });
  }
  S.ms -= 10; addScore(p, 2); refresh();
}

/* ============================================================
   Beute nach gelungenem Raubzug (Original L5C34)
   ============================================================ */
async function lootPayoff(p, la, ln) {
  let P = rnd(3000) + 4000 + (la === 10 && ln === 1 ? 500 : 0);
  const x = p.tip;
  if ((x === 1 && la === 9) || (x === 2 && la === 10 && ln === 2) || (x === 3 && la === 13)) { p.tip = 0; P += 3000; }
  earn(p, P); Sfx.play('coin');
  await UI.say('Erfolg!', [`Dein Fang beläuft sich auf <b>${money(P)}</b>!`], { mood: 'good', art: { key: la === 9 ? 'loc-zug' : la === 13 ? 'loc-transport' : 'loc-bank', icon: '💰', hue: 48 } });
  addScore(p, 4);
}

/** Überfall auf den Geldtransporter (Original L63B8) */
async function raidTransport(p) {
  const art = { key: 'loc-transport', icon: '🚚', hue: 210, label: 'Geldtransporter' };
  if (p.gangsters.length < 3) { p.tip = 0; await UI.say('Überfall auf den Geldtransporter', ['Zu wenige Gangster im Team!'], { art, mood: 'bad' }); return; }
  await UI.say('Überfall auf den Geldtransporter', ['Leider wird der Transporter von einer <b>Polizeikolonne</b> eskortiert!'], { art, mood: 'bad' });
  const won = await fight({ name: 'Eskorte', count: 10, weapon: 7, energy: 50, arena: 'transport', title: 'Der Geldtransporter' });
  if (!won) { await caught(p); return; }
  addScore(p, 4);
  p.raid = true;
  await lootPayoff(p, 13, 1);
}

/** Der Bürgermeister (Original L648D) */
async function raidMayor(p) {
  const art = { key: 'loc-buergermeister', icon: '🎩', hue: 0, label: 'Der Bürgermeister' };
  await UI.say('Der Bürgermeister', ['Der Bürgermeister hat Leibwächter …'], { art, mood: 'bad' });
  if (!await fight({ name: 'Leibwächter', count: 5, weapon: 7, energy: 20, arena: 'strasse', title: 'Die Leibwächter' })) { await caught(p); return; }
  if (!await fight({ name: 'Der Bürgermeister', count: 1, weapon: 1, energy: 30, arena: 'strasse', title: 'Der Bürgermeister' })) { await caught(p); return; }
  Sfx.play('fanfare');
  await UI.say('Mord!', ['Als Belohnung für deine üble Tat bekommst du <b>$7000</b> und einen brandneuen Ausweis!'], { art, mood: 'good' });
  earn(p, 7000); p.items |= ITEM_DOCS; p.tip = 0; p.mayor = true;
  refresh();
}
