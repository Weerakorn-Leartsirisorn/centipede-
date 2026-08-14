import * as THREE from 'three';
import { COLORS, POWERUP_DURATION, disposeObject } from '../game/constants.js';

export const POWER_TYPES = ['rapid', 'spread', 'shield', 'slow'];

const LOOK = {
  rapid: { color: COLORS.cyan, label: 'Rapid' },
  spread: { color: 0x9ad0ff, label: 'Spread' },
  shield: { color: 0xb8ff9a, label: 'Shield' },
  slow: { color: COLORS.gold, label: 'Slow' },
};

export class PowerUp {
  constructor(scene, position, type) {
    this.scene = scene;
    this.type = type;
    this.alive = true;
    this.life = 10;
    this.look = LOOK[type];
    this.mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22),
      new THREE.MeshStandardMaterial({
        color: this.look.color,
        emissive: this.look.color,
        emissiveIntensity: 1.4,
        metalness: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95,
      }),
    );
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.45;
    this.baseY = 0.45;
    this.t = Math.random() * 10;
    this.scene.add(this.mesh);
  }

  get position() {
    return this.mesh.position;
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    this.mesh.rotation.y += dt * 2.2;
    this.mesh.rotation.x += dt * 0.8;
    this.mesh.position.y = this.baseY + Math.sin(this.t * 4) * 0.1;
    if (this.life < 2) this.mesh.material.opacity = 0.35 + 0.65 * Math.abs(Math.sin(this.t * 12));
    if (this.life <= 0) this.alive = false;
  }

  dispose() {
    disposeObject(this.scene, this.mesh);
  }
}

export { POWERUP_DURATION, LOOK as POWER_LOOK };
