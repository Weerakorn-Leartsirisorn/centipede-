import * as THREE from 'three';

export const COLS = 17;
export const ROWS = 22;
export const CELL = 1;
export const PLAYER_BAND = 5;
export const MUSHROOM_HP = 4;
export const START_LIVES = 3;
export const EXTRA_LIFE = 12000;
export const START_SEGMENTS = 12;

export const PLAYER_SPEED = 8.6;
export const BULLET_SPEED = 24;
export const FIRE_COOLDOWN = 0.18;
export const RAPID_COOLDOWN = 0.07;
export const PLAYER_RADIUS = 0.38;

export const BASE_STEP = 0.2;
export const COMBO_WINDOW = 1.4;
export const POWERUP_DURATION = 8.5;
export const INVULN_TIME = 2.1;

export const SCORES = {
  head: 100,
  body: 10,
  mushroom: 1,
  flea: 200,
  scorpion: 1000,
  spiderNear: 900,
  spiderMid: 600,
  spiderFar: 300,
  pickup: 50,
};

export const HIGH_SCORE_KEY = 'centipede-highscore';

export const COLORS = {
  bg: 0x07080d,
  ground: 0x10161f,
  grid: 0x2a6d68,
  cyan: 0x5cffea,
  magenta: 0xff4d9a,
  gold: 0xffd166,
  poison: 0x66ff88,
  spider: 0xc77dff,
  flea: 0xff7a45,
  scorpion: 0xd6ff4d,
};

export function colRowToWorld(col, row) {
  const x = (col - (COLS - 1) / 2) * CELL;
  const z = (row - (ROWS - 1) / 2) * CELL;
  return { x, z };
}

export function worldToColRow(x, z) {
  const col = Math.round(x / CELL + (COLS - 1) / 2);
  const row = Math.round(z / CELL + (ROWS - 1) / 2);
  return { col, row };
}

export function cellCenter(col, row) {
  const { x, z } = colRowToWorld(col, row);
  return new THREE.Vector3(x, 0, z);
}

export function playerBounds() {
  const left = colRowToWorld(0, 0).x;
  const right = colRowToWorld(COLS - 1, 0).x;
  const top = colRowToWorld(0, ROWS - PLAYER_BAND).z;
  const bottom = colRowToWorld(0, ROWS - 1).z;
  return { left, right, top, bottom };
}

export function boardBounds() {
  const left = colRowToWorld(0, 0).x;
  const right = colRowToWorld(COLS - 1, 0).x;
  const top = colRowToWorld(0, 0).z;
  const bottom = colRowToWorld(0, ROWS - 1).z;
  return { left, right, top, bottom };
}

export function disposeObject(scene, obj) {
  if (!obj) return;
  scene.remove(obj);
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      }
    }
  });
}

export function xzDist(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}
