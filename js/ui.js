/* ============================================================
   UI-Grundbausteine: DOM-Helfer, Bilder (ChatGPT-Slots), Sound, Dialoge
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);           // entspricht INT(RND(1)*n)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const money = v => (v === Infinity || v >= 900000000) ? '$ ∞' : '$' + Math.round(v).toLocaleString('de-DE');

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

/* ------------------------------------------------------------
   Bilder-Slots
   Reihenfolge der Auflösung:  eigener Upload (IndexedDB)  >  assets/img/<key>.png|jpg|webp  >  Platzhalter
   ------------------------------------------------------------ */
const IMAGE_STYLE = 'Konsistenter Stil für alle Bilder: Chicago 1925, Prohibitionszeit, cineastische Filmnoir-Illustration, ' +
  'digitale Malerei mit dezenter Körnung, warme Bernstein- und Messingtöne, tiefe Schatten, Art-déco-Akzente, ' +
  'keine Schrift und keine Logos im Bild, keine modernen Gegenstände.';

const IMAGE_SLOTS = [];
(function buildSlots() {
  const add = (key, group, label, prompt, ratio) => IMAGE_SLOTS.push({ key, group, label, prompt, ratio });
  add('titel', 'Allgemein', 'Titelbild', 'Breites Panorama von Chicago bei Nacht im Jahr 1925: regennasse Straße, Art-déco-Hochhäuser, ein schwarzer Packard mit Chromleisten im Vordergrund, Silhouetten von Männern mit Hut und langem Mantel unter einer Straßenlaterne, dramatischer Nebel.', '16:9');
  add('sieg', 'Allgemein', 'Siegerbild', 'Ein Mafia-Boss im Dreiteiler sitzt siegreich auf einem Thron-artigen Ledersessel in einem Penthouse, hinter ihm die nächtliche Skyline von Chicago, Whiskyglas in der Hand, Geldscheine auf dem Tisch, goldenes Licht.', '16:9');
  add('gefaengnis', 'Allgemein', 'Gefängnis', 'Enge Gefängniszelle 1925, ein Mann in gestreifter Häftlingskleidung sitzt auf einer Pritsche, Licht fällt durch ein vergittertes Fenster, dramatische Schatten.', '16:9');
  add('verhaftung', 'Allgemein', 'Verhaftung', 'Chicagoer Polizisten mit Helmen und Trillerpfeifen umringen nachts einen Gangster in einer Gasse, Polizeiwagen mit Blaulicht im Hintergrund, Nebel.', '16:9');
  add('gericht', 'Allgemein', 'Gerichtssaal', 'Gerichtssaal 1925 mit hoher Holzvertäfelung, Richter mit Hammer, Anwalt im Nadelstreifenanzug, Angeklagter, dramatisches Fensterlicht.', '16:9');
  add('strassensperre', 'Allgemein', 'Straßensperre', 'Polizeisperre auf einer nächtlichen Chicagoer Straße 1925, Polizist mit Taschenlampe prüft die Papiere eines Autofahrers, Nebel, Scheinwerferlicht.', '16:9');
  add('fahndung', 'Allgemein', 'Fahndungsplakat (Hintergrund)', 'Leerer vergilbter Papierhintergrund im Stil eines alten Fahndungsplakats von 1925 mit Rissen und Stockflecken, in der Mitte eine freie Fläche für ein Porträt.', '3:4');
  add('gangkrieg', 'Allgemein', 'Bandenkrieg', 'Zwei rivalisierende Gangs stehen sich nachts auf einer Chicagoer Straße gegenüber, Thompson-MPs und Revolver, Nebel, Straßenlaternen, angespannte Stimmung.', '16:9');

  const locs = {
    motel: ['Unterschlupf / Motel', 'Schäbiges Motel und Mietshaus in Chicago 1925 bei Regen, Neonschild ohne Schrift, Feuertreppe, gelbes Fensterlicht, ein dunkler Mann mit Hut lehnt an der Tür.'],
    pub: ['Kneipe', 'Zwielichtige Speakeasy-Kneipe 1925, Rauchschwaden, Barkeeper poliert Gläser, Fässer hinter der Theke, Männer mit Hüten an Tischen, warmes Lampenlicht.'],
    waffen: ['Waffenladen', 'Waffenladen 1925: Revolver, Schrotflinten und Thompson-MPs an der Wand, Glasvitrine mit Messern, der Händler mit Schürze stützt sich auf die Theke.'],
    auto: ['Autohändler', 'Autohaus 1925 mit glänzenden Oldtimern (Talbot, Chevy Roadster, Buick, Auburn) im Schaufenster, Verkäufer im Anzug, warmes Licht.'],
    kredit: ['Kredithai', 'Düsteres Büro eines Kredithais 1925, Schreibtisch mit Geldbündeln und Hauptbuch, zwei muskulöse Schläger im Hintergrund, grüne Bankierslampe.'],
    spiel: ['Spielhölle', 'Illegales Spielkasino 1925 im Hinterzimmer: Pokertisch, Roulette, Rauch, Männer mit Zigarren, Jetons, goldenes schummriges Licht.'],
    laden: ['Gemischtwarenladen', 'Gemischtwarenladen 1925 mit Regalen voller Konserven, Ladentheke mit Registrierkasse, ängstlicher Ladenbesitzer, ein Schatten eines Mannes im Hut an der Tür.'],
    ubahn: ['U-Bahn', 'U-Bahnhof 1925 in Chicago, Gleise, Fliesenwände, wartende Menschen mit Hüten, Zeitungsjunge, einfahrender Zug mit Scheinwerfer.'],
    bahnhof: ['Hauptbahnhof', 'Chicagoer Hauptbahnhof 1925, riesige Halle mit Glasdach, Dampflok, Reisende mit Koffern, Dampfschwaden, Lichtstrahlen.'],
    bank: ['Bank', 'Prunkvolle Bankhalle 1925 mit Marmorsäulen, Messinggittern an den Schaltern, Wachmann, Tresortür im Hintergrund.'],
    polizei: ['Polizeipräsidium', 'Empfangshalle eines Polizeipräsidiums 1925: Schreibtisch des Sergeanten, Fahndungsplakate an der Wand, Zellentür im Hintergrund.'],
    faelscher: ['Billie der Fälscher', 'Versteckte Fälscherwerkstatt 1925: Druckerpresse, Stapel gefälschter Geldscheine und Ausweise, ein schmaler Mann mit Augenschirm arbeitet unter einer Lampe.'],
    transport: ['Geldtransporter-Überfall', 'Gepanzerter Geldtransporter 1925 auf einer Straße, begleitet von Polizeiwagen, Gangster-Hinterhalt, Staub und Mündungsfeuer.'],
    buergermeister: ['Bürgermeister', 'Der Bürgermeister von Chicago 1925 im Zylinder vor dem Rathaus, umringt von Leibwächtern, nachts, Blitzlichter von Pressefotografen.'],
    zug: ['Postzug-Überfall', 'Überfall auf einen Postzug 1925: maskierte Männer auf einem Güterwaggon, Dampflok, Nacht, Funken, Postsäcke.'],
    tresor: ['Tresorknacken', 'Nahaufnahme eines Tresors 1925 mit Drehschloss, ein Mann mit Stethoskop lauscht am Schloss, Lampenlicht, Schweiß.'],
  };
  for (const [k, [label, pr]] of Object.entries(locs)) add('loc-' + k, 'Orte', label, pr, '16:9');

  add('casino-poker', 'Casino', 'Pokertisch', 'Pokertisch in einem illegalen Hinterzimmer-Kasino 1925: grüner Filz, Stapel Jetons, Spielkarten im Fächer, Zigarrenrauch, drei Männer im Anzug mit ernsten Gesichtern, schummriges Lampenlicht.', '16:9');
  add('casino-blackjack', 'Casino', 'Black-Jack-Tisch', 'Black-Jack-Tisch 1925: halbrunder grüner Filztisch, Croupier in Weste und Fliege teilt Karten aus, ein Ass und eine Zehn liegen offen, Jetons, Rauch, warmes Licht.', '16:9');
  add('casino-roulette', 'Casino', 'Roulette-Tisch', 'Roulette-Tisch in einem Kasino 1925: polierter Holzkessel mit Kugel, Tableau mit Jetons, Croupier mit Rechen, elegante Gäste im Hintergrund, goldenes Licht.', '16:9');
  add('casino-kartenruecken', 'Casino', 'Kartenrückseite', 'Rückseite einer Spielkarte im Art-déco-Stil 1925: dunkelrot und Gold, symmetrisches geometrisches Muster mit Rahmen, hochkant, ohne Text.', '2:3');
  add('train-range-bg', 'Training', 'Schießstand (Hintergrund)', 'Innen-Schießstand der Gangsterbande 1925 aus der Sicht des Schützen: Holzbalken, Schiene an der Decke, freie dunkle Wand in der Mitte, Sandsäcke, Hängelampen, Holzbrüstung im Vordergrund. Keine Personen.', '16:9');
  for (let i = 1; i <= 3; i++) add('train-target-' + i, 'Training', 'Zielfigur ' + i + ' (transparent)', 'Schießbuden-Zielfigur: flache, bemalte Holz-Silhouette eines Gangsters in Ganzkörper-Frontalansicht mit Schlapphut, Maschinenpistole quer vor der Brust, roter Zielring auf der Brust. Freigestellt (transparenter Hintergrund). Variante ' + i + '.', '1:2');
  add('train-camp-bg', 'Training', 'Trainingslager (Hintergrund)', 'Straße in Chicago 1925 in der Abenddämmerung, frontal ein dreistöckiges Backsteinhaus mit 3 x 3 gleichmäßig verteilten dunklen Fenstern, Kopfsteinpflaster im Vordergrund frei. Keine Personen.', '16:9');
  for (let i = 1; i <= 3; i++) add('train-enemy-' + i, 'Training', 'Fenster-Gangster ' + i + ' (transparent)', 'Realistisch gemalter Gangster als Halbfigur, lehnt aus einem Fenster und zielt mit einer Maschinenpistole auf den Betrachter. Freigestellt (transparenter Hintergrund). Variante ' + i + '.', '1:1');
  add('train-player-cover', 'Training', 'Spieler in Deckung (transparent)', 'Gangster von hinten, kauert hinter einer Barrikade aus Sandsäcken und Kisten, nur Hut und Schultern sichtbar. Freigestellt (transparenter Hintergrund).', '4:3');
  add('train-player-shoot', 'Training', 'Spieler in Schussposition (transparent)', 'Derselbe Gangster von hinten, hinter derselben Barrikade aufgerichtet, Arm mit Pistole nach vorn ausgestreckt. Freigestellt (transparenter Hintergrund), Barrikade wie im Deckungsbild.', '4:3');

  const vehicles = ['Zu Fuß (Stiefel/Straße)', 'Talbot 90 (1920er-Limousine)', 'Chevy Roadster', 'Buick Century', 'Auburn Modell 120', 'Citroën T.A.'];
  vehicles.forEach((v, i) => add('fahrzeug-' + i, 'Fahrzeuge', v, i === 0 ? 'Ein Paar abgetragene Lederschuhe auf nassem Kopfsteinpflaster, Chicago 1925, dramatisches Licht.' : `${v} von der Seite, freigestellt vor dunklem neutralem Hintergrund, Stil eines Werbeplakats von 1925.`, '4:3'));
  add('map-player', 'Stadtplan', 'Spielfigur (Kartensymbol)', 'Spielfigur für die Kartenansicht: ein Gangster im dunklen Anzug mit Fedora-Hut und Tommy Gun, von direkt oben gesehen (Vogelperspektive), einfache klare Silhouette, Stil Chicago 1925. Freigestellt (transparenter Hintergrund), kein Text.', '1:1');
  vehicles.slice(1).forEach((v, i) => add('map-car-' + (i + 1), 'Stadtplan', v + ' (Kartensymbol)', `${v} als Kartensymbol, von direkt oben gesehen (Vogelperspektive), klar erkennbare Silhouette, Stil Chicago 1925. Freigestellt (transparenter Hintergrund), kein Text.`, '1:1'));

  const weapons = ['Fäuste', 'Messer', 'Knüppel', 'Kette', 'Wurfstern', 'Revolver', 'Schrotflinte', 'Maschinenpistole (Tommy Gun)', 'Handgranaten'];
  weapons.forEach((w, i) => add('waffe-' + i, 'Waffen', w, `Stillleben: ${w} auf dunklem Holz, Filmnoir-Beleuchtung, freigestellt, Stil 1925.`, '1:1'));

  GANGSTERS.forEach(g => {
    if (!g) return;
    const id = String(g.id).padStart(2, '0');
    add('gangster-' + id, 'Gangster', g.name, `Porträt im Filmnoir-Stil, Halbfigur, Chicago 1925: ${g.name}. ${g.desc} Kleidung der 1920er, Hut oder Frisur der Zeit, dunkler Hintergrund.`, '1:1');
  });
  for (let i = 1; i <= 4; i++) add('boss-' + i, 'Bosse', 'Boss-Porträt ' + i, `Porträt eines Mafia-Bosses im Filmnoir-Stil, Chicago 1925, Anzug mit Weste, Hut, selbstsicherer Blick, Typ ${i} (jeweils klar unterscheidbar).`, '1:1');
})();

const Img = {
  db: null,
  custom: new Map(),   // key -> objectURL (Uploads)
  cache: new Map(),    // key -> url | null
  async init() {
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open('mafia-neu', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('img');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      const keys = await this._req(this.db.transaction('img').objectStore('img').getAllKeys());
      for (const k of keys) {
        const blob = await this._req(this.db.transaction('img').objectStore('img').get(k));
        if (blob) this.custom.set(k, URL.createObjectURL(blob));
      }
    } catch (e) { this.db = null; }
  },
  _req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async save(key, file) {
    if (this.db) { try { await this._req(this.db.transaction('img', 'readwrite').objectStore('img').put(file, key)); } catch (e) { } }
    const old = this.custom.get(key); if (old) URL.revokeObjectURL(old);
    this.custom.set(key, URL.createObjectURL(file));
    this.cache.delete(key);
    document.dispatchEvent(new CustomEvent('imgchange', { detail: key }));
  },
  async remove(key) {
    if (this.db) { try { await this._req(this.db.transaction('img', 'readwrite').objectStore('img').delete(key)); } catch (e) { } }
    this.custom.delete(key); this.cache.delete(key);
    document.dispatchEvent(new CustomEvent('imgchange', { detail: key }));
  },
  _probe(url) { return new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = url; }); },
  async resolve(key) {
    if (this.custom.has(key)) return this.custom.get(key);
    if (this.cache.has(key)) return this.cache.get(key);
    let found = null;
    for (const ext of ['webp', 'png', 'jpg', 'jpeg']) {
      const u = `assets/img/${key}.${ext}`;
      if (await this._probe(u)) { found = u; break; }
    }
    this.cache.set(key, found);
    return found;
  },
};

/** Platzhalter-Grafik, falls (noch) kein ChatGPT-Bild vorhanden ist. */
function artEl(key, { icon = '🎩', hue = 40, label = '', cls = '', portrait = false } = {}) {
  const box = el('div', { class: 'art ' + cls + (portrait ? ' art-portrait' : ''), 'data-key': key, style: { '--h': hue } });
  const fb = el('div', { class: 'art-fallback' },
    el('div', { class: 'art-icon' }, icon), label ? el('div', { class: 'art-label' }, label) : null);
  box.append(fb);
  const apply = async () => {
    const url = await Img.resolve(key);
    box.querySelector('img')?.remove();
    if (url) { const im = el('img', { src: url, alt: label, loading: 'lazy' }); box.append(im); box.classList.add('has-img'); }
    else box.classList.remove('has-img');
  };
  apply();
  const onChange = e => { if (e.detail === key) apply(); };
  document.addEventListener('imgchange', onChange);
  box._dispose = () => document.removeEventListener('imgchange', onChange);
  return box;
}

/* ------------------------------------------------------------
   Sound (WebAudio, alles synthetisch – keine Dateien nötig)
   ------------------------------------------------------------ */
const Sfx = {
  ctx: null, enabled: true,
  _c() {
    if (!this.enabled) return null;
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur = 0.1, type = 'square', vol = 0.06, slide = 0, delay = 0) {
    const c = this._c(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.2, vol = 0.12, hp = 800, delay = 0) {
    const c = this._c(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + delay);
  },
  play(name) {
    switch (name) {
      case 'click': this.tone(660, 0.05, 'square', 0.03); break;
      case 'step': this.tone(140, 0.04, 'triangle', 0.03); break;
      case 'ok': this.tone(523, 0.09, 'triangle', 0.06); this.tone(784, 0.14, 'triangle', 0.06, 0, 0.09); break;
      case 'error': this.tone(180, 0.22, 'sawtooth', 0.06, -60); break;
      case 'coin': this.tone(988, 0.07, 'square', 0.04); this.tone(1319, 0.16, 'square', 0.04, 0, 0.07); break;
      case 'shot': this.noise(0.18, 0.16, 500); this.tone(180, 0.12, 'sawtooth', 0.06, -120); break;
      case 'gun': this.noise(0.28, 0.2, 300); this.tone(120, 0.2, 'sawtooth', 0.08, -80); break;
      case 'burst': for (let i = 0; i < 5; i++) { this.noise(0.08, 0.14, 500, i * 0.07); } break;
      case 'boom': this.noise(0.6, 0.28, 60); this.tone(70, 0.5, 'sawtooth', 0.12, -40); break;
      case 'swing': this.noise(0.1, 0.08, 1800); break;
      case 'hit': this.tone(220, 0.1, 'sawtooth', 0.07, -90); break;
      case 'miss': this.noise(0.08, 0.05, 2500); break;
      case 'kill': this.tone(300, 0.35, 'sawtooth', 0.07, -240); break;
      case 'reload': this.tone(700, 0.04, 'square', 0.05); this.tone(420, 0.05, 'square', 0.05, 0, 0.12); this.noise(0.05, 0.08, 2500, 0.2); break;
      case 'tick': this.tone(1500, 0.02, 'square', 0.03); break;
      case 'lock': this.tone(880, 0.05, 'square', 0.05); this.tone(1320, 0.12, 'square', 0.05, 0, 0.05); break;
      case 'alarm': for (let i = 0; i < 4; i++) { this.tone(880, 0.12, 'square', 0.05, 0, i * 0.25); this.tone(660, 0.12, 'square', 0.05, 0, i * 0.25 + 0.12); } break;
      case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.07, 0, i * 0.14)); break;
      case 'jail': this.tone(110, 0.5, 'sawtooth', 0.08, -30); this.noise(0.3, 0.2, 200, 0.05); break;
      case 'turn': this.tone(392, 0.12, 'triangle', 0.06); this.tone(523, 0.12, 'triangle', 0.06, 0, 0.12); this.tone(659, 0.2, 'triangle', 0.06, 0, 0.24); break;
    }
  },
  weapon(w) {
    switch (WEAPONS[w] && WEAPONS[w].snd) {
      case 0: this.play('swing'); break; case 1: this.play('swing'); break;
      case 2: this.play('gun'); break; case 3: this.play('boom'); break;
      case 4: this.play('swing'); break; case 10: this.play('burst'); break;
      default: this.play('shot');
    }
  },
};

/* ------------------------------------------------------------
   Toasts & Protokoll
   ------------------------------------------------------------ */
const Log = {
  lines: [],
  add(html, kind = '') {
    this.lines.push({ html, kind });
    if (this.lines.length > 200) this.lines.shift();
    const box = $('#log'); if (!box) return;
    const p = el('div', { class: 'log-line ' + kind, html });
    box.append(p); box.scrollTop = box.scrollHeight;
    while (box.children.length > 80) box.firstChild.remove();
  },
  clear() { this.lines = []; const b = $('#log'); if (b) b.innerHTML = ''; },
};
function toast(text, kind = '') {
  const t = el('div', { class: 'toast ' + kind }, text);
  $('#toast-root').append(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

/* ------------------------------------------------------------
   Dialoge (alles gibt Promises zurück → async/await im Spielablauf)
   ------------------------------------------------------------ */
const UI = {
  _current: null,
  _keyHandler: null,

  _close() {
    const m = $('#modal-root .modal');
    if (m) { $$('.art', m).forEach(a => a._dispose && a._dispose()); m.remove(); }
    if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler, true); this._keyHandler = null; }
  },

  /**
   * Allgemeine Szene.
   * opts: { art:{key,icon,hue,label}, kicker, title, body (html|Node|Array), actions:[{label,value,kind,key}], mood, wide, dismissable }
   * → Promise<value>
   */
  scene(opts) {
    return new Promise(resolve => {
      this._close();
      const root = $('#modal-root');
      const sheet = el('div', { class: 'sheet' + (opts.wide ? ' wide' : '') + (opts.mood ? ' mood-' + opts.mood : '') });
      if (opts.art) sheet.append(artEl(opts.art.key, { icon: opts.art.icon, hue: opts.art.hue, label: opts.art.label, cls: 'hero' }));
      const body = el('div', { class: 'sheet-body' });
      if (opts.kicker) body.append(el('div', { class: 'kicker' }, opts.kicker));
      if (opts.title) body.append(el('h2', {}, opts.title));
      const content = el('div', { class: 'content' });
      for (const b of [].concat(opts.body || [])) {
        if (b == null) continue;
        if (typeof b === 'string') content.append(el('p', { html: b }));
        else content.append(b);
      }
      body.append(content);
      const actions = el('div', { class: 'actions' + (opts.vertical ? ' vertical' : '') });
      const keymap = new Map();
      let finished = false;
      const done = v => { if (finished) return; finished = true; Sfx.play('click'); this._close(); resolve(v); };
      (opts.actions || [{ label: 'Weiter', value: true, kind: 'primary', key: 'Enter' }]).forEach((a, i) => {
        const b = el('button', { class: 'btn ' + (a.kind || ''), type: 'button', onclick: () => done(a.value) },
          a.num ? el('span', { class: 'num' }, a.num) : null, el('span', { class: 'lbl', html: a.label }), a.sub ? el('span', { class: 'sub', html: a.sub }) : null);
        if (a.disabled) b.disabled = true;
        actions.append(b);
        if (!a.disabled) {
          if (a.key) [].concat(a.key).forEach(k => keymap.set(k.toLowerCase(), a.value));
          if (a.num) keymap.set(String(a.num).toLowerCase(), a.value);
        }
      });
      body.append(actions);
      sheet.append(body);
      const modal = el('div', { class: 'modal' }, sheet);
      root.append(modal);
      requestAnimationFrame(() => modal.classList.add('in'));
      const PREV_KEYS = ['arrowup', 'arrowleft', 'w', 'a'], NEXT_KEYS = ['arrowdown', 'arrowright', 's', 'd'];
      const focusables = () => [...actions.querySelectorAll('.btn:not(:disabled)')];
      const moveSel = dir => {
        const list = focusables(); if (!list.length) return;
        const cur = list.indexOf(document.activeElement);
        const next = list[cur < 0 ? (dir > 0 ? 0 : list.length - 1) : (cur + dir + list.length) % list.length];
        next.focus({ preventScroll: true });
      };
      this._keyHandler = e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.key !== 'Enter' && e.key !== 'Escape') return;
        const k = e.key.toLowerCase();
        if (opts.keyHook && opts.keyHook(e)) { return; }
        if (PREV_KEYS.includes(k)) { e.preventDefault(); e.stopPropagation(); moveSel(-1); return; }
        if (NEXT_KEYS.includes(k)) { e.preventDefault(); e.stopPropagation(); moveSel(1); return; }
        if (keymap.has(k)) { e.preventDefault(); e.stopPropagation(); done(keymap.get(k)); }
        else if (k === ' ' && keymap.has('enter')) { e.preventDefault(); e.stopPropagation(); done(keymap.get('enter')); }
      };
      document.addEventListener('keydown', this._keyHandler, true);
      const f = actions.querySelector('.btn.primary') || actions.querySelector('.btn');
      if (f && !opts.noFocus) f.focus({ preventScroll: true });
      if (opts.onMount) opts.onMount(sheet, done);
    });
  },

  /** Nachricht mit „Weiter“ */
  say(title, body, o = {}) {
    return this.scene({ title, body, art: o.art, kicker: o.kicker, mood: o.mood, actions: [{ label: o.button || 'Weiter', value: true, kind: 'primary', key: ['Enter', ' ', 'Escape'] }] });
  },
  /** Ja/Nein */
  async yesno(title, body, o = {}) {
    return this.scene({
      title, body, art: o.art, kicker: o.kicker, mood: o.mood,
      actions: [
        { label: o.no || 'Nein', value: false, key: ['n', 'Escape'] },
        { label: o.yes || 'Ja', value: true, kind: 'primary', key: ['j', 'y', 'Enter'] },
      ],
    });
  },
  /** Auswahlmenü, gibt 1-basierten Index zurück (oder null) */
  menu(title, body, options, o = {}) {
    return this.scene({
      title, body, art: o.art, kicker: o.kicker, mood: o.mood, vertical: true, wide: o.wide,
      actions: options.map((op, i) => ({
        label: typeof op === 'string' ? op : op.label, sub: typeof op === 'object' ? op.sub : undefined, disabled: typeof op === 'object' ? op.disabled : false,
        value: i + 1, num: String(i + 1), kind: (typeof op === 'object' && op.kind) || (o.primaryFirst && i === 0 ? 'primary' : ''),
        key: o.escLast && i === options.length - 1 ? ['Escape'] : undefined,
      })).concat(o.cancel ? [{ label: o.cancel, value: 0, key: ['Escape'], kind: 'ghost' }] : []),
    });
  },
  /** Zahleneingabe: gibt Zahl zurück, 0 bei Abbruch */
  number(title, body, { min = 0, max = 1e9, def = 0, step = 1, quick = [], unit = '', art, mood, confirm = 'OK', cancel = 'Abbrechen' } = {}) {
    let value = clamp(def, min, max);
    const input = el('input', { class: 'num-input', type: 'number', inputmode: 'numeric', min, max, value, step });
    const setV = v => { value = clamp(Math.round(v) || 0, min, max); input.value = value; };
    const row = el('div', { class: 'num-row' },
      el('button', { class: 'btn small', type: 'button', onclick: () => { setV(value - step); Sfx.play('tick'); } }, '−'),
      input,
      el('button', { class: 'btn small', type: 'button', onclick: () => { setV(value + step); Sfx.play('tick'); } }, '+'),
      unit ? el('span', { class: 'unit' }, unit) : null);
    input.addEventListener('input', () => { value = Number(input.value) || 0; });
    const chips = el('div', { class: 'chips' });
    quick.forEach(q => chips.append(el('button', { class: 'chip', type: 'button', onclick: () => { setV(typeof q === 'number' ? q : q.v); Sfx.play('tick'); } }, typeof q === 'number' ? String(q) : q.l)));
    return this.scene({
      title, body: [].concat(body, row, quick.length ? chips : null), art, mood,
      noFocus: true,
      actions: [{ label: cancel, value: 'cancel', key: ['Escape'], kind: 'ghost' }, { label: confirm, value: 'ok', kind: 'primary', key: ['Enter'] }],
      onMount: () => setTimeout(() => { input.focus(); input.select(); }, 30),
    }).then(r => r === 'ok' ? clamp(Math.floor(Number(input.value) || 0), min, max) : 0);
  },
  /** Gangster wählen (1-basiert), 0 = Abbruch. Zeigt Karten für die Bande. */
  pickGangster(player, title, { art, cancel = 'Abbrechen', filter } = {}) {
    const grid = el('div', { class: 'gpick' });
    const keymap = [];
    return this.scene({
      title, art, wide: true, body: [grid],
      actions: [{ label: cancel, value: 0, key: ['Escape'], kind: 'ghost' }],
      keyHook: e => { const n = parseInt(e.key, 10); if (!isNaN(n)) { const idx = n === 0 ? 10 : n; if (idx >= 1 && idx <= player.gangsters.length) { e.preventDefault(); e.stopPropagation(); $$('.gcard', grid)[idx - 1].click(); return true; } } return false; },
      onMount: (sheet, done) => {
        player.gangsters.forEach((g, i) => {
          const c = gangsterCard(g, i + 1, player);
          c.classList.add('pickable'); c.tabIndex = 0;
          c.addEventListener('click', () => done(i + 1));
          c.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(i + 1); });
          grid.append(c);
        });
      },
    });
  },
};

/* Bandenmitglied als Karte */
function maxEnergy(g) { return 2 + Math.floor(g.pow / 4) + Math.floor(g.brut / 4); }
function gangsterCard(g, num, player) {
  const w = WEAPONS[g.weapon];
  const hue = (g.gid ? g.gid * 47 : 210) % 360;
  const portrait = g.gid ? artEl('gangster-' + String(g.gid).padStart(2, '0'), { icon: '🕴️', hue, label: '', portrait: true, cls: 'gport' })
    : artEl('boss-' + (player ? ((player.idx - 1) % 4) + 1 : 1), { icon: '🎩', hue: player ? 40 + player.idx * 70 : 40, label: '', portrait: true, cls: 'gport' });
  const mx = Math.max(1, maxEnergy(g));
  const pct = clamp(g.en / mx, 0, 1) * 100;
  const stat = (l, v, c) => el('div', { class: 'stat' }, el('span', { class: 'sl' }, l), el('span', { class: 'sbar' }, el('i', { style: { width: clamp(v, 0, 100) + '%', background: c } })), el('span', { class: 'sv' }, v));
  return el('div', { class: 'gcard' },
    num ? el('div', { class: 'gnum' }, num) : null, portrait,
    el('div', { class: 'ginfo' },
      el('div', { class: 'gname' }, g.name),
      el('div', { class: 'gweapon' }, w.icon + ' ' + w.name),
      el('div', { class: 'ebar', title: 'Energie ' + g.en + ' / ' + mx }, el('i', { style: { width: pct + '%' } }), el('b', {}, 'Energie ' + g.en + ' / ' + mx)),
      stat('KRF', g.pow, '#d36a4a'), stat('INT', g.int, '#5aa6d3'), stat('BRU', g.brut, '#c9a13a')));
}
