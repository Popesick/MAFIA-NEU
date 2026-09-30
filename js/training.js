/* ============================================================
   Trainings-Minispiele beim Waffenhändler ("Selber trainieren"):
   - Training.range(g)  Schießstand: 30 Ziele huschen schnell über die Bahn (ab Ziel 10 Kurven, ab Ziel 20 auch von rechts)
   - Training.camp(g)   Trainingslager: 40 Gangster in den Fenstern eines Hauses (wird ab Gegner 20/30 härter)
   Beide liefern { hits, total, ended } zurück; die Belohnung berechnet places.js.
   Bildplätze: train-range-bg, train-target-1..3, train-camp-bg, train-enemy-1..3,
   train-player-cover, train-player-shoot (fehlt ein Bild, gibt es Platzhalter).
   ============================================================ */

const Training = (() => {
  const RANGE_N = 30, CAMP_N = 40;
  const RANGE_HALF = Math.floor(RANGE_N / 2) - 1;
  const MAG = 6;
  const rf = (a, b) => a + Math.random() * (b - a);
  const pickOf = arr => arr[Math.floor(Math.random() * arr.length)];

  /* Fensterraster des Hauses (Mittelpunkt und Größe in % der Bühne) – passend zu train-camp-bg */
  const CAMP_WINDOWS = {
    cols: [37.6, 50.2, 62.9], rows: [15.7, 35.3, 56.3], w: 6, h: 12.5,
  };

  function sprite(key, cls, emoji) {
    const im = el('div', { class: 'tr-spr ' + cls }, el('span', { class: 'tr-emoji' }, emoji));
    Img.resolve(key).then(u => {
      if (!u) return;
      const i = el('img', { src: u, alt: '', draggable: 'false' });
      i.onload = () => { im.classList.add('has'); im.style.setProperty('--ar', i.naturalWidth / i.naturalHeight); };
      im.append(i);
    });
    return im;
  }

  /* ---------- gemeinsamer Rahmen: Bühne, Fadenkreuz, HUD, Ende ---------- */
  async function arena(cfg, build) {
    const stage = el('div', { class: 'tr-stage ' + cfg.cls });
    const bg = el('div', { class: 'tr-bg' });
    const layer = el('div', { class: 'tr-layer' });
    const flash = el('div', { class: 'tr-flash' });
    const cross = el('div', { class: 'tr-cross' }, el('i'), el('b'));
    const banner = el('div', { class: 'tr-banner' });
    stage.append(bg, layer, flash, cross, banner);
    const hud = el('div', { class: 'tr-hud' });
    const hint = el('div', { class: 'tr-hint muted', html: cfg.hint });
    const fsBtn = el('button', { class: 'tr-fsbtn', type: 'button', title: 'Vollbild ein/aus', onclick: e => {
      e.preventDefault(); e.stopPropagation();
      const m = root.closest('.modal');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (m && m.requestFullscreen) m.requestFullscreen().catch(() => {});
    } }, '⛶ Vollbild');

    const root = el('div', { class: 'tr' }, hud, stage, hint);
    Img.resolve(cfg.bg).then(u => { if (u) { bg.style.backgroundImage = `url("${u}")`; stage.classList.add('has-bg'); } });

    let game = null;
    const api = {
      stage, layer, hud, flash, banner,
      rect: () => stage.getBoundingClientRect(),
      say(html, cls = '') { banner.className = 'tr-banner on ' + cls; banner.innerHTML = html; },
      clear() { banner.className = 'tr-banner'; },
      bleed() { flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit'); },
    };
    let aim = { x: -99, y: -99 };
    const move = e => {
      const r = stage.getBoundingClientRect();
      aim = { x: e.clientX - r.left, y: e.clientY - r.top, r };
      cross.style.transform = `translate(${aim.x}px, ${aim.y}px)`;
      cross.classList.add('on');
    };
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', () => cross.classList.remove('on'));
    stage.addEventListener('pointerdown', e => { if (e.button === 0) { e.preventDefault(); move(e); game && game.click(aim, e); } });
    stage.addEventListener('contextmenu', e => e.preventDefault());

    await UI.scene({
      wide: true, title: cfg.title, body: [root], noFocus: true,
      actions: [{ label: 'Training beenden', value: 'quit', kind: 'ghost' }],
      onMount: (sheet, done) => {
        sheet.classList.add('tr-fs'); hud.append(fsBtn);
        const m = sheet.closest('.modal');
        if (m && m.requestFullscreen) m.requestFullscreen().catch(() => {});
        game = build(api, () => setTimeout(done, 2200)); game.start();
      },
    });
    game.stop();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    return game.result();
  }

  /* ============================================================
     Schießstand
     ============================================================ */
  function range(g) {
    return arena({
      cls: 'range', title: '🎯 Schießstand – Selber trainieren', bg: 'train-range-bg',
      hint: 'Mit der Maus zielen, <b>Klick</b> = Schuss. Alle 6 Schuss wird nachgeladen. 30 Ziele – sie werden immer schneller, ab dem 10. fliegen sie Kurven, ab dem 20. kommen sie auch von rechts, ab der Hälfte legen sie nochmal deutlich zu.',
    }, (A, finish) => {
      let T = 0, last = 0, raf = 0, started = false, over = false;
      let idx = 0, hits = 0, ammo = MAG, reloadEnd = 0, cur = null, nextAt = 0.4;
      const hud = {
        hits: el('b', {}, '0'), tgt: el('b', {}, '0'), mag: el('span', { class: 'mag' }), rl: el('span', { class: 'rl' }),
      };
      A.hud.append(el('div', {}, 'Treffer ', hud.hits, ' / ', String(RANGE_N)), el('div', {}, 'Ziel ', hud.tgt, ' / ', String(RANGE_N)),
        el('div', { class: 'mag-box' }, hud.mag, hud.rl));
      const drawMag = () => {
        hud.mag.replaceChildren(...Array.from({ length: MAG }, (_, i) => el('i', { class: i < ammo ? 'full' : '' })));
        hud.rl.textContent = reloadEnd ? 'Nachladen …' : '';
      };
      drawMag();

      const gap = () => idx >= RANGE_HALF ? rf(0.15, 0.4) : rf(0.35, 0.8);

      function spawn() {
        const k = idx / (RANGE_N - 1);
        const dur = idx < RANGE_HALF
          ? 2.3 - 0.9 * (idx / (RANGE_HALF - 1))
          : 1.3 - 0.85 * ((idx - RANGE_HALF) / (RANGE_N - 1 - RANGE_HALF));
        const el1 = sprite('train-target-' + (1 + (idx % 3)), 'tr-target', '🕴️');
        const curvy = idx >= 9;
        const lane = curvy ? rf(26, 38) : rf(24, 50);
        el1.style.top = lane + '%';
        el1.style.visibility = 'hidden';
        A.layer.append(el1);
        const curve = curvy ? { amp: rf(7, 12) + 6 * k, f: rf(0.8, 1.9), ph: rf(0, 6.283) } : null;
        cur = { el: el1, p: 0, dur, dead: false, dir: idx >= 19 && Math.random() < 0.5 ? -1 : 1, curve };
        idx++; hud.tgt.textContent = idx;
      }

      function shoot(aim) {
        if (!started || over) return;
        if (reloadEnd || ammo <= 0) { Sfx.play('tick'); return; }
        ammo--; Sfx.play('shot');
        const mf = el('div', { class: 'tr-mf small', style: { left: aim.x + 'px', top: aim.y + 'px' } });
        A.layer.append(mf); setTimeout(() => mf.remove(), 160);
        if (cur && !cur.dead) {
          const r = cur.el.getBoundingClientRect(), sr = A.rect();
          const x0 = r.left - sr.left, y0 = r.top - sr.top;
          if (aim.x > x0 + r.width * 0.12 && aim.x < x0 + r.width * 0.88 && aim.y > y0 + r.height * 0.05 && aim.y < y0 + r.height * 0.97) {
            cur.dead = true; cur.el.classList.add('down'); hits++; hud.hits.textContent = hits; Sfx.play('hit');
            const pop = el('div', { class: 'tr-pop', style: { left: aim.x + 'px', top: aim.y + 'px' } }, 'Treffer!');
            A.layer.append(pop); setTimeout(() => pop.remove(), 700);
            cur.goneAt = T + 0.6;
          }
        }
        if (ammo <= 0) { reloadEnd = T + 1.3; Sfx.play('reload'); }
        drawMag();
      }

      function end() {
        if (over) return; over = true;
        Sfx.play(hits >= 15 ? 'fanfare' : 'turn');
        A.say(`Geschafft!<small>${hits} von ${RANGE_N} Zielen getroffen</small>`);
        finish();
      }

      function tick(now) {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!started || over) return;
        T += dt;
        if (reloadEnd && T >= reloadEnd) { reloadEnd = 0; ammo = MAG; Sfx.play('lock'); drawMag(); }
        if (cur) {
          if (cur.dead) { if (T >= cur.goneAt) { cur.el.remove(); cur = null; nextAt = T + gap(); } }
          else {
            cur.p += dt / cur.dur;
            const sw = A.stage.clientWidth, sh = A.stage.clientHeight, w = cur.el.offsetWidth;
            cur.el.style.visibility = '';
            const x = cur.dir > 0 ? -w + cur.p * (sw + w) : sw - cur.p * (sw + w);
            const y = cur.curve ? Math.sin(cur.curve.ph + cur.p * cur.curve.f * 6.283) * cur.curve.amp / 100 * sh : 0;
            cur.el.style.transform = `translate(${x}px, ${y}px)`;
            if (cur.p >= 1) { cur.el.remove(); cur = null; nextAt = T + gap(); }
          }
        } else if (T >= nextAt) {
          if (idx >= RANGE_N) return end();
          spawn();
        }
      }

      return {
        start() {
          A.say('Zum Starten klicken<small>Die Ziele werden schnell – ab Ziel 10 fliegen sie Kurven, ab Ziel 20 auch von rechts, ab Ziel 15 wird es nochmal hektischer</small>', 'wait');
          last = performance.now(); raf = requestAnimationFrame(tick);
        },
        click(aim) {
          if (!started) { started = true; A.clear(); return; }
          shoot(aim);
        },
        stop() { cancelAnimationFrame(raf); },
        result() { return { hits, total: RANGE_N, ended: over }; },
      };
    });
  }

  /* ============================================================
     Trainingslager
     ============================================================ */
  function camp(g) {
    const hp0 = Math.max(1, g.en | 0);
    const dmgTop = 2 + Math.round(3 * clamp((hp0 - 10) / 40, 0, 1));
    const TOTAL = CAMP_N;
    return arena({
      cls: 'camp', title: '🏚️ Trainingslager – Selber trainieren', bg: 'train-camp-bg',
      hint: 'Du sitzt hinter der Deckung. <b>Klick</b> auf einen Gangster = Schuss – dabei kommst du aus der Deckung und bist <b>verwundbar</b>. Alle 6 Schuss wird 2 s nachgeladen. Ab dem 20. Gegner (der Hälfte) kommen sie häufiger und schneller, ab dem 30. schießen sie fast sofort und bis zu vier stehen gleichzeitig in den Fenstern.',
    }, (A, finish) => {
      let T = 0, last = 0, raf = 0, started = false, over = false;
      let hp = hp0, kills = 0, spawned = 0, ammo = MAG, reloadEnd = 0, exposedUntil = 0, nextSpawn = 0.6;
      let enemies = [], lastWin = -1;

      const hud = { hp: el('i'), hpt: el('b', {}, hp + ' / ' + hp0), kills: el('b', {}, '0'), mag: el('span', { class: 'mag' }), rl: el('span', { class: 'rl' }) };
      A.hud.append(
        el('div', { class: 'hpbar-box' }, 'Leben ', el('span', { class: 'hpbar' }, hud.hp), ' ', hud.hpt),
        el('div', {}, 'Erledigt ', hud.kills, ' / ', String(TOTAL)),
        el('div', { class: 'mag-box' }, hud.mag, hud.rl));
      const drawHp = () => { hud.hp.style.width = clamp(hp / hp0 * 100, 0, 100) + '%'; hud.hpt.textContent = Math.max(0, hp) + ' / ' + hp0; };
      const drawMag = () => {
        hud.mag.replaceChildren(...Array.from({ length: MAG }, (_, i) => el('i', { class: i < ammo ? 'full' : '' })));
        hud.rl.textContent = reloadEnd ? 'Nachladen …' : '';
      };
      drawHp(); drawMag();

      /* Fensterraster (nur als Platzhalter sichtbar, wenn das Hintergrundbild fehlt) */
      const wins = [];
      CAMP_WINDOWS.rows.forEach(y => CAMP_WINDOWS.cols.forEach(x => wins.push({ x, y })));
      wins.forEach(w => A.layer.append(el('div', { class: 'tr-win', style: { left: w.x + '%', top: w.y + '%', width: CAMP_WINDOWS.w + '%', height: CAMP_WINDOWS.h + '%' } })));

      const me = el('div', { class: 'tr-me' });
      const meCover = sprite('train-player-cover', 'tr-me-cover', '🪖');
      const meShoot = sprite('train-player-shoot', 'tr-me-shoot', '🔫');
      me.append(meCover, meShoot);
      A.layer.append(me);
      const setExposed = on => me.classList.toggle('out', on);

      function muzzle(x, y, big) {
        const mf = el('div', { class: 'tr-mf' + (big ? '' : ' small'), style: { left: x + '%', top: y + '%' } });
        A.layer.append(mf); setTimeout(() => mf.remove(), 180);
      }

      /* Schwierigkeit nach laufender Nummer des Gegners (1-basiert) */
      const fireDelay = n => n >= 30 ? rf(0.8, 1.6) : n >= 20 ? rf(1.1, 2.2) : rf(1.6, 3.2);
      const spawnGap = n => n >= 30 ? rf(0.5, 0.9) : n >= 20 ? rf(0.75, 1.3) : rf(1.4, 2.3);
      const maxAlive = n => n >= 30 ? 4 : n >= 20 ? 3 : 2;

      function spawn() {
        const free = wins.map((w, i) => i).filter(i => i !== lastWin && !enemies.some(e => e.wi === i));
        if (!free.length) return;
        const wi = free[Math.floor(Math.random() * free.length)];
        lastWin = wi;
        const w = wins[wi];
        const n = ++spawned;
        const e = sprite('train-enemy-' + (1 + Math.floor(Math.random() * 3)), 'tr-enemy', '🕴️');
        e.style.left = w.x + '%';
        e.style.top = (w.y + CAMP_WINDOWS.h / 2) + '%';
        e.style.height = (CAMP_WINDOWS.h * 1.35) + '%';
        A.layer.append(e);
        requestAnimationFrame(() => e.classList.add('in'));
        enemies.push({ el: e, w, wi, n, fireAt: T + fireDelay(n), aimed: false });
        nextSpawn = T + spawnGap(n + 1);
      }

      function enemyFire(en) {
        const w = en.w;
        Sfx.play(Math.random() < 0.5 ? 'burst' : 'gun');
        muzzle(w.x, w.y + 1, true);
        en.aimed = false; en.el.classList.remove('aim');
        if (T < exposedUntil) {
          const dmg = 2 + Math.floor(Math.random() * (dmgTop - 2 + 1));
          hp -= dmg; drawHp(); A.bleed(); Sfx.play('hit');
          const pop = el('div', { class: 'tr-pop bad', style: { left: '50%', top: '70%' } }, '−' + dmg);
          A.layer.append(pop); setTimeout(() => pop.remove(), 800);
          if (hp <= 0) return end('dead');
        } else {
          Sfx.play('miss');
          const pop = el('div', { class: 'tr-pop safe', style: { left: '50%', top: '72%' } }, 'Deckung!');
          A.layer.append(pop); setTimeout(() => pop.remove(), 700);
        }
        en.fireAt = T + fireDelay(en.n);
      }

      function shoot(aim) {
        if (!started || over) return;
        if (reloadEnd || ammo <= 0) { Sfx.play('tick'); return; }
        ammo--; Sfx.play('shot');
        exposedUntil = T + 0.9; setExposed(true);
        const sr = A.rect();
        muzzle(60.1, 64.7, false);
        const target = enemies.find(en => {
          const r = en.el.getBoundingClientRect();
          const x0 = r.left - sr.left, y0 = r.top - sr.top;
          return aim.x > x0 + r.width * 0.1 && aim.x < x0 + r.width * 0.9 && aim.y > y0 && aim.y < y0 + r.height;
        });
        if (target) {
          enemies = enemies.filter(en => en !== target);
          target.el.classList.remove('aim'); target.el.classList.add('down'); kills++; hud.kills.textContent = kills;
          Sfx.play('kill');
          setTimeout(() => target.el.remove(), 500);
          if (!enemies.length) nextSpawn = Math.min(nextSpawn, T + 0.35);
          if (kills >= TOTAL) { drawMag(); return end('win'); }
        }
        if (ammo <= 0) { reloadEnd = T + 2; Sfx.play('reload'); }
        drawMag();
      }

      function end(why) {
        if (over) return; over = true;
        enemies.forEach(en => en.el.classList.remove('aim'));
        if (why === 'dead') { Sfx.play('jail'); A.say(`Getroffen!<small>Die Lebenspunkte sind aufgebraucht – ${kills} von ${TOTAL} Gangstern erledigt</small>`, 'bad'); }
        else { Sfx.play('fanfare'); A.say(`Haus gesäubert!<small>Alle ${TOTAL} Gangster erledigt</small>`); }
        setExposed(false);
        finish();
      }

      function tick(now) {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!started || over) return;
        T += dt;
        if (exposedUntil && T >= exposedUntil) { exposedUntil = 0; setExposed(false); }
        if (reloadEnd && T >= reloadEnd) { reloadEnd = 0; ammo = MAG; Sfx.play('lock'); drawMag(); }
        for (const en of enemies.slice()) {
          if (over) break;
          if (!en.aimed && T >= en.fireAt - 0.45) { en.aimed = true; en.el.classList.add('aim'); }
          if (T >= en.fireAt) enemyFire(en);
        }
        if (!over && spawned < TOTAL && enemies.length < maxAlive(spawned + 1) && T >= nextSpawn) spawn();
      }

      return {
        start() {
          A.say('Zum Starten klicken<small>Du hast ' + hp0 + ' Lebenspunkte – die Gangster feuern 1–3 Sekunden nach dem Auftauchen, ab der Hälfte deutlich schneller und öfter zu mehreren</small>', 'wait');
          last = performance.now(); raf = requestAnimationFrame(tick);
        },
        click(aim) {
          if (!started) { started = true; A.clear(); return; }
          shoot(aim);
        },
        stop() { cancelAnimationFrame(raf); },
        result() { return { hits: kills, total: TOTAL, ended: over, hp, hp0 }; },
      };
    });
  }

  return { range, camp };
})();
