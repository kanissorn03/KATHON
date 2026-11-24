import * as THREE from 'three';
import { KrathongId } from '../types';
import { createGlowSprite } from './TextureHelpers';

export interface AnimatedKrathong {
  group: THREE.Group;
  flames: THREE.Mesh[];
  glows: THREE.Sprite[];
  update: (time: number, phaseOffset?: number) => void;
}

function addCandleAndIncense(
  group: THREE.Group,
  flames: THREE.Mesh[],
  glows: THREE.Sprite[],
  positions: [number, number, number][],
  candleColor = '#fff0b3'
): void {
  const candleGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.16, 10);
  const candleMat = new THREE.MeshStandardMaterial({
    color: candleColor,
    roughness: 0.45,
    emissive: '#442b00',
    emissiveIntensity: 0.25
  });

  const flameGeo = new THREE.ConeGeometry(0.026, 0.085, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffdf73' });

  for (const [x, y, z] of positions) {
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(x, y + 0.08, z);
    group.add(candle);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(x, y + 0.19, z);
    group.add(flame);
    flames.push(flame);

    const glow = createGlowSprite('#ffbe55', 0.45, 0.8);
    glow.position.set(x, y + 0.2, z);
    group.add(glow);
    glows.push(glow);
  }

  // 3 cute incense sticks
  const stickGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.24, 6);
  const stickMat = new THREE.MeshStandardMaterial({ color: '#c4864b', roughness: 0.8 });
  const emberGeo = new THREE.SphereGeometry(0.011, 6, 6);
  const emberMat = new THREE.MeshBasicMaterial({ color: '#ff5226' });

  const basePos = positions[0] ?? [0, 0.16, 0];
  for (let i = -1; i <= 1; i++) {
    const holder = new THREE.Group();
    holder.position.set(basePos[0] + i * 0.025, basePos[1] + 0.02, basePos[2] - 0.05);
    holder.rotation.z = i * 0.14;
    holder.rotation.x = -0.14;

    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = 0.12;
    holder.add(stick);

    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.y = 0.24;
    holder.add(ember);
    group.add(holder);
  }
}

function addLeafRing(group: THREE.Group, count: number, radius: number, y: number, color: string, tilt = 0.55): void {
  const leafGeo = new THREE.ConeGeometry(0.075, 0.16, 5);
  const leafMat = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = -angle + Math.PI / 2;
    leaf.rotation.x = tilt;
    group.add(leaf);
  }
}

function addLotusFlower(group: THREE.Group, x: number, y: number, z: number, petalColor: string, scale = 1): void {
  const flower = new THREE.Group();
  flower.position.set(x, y, z);
  flower.scale.setScalar(scale);

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#ffd95e', roughness: 0.5 })
  );
  center.position.y = 0.02;
  flower.add(center);

  const petalGeo = new THREE.SphereGeometry(0.052, 8, 8);
  petalGeo.scale(0.65, 1.35, 0.35);
  const petalMat = new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.55 });

  for (let ring = 0; ring < 2; ring++) {
    const count = ring === 0 ? 6 : 8;
    const r = ring === 0 ? 0.045 : 0.078;
    const tilt = ring === 0 ? 0.48 : 0.88;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.35;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
      petal.rotation.order = 'YXZ';
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = tilt;
      flower.add(petal);
    }
  }
  group.add(flower);
}

export function createKrathongMesh(id: KrathongId, scale = 1): AnimatedKrathong {
  const group = new THREE.Group();
  const flames: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];

  if (id === 'banana_lotus') {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.25, 0.11, 16),
      new THREE.MeshStandardMaterial({ color: '#4d9b4d', roughness: 0.78 })
    );
    base.position.y = 0.055;
    group.add(base);

    addLeafRing(group, 14, 0.27, 0.12, '#62b85a', 0.52);
    addLeafRing(group, 10, 0.19, 0.14, '#7cd16b', 0.32);

    // Mini marigolds around rim
    const mgGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const mgMat = new THREE.MeshStandardMaterial({ color: '#ffbd38', roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const mg = new THREE.Mesh(mgGeo, mgMat);
      mg.position.set(Math.cos(a) * 0.17, 0.13, Math.sin(a) * 0.17);
      group.add(mg);
    }

    addLotusFlower(group, 0, 0.12, 0.04, '#ff9ec6', 1.15);
    addCandleAndIncense(group, flames, glows, [[0, 0.16, 0]]);
  } else if (id === 'bread_turtle') {
    // Bread base platform
    const breadMat = new THREE.MeshStandardMaterial({ color: '#e5a357', roughness: 0.85 });
    const crustMat = new THREE.MeshStandardMaterial({ color: '#c47c32', roughness: 0.85 });

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), breadMat);
    shell.scale.set(1, 0.75, 1.18);
    shell.position.y = 0.04;
    group.add(shell);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.045, 8, 20), crustMat);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1, 1.18, 1);
    rim.position.y = 0.05;
    group.add(rim);

    // Cute turtle head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), breadMat);
    head.position.set(0, 0.11, 0.3);
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.017, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#2b1b12' });
    for (const sx of [-0.04, 0.04]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(sx, 0.135, 0.375);
      group.add(eye);
    }

    // 4 cute legs + tiny tail
    const legGeo = new THREE.SphereGeometry(0.055, 8, 8);
    legGeo.scale(1, 0.65, 1.25);
    const legPos: [number, number][] = [
      [-0.2, 0.16],
      [0.2, 0.16],
      [-0.19, -0.15],
      [0.19, -0.15]
    ];
    for (const [lx, lz] of legPos) {
      const leg = new THREE.Mesh(legGeo, crustMat);
      leg.position.set(lx, 0.04, lz);
      group.add(leg);
    }

    addLotusFlower(group, 0, 0.17, -0.02, '#ffb6d5', 0.75);
    addCandleAndIncense(group, flames, glows, [[0, 0.18, 0.03]], '#ffe08a');
  } else if (id === 'golden_marigold') {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.25, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: '#569c4c', roughness: 0.7 })
    );
    base.position.y = 0.06;
    group.add(base);

    addLeafRing(group, 16, 0.28, 0.12, '#e8b948', 0.48);

    const mgGeo = new THREE.SphereGeometry(0.062, 10, 8);
    const mgMat1 = new THREE.MeshStandardMaterial({ color: '#ffbc2e', roughness: 0.65 });
    const mgMat2 = new THREE.MeshStandardMaterial({ color: '#ffe066', roughness: 0.65 });

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const m = new THREE.Mesh(mgGeo, i % 2 === 0 ? mgMat1 : mgMat2);
      m.position.set(Math.cos(a) * 0.19, 0.15, Math.sin(a) * 0.19);
      group.add(m);
    }

    // Jasmine inner ring
    const jasGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const jasMat = new THREE.MeshStandardMaterial({ color: '#fffef5', roughness: 0.5 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const j = new THREE.Mesh(jasGeo, jasMat);
      j.position.set(Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.1);
      group.add(j);
    }

    addCandleAndIncense(group, flames, glows, [[0, 0.16, 0]], '#fff3b8');
  } else if (id === 'sweetheart_couple') {
    // Heart-shaped base built from ExtrudeGeometry
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.12);
    heartShape.bezierCurveTo(0, 0.16, -0.08, 0.28, -0.22, 0.28);
    heartShape.bezierCurveTo(-0.36, 0.28, -0.36, 0.06, -0.36, 0.06);
    heartShape.bezierCurveTo(-0.36, -0.1, -0.18, -0.24, 0, -0.34);
    heartShape.bezierCurveTo(0.18, -0.24, 0.36, -0.1, 0.36, 0.06);
    heartShape.bezierCurveTo(0.36, 0.06, 0.36, 0.28, 0.22, 0.28);
    heartShape.bezierCurveTo(0.08, 0.28, 0, 0.16, 0, 0.12);

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2
    });
    heartGeo.rotateX(Math.PI / 2);

    const heartBase = new THREE.Mesh(
      heartGeo,
      new THREE.MeshStandardMaterial({ color: '#ff7da8', roughness: 0.62 })
    );
    heartBase.position.y = 0.12;
    group.add(heartBase);

    // Cute rosebuds on heart rim
    const roseGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const roseMat = new THREE.MeshStandardMaterial({ color: '#ff4f87', roughness: 0.55 });
    const roseMatLight = new THREE.MeshStandardMaterial({ color: '#ffc2d9', roughness: 0.55 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = new THREE.Mesh(roseGeo, i % 2 === 0 ? roseMat : roseMatLight);
      r.position.set(Math.cos(a) * 0.2, 0.14, Math.sin(a) * 0.18);
      group.add(r);
    }

    // Twin couple candles!
    addCandleAndIncense(
      group,
      flames,
      glows,
      [
        [-0.075, 0.13, 0.03],
        [0.075, 0.13, 0.03]
      ],
      '#ffd1e6'
    );
  } else if (id === 'coconut_orchid') {
    // Coconut bowl
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: '#6b4226', roughness: 0.85, side: THREE.DoubleSide })
    );
    bowl.position.y = 0.21;
    group.add(bowl);

    // Inner coconut meat rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.02, 8, 20),
      new THREE.MeshStandardMaterial({ color: '#f7f2e8', roughness: 0.65 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.21;
    group.add(rim);

    // Pandan green leaves & purple Thai orchids
    addLeafRing(group, 8, 0.21, 0.19, '#4c9956', 0.65);
    addLotusFlower(group, -0.09, 0.19, 0.08, '#c67dff', 0.8);
    addLotusFlower(group, 0.1, 0.19, -0.05, '#e2a3ff', 0.78);
    addCandleAndIncense(group, flames, glows, [[0, 0.16, 0]], '#fff3c4');
  } else {
    // crystal_lotus
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.2, 0.08, 16),
      new THREE.MeshStandardMaterial({
        color: '#6ecdf2',
        roughness: 0.25,
        metalness: 0.15,
        emissive: '#236e9e',
        emissiveIntensity: 0.45
      })
    );
    base.position.y = 0.04;
    group.add(base);

    const petalGeo = new THREE.SphereGeometry(0.068, 10, 8);
    petalGeo.scale(0.68, 1.5, 0.34);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#a3f0ff',
      emissive: '#3ea8e8',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.84,
      roughness: 0.2
    });

    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? 7 : 10;
      const r = ring === 0 ? 0.11 : 0.19;
      const tilt = ring === 0 ? 0.48 : 0.82;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ring * 0.25;
        const p = new THREE.Mesh(petalGeo, crystalMat);
        p.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
        p.rotation.order = 'YXZ';
        p.rotation.y = -a + Math.PI / 2;
        p.rotation.x = tilt;
        group.add(p);
      }
    }

    const coreGlow = createGlowSprite('#8cf0ff', 0.75, 0.65);
    coreGlow.position.y = 0.15;
    group.add(coreGlow);
    glows.push(coreGlow);

    addCandleAndIncense(group, flames, glows, [[0, 0.11, 0]], '#d6f9ff');
  }

  group.scale.setScalar(scale);

  return {
    group,
    flames,
    glows,
    update: (time: number, phaseOffset = 0) => {
      const t = time + phaseOffset;
      flames.forEach((f, idx) => {
        const flicker = 1 + Math.sin(t * 14 + idx * 2.1) * 0.14 + Math.cos(t * 23) * 0.08;
        f.scale.set(1, flicker, 1);
        f.rotation.z = Math.sin(t * 9 + idx) * 0.08;
      });
      glows.forEach((g, idx) => {
        const pulse = 0.82 + Math.sin(t * 8 + idx * 1.7) * 0.14;
        g.material.opacity = pulse;
      });
    }
  };
}

/**
 * Single shared lightweight WebGL preview controller inside the Krathong Shop modal
 * (avoids spawning multiple WebGL contexts on iPad/iOS Safari).
 */
export class KrathongPreviewController {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private current: AnimatedKrathong | null = null;
  private rafId: number | null = null;
  private rotY = 0;
  private dragging = false;
  private lastX = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    this.camera.position.set(0, 0.68, 1.32);
    this.camera.lookAt(0, 0.16, 0);

    const hemi = new THREE.HemisphereLight('#d6e5ff', '#2c1e3d', 1.25);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight('#ffe4b5', 1.5);
    key.position.set(1.5, 2.5, 2);
    this.scene.add(key);
    const rim = new THREE.PointLight('#ff9ec6', 1.2, 5);
    rim.position.set(-1.2, 1.1, -1.2);
    this.scene.add(rim);
  }

  public attachCanvas(canvas: HTMLCanvasElement, krathongId: KrathongId): void {
    if (!this.renderer || this.renderer.domElement !== canvas) {
      this.disposeRenderer();
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.bindDrag(canvas);
    }

    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width || 220, 160);
    const h = Math.max(rect.height || 180, 140);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.setKrathong(krathongId);
    this.startLoop();
  }

  private bindDrag(canvas: HTMLCanvasElement): void {
    canvas.onpointerdown = (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
    };
    canvas.onpointermove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.rotY += dx * 0.015;
    };
    canvas.onpointerup = () => {
      this.dragging = false;
    };
    canvas.onpointercancel = () => {
      this.dragging = false;
    };
  }

  public setKrathong(id: KrathongId): void {
    if (this.current) {
      this.scene.remove(this.current.group);
    }
    this.current = createKrathongMesh(id, 1.18);
    this.scene.add(this.current.group);
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (!this.renderer) return;
      const t = now * 0.001;
      if (this.current) {
        if (!this.dragging) {
          this.rotY += 0.012;
        }
        this.current.group.rotation.y = this.rotY;
        this.current.group.position.y = Math.sin(t * 2.2) * 0.02;
        this.current.update(t);
      }
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private disposeRenderer(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
