import * as THREE from 'three';
import { BULLET_SPEED, COLORS, boardBounds, disposeObject } from '../game/constants.js';

export class Bullet {
  constructor(scene, origin, direction, speed = BULLET_SPEED) {
    this.scene = scene;
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    this.alive = true;
    this.radius = 0.16;

    this.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07, 0.28, 4, 8),
      new THREE.MeshStandardMaterial({
        color: COLORS.cyan,
        emissive: COLORS.cyan,
        emissiveIntensity: 2.2,
        roughness: 0.2,
      }),
    );
    this.mesh.position.copy(origin);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    this.scene.add(this.mesh);
  }

  get position() {
    return this.mesh.position;
  }

  update(dt) {
    this.mesh.position.addScaledVector(this.velocity, dt);
    const b = boardBounds();
    const p = this.mesh.position;
    if (p.x < b.left - 1.2 || p.x > b.right + 1.2 || p.z < b.top - 1.2 || p.z > b.bottom + 1.2) {
      this.alive = false;
    }
  }

  dispose() {
    disposeObject(this.scene, this.mesh);
  }
}
