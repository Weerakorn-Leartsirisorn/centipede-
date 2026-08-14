import * as THREE from 'three';

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.capacity = 420;
    this.geo = new THREE.SphereGeometry(1, 6, 6);
    this.mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.2,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 1,
    });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, this.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = this.capacity;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.data = Array.from({ length: this.capacity }, () => ({
      life: 0,
      max: 1,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      scale: 0.08,
      color: new THREE.Color(),
    }));
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    if (this.mesh.instanceColor === null) {
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3);
    }
    this.#hideAll();

    this.floaters = [];
  }

  #hideAll() {
    this.dummy.scale.setScalar(0.0001);
    this.dummy.position.set(0, -10, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < this.capacity; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color.setHex(0xffffff));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  burst(position, color, count = 18, speed = 5) {
    const c = new THREE.Color(color);
    let spawned = 0;
    for (const p of this.data) {
      if (p.life > 0) continue;
      p.life = p.max = 0.35 + Math.random() * 0.45;
      p.pos.copy(position);
      p.pos.y += 0.2;
      p.vel.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.9, (Math.random() - 0.5) * speed);
      p.scale = 0.04 + Math.random() * 0.08;
      p.color.copy(c);
      spawned += 1;
      if (spawned >= count) break;
    }
  }

  floatText(position, text, color = '#5cffea') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    ctx.font = 'bold 56px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillText(text, 128, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    sprite.position.copy(position);
    sprite.position.y += 0.7;
    sprite.scale.set(1.4, 0.7, 1);
    this.scene.add(sprite);
    this.floaters.push({ sprite, life: 0.85, vy: 1.15 });
  }

  update(dt) {
    for (let i = 0; i < this.capacity; i++) {
      const p = this.data[i];
      if (p.life <= 0) {
        this.dummy.scale.setScalar(0.0001);
        this.dummy.position.set(0, -12, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.life -= dt;
      p.vel.y -= 9 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const k = Math.max(0, p.life / p.max);
      this.dummy.position.copy(p.pos);
      this.dummy.scale.setScalar(p.scale * (0.35 + k));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, p.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.sprite.position.y += f.vy * dt;
      f.sprite.material.opacity = Math.max(0, f.life / 0.85);
      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        f.sprite.material.map.dispose();
        f.sprite.material.dispose();
        this.floaters.splice(i, 1);
      }
    }
  }

  clearFloaters() {
    for (const f of this.floaters) {
      this.scene.remove(f.sprite);
      f.sprite.material.map.dispose();
      f.sprite.material.dispose();
    }
    this.floaters = [];
    for (const p of this.data) p.life = 0;
  }
}
