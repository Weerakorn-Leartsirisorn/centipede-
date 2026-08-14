import * as THREE from 'three';
import { MUSHROOM_HP, COLORS, colRowToWorld, disposeObject } from '../game/constants.js';

export class Mushroom {
  constructor(scene, col, row, poisoned = false) {
    this.scene = scene;
    this.col = col;
    this.row = row;
    this.hp = MUSHROOM_HP;
    this.poisoned = poisoned;
    this.t = Math.random() * Math.PI * 2;
    this.group = new THREE.Group();
    this.#build();
    const { x, z } = colRowToWorld(col, row);
    this.group.position.set(x, 0, z);
    this.scene.add(this.group);
    this.#applyLook();
  }

  #build() {
    this.stemMat = new THREE.MeshStandardMaterial({
      color: 0xd9d3c7,
      roughness: 0.72,
      metalness: 0.05,
    });
    this.capMat = new THREE.MeshStandardMaterial({
      color: COLORS.magenta,
      emissive: COLORS.magenta,
      emissiveIntensity: 0.45,
      roughness: 0.38,
      metalness: 0.15,
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.26, 8), this.stemMat);
    stem.position.y = 0.13;
    stem.castShadow = true;
    this.cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      this.capMat,
    );
    this.cap.position.y = 0.24;
    this.cap.scale.set(1, 0.72, 1);
    this.cap.castShadow = true;
    this.group.add(stem, this.cap);
  }

  poison() {
    this.poisoned = true;
    this.#applyLook();
  }

  hit() {
    this.hp -= 1;
    this.#applyLook();
    return this.hp <= 0;
  }

  #applyLook() {
    const damage = (MUSHROOM_HP - this.hp) / MUSHROOM_HP;
    const s = 1 - damage * 0.42;
    this.group.scale.setScalar(s);
    if (this.poisoned) {
      this.capMat.color.set(COLORS.poison);
      this.capMat.emissive.set(COLORS.poison);
      this.capMat.emissiveIntensity = 1.15;
    } else {
      this.capMat.color.setHex(0xff4d9a);
      this.capMat.emissive.setHex(0xff4d9a);
      this.capMat.emissiveIntensity = 0.45 - damage * 0.25;
    }
  }

  update(dt) {
    this.t += dt;
    this.group.rotation.y = Math.sin(this.t * 0.7) * 0.08;
  }

  dispose() {
    disposeObject(this.scene, this.group);
  }
}
