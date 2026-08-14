import { POWER_LOOK } from '../entities/PowerUp.js';
import { HIGH_SCORE_KEY } from '../game/constants.js';

export class HUD {
  constructor() {
    this.overlay = document.getElementById('overlay');
    this.sub = document.getElementById('menu-sub');
    this.actions = document.getElementById('menu-actions');
    this.primary = document.getElementById('btn-primary');
    this.high = document.getElementById('high-score');
    this.hud = document.getElementById('hud');
    this.score = document.getElementById('score');
    this.combo = document.getElementById('combo');
    this.comboStat = document.querySelector('.combo-stat');
    this.wave = document.getElementById('wave');
    this.lives = document.getElementById('lives');
    this.banner = document.getElementById('wave-banner');
    this.powerBar = document.getElementById('powerup-bar');
    this.hint = document.querySelector('.hint');
    this.handlers = {};
    this.mode = 'title';

    this.primary.addEventListener('click', () => this.#onPrimary());
  }

  bind(handlers) {
    this.handlers = handlers;
    this.showTitle();
  }

  #onPrimary() {
    if (this.mode === 'title' || this.mode === 'gameover') this.handlers.onStart?.();
    else if (this.mode === 'paused') this.handlers.onResume?.();
  }

  showTitle() {
    this.mode = 'title';
    this.hud.classList.add('hidden');
    this.overlay.classList.remove('hidden');
    this.sub.textContent = 'Blast the swarm. Hold the garden.';
    this.primary.textContent = 'Start';
    this.primary.classList.remove('secondary');
    this.#setSecondary(false);
    this.hint.style.display = '';
    this.refreshHigh();
  }

  showPause() {
    this.mode = 'paused';
    this.overlay.classList.remove('hidden');
    this.sub.textContent = 'Paused';
    this.primary.textContent = 'Resume';
    this.#setSecondary(true, 'Quit', () => this.handlers.onQuit?.());
    this.hint.style.display = 'none';
    this.refreshHigh();
  }

  showGameOver(score) {
    this.mode = 'gameover';
    this.overlay.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.sub.textContent = `Final score ${score.toLocaleString()}`;
    this.primary.textContent = 'Play again';
    this.#setSecondary(false);
    this.hint.style.display = '';
    this.refreshHigh();
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  #setSecondary(show, label = 'Quit', fn = null) {
    const existing = document.getElementById('btn-secondary');
    if (existing) existing.remove();
    if (!show) return;
    const btn = document.createElement('button');
    btn.id = 'btn-secondary';
    btn.className = 'secondary';
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', fn);
    this.actions.appendChild(btn);
  }

  refreshHigh() {
    const n = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
    this.high.textContent = n ? `BEST ${n.toLocaleString()}` : '';
  }

  update(game) {
    this.score.textContent = Math.floor(game.score).toLocaleString();
    this.combo.textContent = `x${Math.max(1, game.combo)}`;
    this.comboStat.classList.toggle('hot', game.combo >= 6);
    this.wave.textContent = String(game.wave);
    this.lives.textContent = '●'.repeat(game.lives) || '—';

    const chips = [];
    for (const [key, time] of Object.entries(game.powerups)) {
      if (time > 0) {
        const look = POWER_LOOK[key];
        chips.push(`<span class="chip ${key}">${look.label} ${time.toFixed(0)}s</span>`);
      }
    }
    this.powerBar.innerHTML = chips.join('');
  }

  showBanner(text) {
    this.banner.textContent = text;
    this.banner.classList.add('show');
    clearTimeout(this._waveTimer);
    this._waveTimer = setTimeout(() => this.banner.classList.remove('show'), 1600);
  }

  showWave(n) {
    this.showBanner(`WAVE ${n}`);
  }
}
