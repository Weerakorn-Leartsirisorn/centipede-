import * as THREE from 'three';
import { COLS, COLORS, colRowToWorld, disposeObject } from '../game/constants.js';

export class Scorpion {
  constructor(scene, row) {
    this.scene = scene;
    this.alive = true;
    this.row = row;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.speed = 4.6;
    this.group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.scorpion,
      emissive: COLORS.scorpion,
      emissiveIntensity: 0.55,
      metalness: 0.5,
      roughness: 0.32,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.36, 4, 8), mat);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 8), mat);
    tail.position.set(0, 0.22, -0.22);
    tail.rotation.x = -0.8;
    const sting = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({
        color: COLORS.poison,
        emissive: COLORS.poison,
        emissiveIntensity: 1.6,
      }),
    );
    sting.position.set(0, 0.36, -0.32);
    this.group.add(body, tail, sting);
    const startCol = this.dir > 0 ? -1 : COLS;
    const { x, z } = colRowToWorld(startCol, row);
    this.group.position.set(x, 0.32, z);
    this.group.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  update(dt) {
    this.group.position.x += this.dir * this.speed * dt;
    this.group.position.y = 0.32 + Math.sin(performance.now() * 0.01) * 0.04;
    const { x } = colRowToWorld(this.dir > 0 ? COLS : -1, this.row);
    if (this.dir > 0 && this.group.position.x > x + 1.5) this.alive = false;
    if (this.dir < 0 && this.group.position.x < x - 1.5) this.alive = false;
  }

  dispose() {
    disposeObject(this.scene, this.group);
  }
}
