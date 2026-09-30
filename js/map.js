/* ============================================================
   Stadtplan (Original: 40 × 25 Zeichen, 41 Eingänge, 2 Sonderfelder)
   ============================================================ */

const COLS = 40, ROWS = 25;
const VIEW_COLS = 16, VIEW_ROWS = 10;
const cellOf = (r, c) => r * COLS + c;

const CityMap = {
  street: new Array(COLS * ROWS).fill(false),
  tile: new Array(COLS * ROWS).fill('x'),
  door: new Map(),      // Zellindex -> {la, ln}
  init() {
    MAP_ROWS.forEach((row, r) => [...row].forEach((ch, c) => {
      const i = cellOf(r, c);
      this.tile[i] = ch; this.street[i] = ch === '.';
    }));
    MAP_ENTRANCES.forEach(([la, ln, r, c]) => this.door.set(cellOf(r, c), { la, ln }));
  },
  /** ist die Zelle für den Spieler begehbar? (Straße; die Sonderfelder nur, solange dort kein Ziel steht) */
  walkable(i, player) {
    if (i < 0 || i >= COLS * ROWS || !this.street[i]) return false;
    if (i === CELL_TRANSPORT && player && player.tip === 3) return false;
    if (i === CELL_MAYOR && player && player.tip === 5) return false;
    return true;
  },
  /** was passiert, wenn man in Zelle i hineinläuft (keine Straße)? */
  target(i, player) {
    if (i === CELL_TRANSPORT && player.tip === 3) return { la: 13, ln: 1 };
    if (i === CELL_MAYOR && player.tip === 5) return { la: 14, ln: 1 };
    return this.door.get(i) || null;
  },
};
CityMap.init();

const DIRS = { up: -COLS, down: COLS, left: -1, right: 1 };

const MapView = {
  cs: 36,
  base: null, ctx: null, canvas: null,
  player: null, hover: -1, path: [], raf: 0, t0: performance.now(), visible: false,
  hilite: null, camR: 0, camC: 0,

  init() {
    this.canvas = $('#map');
    this.canvas.width = VIEW_COLS * this.cs; this.canvas.height = VIEW_ROWS * this.cs;
    this.ctx = this.canvas.getContext('2d');
    this.buildBase();
    this.canvas.addEventListener('mousemove', e => { this.hover = this.cellAt(e); });
    this.canvas.addEventListener('mouseleave', () => { this.hover = -1; });
    this.canvas.addEventListener('click', e => this.onClick(this.cellAt(e)));
    document.addEventListener('imgchange', () => { });
  },
  /** Kamera-Ausschnitt (oben links, in Zellen), zentriert auf 'pos' und ans Kartenende geklemmt */
  camFor(pos) {
    const r = Math.floor(pos / COLS), c = pos % COLS;
    return {
      camR: Math.max(0, Math.min(ROWS - VIEW_ROWS, r - (VIEW_ROWS >> 1))),
      camC: Math.max(0, Math.min(COLS - VIEW_COLS, c - (VIEW_COLS >> 1))),
    };
  },
  inView(i) {
    const r = Math.floor(i / COLS), c = i % COLS;
    return r >= this.camR && r < this.camR + VIEW_ROWS && c >= this.camC && c < this.camC + VIEW_COLS;
  },
  cellAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * VIEW_COLS), y = Math.floor((e.clientY - r.top) / r.height * VIEW_ROWS);
    return x < 0 || y < 0 || x >= VIEW_COLS || y >= VIEW_ROWS ? -1 : cellOf(y + this.camR, x + this.camC);
  },

  /* ---------- statische Ebene ---------- */
  buildBase() {
    const cs = this.cs;
    const c = document.createElement('canvas'); c.width = COLS * cs; c.height = ROWS * cs;
    const g = c.getContext('2d');
    let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const PAL = { h: ['#241812', '#7b5238'], b: ['#241213', '#8a4540'], d: ['#141519', '#485064'], c: ['#1a1a1d', '#65656d'], x: ['#1c1814', '#6a5e4c'] };
    g.fillStyle = '#100f0e'; g.fillRect(0, 0, c.width, c.height);
    const isSt = (r, col) => r >= 0 && col >= 0 && r < ROWS && col < COLS && CityMap.street[cellOf(r, col)];
    for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
      const i = cellOf(r, col), x = col * cs, y = r * cs, t = CityMap.tile[i];
      if (t === '.') {
        g.fillStyle = (r + col) % 2 ? '#43434b' : '#45454d'; g.fillRect(x, y, cs, cs);
        // Bürgersteig dort, wo Häuser angrenzen
        g.fillStyle = '#78705f';
        const e = Math.max(3, cs * 0.12);
        if (!isSt(r - 1, col)) g.fillRect(x, y, cs, e); if (!isSt(r + 1, col)) g.fillRect(x, y + cs - e, cs, e);
        if (!isSt(r, col - 1)) g.fillRect(x, y, e, cs); if (!isSt(r, col + 1)) g.fillRect(x + cs - e, y, e, cs);
        // Mittelstreifen
        g.fillStyle = 'rgba(232,200,120,.32)';
        const h = isSt(r, col - 1) && isSt(r, col + 1), v = isSt(r - 1, col) && isSt(r + 1, col);
        if (h && !v) g.fillRect(x + cs * 0.22, y + cs * 0.47, cs * 0.56, cs * 0.06);
        if (v && !h) g.fillRect(x + cs * 0.47, y + cs * 0.22, cs * 0.06, cs * 0.56);
      } else if (t === 'p') {
        g.fillStyle = '#1f3a24'; g.fillRect(x, y, cs, cs);
        for (let k = 0; k < 3; k++) {
          g.fillStyle = `rgba(${45 + rand() * 35 | 0},${110 + rand() * 60 | 0},${55 + rand() * 25 | 0},.95)`;
          g.beginPath(); g.arc(x + cs * (0.25 + rand() * 0.5), y + cs * (0.25 + rand() * 0.5), cs * (0.16 + rand() * 0.1), 0, 7); g.fill();
        }
      } else if (t === 'w') {
        g.fillStyle = '#1b3450'; g.fillRect(x, y, cs, cs);
        g.strokeStyle = 'rgba(150,200,245,.3)'; g.lineWidth = 1.5;
        for (let k = 0; k < 2; k++) { g.beginPath(); const yy = y + cs * (0.3 + 0.38 * k); g.moveTo(x + 2, yy); g.quadraticCurveTo(x + cs * 0.3, yy - 4, x + cs * 0.5, yy); g.quadraticCurveTo(x + cs * 0.7, yy + 4, x + cs - 2, yy); g.stroke(); }
      } else {
        const [base, roof] = PAL[t] || PAL.x;
        g.fillStyle = base; g.fillRect(x, y, cs, cs);
        const m = cs * 0.09;
        g.fillStyle = roof; g.fillRect(x + m, y + m, cs - 2 * m, cs - 2 * m);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + m, y + m, cs - 2 * m, cs * 0.12);
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + m, y + cs - m - cs * 0.14, cs - 2 * m, cs * 0.14);
        if (rand() > 0.55) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + cs * (0.25 + rand() * 0.25), y + cs * (0.3 + rand() * 0.2), cs * 0.22, cs * 0.2); }
        if (rand() > 0.8) { g.fillStyle = 'rgba(255,214,140,.5)'; g.fillRect(x + cs * (0.2 + rand() * 0.5), y + cs * (0.25 + rand() * 0.4), cs * 0.1, cs * 0.12); }
      }
    }
    this.base = c;
  },

  /* ---------- dynamische Ebene ---------- */
  draw(now) {
    if (!this.visible) return;
    const g = this.ctx, cs = this.cs, t = (now - this.t0) / 1000;
    const P = this.player;
    const { camR, camC } = this.camFor(P ? P.pos : 0);
    this.camR = camR; this.camC = camC;
    g.drawImage(this.base, camC * cs, camR * cs, VIEW_COLS * cs, VIEW_ROWS * cs, 0, 0, VIEW_COLS * cs, VIEW_ROWS * cs);
    // Eingänge
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [i, d] of CityMap.door) { if (this.inView(i)) this.drawBadge(i, BUILDINGS[d.la], this.hilite === d.la); }
    // Sonderziele
    if (P && P.tip === 3 && this.inView(CELL_TRANSPORT)) this.drawBadge(CELL_TRANSPORT, BUILDINGS[13], true, t);
    if (P && P.tip === 5 && this.inView(CELL_MAYOR)) this.drawBadge(CELL_MAYOR, BUILDINGS[14], true, t);
    // Pfadvorschau
    if (this.path.length) {
      g.fillStyle = 'rgba(227,169,79,.35)';
      for (const p of this.path) {
        if (!this.inView(p)) continue;
        const r = Math.floor(p / COLS) - camR, c = (p % COLS) - camC;
        g.beginPath(); g.arc(c * cs + cs / 2, r * cs + cs / 2, cs * 0.14, 0, 7); g.fill();
      }
    }
    // Hover
    if (this.hover >= 0 && this.inView(this.hover)) {
      const r = Math.floor(this.hover / COLS) - camR, c = (this.hover % COLS) - camC;
      const ok = CityMap.walkable(this.hover, P) || (CityMap.target(this.hover, P || {}) != null);
      g.strokeStyle = ok ? 'rgba(227,169,79,.9)' : 'rgba(200,200,200,.25)'; g.lineWidth = 2;
      g.strokeRect(c * cs + 2, r * cs + 2, cs - 4, cs - 4);
    }
    // andere Spieler (blass) und aktueller Spieler
    if (S && S.players) {
      S.players.forEach((q, n) => {
        if (!q || q === P || !this.inView(q.pos)) return;
        this.drawToken(q.pos, q, false, t, n);
      });
    }
    if (P && this.inView(P.pos)) this.drawToken(P.pos, P, true, t, P.idx);
  },
  drawBadge(i, b, glow, t = 0) {
    const g = this.ctx, cs = this.cs, r = Math.floor(i / COLS) - this.camR, c = (i % COLS) - this.camC, cx = c * cs + cs / 2, cy = r * cs + cs / 2;
    const pulse = glow && t ? 1 + Math.sin(t * 5) * 0.08 : 1;
    g.save();
    g.shadowColor = glow ? 'rgba(255,200,90,.9)' : 'rgba(0,0,0,.6)'; g.shadowBlur = glow ? 14 : 5;
    g.fillStyle = b.tint; g.strokeStyle = 'rgba(255,225,160,.85)'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(cx, cy, cs * 0.44 * pulse, 0, 7); g.fill(); g.stroke();
    g.restore();
    g.font = `${cs * 0.5 * pulse}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.fillStyle = '#fff'; g.fillText(b.icon, cx, cy + cs * 0.04);
  },
  drawToken(i, p, active, t, n) {
    const g = this.ctx, cs = this.cs, r = Math.floor(i / COLS) - this.camR, c = (i % COLS) - this.camC, cx = c * cs + cs / 2, cy = r * cs + cs / 2;
    const col = ['', '#e3a94f', '#5fb0e6', '#c86ad8', '#6fd08a'][p.idx] || '#e3a94f';
    g.save();
    if (active) {
      const pr = cs * (0.62 + 0.1 * Math.sin(t * 4));
      g.strokeStyle = col; g.globalAlpha = 0.55; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, pr, 0, 7); g.stroke(); g.globalAlpha = 1;
    } else g.globalAlpha = 0.45;
    g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8;
    g.fillStyle = col; g.beginPath(); g.arc(cx, cy, cs * 0.34, 0, 7); g.fill();
    g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = '#14110c'; g.stroke();
    g.font = `bold ${cs * 0.36}px system-ui, sans-serif`; g.fillStyle = '#14110c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(p.name || '?').trim()[0]?.toUpperCase() || '?', cx, cy + 1);
    g.restore();
  },
  loop(now) {
    if (!this.visible) return;
    this.draw(now);
    this.raf = requestAnimationFrame(t => this.loop(t));
  },
  setVisible(v) {
    this.visible = v;
    cancelAnimationFrame(this.raf);
    if (v) this.raf = requestAnimationFrame(t => this.loop(t));
  },

  /* ---------- Eingabe / Laufen ---------- */
  pending: null,   // {resolve}
  onClick(cell) {
    if (cell < 0 || !this.pending || !this.player) return;
    this.pending.resolve({ click: cell });
  },
  nextInput() {
    return new Promise(res => { this.pending = { resolve: v => { this.pending = null; res(v); } }; });
  },
  /** kürzester Weg (BFS) von 'from' zu einer Zelle, die an 'goal' angrenzt bzw. goal selbst ist */
  findPath(from, goal, player) {
    if (from === goal) return [];
    const isWalk = i => CityMap.walkable(i, player);
    const goalWalk = isWalk(goal);
    const prev = new Map([[from, -1]]);
    const q = [from];
    const nbrs = i => {
      const r = Math.floor(i / COLS), c = i % COLS, out = [];
      if (r > 0) out.push(i - COLS); if (r < ROWS - 1) out.push(i + COLS);
      if (c > 0) out.push(i - 1); if (c < COLS - 1) out.push(i + 1);
      return out;
    };
    let end = -1;
    while (q.length) {
      const cur = q.shift();
      if (goalWalk ? cur === goal : nbrs(cur).includes(goal)) { end = cur; break; }
      for (const n of nbrs(cur)) if (!prev.has(n) && isWalk(n)) { prev.set(n, cur); q.push(n); }
    }
    if (end < 0) return null;
    const path = [];
    for (let x = end; x !== from; x = prev.get(x)) path.unshift(x);
    if (!goalWalk) path.push(goal);
    return path;
  },
};

const KEYDIR = {
  w: -COLS, arrowup: -COLS, s: COLS, arrowdown: COLS, a: -1, arrowleft: -1, d: 1, arrowright: 1,
};
