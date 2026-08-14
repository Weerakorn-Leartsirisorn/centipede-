import * as THREE from 'three';

export class ScreenShake {
  constructor() {
    this.trauma = 0;
    this.offset = new THREE.Vector3();
  }

  add(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.85);
    const mag = this.trauma * this.trauma;
    this.offset.set(
      (Math.random() - 0.5) * 2 * mag * 0.42,
      (Math.random() - 0.5) * 2 * mag * 0.22,
      (Math.random() - 0.5) * 2 * mag * 0.42,
    );
  }
}
