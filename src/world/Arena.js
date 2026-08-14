import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLS, ROWS, CELL, COLORS, colRowToWorld } from '../game/constants.js';

export class Arena {
  constructor(canvas) {
    this.canvas = canvas;
    this.frustumSize = 17.4;

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
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bg);
    this.scene.fog = new THREE.Fog(COLORS.bg, 28, 48);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      (-this.frustumSize * aspect) / 2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      0.1,
      80,
    );

    const dist = 26;
    this.basePosition = new THREE.Vector3(dist, dist, dist);
    this.lookTarget = new THREE.Vector3(0, 0.2, 1.2);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.lookTarget);
    this.camera.up.set(0, 1, 0);

    this._offset = new THREE.Vector3();
    this._camScratch = new THREE.Vector3();

    this.#lights();
    this.#ground();
    this.#frame();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.72,
      0.42,
      0.72,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', () => this.resize());
  }

  #lights() {
    const hemi = new THREE.HemisphereLight(0x9ad8ff, 0x1a1020, 0.55);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff4e5, 1.35);
    key.position.set(10, 18, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 50;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.bias = -0.0008;
    this.scene.add(key);
    this.keyLight = key;

    const rimCyan = new THREE.DirectionalLight(0x5cffea, 0.55);
    rimCyan.position.set(-12, 8, -8);
    this.scene.add(rimCyan);

    const rimMagenta = new THREE.PointLight(0xff4d9a, 8, 28, 2);
    rimMagenta.position.set(8, 4, 10);
    this.scene.add(rimMagenta);

    const fill = new THREE.PointLight(0x5cffea, 4.5, 22, 2);
    fill.position.set(-6, 3.5, 8);
    this.scene.add(fill);
  }

  #ground() {
    const width = COLS * CELL + 1.6;
    const depth = ROWS * CELL + 1.6;
    const geo = new THREE.PlaneGeometry(width, depth, COLS, ROWS);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: 0.86,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x15202b,
      roughness: 0.78,
      metalness: 0.12,
      emissive: 0x0b2a28,
      emissiveIntensity: 0.18,
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

    const grid = new THREE.GridHelper(Math.max(width, depth) - 0.4, Math.max(COLS, ROWS), 0x1f6f68, 0x16343a);
    grid.position.y = 0.06;
    grid.material.transparent = true;
    grid.material.opacity = 0.28;
    this.scene.add(grid);
  }

  #frame() {
    const width = COLS * CELL + 0.35;
    const depth = ROWS * CELL + 0.35;
    const bar = new THREE.MeshStandardMaterial({
      color: 0x0d141c,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.35,
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

  applyShake(x, y, z) {
    this._offset.set(x, y, z);
    this._camScratch.copy(this.basePosition).add(this._offset);
    this.camera.position.copy(this._camScratch);
    this.camera.lookAt(this.lookTarget);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  render() {
    this.composer.render();
  }
}
