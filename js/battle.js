/* ============================================================
   Kampf – Arena 40 × 13, rundenweise, wie im Original:
   pro Runde macht jeder Kämpfer genau EINE Aktion
   (Schritt · Schuss/Schlag · Warten). Der Verteidiger beginnt.
   ============================================================ */

const A_COLS = 40, A_ROWS = 13;

const ARENA_THEME = {
  strasse:   { floor: ['#3a3a40', '#36363c'], wall: '#1d1d22', obst: '#8a6a44', bg: 'Straße' },
  verkehr:   { floor: ['#3a3a40', '#36363c'], wall: '#1d1d22', obst: '#8a6a44' },
  bank:      { floor: ['#57524a', '#4d4841'], wall: '#231f1a', obst: '#9a7b3c' },
  gasse:     { floor: ['#2a2c33', '#26282e'], wall: '#131418', obst: '#5c4a38' },
  kneipe:    { floor: ['#5a3f28', '#523822'], wall: '#241810', obst: '#8b5a2b' },
  knast:     { floor: ['#4a4a4e', '#444448'], wall: '#1a1a1d', obst: '#6e6e74' },
  transport: { floor: ['#3d3d43', '#38383e'], wall: '#1b1b20', obst: '#7a7f8a' },
  zug:       { floor: ['#4a4438', '#443f34'], wall: '#1d1a15', obst: '#6b5a3a' },
  laden:     { floor: ['#5b4a34', '#54452f'], wall: '#231c12', obst: '#8f6b3a' },
};
const SIDE_COLOR = ['', '#d9563f', '#4f9dd9'];

const Arena = {
  cs: 30, canvas: null, ctx: null, visible: false, raf: 0,
  battle: null, hover: -1, mode: 'move', pending: null, fx: [], banner: null,

  init() {
    this.canvas = $('#arena');
    this.canvas.width = A_COLS * this.cs; this.canvas.height = A_ROWS * this.cs;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('mousemove', e => { this.hover = this.cellAt(e); });
    this.canvas.addEventListener('mouseleave', () => { this.hover = -1; });
    this.canvas.addEventListener('click', e => this.onClick(this.cellAt(e)));
    $('#btn-fire').addEventListener('click', () => this.setMode(this.mode === 'fire' ? 'move' : 'fire'));
    $('#btn-pass').addEventListener('click', () => this.answer({ type: 'pass' }));
    $('#btn-quit').addEventListener('click', () => this.answer({ type: 'quit' }));
    $$('#battle-dpad button').forEach(b => b.addEventListener('click', () => this.dirInput(+b.dataset.dr, +b.dataset.dc)));
    document.addEventListener('keydown', e => this.onKey(e));
  },
  cellAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * A_COLS), y = Math.floor((e.clientY - r.top) / r.height * A_ROWS);
    return x < 0 || y < 0 || x >= A_COLS || y >= A_ROWS ? -1 : y * A_COLS + x;
  },
  setMode(m) {
    this.mode = m;
    $('#btn-fire').classList.toggle('active', m === 'fire');
    $('#arena-hint').textContent = m === 'fire' ? 'Feuermodus: Richtung wählen (WASD / Pfeile) oder auf eine Linie klicken.' : 'Schritt: WASD / Pfeile oder Nachbarfeld klicken · Feuer: F · Warten: Leertaste';
  },
  answer(a) { if (this.pending) { const p = this.pending; this.pending = null; this.setMode('move'); p(a); } },
  dirInput(dr, dc) {
    if (!this.pending) return;
    this.answer({ type: this.mode === 'fire' ? 'fire' : 'move', dr, dc });
  },
  onKey(e) {
    if (!this.visible || !this.pending || $('#modal-root .modal')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const map = { w: [-1, 0], arrowup: [-1, 0], s: [1, 0], arrowdown: [1, 0], a: [0, -1], arrowleft: [0, -1], d: [0, 1], arrowright: [0, 1] };
    if (map[k]) { e.preventDefault(); this.dirInput(...map[k]); }
    else if (k === 'f' || k === 'enter') { e.preventDefault(); this.setMode(this.mode === 'fire' ? 'move' : 'fire'); }
    else if (k === ' ') { e.preventDefault(); this.answer({ type: 'pass' }); }
    else if (k === 'q') { e.preventDefault(); this.answer({ type: 'quit' }); }
  },
  onClick(cell) {
    if (cell < 0 || !this.pending || !this.battle) return;
    const f = this.battle.active; if (!f) return;
    const r = Math.floor(cell / A_COLS), c = cell % A_COLS, dr = r - f.r, dc = c - f.c;
    if (dr === 0 && dc === 0) return;
    const inLine = dr === 0 || dc === 0;
    const adjacent = Math.abs(dr) + Math.abs(dc) === 1;
    const enemyThere = this.battle.fighterAt(r, c, f);
    if (this.mode === 'fire') {
      if (Math.abs(dr) >= Math.abs(dc)) this.dirInput(Math.sign(dr), 0); else this.dirInput(0, Math.sign(dc));
      return;
    }
    if (adjacent && !(enemyThere && enemyThere.side !== f.side)) this.dirInput(Math.sign(dr), Math.sign(dc));
    else if (inLine) { this.mode = 'fire'; this.dirInput(Math.sign(dr), Math.sign(dc)); }
  },

  /* ---------- Zeichnen ---------- */
  draw(now) {
    const b = this.battle; if (!b || !this.visible) return;
    const g = this.ctx, cs = this.cs, th = ARENA_THEME[b.arena] || ARENA_THEME.strasse, t = now / 1000;
    for (let r = 0; r < A_ROWS; r++) for (let c = 0; c < A_COLS; c++) {
      const ch = b.grid[r][c], x = c * cs, y = r * cs;
      if (ch === '#') {
        g.fillStyle = th.wall; g.fillRect(x, y, cs, cs);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x + 1, y + 1, cs - 2, cs * 0.35);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + cs * 0.8, cs, cs * 0.2);
      } else {
        g.fillStyle = th.floor[(r + c) % 2]; g.fillRect(x, y, cs, cs);
        if (ch === 'o') {
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 4, y + 6, cs - 6, cs - 6);
          g.fillStyle = th.obst; g.fillRect(x + 3, y + 3, cs - 8, cs - 8);
          g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.strokeRect(x + 3.5, y + 3.5, cs - 9, cs - 9);
          g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + cs - 5, y + cs - 5); g.moveTo(x + cs - 5, y + 3); g.lineTo(x + 3, y + cs - 5); g.stroke();
        }
      }
    }
    // Vorschau der Schusslinie / Bewegungsziele
    const f = b.active;
    if (f && this.pending) {
      if (this.mode === 'fire') {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const cells = b.rayCells(f, dr, dc).cells;
          const hot = this.hover >= 0 && this.hoverDir(f) && this.hoverDir(f)[0] === dr && this.hoverDir(f)[1] === dc;
          g.fillStyle = hot ? 'rgba(255,90,60,.35)' : 'rgba(255,200,90,.10)';
          for (const [r, c] of cells) g.fillRect(c * cs, r * cs, cs, cs);
        }
      } else {
        g.fillStyle = 'rgba(255,220,130,.16)';
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (b.canStep(f, f.r + dr, f.c + dc)) g.fillRect((f.c + dc) * cs, (f.r + dr) * cs, cs, cs);
      }
    }
    // Kämpfer
    for (const u of b.fighters) this.drawUnit(u, u === f, t);
    // Effekte
    this.fx = this.fx.filter(e => now < e.until);
    for (const e of this.fx) e.draw(g, now, cs);
    // Banner
    if (this.banner && now < this.banner.until) {
      g.save(); g.globalAlpha = Math.min(1, (this.banner.until - now) / 250);
      g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = g.measureText(this.banner.text).width + 44;
      g.fillStyle = 'rgba(10,8,6,.82)'; g.fillRect(A_COLS * cs / 2 - w / 2, A_ROWS * cs / 2 - 26, w, 52);
      g.strokeStyle = this.banner.color || '#e3a94f'; g.lineWidth = 2; g.strokeRect(A_COLS * cs / 2 - w / 2 + 3, A_ROWS * cs / 2 - 23, w - 6, 46);
      g.fillStyle = this.banner.color || '#e3a94f'; g.fillText(this.banner.text, A_COLS * cs / 2, A_ROWS * cs / 2 + 1);
      g.restore();
    }
  },
  hoverDir(f) {
    if (this.hover < 0) return null;
    const r = Math.floor(this.hover / A_COLS), c = this.hover % A_COLS, dr = r - f.r, dc = c - f.c;
    if (!dr && !dc) return null;
    return Math.abs(dr) >= Math.abs(dc) ? [Math.sign(dr), 0] : [0, Math.sign(dc)];
  },
  drawUnit(u, active, t) {
    const g = this.ctx, cs = this.cs;
    const x = u.c * cs + cs / 2, y = u.r * cs + cs / 2 + (u.hop ? -Math.abs(Math.sin(t * 8)) * 2 : 0), col = SIDE_COLOR[u.side];
    g.save();
    if (!u.alive) {
      g.globalAlpha = 0.55; g.font = `${cs * 0.7}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('💀', x, y); g.restore(); return;
    }
    if (active) {
      g.strokeStyle = '#ffe28a'; g.lineWidth = 2.5; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
      g.beginPath(); g.arc(x, y, cs * 0.5, 0, 7); g.stroke(); g.globalAlpha = 1;
    }
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 6;
    g.fillStyle = col; g.beginPath(); g.arc(x, y, cs * 0.38, 0, 7); g.fill();
    g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = '#120f0b'; g.stroke();
    g.fillStyle = '#fff'; g.font = `bold ${cs * 0.4}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(u.num), x, y + 1);
    // Energiebalken
    const bw = cs * 0.86, pct = clamp(u.en / Math.max(1, u.maxEn), 0, 1);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - bw / 2, y - cs * 0.62, bw, 4);
    g.fillStyle = pct > 0.5 ? '#6fd08a' : pct > 0.25 ? '#e3b04f' : '#e0645a'; g.fillRect(x - bw / 2, y - cs * 0.62, bw * pct, 4);
    // Waffensymbol
    g.font = `${cs * 0.34}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; g.fillText(WEAPONS[u.weapon].icon, x + cs * 0.3, y + cs * 0.32);
    g.restore();
  },
  loop(now) { if (!this.visible) return; this.draw(now); this.raf = requestAnimationFrame(t => this.loop(t)); },
  setVisible(v) { this.visible = v; cancelAnimationFrame(this.raf); if (v) this.raf = requestAnimationFrame(t => this.loop(t)); },

  /* ---------- Effekte ---------- */
  say(text, color, ms = 900) { this.banner = { text, color, until: performance.now() + ms }; },
  floater(r, c, text, color = '#fff') {
    const t0 = performance.now();
    this.fx.push({ until: t0 + 1100, draw: (g, now, cs) => {
      const k = (now - t0) / 1100;
      g.save(); g.globalAlpha = 1 - k; g.font = 'bold 18px system-ui, sans-serif'; g.textAlign = 'center';
      g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 3; g.strokeText(text, c * cs + cs / 2, r * cs - k * 22 + 4); g.fillStyle = color; g.fillText(text, c * cs + cs / 2, r * cs - k * 22 + 4); g.restore();
    } });
  },
  tracer(cells, from, color = '#ffe9a0', ms = 260) {
    const t0 = performance.now();
    this.fx.push({ until: t0 + ms + 120, draw: (g, now, cs) => {
      const k = Math.min(1, (now - t0) / ms), n = Math.max(1, Math.floor(cells.length * k));
      g.save(); g.strokeStyle = color; g.lineWidth = 3; g.globalAlpha = 1 - Math.max(0, (now - t0 - ms) / 120); g.shadowColor = color; g.shadowBlur = 8;
      g.beginPath(); g.moveTo(from.c * cs + cs / 2, from.r * cs + cs / 2);
      const last = cells[n - 1]; if (last) g.lineTo(last[1] * cs + cs / 2, last[0] * cs + cs / 2); g.stroke(); g.restore();
    } });
  },
  flash(r, c, color = '#ff6a3d') {
    const t0 = performance.now();
    this.fx.push({ until: t0 + 380, draw: (g, now, cs) => {
      const k = (now - t0) / 380;
      g.save(); g.globalAlpha = 1 - k; g.fillStyle = color; g.beginPath(); g.arc(c * cs + cs / 2, r * cs + cs / 2, cs * (0.3 + k * 0.6), 0, 7); g.fill(); g.restore();
    } });
  },
};

/* ------------------------------------------------------------
   Kampflogik
   ------------------------------------------------------------ */
class Battle {
  /**
   * cfg: { arena, title, sides: [ {name, human, members:[{name, weapon, en, pow, brut, ref}]} , {...} ] }
   * Seite 1 beginnt (bei Bandenkrieg der Verteidiger).
   */
  constructor(cfg) {
    this.arena = cfg.arena in ARENAS ? cfg.arena : 'strasse';
    this.grid = ARENAS[this.arena].map(r => [...r]);
    this.cfg = cfg;
    this.fighters = [];
    this.sides = [null, ...cfg.sides.map((s, i) => ({ ...s, list: [], losses: 0, idx: i + 1 }))];
    this.sides.slice(1).forEach(side => side.members.forEach((m, j) => {
      const base = side.idx === 1 ? 129 : 147, cell = base + START_OFFSETS[j % 10];
      let r = Math.floor(cell / 40), c = cell % 40;
      [r, c] = this.nearestFree(r, c);
      const u = { side: side.idx, num: j + 1, name: m.name, weapon: m.weapon, en: m.en, pow: m.pow, brut: m.brut, ref: m.ref || null,
        human: side.human, r, c, alive: true, last: 0, maxEn: m.maxEn || Math.max(m.en, 1), hop: false };
      side.list.push(u); this.fighters.push(u);
    }));
    this.active = null;
  }
  nearestFree(r, c) {
    if (this.free(r, c)) return [r, c];
    for (let d = 1; d < 12; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
      const rr = r + dr, cc = c + dc; if (this.free(rr, cc) && !this.fighterAtPlain(rr, cc)) return [rr, cc];
    }
    return [r, c];
  }
  inb(r, c) { return r >= 0 && c >= 0 && r < A_ROWS && c < A_COLS; }
  free(r, c) { return this.inb(r, c) && this.grid[r][c] === '.'; }
  fighterAtPlain(r, c) { return this.fighters.find(u => u.alive && u.r === r && u.c === c); }
  fighterAt(r, c, self) { return this.fighters.find(u => u.alive && u.r === r && u.c === c && u !== self); }
  canStep(f, r, c) { return this.free(r, c) && !this.fighterAtPlain(r, c); }
  rangeOf(f) { const w = f.weapon; return w === 6 || w === 7 ? 20 : w > 3 ? 15 : 2; }   // Original: 2 (Nahkampf), 15, 20
  /** Zellen entlang der Schusslinie (endet an Mauer, Rand oder Reichweite) – Original: R_44 zählt runter, Abbruch bei R=0 */
  rayCells(f, dr, dc) {
    let r = f.r, c = f.c, R = this.rangeOf(f); const cells = [];
    for (;;) {
      r += dr; c += dc; R -= 1;
      if (!this.inb(r, c) || this.grid[r][c] === '#' || R === 0) break;
      cells.push([r, c]);
      const hit = this.fighters.find(u => u.alive && u.r === r && u.c === c && u.side !== f.side);
      if (hit) return { cells, hit };
    }
    return { cells, hit: null };
  }
  foesOf(f) { return this.fighters.filter(u => u.alive && u.side !== f.side); }

  /** KI (Original L762F): auf Sichtlinie schießen, sonst dem nächsten Gegner näherkommen */
  aiAction(f) {
    const foes = this.foesOf(f); if (!foes.length) return { type: 'pass' };
    foes.sort((a, b) => (Math.abs(a.r - f.r) + Math.abs(a.c - f.c)) - (Math.abs(b.r - f.r) + Math.abs(b.c - f.c)));
    const t = foes[0], dr = t.r - f.r, dc = t.c - f.c;
    const ranged = f.weapon >= 4;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    // 1) freie Schusslinie auf irgendeinen Gegner?
    for (const [a, b] of dirs) { const ray = this.rayCells(f, a, b); if (ray.hit) return { type: 'fire', dr: a, dc: b }; }
    // 2) Fernkämpfer feuern manchmal in die Richtung des Gegners (Original: 50 %)
    if (ranged && rnd(2) === 0 && (dr === 0 || dc === 0)) return { type: 'fire', dr: Math.sign(dr), dc: Math.sign(dc) };
    // 3) Annäherung – nicht sofort wieder zurücklaufen (Original: RI(F))
    const opts = [];
    if (dc !== 0) opts.push([0, Math.sign(dc)]);
    if (dr !== 0) opts.push([Math.sign(dr), 0]);
    if (rnd(2)) opts.reverse();
    for (const [a, b] of opts) if (this.canStep(f, f.r + a, f.c + b) && !(f.last && f.last[0] === -a && f.last[1] === -b)) return { type: 'move', dr: a, dc: b };
    // 4) Ausweichen
    const alt = dirs.filter(([a, b]) => this.canStep(f, f.r + a, f.c + b) && !(f.last && f.last[0] === -a && f.last[1] === -b));
    if (alt.length) { const [a, b] = alt[rnd(alt.length)]; return { type: 'move', dr: a, dc: b }; }
    return { type: 'pass' };
  }

  async run() {
    const A = Arena;
    A.battle = this;
    this.setup();
    let S = 1, F = 0;
    let winner = 0, conceded = false;
    await sleep(500);
    for (;;) {
      F++;
      const other = S === 1 ? 2 : 1;
      if (this.sides[other].list.every(u => !u.alive)) { winner = S; break; }
      if (F > this.sides[S].list.length) { S = other; F = 1; }
      const f = this.sides[S].list[F - 1];
      if (!f.alive) continue;
      this.active = f; this.updateBar(f);
      let act;
      if (this.sides[S].human) {
        Sfx.play('tick');
        act = await new Promise(res => { A.pending = res; });
      } else { await sleep(380); act = this.aiAction(f); }
      if (act.type === 'quit') { winner = other; conceded = true; break; }
      await this.perform(f, act);
      this.active = null;
    }
    this.active = null;
    A.pending = null;
    await sleep(350);
    return { winner, losses: [0, this.sides[1].losses, this.sides[2].losses], conceded };
  }

  setup() {
    $('#arena-title').textContent = this.cfg.title || 'Kampf';
    $('#arena-sub').textContent = 'Schauplatz: ' + (ARENA_LABEL[this.arena] || '');
    const s = $('#arena-sides'); s.innerHTML = '';
    this.sides.slice(1).forEach(sd => s.append(el('span', { class: 'sidechip', style: { '--c': SIDE_COLOR[sd.idx] } }, sd.name + ' ×' + sd.list.length)));
    Arena.setMode('move'); Arena.fx = []; Arena.banner = null;
    $('#arena-info').textContent = '';
  }
  updateBar(f) {
    const w = WEAPONS[f.weapon];
    $('#arena-info').innerHTML = `<b style="color:${SIDE_COLOR[f.side]}">${esc(this.sides[f.side].name)}</b> · Nr. ${f.num} <b>${esc(f.name)}</b> · ${w.icon} ${w.name} · Energie ${f.en}/${f.maxEn} · Reichweite ${this.rangeOf(f) - 1}`;
    const human = this.sides[f.side].human;
    $('#battle-controls').classList.toggle('disabled', !human);
    $('#btn-quit').style.visibility = human ? 'visible' : 'hidden';
  }

  async perform(f, act) {
    const A = Arena;
    if (act.type === 'pass') { A.floater(f.r, f.c, 'wartet', '#bbb'); await sleep(this.sides[f.side].human ? 120 : 220); return; }
    if (act.type === 'move') {
      const r = f.r + act.dr, c = f.c + act.dc;
      if (!this.canStep(f, r, c)) { Sfx.play('error'); A.floater(f.r, f.c, 'blockiert', '#e0645a'); await sleep(200); return; }
      f.r = r; f.c = c; f.last = [act.dr, act.dc]; Sfx.play('step'); await sleep(this.sides[f.side].human ? 90 : 170); return;
    }
    // Feuer
    const w = WEAPONS[f.weapon];
    Sfx.weapon(f.weapon);
    const ray = this.rayCells(f, act.dr, act.dc);
    const melee = this.rangeOf(f) === 2;
    if (ray.cells.length) A.tracer(melee ? ray.cells.slice(0, 1) : ray.cells, f, f.weapon >= 5 ? '#ffe9a0' : '#e8e2d0', melee ? 120 : 240);
    await sleep(melee ? 170 : 300);
    if (!ray.hit) { A.say('Daneben!', '#a99f8c'); Sfx.play('miss'); await sleep(700); return; }
    // Trefferwurf (Original): daneben, wenn INT(RND*TS)=0 oder INT(RND*(KR/10+1))=0
    const pow = f.human ? f.pow : 30, brut = f.human ? f.brut : 30;
    if (rnd(w.prec) === 0 || rnd(Math.floor(pow / 10 + 1)) === 0) { A.say('Daneben!', '#a99f8c'); Sfx.play('miss'); await sleep(700); return; }
    const dmg = Math.floor(Math.random() * w.dmg + brut / 10) + 1;
    const t = ray.hit;
    t.en = Math.max(0, t.en - dmg);
    if (t.ref) t.ref.en = t.en;
    A.flash(t.r, t.c); Sfx.play('hit');
    A.floater(t.r, t.c, '−' + dmg, '#ff8a70');
    if (t.en <= 0) {
      t.alive = false; this.sides[t.side].losses++; Sfx.play('kill');
      A.say(this.sides[t.side].human ? `${t.name} ist erledigt!` : 'Treffer – der Gegner ist erledigt!', '#e0645a', 1300);
      Log.add(`💥 ${esc(f.name)} erledigt ${esc(t.name)}`, 'bad');
      await sleep(1100);
    } else {
      A.say(`Treffer! Energie −${dmg}`, '#e3b04f', 900);
      await sleep(850);
    }
  }
}

/** Baut einen Kämpfer aus einem Bandenmitglied (Referenz für Energie-Übernahme) */
function fighterOfGangster(g) { return { name: g.name, weapon: g.weapon, en: g.en, pow: g.pow, brut: g.brut, ref: g, maxEn: Math.max(maxEnergy(g), g.en) }; }
function npcFighter(name, weapon, en) { return { name, weapon, en, pow: 30, brut: 30, maxEn: Math.max(en, 1) }; }
