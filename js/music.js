/* ============================================================
   Hintergrundmusik: Titelsong (Loop) + zufällige Playlist im Spiel
   ============================================================ */
const Music = {
  el: null,
  enabled: true,
  volume: 0.5,
  mode: null,        // 'title' | 'game' | null
  playlist: ['music-1', 'music-2', 'music-3', 'music-4'],
  last: null,

  init() {
    this.el = new Audio();
    this.el.preload = 'auto';
    try { this.enabled = localStorage.getItem('mafia-neu-music') !== '0'; } catch (e) { }
    try { const v = parseInt(localStorage.getItem('mafia-neu-music-vol'), 10); if (!isNaN(v)) this.volume = clamp(v / 100, 0, 1); } catch (e) { }
    this.el.volume = this.volume;
    this.el.addEventListener('ended', () => { if (this.mode === 'game') this._playNext(); });
    const kick = () => { this._resume(); };
    document.addEventListener('pointerdown', kick, { once: true });
    document.addEventListener('keydown', kick, { once: true });
  },
  _src(key) { return `assets/audio/${key}.mp3`; },
  _resume() { if (this.enabled && this.mode && this.el.paused) this.el.play().catch(() => { }); },
  _playNext() {
    let pick;
    do { pick = this.playlist[Math.floor(Math.random() * this.playlist.length)]; } while (pick === this.last && this.playlist.length > 1);
    this.last = pick;
    this.el.src = this._src(pick); this.el.loop = false;
    if (this.enabled) this.el.play().catch(() => { });
  },
  /** Titelsong (mit Gesang), in Dauerschleife */
  playTitle() {
    if (this.mode === 'title') return;
    this.mode = 'title';
    this.el.src = this._src('music-title'); this.el.loop = true;
    if (this.enabled) this.el.play().catch(() => { });
  },
  /** Zufällige Instrumental-Playlist während des Spiels */
  playGame() {
    if (this.mode === 'game') return;
    this.mode = 'game';
    this._playNext();
  },
  setEnabled(v) {
    this.enabled = v;
    try { localStorage.setItem('mafia-neu-music', v ? '1' : '0'); } catch (e) { }
    if (v) this._resume(); else this.el.pause();
  },
  setVolume(v) {
    this.volume = clamp(v, 0, 1); this.el.volume = this.volume;
    try { localStorage.setItem('mafia-neu-music-vol', Math.round(this.volume * 100)); } catch (e) { }
  },
};

/** Options-Dialog: Musik an/aus + Lautstärke (live) */
function showMusicSettings() {
  const toggle = el('button', { class: 'btn small', type: 'button' });
  const syncToggle = () => { toggle.textContent = Music.enabled ? '🎵 Musik: an' : '🔇 Musik: aus'; };
  syncToggle();
  toggle.addEventListener('click', () => { Music.setEnabled(!Music.enabled); syncToggle(); Sfx.play('click'); });
  const slider = el('input', { type: 'range', min: 0, max: 100, value: Math.round(Music.volume * 100) });
  const pct = el('span', { class: 'unit' }, Math.round(Music.volume * 100) + ' %');
  slider.addEventListener('input', () => { Music.setVolume(slider.value / 100); pct.textContent = slider.value + ' %'; });
  return UI.scene({
    kicker: 'Optionen', title: 'Musik',
    body: [
      el('div', { class: 'num-row' }, toggle),
      el('div', { class: 'num-row' }, slider, pct),
    ],
    actions: [{ label: 'Fertig', value: true, kind: 'primary', key: ['Enter', 'Escape'] }],
  });
}
