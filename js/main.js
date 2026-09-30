/* ============================================================
   Start, Titelbild, Anleitung, Bilder-Manager, Spielmenü, Trainer-Panel
   ============================================================ */

function refreshTitle() {
  $('#btn-continue').classList.toggle('hidden', !hasSave());
  $('#btn-sound').textContent = 'Ton: ' + (Sfx.enabled ? 'an' : 'aus');
  const hs = $('#btn-hudsound'); if (hs) { hs.textContent = Sfx.enabled ? '🔊' : '🔇'; hs.title = Sfx.enabled ? 'Ton ausschalten' : 'Ton einschalten'; }
  Img.resolve('titel').then(url => {
    const bg = $('#title-bg');
    bg.style.backgroundImage = url ? `url("${url}")` : '';
    bg.classList.toggle('has-img', !!url);
  });
}

function toggleSound() {
  Sfx.enabled = !Sfx.enabled;
  try { localStorage.setItem('mafia-neu-sound', Sfx.enabled ? '1' : '0'); } catch (e) { }
  refreshTitle(); if (Sfx.enabled) Sfx.play('ok');
}

/* ---------- Anleitung ---------- */
function showHelp() {
  return UI.scene({
    wide: true, kicker: 'Spielanleitung', title: 'So funktioniert Mafia',
    body: [
      '<p><b>Ziel:</b> Steige vom <i>Anfänger</i> zum <i>König der Unterwelt</i> auf. Du sammelst Punkte (0–100) durch Raubzüge, Geschäfte und Kämpfe – 11,1 Punkte pro Rang. Am Spielende gewinnt, wer die meisten Punkte hat. Wer Rang 10 erreicht, den <b>Geldtransporter</b> überfallen <em>und</em> den <b>Bürgermeister</b> erledigt hat, gewinnt sofort.</p>',
      '<p><b>Ein Monat = ein Zug.</b> Jeder Spieler bekommt pro Monat so viele <b>Bewegungspunkte</b>, wie sein Fahrzeug schnell ist (zu Fuß 25, Auto 35–60). Ein Schritt kostet 1, ein Gebäude 5 – wer ein Gebäude ohne Aktion verlässt, zahlt weitere 5.</p>',
      '<table class="tbl"><tbody>' +
      '<tr><th>Stadtplan</th><td>Ziel anklicken (Laufweg wird berechnet) oder <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / Pfeiltasten. Ein Gebäude betrittst du, indem du hineinläufst. <kbd>Esc</kbd> verlässt den Plan.</td></tr>' +
      '<tr><th>Menüs</th><td>Zifferntasten wählen Einträge, <kbd>Enter</kbd> bestätigt, <kbd>J</kbd>/<kbd>N</kbd> für Ja/Nein, <kbd>Esc</kbd> bricht ab.</td></tr>' +
      '<tr><th>Kampf</th><td>Pro Runde macht jeder Kämpfer <b>eine</b> Aktion: ein Schritt (<kbd>WASD</kbd>/Pfeile), ein Schuss (<kbd>F</kbd>, dann Richtung) oder Warten (<kbd>Leertaste</kbd>). Nahkämpfer treffen nur das Nachbarfeld, Fernwaffen 14 (Schrotflinte/MP 19) Felder weit; Kugeln fliegen durch Kameraden, aber nicht durch Mauern. Ein Klick auf einen Gegner in gerader Linie feuert direkt.</td></tr>' +
      '<tr><th>Bande</th><td>Ab Rang <i>Halunke</i> und mit gemieteter Wohnung kannst du in Kneipen Gangster anheuern (max. 10). Jeder Gangster hat Energie, Kraft, Intelligenz und Brutalität – die Energie füllt sich jeden Monat.</td></tr>' +
      '<tr><th>Gefahren</th><td>Ab Rang <i>Taschendieb</i> gibt es Straßensperren: Mit <b>Ausweis</b> passierst du, mit Schnaps oder Falschgeld im Auto nicht. Wer erwischt wird, kann bestechen, fliehen oder aufgeben – dann folgt der Prozess (Anwalt ab Rang <i>Halunke</i>).</td></tr>' +
      '<tr><th>Trainer</th><td>Nenn dich <b>„Trainer“</b>, dann hast du unendlich Geld, startest als <i>Halunke</i> und bekommst ein Trainer-Panel (🛠 oben rechts) zum schnellen Testen aller Funktionen.</td></tr>' +
      '</tbody></table>',
    ],
    actions: [{ label: 'Verstanden', value: true, kind: 'primary', key: ['Enter', 'Escape', ' '] }],
  });
}

/* ---------- Bilder-Manager (für die ChatGPT-Grafiken) ---------- */
async function showImageManager() {
  const grid = el('div');
  const statusMap = new Map();
  const dz = el('div', { class: 'dropzone' }, 'Bilder hierher ziehen – der Dateiname bestimmt den Platz (z. B. ', el('b', {}, 'loc-pub.png'), ', ', el('b', {}, 'gangster-07.jpg'), ').');
  const handleFiles = async files => {
    let n = 0, miss = [];
    for (const f of files) {
      const key = f.name.replace(/\.[^.]+$/, '').toLowerCase();
      if (IMAGE_SLOTS.find(s => s.key === key)) { await Img.save(key, f); n++; } else miss.push(f.name);
    }
    toast(`${n} Bild${n === 1 ? '' : 'er'} übernommen` + (miss.length ? ` · unbekannt: ${miss.slice(0, 3).join(', ')}` : ''), n ? '' : 'warn');
    render();
  };
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); handleFiles([...e.dataTransfer.files]); });
  const multi = el('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden' });
  multi.addEventListener('change', () => handleFiles([...multi.files]));
  dz.append(' ', el('button', { class: 'btn small', type: 'button', onclick: () => multi.click() }, 'Dateien wählen'), multi);

  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg || 'Kopiert'); } catch (e) { toast('Kopieren nicht möglich – Text bitte manuell markieren.', 'warn'); } };
  const allPrompts = () => IMAGE_STYLE + '\n\n' + IMAGE_SLOTS.map(s => `[${s.key}] (${s.ratio})\n${s.prompt}`).join('\n\n');

  function render() {
    grid.innerHTML = '';
    let group = null, box = null;
    for (const s of IMAGE_SLOTS) {
      if (s.group !== group) { group = s.group; grid.append(el('div', { class: 'group-h' }, group)); box = el('div', { class: 'img-grid' }); grid.append(box); }
      const art = artEl(s.key, { icon: '🖼️', hue: 40, label: s.key });
      const inp = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
      inp.addEventListener('change', async () => { if (inp.files[0]) { await Img.save(s.key, inp.files[0]); render(); } });
      const has = Img.custom.has(s.key);
      box.append(el('div', { class: 'img-slot' + (s.ratio === '1:1' ? ' sq' : '') }, art,
        el('div', { class: 'meta' }, el('b', {}, s.label), el('small', {}, `${s.key} · ${s.ratio}`),
          el('div', { class: 'row' },
            el('button', { class: 'btn', type: 'button', onclick: () => inp.click() }, has ? 'Ersetzen' : 'Bild wählen'), inp,
            el('button', { class: 'btn ghost', type: 'button', onclick: () => copy(`${IMAGE_STYLE}\n\n${s.prompt}\nFormat: ${s.ratio}.`, 'Prompt kopiert') }, 'Prompt'),
            has ? el('button', { class: 'btn ghost', type: 'button', onclick: async () => { await Img.remove(s.key); render(); } }, 'Entfernen') : null))));
    }
  }
  render();
  await UI.scene({
    wide: true, kicker: 'Grafiken', title: 'Bilder verwalten',
    body: [
      '<p>Das Spiel läuft komplett mit Platzhaltern. Sobald du Bilder hast (z. B. aus ChatGPT), erscheinen sie automatisch: entweder hier hochgeladen (bleibt im Browser gespeichert) oder als Datei im Ordner <b>assets/img/</b> (Dateiname = Slot-Name, <b>.png</b>, <b>.jpg</b> oder <b>.webp</b>).</p>',
      el('div', { class: 'tp-row' },
        el('button', { class: 'btn small', type: 'button', onclick: () => copy(IMAGE_STYLE, 'Stil-Hinweis kopiert') }, 'Stil-Hinweis kopieren'),
        el('button', { class: 'btn small', type: 'button', onclick: () => copy(allPrompts(), 'Alle Prompts kopiert') }, 'Alle Prompts kopieren')),
      dz, grid,
    ],
    actions: [{ label: 'Fertig', value: true, kind: 'primary', key: ['Escape'] }],
  });
  refreshTitle();
}

/* ---------- Spielmenü ---------- */
async function gameMenu() {
  if (!S) return;
  for (;;) {
    const c = await UI.menu('Menü', [], [
      { label: 'Spiel speichern', sub: 'Wird zu Beginn jedes Zuges auch automatisch gespeichert.' },
      { label: 'Ton: ' + (Sfx.enabled ? 'an' : 'aus') }, { label: 'Bilder verwalten' }, { label: 'Spielanleitung' }, { label: 'Zum Titelbild (Spiel bleibt gespeichert)' },
    ], { cancel: 'Zurück zum Spiel' });
    if (!c) return;
    if (c === 1) { saveGame(); toast('Gespeichert'); }
    if (c === 2) { toggleSound(); }
    if (c === 3) await showImageManager();
    if (c === 4) await showHelp();
    if (c === 5) { saveGame(); location.reload(); return; }
  }
}

/* ============================================================
   Trainer-Panel
   ============================================================ */
function toggleTrainerPanel() {
  const panel = $('#trainer-panel');
  if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
  buildTrainerPanel(); panel.classList.remove('hidden');
}
function buildTrainerPanel() {
  const panel = $('#trainer-panel'), p = cur();
  if (!p || !p.trainer) { panel.classList.add('hidden'); return; }
  panel.innerHTML = '';
  const sec = (label, ...kids) => el('div', { class: 'tp-sec' }, el('label', {}, label), el('div', { class: 'tp-row' }, ...kids));
  const btn = (t, fn) => el('button', { class: 'btn small', type: 'button', onclick: async () => { await fn(); refresh(); buildTrainerPanel(); } }, t);
  const sel = (opts, id) => { const s = el('select', { id }); opts.forEach(([v, l]) => s.append(el('option', { value: v }, l))); return s; };
  const setRank = r => { r = clamp(r, 1, 10); p.rank = p.newRank = r; p.score = r === 1 ? 0 : Math.min(100, (r - 1) * 11.1 + 0.5); };

  const gSel = sel(GANGSTERS.slice(1).map(g => [g.id, `${String(g.id).padStart(2, '0')} ${g.name}`]), 'tp-g');
  const wSel = sel(WEAPONS.map((w, i) => [i, w.name]), 'tp-w');
  const vSel = sel(VEHICLES.map((v, i) => [i, v.name]), 'tp-v');
  const tSel = sel([[0, 'kein Tipp'], [1, '1 · Postzug'], [2, '2 · Gold in Bank Nr. 2'], [3, '3 · Geldtransporter'], [4, '4 · Waffenschmuggel'], [5, '5 · Bürgermeister']], 'tp-t');
  tSel.value = p.tip;
  const dests = [...CityMap.door.entries()].map(([cell, d]) => [cell, `${BUILDINGS[d.la].name} ${d.ln}`]).sort((a, b) => a[1].localeCompare(b[1], 'de'));
  dests.push([CELL_TRANSPORT, 'Geldtransporter (Feld)'], [CELL_MAYOR, 'Bürgermeister (Feld)']);
  const dSel = sel(dests, 'tp-d');

  const goNear = cell => {
    const r = Math.floor(cell / COLS), c = cell % COLS;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) continue;
      const i = rr * COLS + cc; if (CityMap.street[i] && i !== CELL_TRANSPORT && i !== CELL_MAYOR) { p.pos = i; return; }
    }
  };

  panel.append(
    el('h3', {}, 'Trainer', el('button', { class: 'iconbtn', onclick: () => panel.classList.add('hidden') }, '✕')),
    el('p', { class: 'hint' }, `∞ Geld aktiv · ${p.name}`),
    sec('Rang & Punkte', btn('Rang −', () => setRank(p.rank - 1)), el('b', {}, RANKS[p.rank]), btn('Rang +', () => setRank(p.rank + 1)), btn('+10 Pkt.', () => addScore(p, 10 / S.rating)), btn('−10 Pkt.', () => addScore(p, -10 / S.rating))),
    sec('Zeit & Energie', btn('+50 Bewegungspunkte', () => { S.ms += 50; }), btn('Energie füllen', () => p.gangsters.forEach(g => g.en = maxEnergy(g))), btn('Boss-Werte 99', () => { const b = boss(p); b.pow = b.int = b.brut = 99; })),
    sec('Gangster anheuern', gSel, btn('+', () => {
      if (p.gangsters.length >= 10) return toast('Maximal 10 Gangster', 'warn');
      const g = GANGSTERS[+gSel.value]; p.gangsters.push({ gid: g.id, name: g.name, weapon: g.weapon, en: 5, pow: g.pow, int: g.int, brut: g.brut }); S.recruited[g.id] = true;
      if (!S.flats.slice(1).includes(p.idx)) { const f = S.flats.findIndex((o, i) => i > 0 && o === 0); if (f > 0) { S.flats[f] = p.idx; p.rentMonths += 12; } }
    })),
    sec('Waffe für alle', wSel, btn('Setzen', () => p.gangsters.forEach(g => g.weapon = +wSel.value))),
    sec('Fahrzeug', vSel, btn('Setzen', () => { const v = +vSel.value; S.ms += VEHICLES[v].speed - VEHICLES[p.vehicle].speed; p.vehicle = v; })),
    sec('Alkohol & Papiere', btn('Fässer füllen', () => { p.barrels = VEHICLES[p.vehicle].cap; }), btn('Ausweis ' + (p.items & 1 ? '✔' : '✘'), () => { p.items ^= 1; }), btn('Falschgeld ' + (p.items & 2 ? '✔' : '✘'), () => { p.items ^= 2; })),
    sec('Tipp (Notizbuch)', tSel, btn('Setzen', () => { p.tip = +tSel.value; })),
    sec('Teleport', dSel, btn('Hin', () => goNear(+dSel.value))),
    sec('Ereignisse testen',
      btn('Straßensperre', async () => { panel.classList.add('hidden'); await roadblock(p); }),
      btn('Polizei-Kampf', async () => { panel.classList.add('hidden'); await policeFight(p); }),
      btn('Verhaftet!', async () => { panel.classList.add('hidden'); await caught(p); }),
      btn('Wanted-Plakat', async () => { panel.classList.add('hidden'); await wantedPoster(p); })),
    sec('Gefängnis', btn('Ins Gefängnis (2 Mon.)', () => { p.jail = 2; }), btn('Freilassen', () => { p.jail = 0; })),
    sec('Missionen', btn('Transporter-Raub ✔', () => { p.raid = true; }), btn('Bürgermeister ✔', () => { p.mayor = true; }), btn('Raub/Mord zurücksetzen', () => { p.raid = p.mayor = false; })),
  );
}

/* ============================================================
   Start
   ============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
  try { Sfx.enabled = localStorage.getItem('mafia-neu-sound') !== '0'; } catch (e) { }
  await Img.init();
  MapView.init(); Arena.init(); initMapInput();
  // Legende
  $('#legend').innerHTML = Object.entries(BUILDINGS).filter(([k]) => k <= 12).map(([k, b]) => `<span>${b.icon} ${esc(b.name)}</span>`).join('');
  $('#btn-new').addEventListener('click', () => { Sfx.play('click'); newGame(); });
  $('#btn-continue').addEventListener('click', () => { Sfx.play('click'); loadGame(); });
  $('#btn-help').addEventListener('click', showHelp);
  $('#btn-images').addEventListener('click', showImageManager);
  $('#btn-sound').addEventListener('click', toggleSound);
  $('#btn-menu').addEventListener('click', gameMenu);
  $('#btn-hudsound').addEventListener('click', toggleSound);
  $('#btn-trainer').addEventListener('click', toggleTrainerPanel);
  refreshTitle(); showScreen('title');
  // Debug-Zugriff (z. B. für Tests in der Konsole)
  window.MAFIA = { get S() { return S; }, newPlayer, addScore };
});
