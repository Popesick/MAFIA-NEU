/* ============================================================
   Trainings-Minispiele beim Waffenhändler ("Selber trainieren"):
   - Training.range(g)  Schießstand: 30 Ziele huschen von links nach rechts
   - Training.camp(g)   Trainingslager: 30 Gangster in den Fenstern eines Hauses
   Beide liefern { hits, total, ended } zurück; die Belohnung berechnet places.js.
   Bildplätze: train-range-bg, train-target-1..3, train-camp-bg, train-enemy-1..3,
   train-player-cover, train-player-shoot (fehlt ein Bild, gibt es Platzhalter).
   ============================================================ */

const Training = (() => {
  const TOTAL = 30;
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
      onMount: (sheet, done) => { game = build(api, () => setTimeout(done, 2200)); game.start(); },
    });
    game.stop();
    return game.result();
  }

  /* ============================================================
     Schießstand
     ============================================================ */
  function range(g) {
    return arena({
      cls: 'range', title: '🎯 Schießstand – Selber trainieren', bg: 'train-range-bg',
      hint: 'Mit der Maus zielen, <b>Klick</b> = Schuss. Alle 6 Schuss wird nachgeladen. 30 Ziele – sie werden immer schneller.',
    }, (A, finish) => {
      let T = 0, last = 0, raf = 0, started = false, over = false;
      let idx = 0, hits = 0, ammo = MAG, reloadEnd = 0, cur = null, nextAt = 0.4;
      const hud = {
        hits: el('b', {}, '0'), tgt: el('b', {}, '0'), mag: el('span', { class: 'mag' }), rl: el('span', { class: 'rl' }),
      };
      A.hud.append(el('div', {}, 'Treffer ', hud.hits, ' / ', String(TOTAL)), el('div', {}, 'Ziel ', hud.tgt, ' / ', String(TOTAL)),
        el('div', { class: 'mag-box' }, hud.mag, hud.rl));
      const drawMag = () => {
        hud.mag.replaceChildren(...Array.from({ length: MAG }, (_, i) => el('i', { class: i < ammo ? 'full' : '' })));
        hud.rl.textContent = reloadEnd ? 'Nachladen …' : '';
      };
      drawMag();

      function spawn() {
        const dur = 3.4 - 2.3 * (idx / (TOTAL - 1));
        const el1 = sprite('train-target-' + (1 + (idx % 3)), 'tr-target', '🕴️');
        const lane = rf(24, 50);
        el1.style.top = lane + '%';
        el1.style.visibility = 'hidden';
        A.layer.append(el1);
        cur = { el: el1, p: 0, dur, dead: false };
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
        A.say(`Geschafft!<small>${hits} von ${TOTAL} Zielen getroffen</small>`);
        finish();
      }

      function tick(now) {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!started || over) return;
        T += dt;
        if (reloadEnd && T >= reloadEnd) { reloadEnd = 0; ammo = MAG; Sfx.play('lock'); drawMag(); }
        if (cur) {
          if (cur.dead) { if (T >= cur.goneAt) { cur.el.remove(); cur = null; nextAt = T + rf(0.35, 0.8); } }
          else {
            cur.p += dt / cur.dur;
            const sw = A.stage.clientWidth, w = cur.el.offsetWidth;
            cur.el.style.visibility = '';
            cur.el.style.transform = `translateX(${-w + cur.p * (sw + w)}px)`;
            if (cur.p >= 1) { cur.el.remove(); cur = null; nextAt = T + rf(0.35, 0.8); }
          }
        } else if (T >= nextAt) {
          if (idx >= TOTAL) return end();
          spawn();
        }
      }

      return {
        start() {
          A.say('Zum Starten klicken<small>Die Ziele kommen von links</small>', 'wait');
          last = performance.now(); raf = requestAnimationFrame(tick);
        },
        click(aim) {
          if (!started) { started = true; A.clear(); return; }
          shoot(aim);
        },
        stop() { cancelAnimationFrame(raf); },
        result() { return { hits, total: TOTAL, ended: over }; },
      };
    });
  }

  /* ============================================================
     Trainingslager
     ============================================================ */
  function camp(g) {
    const hp0 = Math.max(1, g.en | 0);
    const dmgTop = 2 + Math.round(3 * clamp((hp0 - 10) / 40, 0, 1));
    return arena({
      cls: 'camp', title: '🏚️ Trainingslager – Selber trainieren', bg: 'train-camp-bg',
      hint: 'Du sitzt hinter der Deckung. <b>Klick</b> auf einen Gangster = Schuss – dabei kommst du aus der Deckung und bist <b>verwundbar</b>. Alle 6 Schuss wird 2 s nachgeladen.',
    }, (A, finish) => {
      let T = 0, last = 0, raf = 0, started = false, over = false;
      let hp = hp0, kills = 0, spawned = 0, ammo = MAG, reloadEnd = 0, exposedUntil = 0, nextSpawn = 0.6;
      let enemy = null, lastWin = -1;

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

      function spawn() {
        let wi; do { wi = Math.floor(Math.random() * wins.length); } while (wi === lastWin);
        lastWin = wi;
        const w = wins[wi];
        const e = sprite('train-enemy-' + (1 + Math.floor(Math.random() * 3)), 'tr-enemy', '🕴️');
        e.style.left = w.x + '%';
        e.style.top = (w.y + CAMP_WINDOWS.h / 2) + '%';
        e.style.height = (CAMP_WINDOWS.h * 1.35) + '%';
        A.layer.append(e);
        requestAnimationFrame(() => e.classList.add('in'));
        enemy = { el: e, w, fireAt: T + rf(2, 4), dead: false, aimed: false };
        spawned++;
      }

      function enemyFire() {
        const w = enemy.w;
        Sfx.play(Math.random() < 0.5 ? 'burst' : 'gun');
        muzzle(w.x, w.y + 1, true);
        enemy.aimed = false; enemy.el.classList.remove('aim');
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
        enemy.fireAt = T + rf(2, 4);
      }

      function shoot(aim) {
        if (!started || over) return;
        if (reloadEnd || ammo <= 0) { Sfx.play('tick'); return; }
        ammo--; Sfx.play('shot');
        exposedUntil = T + 0.9; setExposed(true);
        const sr = A.rect();
        muzzle(60.1, 64.7, false);
        if (enemy && !enemy.dead) {
          const r = enemy.el.getBoundingClientRect();
          const x0 = r.left - sr.left, y0 = r.top - sr.top;
          if (aim.x > x0 + r.width * 0.1 && aim.x < x0 + r.width * 0.9 && aim.y > y0 && aim.y < y0 + r.height) {
            enemy.dead = true; enemy.el.classList.remove('aim'); enemy.el.classList.add('down'); kills++; hud.kills.textContent = kills;
            Sfx.play('kill');
            const dead = enemy; setTimeout(() => dead.el.remove(), 500);
            enemy = null; nextSpawn = T + rf(0.8, 1.5);
            if (kills >= TOTAL) { drawMag(); return end('win'); }
          }
        }
        if (ammo <= 0) { reloadEnd = T + 2; Sfx.play('reload'); }
        drawMag();
      }

      function end(why) {
        if (over) return; over = true;
        if (enemy) { enemy.el.classList.remove('aim'); }
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
        if (exposedUntil && T >= exposedUntil && !reloadEnd) { exposedUntil = 0; setExposed(false); }
        else if (exposedUntil && T >= exposedUntil) { exposedUntil = 0; setExposed(false); }
        if (reloadEnd && T >= reloadEnd) { reloadEnd = 0; ammo = MAG; Sfx.play('lock'); drawMag(); }
        if (enemy) {
          if (!enemy.aimed && T >= enemy.fireAt - 0.45) { enemy.aimed = true; enemy.el.classList.add('aim'); }
          if (T >= enemy.fireAt) enemyFire();
        } else if (spawned < TOTAL && T >= nextSpawn) spawn();
      }

      return {
        start() {
          A.say('Zum Starten klicken<small>Du hast ' + hp0 + ' Lebenspunkte – die Gangster feuern 2–4 Sekunden nach dem Auftauchen</small>', 'wait');
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
