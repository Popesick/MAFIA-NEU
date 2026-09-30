/* ============================================================
   Die Gebäude der Stadt – jede Funktion entspricht einem Programmteil des Originals.
   Signatur: async (spieler, gewählteOption, gebäudeNr, artInfo)
   ============================================================ */

/* Auswahl per Karten (z. B. Waffen, Autos) */
function pickCards(title, intro, cards, { art, cancel = 'Zurück', wide = true } = {}) {
  const grid = el('div', { class: 'cards' });
  return UI.scene({
    title, body: [].concat(intro || [], grid), art, wide,
    actions: [{ label: cancel, value: 0, key: ['Escape'], kind: 'ghost' }],
    keyHook: e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= cards.length) { const c = $$('.card-pick', grid)[n - 1]; if (c && !c.disabled) { e.preventDefault(); e.stopPropagation(); c.click(); return true; } } return false; },
    onMount: (sheet, done) => {
      cards.forEach((c, i) => {
        const b = el('button', { class: 'card-pick', type: 'button', onclick: () => done(c.value) },
          el('span', { class: 'cp-n' }, i + 1), c.art || null,
          el('span', { class: 'cp-t' }, c.title), el('span', { class: 'cp-p' }, c.price || ''), el('span', { class: 'cp-d', html: c.desc || '' }));
        grid.append(b);
      });
    },
  });
}

/* ============================================================
   1 · Unterschlupf
   ============================================================ */
PLACES[1] = async (p, W, ln, art) => {
  if (W === 3) {
    if (S.flats[ln] !== p.idx) return UI.say('Unterschlupf', ['„Sie wohnen hier gar nicht!“'], { art, mood: 'bad' });
    S.ms -= 5;
    p.gangsters.forEach(g => g.en = maxEnergy(g));
    Sfx.play('ok');
    return UI.say('Ausgeruht', ['Die ganze Bande legt sich ein paar Stunden hin – die Energie aller Gangster ist wieder voll aufgefüllt.'], { art, mood: 'good' });
  }
  if (W === 2) {
    if (S.flats[ln] !== p.idx) return UI.say('Unterschlupf', ['„Sie wohnen hier gar nicht!“'], { art, mood: 'bad' });
  } else if (S.flats[ln] !== 0) return UI.say('Unterschlupf', ['„Nichts frei!“'], { art });
  const rent = ln === 1 ? 150 : (ln === 3 || ln === 4) ? 100 : 50;        // Original: FN22
  const months = await UI.number('Miete', [`„Gut. Die monatliche Miete beträgt <b>${money(rent)}</b>.“`, 'Für wie viele Monate zahlst du?'], { min: 0, max: 99, def: 1, quick: [1, 3, 6, 12], unit: 'Monate', art });
  if (months <= 0) return;
  if (!canPay(p, months * rent)) return notEnough();
  spend(p, months * rent); S.flats[ln] = p.idx; p.rentMonths += months; Sfx.play('coin');
  await UI.say('Unterschlupf', ['„Einen schönen Tag noch, Sir.“'], { art, mood: 'good' });
};

/* ============================================================
   2 · Kneipe
   ============================================================ */
PLACES[2] = async (p, W, ln, art) => {
  if (W === 1) return pubBooze(p, ln, art);
  if (W === 2) return pubRecruit(p, ln, art);
  if (W === 3) return pubTip(p, art);
  if (W === 4) return pubJob(p, art);
};

async function pubBooze(p, ln, art) {
  if (ln === 4 || ln === 5) {                                  // Schwarzbrenner verkauft Fässer
    const avail = rnd(200) + 100, price = rnd(5) + 5;
    const room = VEHICLES[p.vehicle].cap - p.barrels;
    const max = Math.max(0, Math.min(avail, room));
    if (max <= 0) return UI.say('Kneipe', ['Dein Fahrzeug ist bereits voll beladen.'], { art });
    const y = await UI.number('Alkohol kaufen', [`„Ich hab <b>${avail}</b> Fässer für <b>${money(price)}</b> pro Stück.“`, `Dein Fahrzeug nimmt noch ${room} Fässer auf. Wie viele willst du?`], { min: 0, max, def: max, quick: [10, 25, 50, { l: 'Alle', v: max }], unit: 'Fässer', art });
    if (y <= 0) return;
    if (!canPay(p, y * price)) return notEnough();
    p.barrels += y; spend(p, y * price); addScore(p, 2); Sfx.play('coin');
    await UI.say('Alkohol gekauft', [`Du lädst <b>${y}</b> Fässer ein. Gesamtpreis: ${money(y * price)}.`], { art, mood: 'good' });
  } else if (rnd(2) === 0) {                                   // Wirt kauft Fässer
    const price = rnd(20) + 10;
    if (p.barrels <= 0) return UI.say('Kneipe', [`„Nein. Aber vielleicht hast du etwas für mich? Ich zahle ${money(price)} pro Fass!“`, 'Du hast leider keine Fässer dabei.'], { art });
    const y = await UI.number('Alkohol verkaufen', [`„Nein. Aber vielleicht hast du etwas für mich. Ich zahle <b>${money(price)}</b> pro Fass!“`], { min: 0, max: p.barrels, def: p.barrels, quick: [{ l: 'Alle', v: p.barrels }], unit: 'Fässer', art });
    if (y <= 0) return;
    earn(p, y * price); p.barrels -= y; Sfx.play('coin');
    await UI.say('Verkauft', ['„Bring mir mehr! (sabber)“', `Du erhältst ${money(y * price)}.`], { art, mood: 'good' });
  } else await UI.say('Kneipe', ['„Was? Alkohol? Das ist doch illegal!“'], { art });
}

async function pubRecruit(p, ln, art) {
  if (p.rank <= 4) return UI.say('Kneipe', [`Als <b>${RANKS[p.rank]}</b> kannst du noch keine Leute haben! (Ab Rang ${RANKS[5]})`], { art, mood: 'bad' });
  if (!S.flats.slice(1).includes(p.idx)) return UI.say('Kneipe', ['Für deine Gangster brauchst du eine Wohnung!'], { art, mood: 'bad' });
  if (p.gangsters.length === 10) return UI.say('Kneipe', ['Maximal 10 Gangster!'], { art, mood: 'bad' });
  let y = 0; for (let i = 1; i <= 30; i++) if (!S.recruited[i]) y++;
  if (y > 3) y = 3;
  const x = rnd(y + 1);
  if (x === 0 || ln === 3) return UI.say('Kneipe', ['Niemand ist da.'], { art });
  const picked = [];
  for (let i = 0; i < x; i++) {
    let gid;
    do { gid = rnd(30) + 1; } while (S.recruited[gid] || picked.includes(gid));
    picked.push(gid);
    const g = GANGSTERS[gid], price = g.price + 1000;
    const pron = g.lady ? 'Sie' : 'Er';
    const card = gangsterCard({ gid, name: g.name, weapon: g.weapon, en: 5, pow: g.pow, int: g.int, brut: g.brut }, 0, p);
    const ok = await UI.yesno(g.lady ? 'Eine Dame interessiert sich für deine Bande …' : 'Ein Gangster möchte mit dir sprechen.',
      [card, `<p><i>${esc(g.desc)}</i></p>`, `<p>${pron} verlangt <b>${money(price)}</b> im Voraus, wenn ${g.lady ? 'sie' : 'er'} zu dir stoßen soll.</p>`], { art, yes: `Anheuern (${money(price)})`, no: 'Kein Interesse' });
    if (!ok) continue;
    if (!canPay(p, price)) { await notEnough(); continue; }
    if (p.gangsters.length >= 10) { await UI.say('Kneipe', ['Maximal 10 Gangster!'], { art, mood: 'bad' }); return; }
    spend(p, price);
    p.gangsters.push({ gid, name: g.name, weapon: g.weapon, en: 5, pow: g.pow, int: g.int, brut: g.brut });
    S.recruited[gid] = true; Sfx.play('ok'); refresh();
    await UI.say('Neuer Mann in der Bande', [`Jetzt hast du <b>${p.gangsters.length}</b> Gangster.`], { art, mood: 'good' });
  }
}

async function pubTip(p, art) {
  if (p.rank <= 3) return UI.say('Kneipe', ['„Du bist zu unerfahren!“'], { art, mood: 'bad' });
  if (rnd(3) !== 0) return UI.say('Kneipe', ['„Tut mir leid, ich hab nichts für dich.“'], { art });
  const price = 1000 + rnd(3) * 500;
  const ok = await UI.yesno('Insider-Info', [`„Ich hab da Gerüchte gehört … gib mir <b>${money(price)}</b>, und ich sing’ dir was.“`], { art, yes: 'Zahlen', no: 'Nein' });
  if (!ok) return;
  if (!canPay(p, price)) return notEnough();
  spend(p, price);
  p.tip = rnd(5) + 1;
  const TXT = {
    1: ['„Der Postzug soll eine riesige Ladung Diamanten transportieren …“', 'Wenn du den Zug am <b>Hauptbahnhof</b> überfällst, wird es sich lohnen.'],
    2: ['„500 kg Goldbarren sollen in der Bank an der Main Street eingelagert werden …“', '(Die Bank liegt im Osten der Stadt – Bank Nr. 2.)'],
    3: ['„Ein Geldtransporter fährt durch unsere Stadt. Es ist ein blaues Auto. Du wirst es erkennen!“', 'Auf dem Stadtplan erscheint der Transporter.'],
    4: ['„Mit 5000 $ kannst du bei einem großartigen Waffenschmuggel einsteigen!“'],
    5: ['„Pst … ich habe einen äußerst wichtigen Auftrag. Der Bürgermeister muss beseitigt werden.“', 'Aber er hat Leibwächter.'],
  };
  await UI.say('Insider-Info', TXT[p.tip], { art });
  if (p.tip === 4) {
    const join = await UI.yesno('Waffenschmuggel', ['Steigst du für <b>$5000</b> ein?'], { art });
    if (!join) { p.tip = 0; return; }
    if (!canPay(p, 5000)) { p.tip = 0; return notEnough(); }
    spend(p, 5000);
    await UI.say('Waffenschmuggel', ['„Du wirst es nicht bereuen …“'], { art, mood: 'good' });
  }
  Log.add('🕵️ Neuer Tipp im Notizbuch');
}

async function pubJob(p, art) {
  if (p.rank >= 4) return UI.say('Kneipe', [`Als „${RANKS[p.rank]}“ findest du bessere Jobs!`], { art });
  if (rnd(5) === 0) return UI.say('Kneipe', ['Niemand hat einen Job für dich.'], { art });
  const x = rnd(4) + 1;
  const J = {
    1: { t: ['Der Barkeeper am Bahnhof will dich für 3 Monate als Türsteher anheuern.'], left: 3, pay: rnd(1000) + 2000 },
    2: { t: ['Du kannst 2 Monate als Croupier in Georges Kasino arbeiten.'], left: 2, pay: rnd(500) + 1000 },
    3: { t: ['Das Hotel „Le Roi“ sucht für 2 Monate einen Portier.'], left: 2, pay: rnd(500) + 2000 },
    4: { t: ['Du bekommst das Foto eines Mannes, der im „Roten Haus“ wohnt. Dein Auftrag: Du sollst ihn umlegen!'], left: 1, pay: rnd(500) + 2000 },
  }[x];
  const ok = await UI.yesno('Ein Job für dich', [...J.t, `Du wirst mit <b>${money(J.pay)}</b> bezahlt.`], { art, yes: 'Annehmen', no: 'Ablehnen' });
  if (!ok) return;
  p.job = x; p.jobLeft = J.left; p.jobPay = J.pay; S.ms = 0;
  await UI.say('Job angenommen', ['Du hast den Job bekommen! Er beschäftigt dich ab sofort jeden Monat.'], { art, mood: 'good' });
}

/* ============================================================
   3 · Waffenladen
   ============================================================ */
PLACES[3] = async (p, W, ln, art) => W === 1 ? weaponShop(p, ln, art) : weaponTrain(p, ln, art);

async function weaponShop(p, ln, art) {
  for (;;) {
    let A, B, banner = null;
    if (ln === 1) { A = 3; B = 7; if (rnd(3) === 0 && p.rank > 5) { B = 8; banner = '…heiße Ware! Eine Ladung Armee-Handgranaten ist gerade eingetroffen!'; } }
    if (ln === 2) { A = 1; B = 5; }
    if (ln === 3) { A = 1; B = 4; }
    const cards = [];
    for (let i = A; i <= B; i++) {
      const w = WEAPONS[i];
      cards.push({ value: i, art: artEl('waffe-' + i, { icon: w.icon, hue: 0, label: '', cls: 'wart' }), title: w.name, price: money(w.price),
        desc: `Treffsicherheit: <b>${PRECISION_LABEL[Math.floor(w.prec / 2)]}</b><br>Wirkung: <b>${EFFECT_LABEL[Math.floor(w.dmg / 4) + 1]}</b>` });
    }
    const x = await pickCards('Das haben wir da', [banner ? `<p class="hot">${banner}</p>` : '', `Du hast ${money(p.cash)}.`], cards, { art, cancel: 'Nichts kaufen' });
    if (!x) return;
    const w = WEAPONS[x];
    if (!canPay(p, w.price)) { await notEnough(); continue; }
    // Bandenmitglied wählen; Voraussetzungen prüfen (Original: zu dumm / zu schwach / nicht brutal genug)
    let pick;
    for (;;) {
      pick = await pickGangster(p, `Für welchen Gangster? – ${w.name}`, { art, alwaysAsk: true });
      if (!pick) break;
      const g = pick.g;
      if (g.int < 40 && x > 5) { Sfx.play('error'); await UI.say('Zu dumm!', [`${esc(g.name)} kommt mit dieser Waffe nicht klar (Intelligenz unter 40).`], { mood: 'bad' }); continue; }
      if (g.pow < 20 && (x === 2 || x === 3)) { Sfx.play('error'); await UI.say('Zu schwach!', [`${esc(g.name)} kann das nicht heben (Kraft unter 20).`], { mood: 'bad' }); continue; }
      if (g.brut < 40 && (x === 3 || x > 6)) { Sfx.play('error'); await UI.say('Nicht brutal genug!', [`${esc(g.name)} traut sich das nicht (Brutalität unter 40).`], { mood: 'bad' }); continue; }
      break;
    }
    if (!pick) continue;
    const g = pick.g;
    let q = 0;
    if (g.weapon <= 0) { addScore(p, 1); }
    else {
      q = Math.floor(WEAPONS[g.weapon].price / 1.5);
      const ok = await UI.yesno('Inzahlungnahme', [`Der Händler bietet dir <b>${money(q)}</b> für die alte Waffe (${WEAPONS[g.weapon].name}).`], { art });
      if (!ok) continue;
      addScore(p, x > g.weapon ? 1 : -2);
    }
    earn(p, q); spend(p, w.price);
    g.weapon = x; Sfx.play('ok'); refresh();
    return UI.say('Neue Waffe!', [`${esc(g.name)} hat jetzt: <b>${w.icon} ${w.name}</b>.`], { art, mood: 'good' });
  }
}

async function weaponTrain(p, ln, art) {
  const pick = await pickGangster(p, 'Wer braucht Training?', { art, alwaysAsk: true });
  if (!pick) return;
  const g = pick.g;
  let camp = false;
  if (p.rank >= 5) {
    const c = await UI.menu('Training', ['Was soll es sein?'], ['Schießstand', 'Trainingslager'], { art });
    if (!c) return; camp = c === 2;
  }
  const price = camp ? 2500 + 500 * p.rank : 800 + 200 * p.rank;
  const title = camp ? 'Trainingslager' : 'Schießstand';
  const how = await UI.menu(title, [`Das macht <b>${money(price)}</b>.`,
    camp ? 'Alle Werte steigen kräftig (je +8 bis +15).' : 'Kraft +5, Intelligenz +3, Brutalität +2 (je nach Laden mehr).',
    '<b>Selber trainieren</b> ist ein Minispiel: Je besser du bist, desto größer der Erfolg (0–100 %).'],
  [{ label: 'Automatisch trainieren', sub: 'Immer der volle Erfolg' }, { label: 'Selber trainieren', sub: camp ? 'Minispiel: 40 Gangster im Haus' : 'Minispiel: 30 Zielscheiben' }],
  { art, cancel: 'Lieber nicht' });
  if (!how) return;
  if (!canPay(p, price)) return notEnough();

  let f = 1;                                                   // Anteil des maximalen Trainingserfolgs
  if (how === 2) {
    if (!camp) spend(p, price);
    else { await UI.say(title, [`${esc(g.name)} besucht ein Trainingslager …`, `Du sitzt selbst hinter der Deckung – <b>${g.en}</b> Lebenspunkte, genau wie ${esc(g.name)}.`], { art }); spend(p, price); }
    refresh();
    const r = camp ? await Training.camp(g) : await Training.range(g);
    f = r.hits / r.total;
    const pct = Math.round(f * 100);
    await UI.say(title, [`<b>${r.hits} von ${r.total}</b> Zielen getroffen – ${pct} % des möglichen Trainingserfolgs.`], { art, mood: f >= 0.5 ? 'good' : undefined });
  } else {
    if (camp) await UI.say(title, [`${esc(g.name)} besucht ein Trainingslager …`], { art });
    spend(p, price);
  }
  const part = n => Math.round(n * f);
  const before = { pow: g.pow, int: g.int, brut: g.brut };
  if (!camp) {
    g.pow = Math.min(99, g.pow + part(5));
    g.int = Math.min(99, g.int + part(3 + (ln === 1 ? 2 : 0)));
    g.brut = Math.min(99, g.brut + part(2 + (ln === 2 ? 3 : 0)));
    if (f >= 0.5) addScore(p, 1);
  } else {
    const r8 = () => rnd(8) + 8;                                // Original: FN28
    g.int = Math.min(99, g.int + part(r8())); g.brut = Math.min(99, g.brut + part(r8())); g.pow = Math.min(99, g.pow + part(r8()));
    if (f >= 0.5) addScore(p, 2);
  }
  Sfx.play('ok'); refresh();
  const d = [`Kraft +${g.pow - before.pow}`, `Intelligenz +${g.int - before.int}`, `Brutalität +${g.brut - before.brut}`].join(', ');
  if (how === 2) await UI.say(title, [`${esc(g.name)}: ${d}.`], { art, mood: 'good' });
  else await UI.say(title, camp ? ['Da ist er (bzw. sie) wieder – stärker denn je!'] : [`${esc(g.name)} besucht einen Schießstand.`, 'Die Werte sind gestiegen.'], { art, mood: 'good' });
}

/* ============================================================
   4 · Autohändler
   ============================================================ */
PLACES[4] = async (p, W, ln, art) => W === 1 ? carBuy(p, ln, art) : carSteal(p, ln, art);

async function carBuy(p, ln, art) {
  for (;;) {
    const n = ln === 2 ? 4 : 3;
    const cards = [];
    for (let i = 0; i < n; i++) {
      const v = VEHICLES[i + 1];
      cards.push({ value: i + 1, art: artEl('fahrzeug-' + (i + 1), { icon: v.icon, hue: 205, label: '', cls: 'wart' }), title: v.name, price: money(3000 + 1000 * i), desc: `Tempo: <b>${v.speed}</b> Punkte/Monat<br>Ladung: <b>${v.cap}</b> Fässer` });
    }
    const y = await pickCards('Der Händler zeigt dir eine Auswahl', [`Du fährst momentan: ${VEHICLES[p.vehicle].icon} <b>${VEHICLES[p.vehicle].name}</b>.`], cards, { art, cancel: 'Nichts kaufen' });
    if (!y) return;
    const price = 3000 + 1000 * (y - 1);
    if (!canPay(p, price)) { await notEnough(); continue; }
    let q = 0;
    if (p.vehicle > 0) {
      q = p.vehicle === 5 ? 1000 : 1000 + 1000 * p.vehicle;
      const ok = await UI.yesno('Inzahlungnahme', [`Dir werden <b>${money(q)}</b> für deine alte Karre geboten.`], { art });
      if (!ok) continue;
    }
    spend(p, price); earn(p, q);
    S.ms += VEHICLES[y].speed - VEHICLES[p.vehicle].speed;
    p.vehicle = y; Sfx.play('ok'); refresh();
    return UI.say('Neues Auto', ['Der Händler gibt dir die Schlüssel und die Papiere.'], { art, mood: 'good' });
  }
}

async function carSteal(p, ln, art) {
  if (ln !== 4 && rnd(3) !== 0) return UI.say('Autohändler', ['Hier sind zu viele Leute.'], { art });
  const pick = await pickGangster(p, 'Wer soll das Auto knacken?', { art, alwaysAsk: true });
  if (!pick) return;
  const g = pick.g;
  if (Math.floor(Math.random() * (g.int / 40 + g.pow / 30)) === 0) {
    await UI.say('Erwischt!', ['Leider erwischt der Besitzer das Auto dich!'], { art, mood: 'bad' });
    const won = await fight({ name: 'Autobesitzer', count: 1, weapon: 5, energy: 30, arena: 'strasse', title: 'Der Autobesitzer' });
    if (!won) { await caught(p); return; }
    await UI.say('Weg damit', ['Nachdem du den Besitzer erledigt hast, musst du das Auto zurücklassen und abhauen.'], { art, mood: 'bad' });
    return;
  }
  Sfx.play('ok');
  await UI.say('Yeah!', ['Das Auto ist offen! Du startest den Motor und düst davon.', p.vehicle === 0 ? '' : 'Dein altes Fahrzeug musst du zurücklassen.'], { art, mood: 'good' });
  p.vehicle = 5; refresh();
}

/* ============================================================
   5 · Kredithai
   ============================================================ */
PLACES[5] = async (p, W, ln, art) => {
  if (W === 1) {                                                   // Kredit aufnehmen
    if (p.debt > 0) return UI.say('Kredithai', ['Zahl erst mal deine alten Schulden!'], { art, mood: 'bad' });
    const x = await UI.number('Kredit', ['„Wie viel Geld brauchst du?“', 'Rückzahlung innerhalb von 6 Monaten. Maximal 5000 $.'], { min: 0, max: 5000, def: 2000, step: 500, quick: [1000, 2500, 5000], unit: '$', art });
    if (x <= 0) return;
    p.debt += x; earn(p, x); p.debtMonths = 6; Sfx.play('coin');
    return UI.say('Kredit', [`Du bekommst <b>${money(x)}</b>. Die Rückzahlung ist innerhalb von 6 Monaten fällig.`], { art });
  }
  if (W === 2) {                                                   // Schulden zahlen
    if (p.debt <= 0) return UI.say('Kredithai', ['„Du hast gar keine Schulden bei mir.“'], { art });
    const x = await UI.number('Schulden zahlen', [`Deine Schulden: <b>${money(p.debt)}</b>. Wie viel zahlst du zurück?`], { min: 0, max: p.debt, def: p.debt, step: 500, quick: [{ l: 'Alles', v: p.debt }], unit: '$', art });
    if (x <= 0) return;
    if (!canPay(p, x)) return notEnough();
    spend(p, x); p.debt -= x; Sfx.play('coin');
    if (p.debt <= 0) { p.debt = 0; p.debtMonths = 0; return UI.say('Kredithai', ['Du hast deine Schulden bezahlt!'], { art, mood: 'good' }); }
    return UI.say('Kredithai', [`Du hast noch <b>${money(p.debt)}</b> Schulden!`], { art });
  }
  if (W === 3) return creditTrade(p, ln, art);
  if (W === 4) return creditDeposit(p, ln, art);
  if (W === 5) return creditEnforce(p, ln, art);
};

async function creditTrade(p, ln, art) {
  if (p.creditShop === ln) {                                       // verkaufen
    const P = rnd(11) * 100 + 4500;
    const ok = await UI.yesno('Kreditgeschäft verkaufen', [`Dir werden <b>${money(P)}</b> für das Geschäft geboten.`], { art, yes: 'Verkaufen' });
    if (!ok) return;
    earn(p, P); p.creditShop = 0; Sfx.play('coin'); return;
  }
  if (p.creditShop) return UI.say('Kredithai', ['Du besitzt bereits ein Kreditgeschäft!'], { art });
  if (p.debt > 0) return UI.say('Kredithai', ['Zahl erst deine eigenen Schulden!'], { art, mood: 'bad' });
  const owner = S.players.slice(1).find(q => q.creditShop === ln);
  if (owner) return UI.say('Kredithai', [`Das Geschäft gehört <b>${esc(owner.name)}</b>!`], { art });
  const P = rnd(11) * 100 + 5000;
  const ok = await UI.yesno('Kreditgeschäft kaufen', [`Der Besitzer verlangt <b>${money(P)}</b>.`], { art, yes: 'Kaufen' });
  if (!ok) return;
  if (!canPay(p, P)) return notEnough();
  spend(p, P); p.creditShop = ln; Sfx.play('ok');
  await UI.say('Kreditgeschäft', ['Das Geschäft gehört jetzt dir!'], { art, mood: 'good' });
  return creditDeposit(p, ln, art);
}
async function creditDeposit(p, ln, art) {
  if (p.creditShop !== ln) return UI.say('Kredithai', ['Dieses Geschäft gehört dir nicht!'], { art, mood: 'bad' });
  const cap = 5000 - p.creditDeposit;
  const x = await UI.number('Einlage ändern', [`Du hast <b>${money(p.creditDeposit)}</b> im Kreditgeschäft (maximal $5000).`, 'Positive Zahl: einzahlen · Negative Zahl: abheben.'], { min: -p.creditDeposit, max: Math.min(cap, p.trainer ? cap : Math.floor(p.cash)), def: 0, step: 500, quick: [-1000, 1000, 2500, { l: 'Max', v: cap }], unit: '$', art });
  if (!x) return;
  if (!canPay(p, x)) return notEnough();
  spend(p, x); p.creditDeposit += x; Sfx.play('coin');
}
async function creditEnforce(p, ln, art) {
  if (p.creditShop !== ln) return UI.say('Kredithai', ['Dieses Geschäft gehört dir nicht!'], { art, mood: 'bad' });
  if (rnd(3) === 0 || p.creditDeposit === 0) return UI.say('Kredithai', ['Alle Schuldner haben rechtzeitig bezahlt.'], { art });
  await UI.say('Schuldeneintreibung', ['Einer deiner Kunden weigert sich zu zahlen. Er empfängt dich mit einer Waffe, als du das Geld holen willst!'], { art, mood: 'bad' });
  const won = await fight({ name: 'Schuldner', count: 1, weapon: 6, energy: 35, arena: 'kneipe', title: 'Der Schuldner' });
  if (!won) return;
  const P = rnd(1000) + 500; earn(p, P);
  addScore(p, 2); Sfx.play('coin');
  await UI.say('Kassiert', [`Er hatte <b>${money(P)}</b> dabei.`], { art, mood: 'good' });
}

/* ============================================================
   6 · Spielhölle
   ============================================================ */
PLACES[6] = async (p, W, ln, art) => {
  for (; ;) {
    const x = await UI.menu('Spielhölle', ['„Nimm Platz, mein Freund.“', 'Drei Tische, echtes Geld: Poker, Black Jack und Roulette.'], ['Poker', 'Black Jack', 'Roulette'], { art, cancel: 'Lieber nicht' });
    if (!x) return;
    if (!p.trainer && p.cash < 10) return notEnough();
    await [Casino.poker, Casino.blackjack, Casino.roulette][x - 1](p);
  }
};

/* ============================================================
   7 · Gemischtwarenladen
   ============================================================ */
PLACES[7] = async (p, W, ln, art) => {
  if (p.rank <= 1) return UI.say('Laden', ['„Verschwinde hier, du Milchbubi!“'], { art, mood: 'bad' });
  if (p.lastPlace === 20 * 7 + ln) {
    await UI.say('Falle!', ['Die Polizei wartet draußen auf dich!'], { art, mood: 'bad' });
    return void await policeFight(p, 'strasse');
  }
  const police = async () => { await policeFight(p, 'strasse'); };
  let ok = false;
  if (W === 1) {
    const b = p.gangsters[0];
    if (b.brut < 30) { await UI.say('Laden', ['Niemand ist von dir beeindruckt …', 'Der Kerl ruft die Polizei!!!'], { art, mood: 'bad' }); return police(); }
    if (ln === 1 || ln === 7 || ln === 9) ok = true;
    else { await UI.say('Laden', ['Der Kerl ruft die Polizei!!!'], { art, mood: 'bad' }); return police(); }
  } else if (W === 2) {
    if (ln === 1 || ln === 4 || ln === 5) ok = true;
    else return UI.say('Laden', ['„Deine alte Dame ist nicht mein Problem!“'], { art });
  } else if (W === 3) {
    if (ln === 2 || ln === 3 || ln === 8) ok = true;
    else {
      await UI.say('Laden', ['„Scarface Jack wird nicht begeistert sein …“'], { art, mood: 'bad' });
      const won = await fight({ name: 'Jacks Bande', count: p.gangsters.length > 5 ? 5 : 3, weapon: 7, energy: 30, arena: 'laden', title: 'Scarface Jacks Bande' });
      if (!won) return;
      await UI.say('Jack zieht ab', ['Jack verlässt für den Augenblick diesen Sektor …'], { art, mood: 'good' });
      ok = true;
    }
  } else if (W === 4) {
    const b = p.gangsters[0];
    if ((ln === 1 || ln === 3 || ln === 6) && b.int >= 30) ok = true;
    else return UI.say('Laden', ['„Bah, der alte Bullen-Trick zieht bei keinem mehr!“'], { art });
  }
  if (!ok) return;
  addScore(p, 2);
  let P, line;
  if (rnd(3) === 0) {
    P = rnd(100) + 100; line = `„Tut mir leid, mehr als <b>${money(P)}</b> hab ich nicht!“`;
  } else {
    P = rnd(200) + 800 + (ln === 2 ? 300 : 0) + (ln === 7 ? 200 : 0) + (ln === 9 ? 200 : 0) - (W === 2 ? 600 : 0);
    line = ['', `„I-I-Ich z-z-zahle so-so-sofort! H-H-Hier sind <b>${money(P)}</b>!“`, `„Deine arme alte Mutter (schnief)! Gib ihr diese <b>${money(P)}</b>.“`,
      `„Ich habe <b>${money(P)}</b>. Reicht das?“`, `„Verdammt! Wer hat mir bloß <b>${money(P)}</b> Falschgeld angedreht?“`][W];
    if (W === 2) p.lastPlace = 0;
  }
  earn(p, P); Sfx.play('coin');
  const c = await UI.menu('Beute', [line], ['Angebotene Summe nehmen', 'Laden verwüsten', 'Ladenbesitzer verprügeln'], { art, mood: 'good' });
  if (c === 1 || !c) return;
  if (c === 2) {
    if (ln === 2 || ln === 6 || ln === 7 || ln === 8) {
      await UI.say('Verwüstung', ['„Ratten! Dafür bezahlst du!“', '(Er pfeift, und ein paar Rowdys tauchen auf.)'], { art, mood: 'bad' });
      const won = await fight({ name: 'Rowdys', count: 5, weapon: 3, energy: 20, arena: 'laden', title: 'Die Rowdys' });
      if (!won) return;
    }
    const q = rnd(100) + 300; earn(p, q); addScore(p, 1);
    await UI.say('Verwüstet', [`Der Laden ist nur noch eine Ruine, als du gehst – und du bist <b>${money(q)}</b> reicher.`], { art, mood: 'good' });
    return;
  }
  if (ln === 1 || ln === 4) {
    await UI.say('Rache', ['Er verspricht dir einen schönen Grabstein und greift zu seiner ' + WEAPONS[7].name + '!'], { art, mood: 'bad' });
    const won = await fight({ name: 'Ladenbesitzer', count: 1, weapon: 7, energy: 30, arena: 'laden', title: 'Der Ladenbesitzer' });
    if (!won) return;
  }
  const q = rnd(100) + 200; earn(p, q); addScore(p, 1);
  await UI.say('Erledigt', [`Der üble Kerl ist erledigt. Er hatte <b>${money(q)}</b> in der Tasche!`], { art, mood: 'good' });
  addScore(p, 1);
};

/* ============================================================
   8 · U-Bahn  ·  9 · Bahnhof
   ============================================================ */
PLACES[8] = async (p, W, ln, art) => {
  if (W === 2) {
    const ok = await UI.yesno('U-Bahn', ['Eine Fahrkarte für die U-Bahn kostet <b>50 $</b>.'], { art });
    if (!ok) return;
    if (!canPay(p, 50)) return notEnough();
    spend(p, 50);
  }
  return pickpocket(p, W, 8, art);
};

async function pickpocket(p, W, la, art) {
  const pick = await pickGangster(p, 'Wer soll als Dieb arbeiten?', { art, alwaysAsk: true });
  if (!pick) return;
  const g = pick.g;
  addScore(p, 1);
  await UI.say('Du klaust …', ['Du klaust …'], { art });
  if (rnd(15) === 10) { p.safeBonus = 5; Sfx.play('ok'); return UI.say('Fundstück', ['…ein Handbuch mit dem Titel „Tresorknacken leicht gemacht“!?'], { art, mood: 'good' }); }
  if (Math.floor(Math.random() * (g.int / 10)) === 0) {
    Sfx.play('error'); await UI.say('Erwischt!', ['…nichts! Denn du wurdest geschnappt!'], { art, mood: 'bad' });
    return caught(p);
  }
  const idx = rnd(4) + (W === 2 ? 1 : 0) + (la !== 9 ? 1 : 0);
  switch (idx) {
    case 1: earn(p, 50); Sfx.play('coin'); return UI.say('Beute', ['…eine Kamera, die du für <b>50 $</b> verkaufst.'], { art, mood: 'good' });
    case 2: return UI.say('Beute', ['…eine falsche Perlenkette!'], { art });
    case 3: earn(p, 100); Sfx.play('coin'); return UI.say('Beute', ['…eine Armbanduhr im Wert von <b>100 $</b>!'], { art, mood: 'good' });
    case 4: earn(p, 500); Sfx.play('coin'); return UI.say('Beute', ['…eine Brieftasche mit <b>500 $</b>!'], { art, mood: 'good' });
    case 5: earn(p, 800); Sfx.play('coin'); return UI.say('Beute', ['…einen Diamantring, den du für <b>800 $</b> verkaufst!'], { art, mood: 'good' });
    default: return UI.say('Beute', ['…eine wunderschöne Handtasche – nichts wert!'], { art });
  }
}

PLACES[9] = async (p, W, ln, art) => {
  if (W === 1) {                                                    // Bahnhofskneipe = Kneipe Nr. 5
    const b = BUILDINGS[2];
    const art2 = { key: 'loc-pub', icon: b.icon, hue: b.hue, label: 'Bahnhofskneipe' };
    const idx = await UI.menu(b.title, [`<i>${b.greet}</i>`], b.opts, { art: art2, escLast: true, kicker: 'Bahnhofskneipe' });
    if (!idx) return;
    if (idx === b.opts.length) { S.ms -= 5; return; }
    return PLACES[2](p, idx, 5, art2);
  }
  if (W === 2) return pickpocket(p, 1, 9, art);
  if (W === 3) {                                                    // Postzug
    if (p.tip !== 1) return UI.say('Bahnhof', ['Kein Postzug in Sicht!'], { art });
    if (p.gangsters.length < 3) { p.tip = 0; return UI.say('Bahnhof', ['Zu wenige Gangster im Team!'], { art, mood: 'bad' }); }
    const zart = { key: 'loc-zug', icon: '🚂', hue: 30, label: 'Postzug' };
    await UI.say('Postzug-Überfall', ['Ihr betretet den Panzerwagen und wollt gerade eure Taschen füllen, als ihr <b>drei gut gekleidete Herren</b> bemerkt!'], { art: zart, mood: 'bad' });
    const won = await fight({ name: 'Wachen', count: 3, weapon: 7, energy: 30, arena: 'zug', title: 'Der Postzug' });
    if (!won) return caught(p);
    return lootPayoff(p, 9, 1);
  }
};

/* ============================================================
   10 · Bank
   ============================================================ */
PLACES[10] = async (p, W, ln, art) => {
  if (p.rank < 3) return UI.say('Bank', [`Dafür ist mindestens der Rang „${RANKS[3]}“ nötig!`], { art, mood: 'bad' });
  if (p.lastPlace === 20 * 10 + ln) {
    await UI.say('Falle!', ['Die Polizei wartet draußen auf dich!'], { art, mood: 'bad' });
    return void await policeFight(p, 'strasse');
  }
  if (W === 1) {
    if (p.gangsters.length === 1) return UI.say('Bank', ['Du brauchst einen Begleiter!'], { art, mood: 'bad' });
    if (rnd(3) !== 0) {
      await UI.say('Bankraub', ['Du hast <b>drei Wachmänner</b> am Eingang nicht bemerkt …'], { art, mood: 'bad' });
      const won = await fight({ name: 'Wachmänner', count: 3 + (ln === 1 ? 1 : 0), weapon: 6, energy: 30, arena: 'bank', title: 'Die Wachmänner' });
      if (!won) return caught(p);
    }
    return lootPayoff(p, 10, ln);
  }
  return safeCrack(p, ln, art);
};

async function safeCrack(p, ln, art) {
  const b = p.gangsters[0];
  if (!(b.int >= 40 && b.pow >= 15 && b.brut >= 20)) return UI.say('Bank', ['Du brauchst erst etwas Training!', '(Boss: Intelligenz ≥ 40, Kraft ≥ 15, Brutalität ≥ 20)'], { art, mood: 'bad' });
  const pick = await pickGangster(p, 'Wer soll das Ding knacken?', { art, alwaysAsk: true });
  if (!pick) return;
  const g = pick.g;
  await UI.say('Tresor', ['„Hmh. Lass mal sehen. Ich versuch’s mit dem Stethoskop …“', 'Drehe die Räder mit den <b>Tasten 1, 2, 3</b> (oder per Klick). Ein <b>heller Klick</b> verrät dir die richtige Ziffer!'], { art: { key: 'loc-tresor', icon: '🔐', hue: 45, label: 'Tresor' } });
  const RD = [1, 2, 3], CD = [rnd(10), rnd(10), rnd(10)];
  let Y = 20 + Math.floor(g.int / 10) + (ln === 1 ? -3 : 0) + p.safeBonus;
  p.safeBonus = Math.max(0, p.safeBonus - 1);
  const total = Y;
  const dials = [0, 1, 2].map(i => el('button', { class: 'dial', type: 'button' }, el('span', { class: 'dv' }, String(RD[i])), el('small', {}, `Rad ${i + 1} · Taste ${i + 1}`)));
  const meter = el('div', { class: 'meter' }, el('i', {}));
  const status = el('div', { class: 'safe-status' }, 'Du lauschst …');
  let solved = false, turnRef = null;
  await UI.scene({
    title: 'Tresor knacken', art: { key: 'loc-tresor', icon: '🔐', hue: 45, label: 'Tresor' }, mood: 'tense',
    body: [el('div', { class: 'dials' }, ...dials), meter, status],
    actions: [],
    keyHook: e => { if (['1', '2', '3'].includes(e.key) && turnRef) { e.preventDefault(); e.stopPropagation(); turnRef(+e.key - 1); return true; } return false; },
    onMount: (sheet, done) => {
      dials.forEach((d, i) => d.addEventListener('click', () => turn(i)));
      const upd = () => { meter.firstChild.style.width = clamp(Y / total * 100, 0, 100) + '%'; };
      upd();
      turnRef = turn;
      function turn(x) {
        if (solved || Y <= 0) return;
        RD[x] = (RD[x] + 1) % 10; dials[x].firstChild.textContent = RD[x];
        const heard = Math.floor(Math.random() * (g.int / 8)) !== 0 && RD[x] === CD[x];   // Original: INT(RND*(IN/8))=0 → Klick überhört
        if (heard) {
          Sfx.play('lock'); dials[x].classList.add('right'); status.textContent = 'Klick! Das Rad rastet ein …';
          if (RD.every((v, i) => v === CD[i])) { solved = true; upd(); setTimeout(() => done(true), 450); return; }
        } else { Sfx.play('tick'); dials[x].classList.remove('right'); status.textContent = 'Du lauschst …'; }
        Y--; upd();
        if (Y <= 0) { setTimeout(() => done(false), 350); }
      }
    },
  });
  if (!solved) {
    Sfx.play('alarm');
    await UI.say('Alarm!', ['„Verdammt, da ist etwas schiefgelaufen! Jemand kommt!!!“'], { art, mood: 'bad' });
    await policeFight(p, 'bank');
    return;
  }
  Sfx.play('ok');
  await UI.say('Der Tresor ist offen!', ['Das Schloss springt auf …'], { art: { key: 'loc-tresor', icon: '🔓', hue: 45 }, mood: 'good' });
  addScore(p, -1);
  return lootPayoff(p, 10, ln);
}

/* ============================================================
   11 · Polizeipräsidium
   ============================================================ */
PLACES[11] = async (p, W, ln, art) => {
  if (W === 1) { await UI.say('Polizei', ['Du stellst dich freiwillig …'], { art, mood: 'bad' }); return trial(p); }
  if (W === 2) {
    const x = await UI.number('Kommissar bestechen', ['„Ich drücke für <b>$1000</b> pro Monat beide Augen zu … Wie viele Monate?“'], { min: 0, max: 24, def: 3, quick: [1, 3, 6, 12], unit: 'Monate', art });
    if (x <= 0) return;
    const P = x * 1000;
    if (!canPay(p, P)) return UI.say('Polizei', ['„Tut mir leid, das können Sie sich nicht leisten!“'], { art, mood: 'bad' });
    spend(p, P); p.bribe += x + 1; addScore(p, 2); p.pos = CELL_JAIL_EXIT; Sfx.play('coin');
    return UI.say('Abgemacht', ['„Vielen Dank! Verlassen Sie das Haus durch die Hintertür.“'], { art, mood: 'good' });
  }
  if (W === 3) return freePrisoner(p, art);
};

async function freePrisoner(p, art) {
  const G = [];
  S.players.slice(1).forEach(q => { if (q.jail > 0) G.push({ q, name: q.name }); });
  if (rnd(3) === 0 && p.rank > 4) G.push({ q: null, name: 'Irgendjemand' });
  if (!G.length) return UI.say('Polizei', ['Momentan sitzt niemand ein.'], { art });
  const c = await UI.menu('Wen willst du befreien?', ['Die Zellen im Keller …'], G.map(o => o.name), { art, cancel: 'Niemanden' });
  if (!c) return;
  const tgt = G[c - 1];
  const P = 500 * rnd(5) + 3000;
  const ok = await UI.yesno('Wärter bestechen', [`Du brauchst <b>${money(P)}</b> für die Bestechung der Wärter.`], { art });
  if (!ok) return;
  if (!canPay(p, P)) return notEnough();
  spend(p, P);
  await UI.say('Ausbruch', ['Mit deiner Hilfe entkommt der Gefangene!'], { art, mood: 'good' });
  if (!tgt.q) {
    if (p.gangsters.length >= 10) return UI.say('Ausbruch', ['Er dankt dir und verschwindet …'], { art });
    p.gangsters.push({ gid: 0, name: 'Ex-Häftling', weapon: 0, en: 5, pow: 10, int: 5, brut: 40 });
    refresh(); return;
  }
  const X = tgt.q;
  const reward = await UI.number(`${X.name}!`, [`Du wurdest von <b>${esc(p.name)}</b> befreit!`, 'Wie viel zahlst du als Belohnung für deine Freiheit?'], { min: 0, max: X.trainer ? 100000 : Math.floor(X.cash), def: 0, step: 100, quick: [500, 1000, 3000], unit: '$', art });
  spend(X, reward); earn(p, reward);
  X.jail = 0; addScore(p, 2); Sfx.play('ok');
}

/* ============================================================
   12 · Billie der Fälscher
   ============================================================ */
PLACES[12] = async (p, W, ln, art) => {
  if (W === 1) {
    const n = p.gangsters.length, P = 1000 * n;
    const ok = await UI.yesno('Ausweise', [`„Okay, Sonny.“ ${n === 1 ? 'Für einen Ausweis' : 'Für ' + n + ' Ausweise'} sind <b>${money(P)}</b> fällig.`], { art });
    if (!ok) return;
    if (!canPay(p, P)) return notEnough();
    spend(p, P); p.items |= ITEM_DOCS; addScore(p, 1); Sfx.play('ok');
    return UI.say('Ausweise', ['„Hier, frisch aus der Presse, hehe!“'], { art, mood: 'good' });
  }
  const q = await UI.number('Falschgeld', ['„Ngh … widerwillig! Wie viel willst du investieren?“'], { min: 0, max: p.trainer ? 5000 : Math.min(5000, Math.floor(p.cash)), def: 1000, step: 500, quick: [500, 1000, 2500, 5000], unit: '$', art });
  if (q <= 0) return;
  const P = Math.floor(Math.random() * q / 2) + q + 100;
  const ok = await UI.yesno('Falschgeld', [`„Ich geb dir <b>${money(P)}</b> in Blüten.“`], { art });
  if (!ok) return;
  spend(p, q); earn(p, P); p.items |= ITEM_FAKE; addScore(p, 1); Sfx.play('coin');
  return UI.say('Falschgeld', ['Vorsicht bei Straßenkontrollen …'], { art, mood: 'good' });
};
