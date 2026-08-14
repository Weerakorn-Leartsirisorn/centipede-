import * as THREE from 'three';
import { COLORS, playerBounds, colRowToWorld, disposeObject } from '../game/constants.js';

export class Flea {
  constructor(scene, col) {
    this.scene = scene;
    this.alive = true;
    this.hp = 2;
    this.col = col;
    this.speed = 7.2;
    this.dropAcc = 0;
    this.group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.flea,
      emissive: COLORS.flea,
      emissiveIntensity: 0.85,
      metalness: 0.3,
      roughness: 0.4,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.22, 4, 8), mat);
    body.castShadow = true;
    this.group.add(body);
    const { x, z } = colRowToWorld(col, 0);
    this.group.position.set(x, 0.4, z - 1.2);
    this.scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  hit() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    this.speed = 12.5;
    return false;
  }

  update(dt) {
    this.group.position.z += this.speed * dt;
    this.group.position.y = 0.4 + Math.sin(performance.now() * 0.02) * 0.08;
    this.group.scale.y = 1 + Math.sin(performance.now() * 0.03) * 0.12;
    const { bottom } = playerBounds();
    if (this.group.position.z > bottom + 1.4) this.alive = false;
  }

  dispose() {
    disposeObject(this.scene, this.group);
  }
}
