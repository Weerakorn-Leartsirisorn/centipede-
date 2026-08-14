import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLS, ROWS, CELL, COLORS, colRowToWorld } from '../game/constants.js';

export class Arena {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bg);
    this.scene.fog = new THREE.Fog(COLORS.bg, 70, 120);

    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 120);

    // Look from behind the player (+Z) so the near edge is a flat strip at the
    // bottom of the screen, not a diamond tip. Slight X offset keeps depth.
    this.basePosition = new THREE.Vector3(5.5, 22, 28);
    this.lookTarget = new THREE.Vector3(0, 0, -0.8);
    this.camera.position.copy(this.basePosition);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.lookTarget);

    this._offset = new THREE.Vector3();
    this._camScratch = new THREE.Vector3();
    this._fitVec = new THREE.Vector3();

    this.#lights();
    this.#ground();
    this.#frame();
    this.#fitToBoard();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55,
      0.38,
      0.78,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', () => this.resize());
  }

  #lights() {
    const hemi = new THREE.HemisphereLight(0xc4e4ff, 0x243044, 1.15);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0x6a7c92, 0.35);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff2df, 1.55);
    key.position.set(8, 24, 16);
    key.target.position.set(0, 0, 0);
    this.scene.add(key.target);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 70;
    key.shadow.camera.left = -18;
    key.shadow.camera.right = 18;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    key.shadow.bias = -0.0008;
    this.scene.add(key);
    this.keyLight = key;

    const farFill = new THREE.DirectionalLight(0x9ec7ff, 0.7);
    farFill.position.set(-6, 16, -18);
    farFill.target.position.set(0, 0, 0);
    this.scene.add(farFill.target);
    this.scene.add(farFill);

    const rimCyan = new THREE.DirectionalLight(0x5cffea, 0.4);
    rimCyan.position.set(-14, 10, 4);
    this.scene.add(rimCyan);

    const center = new THREE.PointLight(0x7ee8ff, 12, 42, 1.2);
    center.position.set(0, 9, 0);
    this.scene.add(center);

    const farGlow = new THREE.PointLight(0xff4d9a, 8, 34, 1.3);
    farGlow.position.set(4, 6, -8);
    this.scene.add(farGlow);
  }

  #ground() {
    const width = COLS * CELL + 1.6;
    const depth = ROWS * CELL + 1.6;
    const geo = new THREE.PlaneGeometry(width, depth, COLS, ROWS);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: 0.82,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x223040,
      roughness: 0.74,
      metalness: 0.12,
      emissive: 0x123832,
      emissiveIntensity: 0.28,
    });
    const tileGeo = new THREE.BoxGeometry(CELL * 0.92, 0.05, CELL * 0.92);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((c + r) % 2 === 0) continue;
        const tile = new THREE.Mesh(tileGeo, tileMat);
        const { x, z } = colRowToWorld(c, r);
        tile.position.set(x, 0.028, z);
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }

    const grid = new THREE.GridHelper(Math.max(width, depth) - 0.4, Math.max(COLS, ROWS), 0x2a8f86, 0x1c4a52);
    grid.position.y = 0.06;
    grid.material.transparent = true;
    grid.material.opacity = 0.38;
    this.scene.add(grid);
  }

  #frame() {
    const width = COLS * CELL + 0.35;
    const depth = ROWS * CELL + 0.35;
    const bar = new THREE.MeshStandardMaterial({
      color: 0x0d141c,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.6,
    });
    const long = new THREE.BoxGeometry(width + 0.28, 0.16, 0.16);
    const short = new THREE.BoxGeometry(0.16, 0.16, depth + 0.28);
    const north = new THREE.Mesh(long, bar);
    const south = new THREE.Mesh(long, bar);
    const west = new THREE.Mesh(short, bar);
    const east = new THREE.Mesh(short, bar);
    north.position.set(0, 0.1, colRowToWorld(0, 0).z - 0.62);
    south.position.set(0, 0.1, colRowToWorld(0, ROWS - 1).z + 0.62);
    west.position.set(colRowToWorld(0, 0).x - 0.62, 0.1, 0);
    east.position.set(colRowToWorld(COLS - 1, 0).x + 0.62, 0.1, 0);
    this.scene.add(north, south, west, east);

    const cornerGeo = new THREE.OctahedronGeometry(0.18);
    const cornerMat = new THREE.MeshStandardMaterial({
      color: COLORS.magenta,
      emissive: COLORS.magenta,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });
    const corners = [
      [west.position.x, north.position.z],
      [east.position.x, north.position.z],
      [west.position.x, south.position.z],
      [east.position.x, south.position.z],
    ];
    for (const [x, z] of corners) {
      const m = new THREE.Mesh(cornerGeo, cornerMat);
      m.position.set(x, 0.22, z);
      this.scene.add(m);
    }
  }

  #fitToBoard() {
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.lookTarget);
    this.camera.updateMatrixWorld();

    const inv = this.camera.matrixWorldInverse;
    const v = this._fitVec;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const c of [0, COLS - 1]) {
      for (const r of [0, ROWS - 1]) {
        const { x, z } = colRowToWorld(c, r);
        v.set(x, 0.5, z).applyMatrix4(inv);
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }
    }

    const pad = 1.4;
    minX -= pad;
    maxX += pad;
    minY -= pad;
    maxY += pad;

    let width = maxX - minX;
    let height = maxY - minY;
    const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    const boardAspect = width / height;

    if (boardAspect > aspect) {
      const extra = width / aspect - height;
      minY -= extra / 2;
      maxY += extra / 2;
    } else {
      const extra = height * aspect - width;
      minX -= extra / 2;
      maxX += extra / 2;
    }

    this.camera.left = minX;
    this.camera.right = maxX;
    this.camera.top = maxY;
    this.camera.bottom = minY;
    this.camera.updateProjectionMatrix();
  }

  applyShake(x, y, z) {
    this._offset.set(x, y, z);
    this._camScratch.copy(this.basePosition).add(this._offset);
    this.camera.position.copy(this._camScratch);
    this.camera.lookAt(this.lookTarget);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.#fitToBoard();
  }

  render() {
    this.composer.render();
  }
}
