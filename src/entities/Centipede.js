import * as THREE from 'three';
import {
  COLS,
  ROWS,
  PLAYER_BAND,
  COLORS,
  colRowToWorld,
  disposeObject,
} from '../game/constants.js';

function makeSegment(isHead) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: isHead ? 0x7cffda : 0x3ad6b2,
    metalness: 0.78,
    roughness: 0.22,
    emissive: isHead ? COLORS.cyan : 0x145f52,
    emissiveIntensity: isHead ? 0.85 : 0.28,
  });
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(isHead ? 0.32 : 0.28, 14, 12),
    mat,
  );
  body.castShadow = true;
  group.add(body);

  if (isHead) {
    const eyeMat = new THREE.MeshStandardMaterial({
      color: COLORS.magenta,
      emissive: COLORS.magenta,
      emissiveIntensity: 1.8,
    });
    const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const left = new THREE.Mesh(eyeGeo, eyeMat);
    const right = new THREE.Mesh(eyeGeo, eyeMat);
    left.position.set(-0.1, 0.1, -0.24);
    right.position.set(0.1, 0.1, -0.24);
    const mandible = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.16, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xffd166,
        emissiveIntensity: 0.6,
      }),
    );
    mandible.rotation.x = Math.PI / 2;
    mandible.position.set(0, -0.02, -0.34);
    group.add(left, right, mandible);
  } else {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.03, 6, 14),
      new THREE.MeshStandardMaterial({
        color: COLORS.gold,
        emissive: COLORS.gold,
        emissiveIntensity: 0.35,
        metalness: 0.7,
        roughness: 0.3,
      }),
    );
    band.rotation.x = Math.PI / 2;
    group.add(band);
  }
  return { group, mat };
}

export class Centipede {
  constructor(scene, cells, dir = 1, stepTime = 0.2) {
    this.scene = scene;
    this.dir = dir;
    this.vDir = 1;
    this.diving = false;
    this.stepTime = stepTime;
    this.accum = 0;
    this.alive = true;
    this.segments = cells.map((cell, i) => this.#makeSeg(cell.col, cell.row, i === 0));
  }

  #makeSeg(col, row, isHead) {
    const { group, mat } = makeSegment(isHead);
    const { x, z } = colRowToWorld(col, row);
    group.position.set(x, 0.38, z);
    this.scene.add(group);
    return {
      col,
      row,
      isHead,
      group,
      mat,
      from: new THREE.Vector3(x, 0.38, z),
      to: new THREE.Vector3(x, 0.38, z),
    };
  }

  #refreshHead() {
    this.segments.forEach((seg, i) => {
      const shouldHead = i === 0;
      if (seg.isHead === shouldHead) return;
      disposeObject(this.scene, seg.group);
      const next = this.#makeSeg(seg.col, seg.row, shouldHead);
      next.from.copy(seg.from);
      next.to.copy(seg.to);
      this.segments[i] = next;
    });
  }

  get head() {
    return this.segments[0];
  }

  update(dt, grid) {
    if (!this.segments.length) {
      this.alive = false;
      return;
    }
    this.accum += dt;
    const t = Math.min(1, this.accum / this.stepTime);
    for (const seg of this.segments) {
      seg.group.position.lerpVectors(seg.from, seg.to, t);
      seg.group.position.y = 0.38 + Math.sin(performance.now() * 0.01 + seg.col) * 0.03;
    }
    if (this.head) {
      const dx = this.head.to.x - this.head.from.x;
      const dz = this.head.to.z - this.head.from.z;
      if (dx * dx + dz * dz > 0.0001) {
        this.head.group.rotation.y = Math.atan2(-dx, -dz);
      }
    }
    if (this.accum >= this.stepTime) {
      this.accum -= this.stepTime;
      this.#step(grid);
    }
  }

  #step(grid) {
    const prev = this.segments.map((s) => ({ col: s.col, row: s.row }));
    const next = this.#nextHead(grid);
    for (let i = 0; i < this.segments.length; i++) {
      const cell = i === 0 ? next : prev[i - 1];
      const seg = this.segments[i];
      seg.from.set(seg.group.position.x, 0.38, seg.group.position.z);
      seg.col = cell.col;
      seg.row = cell.row;
      const { x, z } = colRowToWorld(cell.col, cell.row);
      seg.to.set(x, 0.38, z);
    }
  }

  #nextHead(grid) {
    let { col, row } = this.head;
    if (this.diving) {
      let nextRow = row + this.vDir;
      if (nextRow >= ROWS) {
        this.vDir = -1;
        nextRow = row + this.vDir;
        this.diving = false;
      } else if (nextRow < 0) {
        this.vDir = 1;
        nextRow = row + this.vDir;
      }
      if (nextRow >= ROWS - PLAYER_BAND) this.diving = false;
      return { col, row: nextRow };
    }

    let nextCol = col + this.dir;
    let nextRow = row;
    const mushroom = grid.inBounds(nextCol, row) ? grid.get(nextCol, row) : null;
    const blocked = !grid.inBounds(nextCol, row) || Boolean(mushroom);

    if (blocked) {
      if (mushroom?.poisoned) this.diving = true;
      this.dir *= -1;
      nextRow = row + this.vDir;
      if (nextRow >= ROWS) {
        this.vDir = -1;
        nextRow = row + this.vDir;
      }
      if (nextRow < 0) {
        this.vDir = 1;
        nextRow = row + this.vDir;
      }
      if (row >= ROWS - PLAYER_BAND && this.vDir < 0 && nextRow < ROWS - PLAYER_BAND) {
        this.vDir = 1;
        nextRow = Math.min(ROWS - 1, row + this.vDir);
      }
      if (this.diving) {
        nextRow = THREE.MathUtils.clamp(row + this.vDir, 0, ROWS - 1);
        return { col, row: nextRow };
      }
      nextCol = col + this.dir;
      if (!grid.inBounds(nextCol, nextRow) || grid.get(nextCol, nextRow)) {
        nextCol = col;
      }
    }

    nextCol = THREE.MathUtils.clamp(nextCol, 0, COLS - 1);
    nextRow = THREE.MathUtils.clamp(nextRow, 0, ROWS - 1);
    return { col: nextCol, row: nextRow };
  }

  hitIndex(index) {
    const hit = this.segments[index];
    if (!hit) return { mushroomCell: null, leftover: null };
    const mushroomCell = { col: hit.col, row: hit.row, wasHead: hit.isHead || index === 0 };
    disposeObject(this.scene, hit.group);

    const tailCells = this.segments.slice(index + 1).map((s) => ({ col: s.col, row: s.row }));
    const tailMeshes = this.segments.slice(index + 1);
    this.segments.splice(index);

    let leftover = null;
    if (tailCells.length) {
      leftover = new Centipede(this.scene, tailCells, -this.dir, this.stepTime);
      leftover.vDir = this.vDir;
      leftover.diving = this.diving;
      leftover.accum = this.accum;
      for (const extra of tailMeshes) disposeObject(this.scene, extra.group);
    }

    if (!this.segments.length) this.alive = false;
    else this.#refreshHead();
    return { mushroomCell, leftover };
  }

  dispose() {
    for (const seg of this.segments) disposeObject(this.scene, seg.group);
    this.segments = [];
    this.alive = false;
  }
}

export function spawnCentipede(scene, length, stepTime, startCol = Math.floor(COLS / 2), startRow = 0) {
  const cells = [];
  for (let i = 0; i < length; i++) {
    const col = THREE.MathUtils.clamp(startCol - i, 0, COLS - 1);
    cells.push({ col, row: startRow });
  }
  return new Centipede(scene, cells, 1, stepTime);
}
