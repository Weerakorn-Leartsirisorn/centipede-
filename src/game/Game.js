import * as THREE from 'three';
import {
  COLS,
  ROWS,
  PLAYER_BAND,
  START_LIVES,
  START_SEGMENTS,
  EXTRA_LIFE,
  BASE_STEP,
  COMBO_WINDOW,
  POWERUP_DURATION,
  SCORES,
  HIGH_SCORE_KEY,
  COLORS,
  INVULN_TIME,
  colRowToWorld,
  worldToColRow,
  xzDist,
} from './constants.js';
import { Arena } from '../world/Arena.js';
import { Grid } from '../world/Grid.js';
import { Input } from './input.js';
import { AudioBus } from './audio.js';
import { HUD } from '../ui/HUD.js';
import { Player } from '../entities/Player.js';
import { Mushroom } from '../entities/Mushroom.js';
import { Bullet } from '../entities/Bullet.js';
import { spawnCentipede } from '../entities/Centipede.js';
import { Spider } from '../entities/Spider.js';
import { Flea } from '../entities/Flea.js';
import { Scorpion } from '../entities/Scorpion.js';
import { PowerUp, POWER_TYPES } from '../entities/PowerUp.js';
import { Particles } from '../fx/Particles.js';
import { ScreenShake } from '../fx/ScreenShake.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.arena = new Arena(canvas);
    this.grid = new Grid();
    this.input = new Input(canvas);
    this.audio = new AudioBus();
    this.hud = new HUD();
    this.particles = new Particles(this.arena.scene);
    this.shake = new ScreenShake();
    this.clock = new THREE.Clock();
    this.state = 'title';

    this.player = null;
    this.bullets = [];
    this.centipedes = [];
    this.spiders = [];
    this.fleas = [];
    this.scorpions = [];
    this.pickups = [];
    this.powerups = { rapid: 0, spread: 0, shield: 0, slow: 0 };

    this.score = 0;
    this.lives = START_LIVES;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.extraLifeAt = EXTRA_LIFE;
    this.invuln = 0;
    this.hitStop = 0;
    this.wavePause = 0;
    this.spiderTimer = 0;
    this.fleaTimer = 0;
    this.scorpionTimer = 0;

    this.hud.bind({
      onStart: () => this.startGame(),
      onResume: () => this.resume(),
      onQuit: () => this.quitToTitle(),
    });

    this.#scatterMushrooms(26);
    this.centipedes.push(spawnCentipede(this.arena.scene, 10, 0.28, 11, 2));

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  startGame() {
    this.audio.ensure();
    this.#clearEntities(true);
    this.score = 0;
    this.lives = START_LIVES;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.extraLifeAt = EXTRA_LIFE;
    this.powerups = { rapid: 0, spread: 0, shield: 0, slow: 0 };
    this.invuln = 1.2;
    this.player = new Player(this.arena.scene);
    this.#scatterMushrooms(24);
    this.#spawnWave();
    this.state = 'playing';
    this.hud.hideOverlay();
    this.hud.update(this);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.hideOverlay();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.hud.showPause();
  }

  quitToTitle() {
    this.#clearEntities(true);
    this.player = null;
    this.#scatterMushrooms(26);
    this.centipedes.push(spawnCentipede(this.arena.scene, 10, 0.28, 11, 2));
    this.state = 'title';
    this.hud.showTitle();
  }

  #clearEntities(clearMushrooms) {
    for (const list of [this.bullets, this.centipedes, this.spiders, this.fleas, this.scorpions, this.pickups]) {
      for (const item of list) item.dispose?.();
      list.length = 0;
    }
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    if (clearMushrooms) {
      for (const m of this.grid.mushrooms.values()) m.dispose();
      this.grid.clear();
    }
    this.particles.clearFloaters();
  }

  #scatterMushrooms(count) {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < 400) {
      guard += 1;
      const col = 1 + Math.floor(Math.random() * (COLS - 2));
      const row = 1 + Math.floor(Math.random() * (ROWS - PLAYER_BAND - 2));
      if (this.grid.get(col, row)) continue;
      this.#addMushroom(col, row);
      placed += 1;
    }
  }

  #addMushroom(col, row, poisoned = false) {
    if (!this.grid.inBounds(col, row) || this.grid.get(col, row)) return null;
    const m = new Mushroom(this.arena.scene, col, row, poisoned);
    this.grid.set(col, row, m);
    return m;
  }

  #spawnWave() {
    const length = Math.min(16, START_SEGMENTS + Math.floor((this.wave - 1) / 1.5));
    const step = Math.max(0.07, BASE_STEP * Math.pow(0.91, this.wave - 1));
    this.centipedes.push(spawnCentipede(this.arena.scene, length, step, Math.min(COLS - 2, length), 0));
    if (this.wave >= 3 && this.wave % 2 === 1) {
      this.centipedes.push(spawnCentipede(this.arena.scene, Math.max(6, length - 5), step * 0.95, 4, 1));
    }
    this.spiderTimer = 3.5;
    this.fleaTimer = 2.2;
    this.scorpionTimer = this.wave >= 2 ? 8 : 14;
    this.wavePause = 0.4;
    this.hud.showWave(this.wave);
    this.audio.wave();
  }

  loop() {
    const raw = Math.min(0.05, this.clock.getDelta());
    this.#tick(raw);
    this.arena.applyShake(this.shake.offset.x, this.shake.offset.y, this.shake.offset.z);
    this.arena.render();
    requestAnimationFrame(this.loop);
  }

  #tick(raw) {
    if (this.input.consumePause()) {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }

    this.shake.update(raw);
    this.particles.update(raw);

    if (this.state === 'title') {
      for (const m of this.grid.mushrooms.values()) m.update(raw);
      for (const w of this.centipedes) w.update(raw * 0.85, this.grid);
      return;
    }

    if (this.state !== 'playing') return;

    if (this.hitStop > 0) {
      this.hitStop -= raw;
      return;
    }

    const enemyDt = this.powerups.slow > 0 ? raw * 0.45 : raw;

    for (const key of Object.keys(this.powerups)) {
      this.powerups[key] = Math.max(0, this.powerups[key] - raw);
    }
    this.invuln = Math.max(0, this.invuln - raw);
    this.comboTimer -= raw;
    if (this.comboTimer <= 0) this.combo = 0;
    this.wavePause = Math.max(0, this.wavePause - raw);

    if (this.player) {
      this.input.updateAim(this.arena.camera, this.player.position);
      this.player.update(raw, this.input, this.grid, this.powerups, this.invuln);
      this.#tryFire();
    }

    for (const m of this.grid.mushrooms.values()) m.update(raw);
    for (const b of this.bullets) b.update(raw);
    for (const w of this.centipedes) w.update(enemyDt, this.grid);
    for (const s of this.spiders) s.update(enemyDt);
    for (const f of this.fleas) {
      f.update(enemyDt);
      this.#fleaDrop(f, enemyDt);
    }
    for (const s of this.scorpions) {
      s.update(enemyDt);
      this.#scorpionPoison(s);
    }
    for (const p of this.pickups) p.update(raw);

    this.#collisions();
    this.#reap();
    this.#spawnSupport(enemyDt);
    this.#checkWaveClear();
    this.hud.update(this);
  }

  #tryFire() {
    if (!this.player || !this.input.firing) return;
    const rapid = this.powerups.rapid > 0;
    if (!this.player.canFire()) return;
    this.player.kickCooldown(rapid);
    const dir = this.input.aim.clone().normalize();
    const origin = this.player.muzzleWorld();
    const angles = this.powerups.spread > 0 ? [-18, 0, 18] : [0];
    for (const a of angles) this.#spawnBullet(origin, rotateY(dir, a));
    this.audio.laser();
  }

  #spawnBullet(origin, dir) {
    this.bullets.push(new Bullet(this.arena.scene, origin, dir));
  }

  #fleaDrop(flea, dt) {
    flea.dropAcc += dt;
    if (flea.dropAcc < 0.18) return;
    flea.dropAcc = 0;
    const { col, row } = worldToColRow(flea.position.x, flea.position.z);
    if (Math.random() < 0.55) this.#addMushroom(col, row);
  }

  #scorpionPoison(scorpion) {
    const { col, row } = worldToColRow(scorpion.position.x, scorpion.position.z);
    const m = this.grid.get(col, row);
    if (m && !m.poisoned) {
      m.poison();
      this.particles.burst(m.group.position, COLORS.poison, 8, 3);
    }
  }

  #spawnSupport(dt) {
    this.spiderTimer -= dt;
    this.fleaTimer -= dt;
    this.scorpionTimer -= dt;

    if (this.spiderTimer <= 0 && this.spiders.length === 0) {
      this.spiders.push(new Spider(this.arena.scene));
      this.spiderTimer = 7 + Math.random() * 4;
    }

    const sparse = this.grid.countInBand(ROWS - PLAYER_BAND, ROWS - 1) < 5;
    if (sparse && this.fleaTimer <= 0 && this.fleas.length < 2) {
      const col = 1 + Math.floor(Math.random() * (COLS - 2));
      this.fleas.push(new Flea(this.arena.scene, col));
      this.fleaTimer = 5 + Math.random() * 3;
    }

    if (this.scorpionTimer <= 0 && this.scorpions.length === 0 && this.wave >= 2) {
      const row = 2 + Math.floor(Math.random() * Math.max(1, ROWS - PLAYER_BAND - 4));
      this.scorpions.push(new Scorpion(this.arena.scene, row));
      this.scorpionTimer = 11 + Math.random() * 6;
    }
  }

  #collisions() {
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      const { col, row } = worldToColRow(bullet.position.x, bullet.position.z);
      const mushroom = this.grid.get(col, row);
      if (mushroom && xzDist(bullet.position, mushroom.group.position) < 0.42) {
        bullet.alive = false;
        const dead = mushroom.hit();
        this.#score(SCORES.mushroom, mushroom.group.position, false);
        this.audio.pop();
        this.particles.burst(mushroom.group.position, mushroom.poisoned ? COLORS.poison : COLORS.magenta, 10, 3.5);
        if (dead) {
          this.grid.remove(col, row);
          mushroom.dispose();
          this.#maybeDrop(mushroom.group.position, 0.12);
        }
        continue;
      }

      let hitWorm = false;
      for (const worm of this.centipedes) {
        if (hitWorm || !worm.alive) continue;
        for (let i = 0; i < worm.segments.length; i++) {
          const seg = worm.segments[i];
          if (xzDist(bullet.position, seg.group.position) > 0.36) continue;
          bullet.alive = false;
          hitWorm = true;
          const wasHead = i === 0;
          const pos = seg.group.position.clone();
          const { mushroomCell, leftover } = worm.hitIndex(i);
          this.#score(wasHead ? SCORES.head : SCORES.body, pos, true);
          this.particles.burst(pos, wasHead ? COLORS.gold : COLORS.cyan, wasHead ? 28 : 16, 6);
          this.shake.add(wasHead ? 0.45 : 0.22);
          if (wasHead) this.hitStop = 0.045;
          this.audio.explode();
          if (mushroomCell) this.#addMushroom(mushroomCell.col, mushroomCell.row);
          if (leftover) this.centipedes.push(leftover);
          break;
        }
      }
      if (hitWorm) continue;

      for (const spider of this.spiders) {
        if (!spider.alive) continue;
        if (xzDist(bullet.position, spider.position) > 0.4) continue;
        bullet.alive = false;
        spider.alive = false;
        const key = spider.proximityScore(this.player?.position.z ?? 0);
        this.#score(SCORES[key], spider.position, true);
        this.particles.burst(spider.position, COLORS.spider, 26, 6);
        this.shake.add(0.4);
        this.hitStop = 0.04;
        this.audio.explode();
        this.#maybeDrop(spider.position, 0.4);
      }

      for (const flea of this.fleas) {
        if (!flea.alive) continue;
        if (xzDist(bullet.position, flea.position) > 0.34) continue;
        bullet.alive = false;
        const killed = flea.hit();
        this.particles.burst(flea.position, COLORS.flea, 12, 5);
        if (killed) {
          this.#score(SCORES.flea, flea.position, true);
          this.audio.explode();
          this.shake.add(0.28);
        } else this.audio.pop();
      }

      for (const scorp of this.scorpions) {
        if (!scorp.alive) continue;
        if (xzDist(bullet.position, scorp.position) > 0.4) continue;
        bullet.alive = false;
        scorp.alive = false;
        this.#score(SCORES.scorpion, scorp.position, true);
        this.particles.burst(scorp.position, COLORS.scorpion, 24, 6);
        this.shake.add(0.38);
        this.audio.explode();
        this.#maybeDrop(scorp.position, 0.3);
      }
    }

    if (this.player && this.invuln <= 0) {
      const pos = this.player.position;
      const hitEnemy =
        this.spiders.some((s) => s.alive && xzDist(pos, s.position) < 0.48) ||
        this.fleas.some((f) => f.alive && xzDist(pos, f.position) < 0.42) ||
        this.centipedes.some((w) => w.segments.some((s) => xzDist(pos, s.group.position) < 0.42));
      if (hitEnemy) this.#playerHit();
    }

    if (this.player) {
      for (const p of this.pickups) {
        if (!p.alive) continue;
        if (xzDist(this.player.position, p.position) < 0.55) {
          p.alive = false;
          this.powerups[p.type] = POWERUP_DURATION;
          this.#score(SCORES.pickup, p.position, true);
          this.audio.pickup();
          this.particles.burst(p.position, p.look.color, 14, 4);
        }
      }
    }
  }

  #playerHit() {
    if (this.powerups.shield > 0) {
      this.powerups.shield = 0;
      this.invuln = 0.8;
      this.shake.add(0.3);
      this.audio.pop();
      this.particles.burst(this.player.position, COLORS.cyan, 20, 5);
      return;
    }
    this.lives -= 1;
    this.audio.hurt();
    this.shake.add(0.7);
    this.particles.burst(this.player.position, COLORS.magenta, 32, 7);
    this.combo = 0;
    if (this.lives <= 0) {
      this.#gameOver();
      return;
    }
    this.invuln = INVULN_TIME;
    this.player.resetPosition();
  }

  #gameOver() {
    this.state = 'gameover';
    const best = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
    if (this.score > best) localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(this.score)));
    this.hud.showGameOver(Math.floor(this.score));
  }

  #score(base, position, comboable) {
    if (comboable) {
      this.combo += 1;
      this.comboTimer = COMBO_WINDOW;
      if (this.combo >= 3 && this.combo % 3 === 0) this.audio.combo(this.combo);
    }
    const mult = comboable ? Math.max(1, this.combo) : 1;
    const gained = base * mult;
    this.score += gained;
    if (position) this.particles.floatText(position, `+${gained}`, this.combo >= 6 ? '#ff4d9a' : '#5cffea');
    while (this.score >= this.extraLifeAt) {
      this.lives += 1;
      this.extraLifeAt += EXTRA_LIFE;
      this.audio.extraLife();
      this.hud.showBanner('1UP');
    }
  }

  #maybeDrop(position, chance) {
    if (Math.random() > chance) return;
    const type = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
    this.pickups.push(new PowerUp(this.arena.scene, position, type));
  }

  #reap() {
    this.#reapList(this.bullets);
    this.#reapList(this.spiders);
    this.#reapList(this.fleas);
    this.#reapList(this.scorpions);
    this.#reapList(this.pickups);
    for (let i = this.centipedes.length - 1; i >= 0; i--) {
      if (!this.centipedes[i].alive || this.centipedes[i].segments.length === 0) {
        this.centipedes[i].dispose();
        this.centipedes.splice(i, 1);
      }
    }
  }

  #reapList(list) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].alive) {
        list[i].dispose();
        list.splice(i, 1);
      }
    }
  }

  #checkWaveClear() {
    if (this.wavePause > 0) return;
    if (this.centipedes.length > 0) return;
    this.wave += 1;
    this.#spawnWave();
  }
}

function rotateY(v, deg) {
  const a = THREE.MathUtils.degToRad(deg);
  return new THREE.Vector3(
    v.x * Math.cos(a) - v.z * Math.sin(a),
    0,
    v.x * Math.sin(a) + v.z * Math.cos(a),
  ).normalize();
}
