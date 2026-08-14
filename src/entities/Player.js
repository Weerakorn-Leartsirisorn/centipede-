import * as THREE from 'three';
import {
  COLS,
  ROWS,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  FIRE_COOLDOWN,
  RAPID_COOLDOWN,
  COLORS,
  colRowToWorld,
  worldToColRow,
  playerBounds,
  disposeObject,
} from '../game/constants.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.cooldown = 0;
    this.alive = true;
    this.group = new THREE.Group();
    this.#build();
    this.scene.add(this.group);
    this.resetPosition();
  }

  #build() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd7f8ff,
      metalness: 0.72,
      roughness: 0.28,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.22,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x152028,
      metalness: 0.4,
      roughness: 0.45,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: COLORS.cyan,
      emissive: COLORS.cyan,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.18, 12), bodyMat);
    hull.position.y = 0.22;
    hull.castShadow = true;

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
    dome.position.y = 0.32;
    dome.castShadow = true;

    this.turret = new THREE.Group();
    this.turret.position.y = 0.34;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.48, 8), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.22;
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), glowMat);
    muzzle.position.z = -0.46;
    this.muzzle = muzzle;
    this.turret.add(barrel, muzzle);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 24), glowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;

    this.shieldMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.035, 8, 28),
      new THREE.MeshStandardMaterial({
        color: COLORS.cyan,
        emissive: COLORS.cyan,
        emissiveIntensity: 1.6,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
      }),
    );
    this.shieldMesh.rotation.x = Math.PI / 2;
    this.shieldMesh.position.y = 0.28;
    this.shieldMesh.visible = false;

    this.group.add(hull, dome, this.turret, ring, this.shieldMesh);
  }

  resetPosition() {
    const { x, z } = colRowToWorld(Math.floor(COLS / 2), ROWS - 2);
    this.group.position.set(x, 0, z);
    this.cooldown = 0;
    this.alive = true;
  }

  get position() {
    return this.group.position;
  }

  muzzleWorld() {
    const v = new THREE.Vector3();
    this.muzzle.getWorldPosition(v);
    return v;
  }

  update(dt, input, grid, powerups, invuln) {
    const speed = PLAYER_SPEED;
    let dx = input.moveX;
    let dz = input.moveZ;
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }

    const next = this.group.position.clone();
    next.x += dx * speed * dt;
    if (!this.#blocked(next, grid)) this.group.position.x = next.x;
    else next.x = this.group.position.x;

    next.z += dz * speed * dt;
    if (!this.#blocked(next, grid)) this.group.position.z = next.z;

    const b = playerBounds();
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, b.left, b.right);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, b.top, b.bottom);

    this.group.position.y = 0.02 + Math.sin(performance.now() * 0.006) * 0.03;

    this.turret.rotation.y = Math.atan2(-input.aim.x, -input.aim.z);

    this.shieldMesh.visible = powerups.shield > 0;
    if (this.shieldMesh.visible) this.shieldMesh.rotation.z += dt * 2.4;

    const flash = invuln > 0 && Math.sin(performance.now() * 0.028) < 0;
    for (const child of this.group.children) {
      if (child === this.shieldMesh) continue;
      child.visible = !flash;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  #blocked(pos, grid) {
    const { col, row } = worldToColRow(pos.x, pos.z);
    const nearby = [
      [col, row],
      [col + 1, row],
      [col - 1, row],
      [col, row + 1],
      [col, row - 1],
    ];
    for (const [c, r] of nearby) {
      const m = grid.get(c, r);
      if (!m) continue;
      const { x, z } = colRowToWorld(c, r);
      if (Math.hypot(pos.x - x, pos.z - z) < PLAYER_RADIUS + 0.28) return true;
    }
    return false;
  }

  canFire() {
    return this.alive && this.cooldown <= 0;
  }

  kickCooldown(rapid) {
    this.cooldown = rapid ? RAPID_COOLDOWN : FIRE_COOLDOWN;
  }

  dispose() {
    disposeObject(this.scene, this.group);
  }
}
