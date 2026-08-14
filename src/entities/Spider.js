import * as THREE from 'three';
import { COLORS, playerBounds, disposeObject } from '../game/constants.js';

export class Spider {
  constructor(scene) {
    this.scene = scene;
    this.alive = true;
    this.hp = 1;
    this.t = 0;
    const b = playerBounds();
    this.group = new THREE.Group();
    this.#build();
    const side = Math.random() < 0.5 ? b.left : b.right;
    this.group.position.set(side, 0.28, THREE.MathUtils.lerp(b.top, b.bottom, Math.random()));
    const inward = side < 0 ? 1 : -1;
    this.vx = inward * (3.2 + Math.random() * 1.6);
    this.vz = (Math.random() < 0.5 ? -1 : 1) * (2.4 + Math.random() * 1.4);
    this.scene.add(this.group);
  }

  #build() {
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.spider,
      emissive: COLORS.spider,
      emissiveIntensity: 0.7,
      metalness: 0.45,
      roughness: 0.35,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mat);
    body.castShadow = true;
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat);
    abdomen.position.set(0, -0.02, 0.22);
    abdomen.scale.set(1, 0.8, 1.15);
    this.group.add(body, abdomen);
    this.legs = [];
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a1638, roughness: 0.5 });
    for (let i = 0; i < 8; i++) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.34, 3, 6), legMat);
      const side = i < 4 ? -1 : 1;
      const z = ((i % 4) - 1.5) * 0.1;
      leg.position.set(side * 0.18, 0.02, z);
      this.group.add(leg);
      this.legs.push({ mesh: leg, side, phase: i });
    }
  }

  get position() {
    return this.group.position;
  }

  update(dt) {
    this.t += dt;
    this.group.position.x += this.vx * dt;
    this.group.position.z += this.vz * dt;
    this.group.position.y = 0.28 + Math.abs(Math.sin(this.t * 10)) * 0.16;

    const b = playerBounds();
    if (this.group.position.x < b.left) {
      this.group.position.x = b.left;
      this.vx *= -1;
    }
    if (this.group.position.x > b.right) {
      this.group.position.x = b.right;
      this.vx *= -1;
    }
    if (this.group.position.z < b.top) {
      this.group.position.z = b.top;
      this.vz *= -1;
    }
    if (this.group.position.z > b.bottom) {
      this.group.position.z = b.bottom;
      this.vz *= -1;
    }
    if (Math.random() < dt * 0.7) {
      this.vx += (Math.random() - 0.5) * 3;
      this.vz += (Math.random() - 0.5) * 3;
      const sp = Math.hypot(this.vx, this.vz);
      if (sp > 6) {
        this.vx = (this.vx / sp) * 6;
        this.vz = (this.vz / sp) * 6;
      }
    }

    for (const leg of this.legs) {
      leg.mesh.rotation.z = leg.side * (0.6 + Math.sin(this.t * 14 + leg.phase) * 0.5);
    }
    this.group.rotation.y = Math.atan2(this.vx, this.vz);
  }

  proximityScore(playerZ) {
    const { top, bottom } = playerBounds();
    const near = Math.abs(this.group.position.z - playerZ);
    const band = bottom - top;
    if (near < band * 0.28) return 'spiderNear';
    if (near < band * 0.55) return 'spiderMid';
    return 'spiderFar';
  }

  dispose() {
    disposeObject(this.scene, this.group);
  }
}
