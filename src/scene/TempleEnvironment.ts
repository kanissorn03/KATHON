import * as THREE from 'three';
import { addJoinery, buildSanctuaryRoof } from './Architecture';
import { buildPierLanterns } from './PierLanterns';
import {
  createCourtyardTileTexture,
  createGlowSprite,
  createGroundGlowDisc,
  createSignTexture,
  createWoodPlankTexture,
  getGlowTexture
} from './TextureHelpers';

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const FERRIS_PLATFORM = { x: 13.65, z: -13, facing: -Math.PI / 2 } as const;
const FERRIS_CENTER_X = 16.5;
export const COURTYARD_HALF_WIDTH = 23;
export const COURTYARD_BACK = -22;

export class TempleEnvironment {
  public readonly group = new THREE.Group();
  public readonly walkableMeshes: THREE.Object3D[] = [];
  public readonly obstacles: ObstacleBox[] = [];

  private ferrisWheelPivot = new THREE.Group();
  private ferrisBoardingGate: THREE.Mesh | null = null;
  private gondolas: THREE.Group[] = [];
  private pierLotusRing: THREE.Mesh;
  private swayingLanterns: { group: THREE.Group; phase: number }[] = [];
  private flickeringFlames: { mesh: THREE.Mesh; baseScale: number; phase: number }[] = [];
  private twinklingBulbs: { glow: THREE.Sprite; baseOpacity: number; phase: number }[] = [];
  private flutteringFlags: { mesh: THREE.Mesh; phase: number }[] = [];
  private incenseParticles: THREE.Points | null = null;
  private incenseBase: Float32Array | null = null;

  constructor() {
    this.buildCourtyard();
    this.buildTempleUbosot();
    this.buildGoldenChedi();
    this.buildFerrisWheel();
    this.buildPerimeterAndTrees();
    this.buildRiverEmbankmentAndBridge();
    this.buildOverheadFestivalLights();
    this.buildLannaLanternPosts();
    this.buildRiverbankAndTempleDecor();

    // Glowing invitation marker on the lower floating pier
    this.pierLotusRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 28),
      new THREE.MeshBasicMaterial({
        color: '#ffd573',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78
      })
    );
    this.pierLotusRing.rotation.x = -Math.PI / 2;
    this.pierLotusRing.position.set(0, -0.4, 23.25);
    this.group.add(this.pierLotusRing);
  }

  public static getGroundHeight(x: number, z: number): number {
    if (z <= 9.8) return 0;
    if (z <= 19.5 && Math.abs(x) <= 2.2) return 0.14;
    if (z <= 21.8 && Math.abs(x) <= 2.4) {
      const t = THREE.MathUtils.clamp((z - 19.5) / (21.8 - 19.5), 0, 1);
      return THREE.MathUtils.lerp(0.14, -0.42, t);
    }
    if (z > 21.8 && Math.abs(x) <= 3.4) return -0.42;
    return 0;
  }

  public isPointWalkable(x: number, z: number): boolean {
    if (z < COURTYARD_BACK + 0.65 || z > 23.75) return false;

    if (z <= 9.6) {
      if (Math.abs(x) > COURTYARD_HALF_WIDTH - 0.65) return false;
      for (const box of this.obstacles) {
        if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) {
          return false;
        }
      }
      return true;
    }

    // Wooden bridge corridor
    if (z <= 21.8) {
      return Math.abs(x) <= 1.55;
    }

    // Lower wooden pier deck
    return Math.abs(x) <= 2.75 && z <= 23.75;
  }

  private buildCourtyard(): void {
    // Temple courtyard ground with nocturnal stone paver texture
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(COURTYARD_HALF_WIDTH * 2, 1.4, 10 - COURTYARD_BACK),
      new THREE.MeshStandardMaterial({
        map: createCourtyardTileTexture(16, 11),
        roughness: 0.9
      })
    );
    ground.position.set(0, -0.7, (10 + COURTYARD_BACK) / 2);
    ground.receiveShadow = true;
    this.group.add(ground);
    this.walkableMeshes.push(ground);

    // Decorative warm stone central walkway leading from Temple Ubosot to Wooden Bridge
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.04, 21),
      new THREE.MeshStandardMaterial({
        map: createCourtyardTileTexture(2, 10),
        color: '#e6ddf5',
        emissive: '#1f1833',
        emissiveIntensity: 0.28,
        roughness: 0.78
      })
    );
    path.position.set(0, 0.01, -0.6);
    path.receiveShadow = true;
    this.group.add(path);
    this.walkableMeshes.push(path);

    // Subtle stone border tiles + warm walkway ground glow pools
    const tileMat = new THREE.MeshStandardMaterial({ color: '#9c8aad', roughness: 0.78 });
    for (let z = -8; z <= 8; z += 2) {
      for (const sx of [-2.05, 2.05]) {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 1.5), tileMat);
        curb.position.set(sx, 0.03, z);
        this.group.add(curb);
      }
      if (z % 4 === 0) {
        const pool = createGroundGlowDisc('#ffd57a', 1.85, 0.14);
        pool.position.set(0, 0.035, z);
        this.group.add(pool);
      }
    }

    // Two cozy temple courtyard wooden benches flanking the central plaza
    const benchMat = new THREE.MeshStandardMaterial({
      map: createWoodPlankTexture(2, 1),
      roughness: 0.85
    });
    for (const bx of [-4.2, 4.2]) {
      const bench = new THREE.Group();
      bench.position.set(bx, 0, -0.5);
      bench.rotation.y = bx < 0 ? Math.PI / 2 : -Math.PI / 2;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.62), benchMat);
      seat.position.y = 0.42;
      seat.castShadow = true;
      bench.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.08), benchMat);
      back.position.set(0, 0.7, -0.26);
      bench.add(back);

      for (const lx of [-0.75, 0.75]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.5), benchMat);
        leg.position.set(lx, 0.21, 0);
        bench.add(leg);
      }
      this.group.add(bench);
      this.obstacles.push({
        minX: bx - 0.55,
        maxX: bx + 0.55,
        minZ: -1.65,
        maxZ: 0.65
      });
    }
  }

  private buildTempleUbosot(): void {
    const temple = new THREE.Group();
    temple.position.set(0, 0, -15.5);

    const baseMat = new THREE.MeshStandardMaterial({ color: '#ebe4d8', roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f0c056', roughness: 0.35, metalness: 0.45 });
    const teak = new THREE.MeshStandardMaterial({ color: '#733d2b', roughness: 0.75 });
    const sill = new THREE.MeshStandardMaterial({ color: '#b6a38d', roughness: 0.9 });

    // Raised stepped platform
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.8, 8.8), baseMat);
    plinth.position.y = 0.4;
    plinth.receiveShadow = true;
    temple.add(plinth);

    // Front stairs
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, (i + 1) * 0.2, 0.55), baseMat);
      step.position.set(0, (i + 1) * 0.1, 5.2 - i * 0.4);
      temple.add(step);
    }

    // Main sanctuary hall
    const hall = new THREE.Mesh(new THREE.BoxGeometry(8.6, 4.2, 6.4), baseMat);
    hall.position.y = 2.9;
    hall.castShadow = true;
    temple.add(hall);

    // Warm glowing temple doorway & flanking side windows
    const doorGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 2.7, 0.2),
      new THREE.MeshBasicMaterial({ color: '#ffd985' })
    );
    doorGlow.position.set(0, 2.2, 3.22);
    temple.add(doorGlow);

    for (const wx of [-2.6, 2.6]) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.6, 0.2),
        new THREE.MeshBasicMaterial({ color: '#ffcf78' })
      );
      win.position.set(wx, 2.5, 3.22);
      temple.add(win);
    }

    // Twin golden lotus pedestal lamps flanking the temple stairs
    for (const lx of [-2.2, 2.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), goldMat);
      post.position.set(lx, 0.6, 5.4);
      temple.add(post);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 10, 8),
        new THREE.MeshBasicMaterial({ color: '#ffe394' })
      );
      orb.position.set(lx, 1.32, 5.4);
      temple.add(orb);

      const lg = createGlowSprite('#ffd478', 1.4, 0.65);
      lg.position.copy(orb.position);
      temple.add(lg);
    }

    // Pillars along front porch
    const pillarGeo = new THREE.CylinderGeometry(0.2, 0.24, 4.2, 10);
    for (const px of [-3.4, -1.6, 1.6, 3.4]) {
      const pillar = new THREE.Mesh(pillarGeo, baseMat);
      pillar.position.set(px, 2.9, 3.85);
      temple.add(pillar);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.26, 10), goldMat);
      cap.position.set(px, 4.9, 3.85);
      temple.add(cap);
    }

    addJoinery(temple, sill, [
      [0, 0.14, 0, 11.84, 0.22, 9.02], [0, 0.73, 0, 11.78, 0.14, 8.96],
      [0, 1.03, 0, 8.76, 0.20, 6.56], [0, 4.68, 0, 8.82, 0.18, 6.62]
    ]);
    addJoinery(temple, teak, [
      [-0.42, 1.87, 3.35, 0.77, 2.08, 0.10], [0.42, 1.87, 3.35, 0.77, 2.08, 0.10],
      [0, 4.83, 3.85, 8.55, 0.21, 0.38],
      [-0.91, 2.17, 3.34, 0.15, 2.77, 0.24], [0.91, 2.17, 3.34, 0.15, 2.77, 0.24],
      [0, 3.59, 3.34, 2.06, 0.18, 0.27], [0, 2.20, 3.34, 0.08, 2.72, 0.09],
      ...[-2.6, 2.6].flatMap((x): [number, number, number, number, number, number][] => [
        [x, 1.66, 3.36, 1.23, 0.14, 0.33], [x, 3.34, 3.36, 1.23, 0.15, 0.33],
        ...[-0.52, -0.17, 0.17, 0.52].map((offset): [number, number, number, number, number, number] =>
          [x + offset, 2.51, 3.34, 0.075, 1.60, 0.14])
      ])
    ]);
    addJoinery(temple, goldMat, [
      ...[-0.42, 0.42].flatMap((x): [number, number, number, number, number, number][] => [
        [x, 1.09, 3.41, 0.56, 0.04, 0.035], [x, 2.66, 3.41, 0.56, 0.04, 0.035],
        [x - 0.27, 1.88, 3.41, 0.035, 1.61, 0.035], [x + 0.27, 1.88, 3.41, 0.035, 1.61, 0.035]
      ])
    ]);
    temple.add(buildSanctuaryRoof());

    this.group.add(temple);
    this.obstacles.push({ minX: -6.2, maxX: 6.2, minZ: -20, maxZ: -9.8 });
  }

  private buildGoldenChedi(): void {
    const chedi = new THREE.Group();
    chedi.position.set(-12.5, 0, -11.5);

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#f2c152',
      roughness: 0.36,
      metalness: 0.45,
      emissive: '#3d2600',
      emissiveIntensity: 0.2
    });

    const base1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 4.4), goldMat);
    base1.position.y = 0.4;
    chedi.add(base1);

    const base2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 3.4), goldMat);
    base2.position.y = 1.25;
    chedi.add(base2);

    // A continuous moulded base, bell, square throne and ringed spire.
    const profile = [[1.64, 1.68], [1.69, 1.77], [1.67, 1.88], [1.45, 1.96],
      [1.53, 2.06], [1.51, 2.15], [1.27, 2.27], [1.34, 2.35],
      [1.32, 2.44], [1.12, 2.51], [0.94, 2.70], [0.76, 2.97],
      [0.62, 3.29], [0.54, 3.62], [0.49, 3.80], [0.35, 3.85]];
    chedi.add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y]) =>
      new THREE.Vector2(r,y)), 40), goldMat));
    addJoinery(chedi, goldMat, [[0, 3.94, 0, 1.08, 0.24, 1.08]]);
    const rings = [new THREE.Vector2(0.46, 4.04)];
    for (let i = 0; i < 11; i++) {
      const r = 0.46 - i * 0.035;
      rings.push(new THREE.Vector2(r, 4.11 + i * 0.16), new THREE.Vector2(r * 0.76, 4.19 + i * 0.16));
    }
    rings.push(new THREE.Vector2(0.055, 6.05), new THREE.Vector2(0, 6.52));
    chedi.add(new THREE.Mesh(new THREE.LatheGeometry(rings, 32), goldMat));

    const glow = createGlowSprite('#ffd478', 4.5, 0.32);
    glow.position.set(0, 3.8, 0);
    chedi.add(glow);

    this.group.add(chedi);
    this.obstacles.push({ minX: -15, maxX: -10, minZ: -14, maxZ: -9 });
  }

  private buildFerrisWheel(): void {
    const fw = new THREE.Group();
    fw.position.set(FERRIS_CENTER_X, 0, FERRIS_PLATFORM.z);

    const frameMat = new THREE.MeshStandardMaterial({ color: '#5c4d7d', roughness: 0.6 });
    const legGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.4, 8);
    for (const sx of [-1.4, 1.4]) {
      const leg1 = new THREE.Mesh(legGeo, frameMat);
      leg1.position.set(sx, 3.05, -0.89);
      leg1.rotation.x = 0.28;
      fw.add(leg1);

      const leg2 = new THREE.Mesh(legGeo, frameMat);
      leg2.position.set(sx, 3.05, 0.89);
      leg2.rotation.x = -0.28;
      fw.add(leg2);
    }

    this.ferrisWheelPivot.position.set(0, 5.78, 0);
    fw.add(this.ferrisWheelPivot);

    const rimMat = new THREE.MeshStandardMaterial({
      color: '#ffd77a',
      emissive: '#ffaa3b',
      emissiveIntensity: 0.45
    });
    for (const sx of [-0.6, 0.6]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.1, 8, 28), rimMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = sx;
      this.ferrisWheelPivot.add(rim);
    }

    const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, 9.6, 6);
    const gondolaColors = ['#ff9ec6', '#8de4ff', '#ffe278', '#b89eff', '#94f2b8', '#ffb385'];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, frameMat);
      spoke.rotation.x = Math.PI / 2 - angle;
      this.ferrisWheelPivot.add(spoke);

      const gPivot = new THREE.Group();
      gPivot.position.set(0, Math.sin(angle) * 4.8, Math.cos(angle) * 4.8);

      const cabin = new THREE.Group();
      cabin.rotation.y = FERRIS_PLATFORM.facing;
      gPivot.add(cabin);
      const enamel = new THREE.MeshStandardMaterial({
          color: gondolaColors[i % gondolaColors.length],
          emissive: gondolaColors[i % gondolaColors.length],
          emissiveIntensity: 0.25,
          roughness: 0.5
      });
      const panel = (w: number, h: number, d: number, x: number, y: number, z: number, mat = enamel) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        cabin.add(mesh);
      };
      panel(1.95, 0.16, 1.23, 0, -0.88, 0);
      panel(1.95, 0.70, 0.10, 0, -0.46, -0.57);
      panel(1.79, 0.14, 0.53, 0, -0.51, -0.24, frameMat);
      if (i === 0) {
        const gate = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.09, 0.055), rimMat);
        gate.geometry.translate(0.95, 0, 0);
        gate.position.set(-0.95, -0.5, 0.59);
        this.ferrisBoardingGate = gate;
        cabin.add(gate);
      } else {
        panel(1.90, 0.09, 0.055, 0, -0.5, 0.59, rimMat);
      }
      for (const side of [-1, 1]) {
        panel(0.095, 0.47, 1.20, side * 0.93, -0.63, 0);
        panel(0.08, 0.91, 0.08, side * 0.80, -0.39, -0.5, frameMat);
      }

      const bulb = createGlowSprite('#ffe599', 0.85, 0.75);
      bulb.position.y = 0.08;
      gPivot.add(bulb);

      this.ferrisWheelPivot.add(gPivot);
      this.gondolas.push(gPivot);
    }

    this.group.add(fw);
    this.obstacles.push({ minX: 14.8, maxX: 18.05, minZ: -18.2, maxZ: -7.8 });
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.055, 6.7),
      new THREE.MeshStandardMaterial({ map: createCourtyardTileTexture(2, 2), color: '#dbb8df' }));
    plaza.position.set(FERRIS_PLATFORM.x - 0.78, 0.01, FERRIS_PLATFORM.z);
    this.group.add(plaza);
    for (const side of [-1, 1]) {
      const glow = createGroundGlowDisc('#ffc970', 1.25, 0.33);
      glow.position.set(FERRIS_PLATFORM.x, 0.045, FERRIS_PLATFORM.z + side * 1.5);
      this.group.add(glow);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.96), new THREE.MeshBasicMaterial({
      map: createSignTexture('ชิงช้าสวรรค์', 'จุดขึ้นกระเช้า · 2 ที่นั่ง'), transparent: true, side: THREE.DoubleSide
    }));
    sign.position.set(FERRIS_PLATFORM.x - 0.2, 2.1, FERRIS_PLATFORM.z + 2.1);
    sign.rotation.y = -Math.PI / 4;
    this.group.add(sign);
    this.setFerrisProgress(0);
  }

  public setFerrisProgress(progress: number): void {
    const angle = Math.PI / 2 + progress * Math.PI * 2;
    this.ferrisWheelPivot.rotation.x = angle;
    for (const gondola of this.gondolas) gondola.rotation.x = -angle;
    if (this.ferrisBoardingGate) {
      const atStation = Math.min(progress, 1 - progress);
      this.ferrisBoardingGate.rotation.z = (1 - THREE.MathUtils.smoothstep(atStation, 0, 0.006)) * Math.PI / 2;
    }
  }

  public getFerrisSeat(slot: 1 | 2, target: THREE.Vector3): THREE.Vector3 {
    return this.gondolas[0].localToWorld(target.set(0.19, -0.57, slot === 1 ? -0.46 : 0.46));
  }

  private buildPerimeterAndTrees(): void {
    // Low Thai temple courtyard walls along left & right edges
    const wallMat = new THREE.MeshStandardMaterial({ color: '#ddd5c7', roughness: 0.85 });
    for (const sx of [-COURTYARD_HALF_WIDTH, COURTYARD_HALF_WIDTH]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 32), wallMat);
      wall.position.set(sx, 0.67, -6);
      this.group.add(wall);
    }
    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(46, 1.35, 0.55), wallMat);
    rearWall.position.set(0, 0.67, COURTYARD_BACK);
    this.group.add(rearWall);

    // Cute clay trees around the edges
    const treePositions: [number, number, number][] = [
      [-15.5, 0, 7.2],
      [-15.2, 0, -5.5],
      [15.5, 0, 7.2],
      [15.2, 0, -5.5],
      [-11.5, 0, 8.6],
      [11.5, 0, 8.6],
      [-21, 0, -15], [-19, 0, -20], [-7.4, 0, -19.7],
      [7.8, 0, -19.8], [21.4, 0, -19.2], [20.8, 0, -3.7]
    ];

    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4b38', roughness: 0.9 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: '#386e56', roughness: 0.82 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: '#498566', roughness: 0.82 });

    treePositions.forEach(([tx, ty, tz], idx) => {
      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 2.3, 8), trunkMat);
      trunk.position.y = 1.15;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown1 = new THREE.Mesh(new THREE.SphereGeometry(1.45, 12, 10), leafMat1);
      crown1.position.set(0, 2.9, 0);
      tree.add(crown1);

      const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 8), leafMat2);
      crown2.position.set(0.6, 2.4, 0.4);
      tree.add(crown2);

      // Hanging lantern on tree branch
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? '#ffd075' : '#ff9ec6' })
      );
      lantern.position.set(-0.75, 1.95, 0.55);
      tree.add(lantern);

      const glow = createGlowSprite(idx % 2 === 0 ? '#ffd075' : '#ff9ec6', 1.1, 0.65);
      glow.position.copy(lantern.position);
      tree.add(glow);

      this.group.add(tree);
      this.obstacles.push({
        minX: tx - 0.8,
        maxX: tx + 0.8,
        minZ: tz - 0.8,
        maxZ: tz + 0.8
      });
    });
  }

  private buildRiverEmbankmentAndBridge(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#6d627c', roughness: 0.88 });
    const capMat = new THREE.MeshStandardMaterial({ color: '#9c8ca8', roughness: 0.78 });

    // Left & right riverbank walls leaving gap at X: -2..2 for the wooden bridge
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(21, 1.7, 1.1), stoneMat);
      bank.position.set(side * 12.5, -0.1, 9.8);
      this.group.add(bank);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(21, 0.18, 1.3), capMat);
      rail.position.set(side * 12.5, 0.8, 9.8);
      this.group.add(rail);
    }

    // Wooden Bridge & Lower Pier (สะพานไม้สำหรับลอยกระทง)
    const woodMat = new THREE.MeshStandardMaterial({ color: '#8f5d3b', roughness: 0.86 });
    const plankMat = new THREE.MeshStandardMaterial({
      map: createWoodPlankTexture(2, 1),
      roughness: 0.82
    });
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#d4b483', roughness: 0.9 });

    // Grand Festive Archway at bridge entrance (ซุ้มประตูงานลอยกระทง)
    this.group.add(buildPierLanterns());
    for (const ax of [-2.05, 2.05]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 3.6, 10), woodMat);
      col.position.set(ax, 1.8, 9.6);
      this.group.add(col);

      const capGlow = createGlowSprite('#ffd87a', 1.3, 0.65);
      capGlow.position.set(ax, 3.75, 9.6);
      this.group.add(capGlow);
    }
    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.24, 0.24), woodMat);
    archBeam.position.set(0, 3.45, 9.6);
    this.group.add(archBeam);

    const signGeometry = new THREE.PlaneGeometry(3.4, 1.05);
    const signMaterial = new THREE.MeshBasicMaterial({
      map: createSignTexture('🪷 ท่าน้ำลอยกระทง 🪷', 'เชิญอธิษฐานใต้แสงจันทร์', '#2b1946', '#ffd573'),
      transparent: true
    });
    for (const facing of [-1, 1]) {
      const archSign = new THREE.Mesh(signGeometry, signMaterial);
      archSign.rotation.y = facing < 0 ? Math.PI : 0;
      archSign.position.set(0, 3.95, 9.6 + facing * 0.21);
      this.group.add(archSign);
    }

    // Support pilings into water
    const postGeo = new THREE.CylinderGeometry(0.13, 0.15, 2.2, 8);
    for (let z = 10.5; z <= 23.6; z += 2.6) {
      for (const px of [-1.75, 1.75]) {
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(px, -0.3, z);
        this.group.add(post);
      }
    }

    // Bridge walkway planks (Z = 9.8 .. 19.5)
    for (let z = 9.95; z <= 19.45; z += 0.45) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.1, 0.38), plankMat);
      plank.position.set(0, 0.09, z);
      plank.receiveShadow = true;
      this.group.add(plank);
      this.walkableMeshes.push(plank);
    }

    // Bridge side beams & rope railings + warm Lanna lanterns
    for (let z = 10.4; z <= 19.2; z += 2.2) {
      for (const px of [-1.78, 1.78]) {
        const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.35, 8), woodMat);
        railPost.position.set(px, 0.78, z);
        this.group.add(railPost);

        const glow = createGlowSprite('#ffd075', 0.95, 0.65);
        glow.position.set(px, 1.7, z);
        this.group.add(glow);
      }
    }

    for (const px of [-1.78, 1.78]) {
      const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 9.2, 6), ropeMat);
      railBar.rotation.x = Math.PI / 2;
      railBar.position.set(px, 1.05, 14.8);
      this.group.add(railBar);
    }

    // Wooden stairs descending from bridge (Z = 19.5 .. 21.8)
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const stepY = THREE.MathUtils.lerp(0.08, -0.45, t);
      const stepZ = THREE.MathUtils.lerp(19.75, 21.65, t);
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 0.5), plankMat);
      step.position.set(0, stepY, stepZ);
      step.receiveShadow = true;
      this.group.add(step);
      this.walkableMeshes.push(step);
    }

    // Lower floating wooden pier deck close to water (Z = 21.8 .. 24.2)
    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 2.6), plankMat);
    pierDeck.position.set(0, -0.5, 23.0);
    pierDeck.receiveShadow = true;
    this.group.add(pierDeck);
    this.walkableMeshes.push(pierDeck);

    // Corner lanterns on pier deck
    for (const px of [-2.95, 2.95]) {
      const pPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 1.3, 8), woodMat);
      pPost.position.set(px, 0.1, 23.95);
      this.group.add(pPost);

      const pLantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        new THREE.MeshBasicMaterial({ color: '#ffd87a' })
      );
      pLantern.position.set(px, 0.85, 23.95);
      this.group.add(pLantern);

      const glow = createGlowSprite('#ffd478', 1.25, 0.72);
      glow.position.copy(pLantern.position);
      this.group.add(glow);
    }
  }

  private buildOverheadFestivalLights(): void {
    // Festive string lights crisscrossing the temple courtyard
    const poleMat = new THREE.MeshStandardMaterial({ color: '#594238', roughness: 0.85 });
    const poleCoords: [number, number][] = [
      [-12, 7.5],
      [12, 7.5],
      [-12, -5.5],
      [12, -5.5]
    ];

    for (const [px, pz] of poleCoords) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 5.2, 8), poleMat);
      pole.position.set(px, 2.6, pz);
      this.group.add(pole);
    }

    const lines: [[number, number], [number, number]][] = [
      [
        [-12, 7.5],
        [12, 7.5]
      ],
      [
        [-12, -5.5],
        [12, -5.5]
      ],
      [
        [-12, 7.5],
        [12, -5.5]
      ],
      [
        [12, 7.5],
        [-12, -5.5]
      ]
    ];

    const colors = ['#ffd973', '#ff94c2', '#82e8ff', '#a8ff9e', '#ffb26b'];
    const bulbGeo = new THREE.SphereGeometry(0.11, 8, 8);

    lines.forEach(([a, b], lineIdx) => {
      const count = 13;
      for (let i = 1; i < count; i++) {
        const t = i / count;
        const x = THREE.MathUtils.lerp(a[0], b[0], t);
        const z = THREE.MathUtils.lerp(a[1], b[1], t);
        const sag = Math.sin(t * Math.PI) * 0.85;
        const y = 4.95 - sag;

        const color = colors[(i + lineIdx) % colors.length];
        const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color }));
        bulb.position.set(x, y, z);
        this.group.add(bulb);

        // Colorful triangular pennant flag (ธงราวงานวัด) hanging below bulb
        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 0.34, 3),
          new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
        );
        flag.rotation.x = Math.PI;
        flag.position.set(x, y - 0.24, z);
        this.group.add(flag);
        this.flutteringFlags.push({ mesh: flag, phase: i * 0.6 + lineIdx * 1.1 });

        if (i % 2 === 0) {
          const glow = createGlowSprite(color, 0.72, 0.45);
          glow.position.copy(bulb.position);
          this.group.add(glow);
          this.twinklingBulbs.push({ glow, baseOpacity: 0.45, phase: i * 0.9 + lineIdx });
        }
      }
    });
  }

  private buildLannaLanternPosts(): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: '#4d3227', roughness: 0.85 });
    const capMat = new THREE.MeshStandardMaterial({ color: '#d4a149', roughness: 0.55 });
    const poleGeo = new THREE.CylinderGeometry(0.065, 0.085, 2.75, 8);
    const armGeo = new THREE.BoxGeometry(0.46, 0.065, 0.065);
    const bodyGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.38, 6);
    const capGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.04, 6);
    const tasselGeo = new THREE.ConeGeometry(0.045, 0.18, 6);

    const lanternPalette = ['#ffd072', '#ff9ec6', '#ff9b4a', '#fff0c4'];

    const avenuePosts: [number, number, number][] = [];
    for (const z of [-6.2, -2.5, 2.5, 6.2]) {
      avenuePosts.push([-2.55, z, 1], [2.55, z, -1]);
    }
    const riverPosts: [number, number, number][] = [-14.2, -9.8, -5.2, 5.2, 9.8, 14.2].map(
      (x) => [x, 9.0, 0]
    );

    const allPosts = [...avenuePosts, ...riverPosts];
    allPosts.forEach(([px, pz, inwardDir], idx) => {
      const stand = new THREE.Group();
      stand.position.set(px, 0, pz);

      const post = new THREE.Mesh(poleGeo, woodMat);
      post.position.y = 1.375;
      post.castShadow = true;
      stand.add(post);

      const armOffset = inwardDir !== 0 ? inwardDir * 0.2 : 0;
      const armZOffset = inwardDir === 0 ? 0.2 : 0;
      const arm = new THREE.Mesh(armGeo, woodMat);
      arm.position.set(armOffset, 2.66, armZOffset);
      if (inwardDir === 0) arm.rotation.y = Math.PI / 2;
      stand.add(arm);

      const color = lanternPalette[idx % lanternPalette.length];
      const lanternPivot = new THREE.Group();
      lanternPivot.position.set(armOffset * 1.85, 2.63, armZOffset * 1.85);

      const lanternMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.72,
        roughness: 0.45
      });

      const body = new THREE.Mesh(bodyGeo, lanternMat);
      body.position.y = -0.24;
      lanternPivot.add(body);

      for (const cy of [-0.04, -0.44]) {
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = cy;
        lanternPivot.add(cap);
      }

      const tassel = new THREE.Mesh(
        tasselGeo,
        new THREE.MeshStandardMaterial({ color: '#e6b44c', roughness: 0.65 })
      );
      tassel.rotation.x = Math.PI;
      tassel.position.y = -0.55;
      lanternPivot.add(tassel);

      const glow = createGlowSprite(color, 1.35, 0.58);
      glow.position.y = -0.24;
      lanternPivot.add(glow);

      stand.add(lanternPivot);
      this.swayingLanterns.push({ group: lanternPivot, phase: idx * 0.75 });

      const floorGlow = createGroundGlowDisc(color, 1.35, 0.12);
      floorGlow.position.set(armOffset * 1.6, 0.025, armZOffset * 1.6);
      stand.add(floorGlow);

      this.group.add(stand);

      if (inwardDir !== 0) {
        this.obstacles.push({
          minX: px - 0.28,
          maxX: px + 0.28,
          minZ: pz - 0.28,
          maxZ: pz + 0.28
        });
      }
    });
  }

  private buildRiverbankAndTempleDecor(): void {
    // 1. Phang Prathip (ผางประทีป) traditional Lanna clay candle bowls along riverbank & temple stairs
    const clayMat = new THREE.MeshStandardMaterial({ color: '#9c5a3c', roughness: 0.85 });
    const waxMat = new THREE.MeshStandardMaterial({ color: '#ffe5a8', roughness: 0.5 });
    const flameMat = new THREE.MeshBasicMaterial({ color: '#fff1a8' });
    const bowlGeo = new THREE.CylinderGeometry(0.14, 0.08, 0.07, 10);
    const waxGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.02, 10);
    const flameGeo = new THREE.ConeGeometry(0.032, 0.09, 6);

    const addPrathip = (x: number, y: number, z: number, phase: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);

      const bowl = new THREE.Mesh(bowlGeo, clayMat);
      g.add(bowl);

      const wax = new THREE.Mesh(waxGeo, waxMat);
      wax.position.y = 0.03;
      g.add(wax);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.085;
      g.add(flame);
      this.flickeringFlames.push({ mesh: flame, baseScale: 1, phase });

      const glow = createGlowSprite('#ffcb6b', 0.68, 0.55);
      glow.position.y = 0.1;
      g.add(glow);

      this.group.add(g);
    };

    let prathipIdx = 0;
    for (let x = -16; x <= -3; x += 2.6) {
      addPrathip(x, 0.92, 9.8, prathipIdx++ * 0.7);
    }
    for (let x = 3; x <= 16; x += 2.6) {
      addPrathip(x, 0.92, 9.8, prathipIdx++ * 0.7);
    }
    for (const tx of [-2.7, -2.0, 2.0, 2.7]) {
      addPrathip(tx, 0.04, -10.2, prathipIdx++ * 0.9);
    }

    // 2. Marigold garlands (พวงมาลัยดาวเรือง) along bridge archway & riverbank wall
    const marigoldMat1 = new THREE.MeshStandardMaterial({
      color: '#ffae2b',
      emissive: '#6e3b00',
      emissiveIntensity: 0.3,
      roughness: 0.6
    });
    const marigoldMat2 = new THREE.MeshStandardMaterial({
      color: '#ffd24c',
      emissive: '#6e4e00',
      emissiveIntensity: 0.28,
      roughness: 0.6
    });
    const beadGeo = new THREE.SphereGeometry(0.065, 7, 7);

    const addGarlandSpan = (x1: number, x2: number, yTop: number, z: number, sag: number, count: number) => {
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const gx = THREE.MathUtils.lerp(x1, x2, t);
        const gy = yTop - Math.sin(t * Math.PI) * sag;
        const bead = new THREE.Mesh(beadGeo, i % 2 === 0 ? marigoldMat1 : marigoldMat2);
        bead.position.set(gx, gy, z);
        this.group.add(bead);
      }
    };

    // Bridge archway dual marigold swags
    addGarlandSpan(-1.95, 0, 3.38, 9.48, 0.36, 11);
    addGarlandSpan(0, 1.95, 3.38, 9.48, 0.36, 11);
    // Riverbank decorative swags flanking bridge entrance
    for (const side of [-1, 1]) {
      for (let s = 0; s < 3; s++) {
        const sx1 = side * (2.6 + s * 4.8);
        const sx2 = side * (2.6 + (s + 1) * 4.8);
        addGarlandSpan(Math.min(sx1, sx2), Math.max(sx1, sx2), 0.72, 9.2, 0.28, 12);
      }
    }

    // 3. Glazed clay lotus basins (อ่างบัว) flanking bridge archway & temple stairs
    const basinGeo = new THREE.CylinderGeometry(0.46, 0.32, 0.36, 14);
    const basinMat = new THREE.MeshStandardMaterial({ color: '#453532', roughness: 0.42 });
    const waterDiscGeo = new THREE.CircleGeometry(0.4, 14);
    const waterDiscMat = new THREE.MeshBasicMaterial({ color: '#1b3d4a' });
    const padGeo = new THREE.CircleGeometry(0.11, 10);
    const padMat = new THREE.MeshStandardMaterial({ color: '#3b8054', roughness: 0.75 });
    const lotusPetalMat = new THREE.MeshStandardMaterial({
      color: '#ff9ec6',
      emissive: '#6e2242',
      emissiveIntensity: 0.25,
      roughness: 0.55
    });

    const basinSpots: [number, number][] = [
      [-2.65, 9.05],
      [2.65, 9.05],
      [-3.3, -9.7],
      [3.3, -9.7]
    ];
    for (const [bx, bz] of basinSpots) {
      const basinGroup = new THREE.Group();
      basinGroup.position.set(bx, 0, bz);

      const bowl = new THREE.Mesh(basinGeo, basinMat);
      bowl.position.y = 0.18;
      bowl.castShadow = true;
      basinGroup.add(bowl);

      const waterDisc = new THREE.Mesh(waterDiscGeo, waterDiscMat);
      waterDisc.rotation.x = -Math.PI / 2;
      waterDisc.position.y = 0.34;
      basinGroup.add(waterDisc);

      for (const [px, pz] of [
        [-0.14, 0.08],
        [0.14, -0.06]
      ]) {
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(px, 0.35, pz);
        basinGroup.add(pad);
      }

      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 7), lotusPetalMat);
      lotus.position.set(0.05, 0.41, 0.04);
      basinGroup.add(lotus);

      this.group.add(basinGroup);
    }

    // 4. Temple offering altar table & gently rising incense smoke in front of stairs
    const altar = new THREE.Group();
    altar.position.set(0, 0, -9.95);
    const altarWood = new THREE.MeshStandardMaterial({ color: '#6b3826', roughness: 0.75 });
    const altarGold = new THREE.MeshStandardMaterial({ color: '#f0c056', roughness: 0.35, metalness: 0.45 });

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.65), altarWood);
    tableTop.position.y = 0.72;
    altar.add(tableTop);

    for (const lx of [-0.62, 0.62]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.5), altarWood);
      leg.position.set(lx, 0.36, 0);
      altar.add(leg);
    }

    const incensePot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.16, 10), altarGold);
    incensePot.position.set(0, 0.85, 0);
    altar.add(incensePot);

    for (const cx of [-0.45, 0.45]) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), waxMat);
      candle.position.set(cx, 0.87, 0.05);
      altar.add(candle);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(cx, 1.0, 0.05);
      altar.add(flame);
      this.flickeringFlames.push({ mesh: flame, baseScale: 0.9, phase: cx * 3 });
    }
    this.group.add(altar);

    const smokeCount = 28;
    const smokePos = new Float32Array(smokeCount * 3);
    this.incenseBase = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      const sx = (Math.random() - 0.5) * 0.24;
      const sy = 0.98 + (i / smokeCount) * 2.2;
      const sz = -9.95 + (Math.random() - 0.5) * 0.18;
      smokePos[i * 3] = sx;
      smokePos[i * 3 + 1] = sy;
      smokePos[i * 3 + 2] = sz;
      this.incenseBase[i * 3] = sx;
      this.incenseBase[i * 3 + 1] = sy;
      this.incenseBase[i * 3 + 2] = sz;
    }
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: '#e5dcf5',
      map: getGlowTexture(),
      size: 0.38,
      transparent: true,
      opacity: 0.24,
      depthWrite: false
    });
    this.incenseParticles = new THREE.Points(smokeGeo, smokeMat);
    this.group.add(this.incenseParticles);
  }

  public update(dt: number, time: number): void {

    // Pulse pier lotus invitation ring
    const pulse = 1 + Math.sin(time * 3.2) * 0.08;
    this.pierLotusRing.scale.set(pulse, pulse, 1);
    (this.pierLotusRing.material as THREE.MeshBasicMaterial).opacity =
      0.55 + Math.sin(time * 3.2) * 0.25;

    // Gentle wind sway on Lanna hanging lanterns
    for (const l of this.swayingLanterns) {
      l.group.rotation.z = Math.sin(time * 1.45 + l.phase) * 0.065;
      l.group.rotation.x = Math.cos(time * 1.15 + l.phase) * 0.04;
    }

    // Soft candle flicker on Phang Prathip bowls & temple altar
    for (const f of this.flickeringFlames) {
      const flicker = f.baseScale * (0.9 + Math.sin(time * 9.5 + f.phase) * 0.14);
      f.mesh.scale.set(1, flicker, 1);
    }

    // Festive pennant flutter & bulb twinkle
    for (const flag of this.flutteringFlags) {
      flag.mesh.rotation.z = Math.sin(time * 3.2 + flag.phase) * 0.14;
    }
    for (const b of this.twinklingBulbs) {
      (b.glow.material as THREE.SpriteMaterial).opacity =
        b.baseOpacity + Math.sin(time * 2.6 + b.phase) * 0.12;
    }

    // Rising temple incense smoke
    if (this.incenseParticles && this.incenseBase) {
      const attr = this.incenseParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        let ny = attr.getY(i) + dt * 0.42;
        if (ny > 3.2) {
          ny = 0.98;
        }
        const heightNorm = (ny - 0.98) / 2.22;
        const nx = this.incenseBase[i * 3] + Math.sin(time * 1.3 + i) * 0.14 * heightNorm;
        const nz = this.incenseBase[i * 3 + 2] + Math.cos(time * 1.1 + i * 0.7) * 0.1 * heightNorm;
        attr.setXYZ(i, nx, ny, nz);
      }
      attr.needsUpdate = true;
    }
  }
}
