import * as THREE from 'three';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointer = new THREE.Vector2();
    this.mouseDown = false;
    this.pausePressed = false;
    this._pauseQueued = false;

    this.aim = new THREE.Vector3(0, 0, -1);
    this._raycaster = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit = new THREE.Vector3();

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'Escape') this._pauseQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('pointerdown', (e) => {
      this.mouseDown = true;
      this.#setPointer(e);
    });
    window.addEventListener('pointerup', () => {
      this.mouseDown = false;
    });
    window.addEventListener('pointermove', (e) => this.#setPointer(e));
  }

  #setPointer(e) {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  consumePause() {
    const v = this._pauseQueued;
    this._pauseQueued = false;
    return v;
  }

  get moveX() {
    let x = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    return x;
  }

  get moveZ() {
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    return z;
  }

  get firing() {
    return this.mouseDown || this.keys.has('Space');
  }

  updateAim(camera, origin) {
    this._raycaster.setFromCamera(this.pointer, camera);
    if (this._raycaster.ray.intersectPlane(this._plane, this._hit)) {
      this.aim.set(this._hit.x - origin.x, 0, this._hit.z - origin.z);
      if (this.aim.lengthSq() < 0.04) this.aim.set(0, 0, -1);
      else this.aim.normalize();
    }
  }
}
