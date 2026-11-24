import * as THREE from 'three';
import { addJoinery, sewAwning } from './Architecture';
import { InteractiveZone, KrathongId, ZoneId } from '../types';
import { AnimatedKrathong, createKrathongMesh } from './KrathongFactory';
import { ObstacleBox } from './TempleEnvironment';
import {
  createGlowSprite,
  createGroundGlowDisc,
  createSignTexture,
  createWoodPlankTexture
} from './TextureHelpers';

export interface StallRecord {
  zone: InteractiveZone;
  group: THREE.Group;
  vendorHead: THREE.Mesh;
}

export class StallsBuilder {
  public readonly group = new THREE.Group();
  public readonly zones: InteractiveZone[] = [];
  public readonly interactiveMeshes: THREE.Object3D[] = [];
  private stalls: StallRecord[] = [];
  private displayKrathongs: AnimatedKrathong[] = [];

  constructor(obstacles: ObstacleBox[]) {
    this.buildKrathongShop(obstacles);
    this.buildSnackShop(obstacles);
    this.buildDrinkShop(obstacles);
    this.buildFortuneBooth(obstacles);

    // Pier zone (no stall obstacle, located on lower pier deck)
    this.zones.push({
      id: 'pier',
      label: 'สะพานลอยกระทง',
      actionLabel: '✨ อธิษฐาน & ลอยกระทงคู่กัน',
      icon: '🌉',
      position: { x: 0, z: 23.25 },
      interactionPos: { x: 0, z: 23.0 },
      radius: 2.8
    });
  }

  private createBoothBase(
    zoneId: ZoneId,
    title: string,
    subtitle: string,
    awningColor1: string,
    awningColor2: string,
    signBg: string,
    pos: [number, number],
    rotY: number
  ): { booth: THREE.Group; vendorHead: THREE.Mesh } {
    const booth = new THREE.Group();
    booth.position.set(pos[0], 0, pos[1]);
    booth.rotation.y = rotY;
    booth.userData.zoneId = zoneId;

    const woodMat = new THREE.MeshStandardMaterial({ color: '#8c5636', roughness: 0.85 });
    const counterMat = new THREE.MeshStandardMaterial({
      map: createWoodPlankTexture(2, 1),
      roughness: 0.78
    });

    // Warm ground glow pool under booth awning
    const boothPool = createGroundGlowDisc('#ffd57a', 2.4, 0.16);
    boothPool.position.set(0, 0.03, 0.9);
    booth.add(boothPool);

    // Counter table
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 1.25), counterMat);
    counter.position.set(0, 0.48, 0.45);
    counter.castShadow = true;
    counter.receiveShadow = true;
    counter.userData.zoneId = zoneId;
    booth.add(counter);

    // 4 wooden corner posts
    const postGeo = new THREE.CylinderGeometry(0.08, 0.09, 2.9, 8);
    for (const [px, pz] of [
      [-1.55, -0.55],
      [1.55, -0.55],
      [-1.55, 0.95],
      [1.55, 0.95]
    ]) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(px, 1.45, pz);
      booth.add(post);
    }

    booth.add(sewAwning([awningColor1, awningColor2]));
    const teak = new THREE.MeshStandardMaterial({ color: '#654032', roughness: 0.77 });
    const bamboo = new THREE.MeshStandardMaterial({ color: '#bb9260', roughness: 0.83 });
    addJoinery(booth, teak, [
      [0, 0.91, 0.45, 3.54, 0.085, 1.36],
      [0, 0.12, 1.09, 3.4, 0.12, 0.075],
      [0, 2.69, 1.32, 3.72, 0.10, 0.10],
      [0, 3.13, -0.80, 3.72, 0.095, 0.10],
      [-1.54, 1.56, -0.76, 0.13, 3.12, 0.13],
      [1.54, 1.56, -0.76, 0.13, 3.12, 0.13],
      [0, 1.68, -0.68, 3.2, 0.1, 0.32],
      [0, 3.45, 0.84, 2.82, 1.02, 0.13],
      [-1.03, 2.99, 0.84, 0.09, 0.58, 0.1],
      [1.03, 2.99, 0.84, 0.09, 0.58, 0.1]
    ]);
    addJoinery(booth, bamboo, [
      ...Array.from({length: 23}, (_, i): [number, number, number, number, number, number] =>
        [(i - 11) * 0.14, 0.50, 1.085, 0.075, 0.66, 0.055]),
      ...Array.from({length: 13}, (_, i): [number, number, number, number, number, number] =>
        [(i - 6) * 0.24, 1.10, -0.84, 0.18, 2.18, 0.06])
    ]);

    // Crisp Thai signboard
    const signTex = createSignTexture(title, subtitle, signBg, '#ffd573');
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.92),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true })
    );
    sign.position.set(0, 3.45, 0.92);
    sign.userData.zoneId = zoneId;
    booth.add(sign);

    // Warm glowing fairy bulbs under front awning
    const shade = new THREE.LatheGeometry([[0.06, 0], [0.12, 0.06], [0.135, 0.16],
      [0.10, 0.24], [0.045, 0.27]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
    const paper = new THREE.MeshStandardMaterial({ color: '#ffcf84', emissive: '#ffab51', emissiveIntensity: 0.7 });
    for (const bx of [-1.2, 0, 1.2]) {
      const lamp = new THREE.Mesh(shade, paper);
      lamp.position.set(bx, 2.39, 1.28);
      booth.add(lamp);
      const glow = createGlowSprite('#ffe08c', 0.85, 0.72);
      glow.position.set(bx, 2.53, 1.36);
      booth.add(glow);
    }

    // Cute mini Thai fair vendor NPC behind counter
    const npc = new THREE.Group();
    npc.position.set(0, 0, -0.35);

    const npcBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.75, 10),
      new THREE.MeshStandardMaterial({ color: awningColor1, roughness: 0.75 })
    );
    npcBody.position.y = 0.75;
    npc.add(npcBody);

    const vendorHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 12),
      new THREE.MeshStandardMaterial({ color: '#f7ccb4', roughness: 0.75 })
    );
    vendorHead.position.y = 1.38;
    npc.add(vendorHead);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.295, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      new THREE.MeshStandardMaterial({ color: '#2b2220', roughness: 0.8 })
    );
    hair.position.y = 1.42;
    npc.add(hair);

    for (const sx of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 6, 6),
        new THREE.MeshBasicMaterial({ color: '#221824' })
      );
      eye.position.set(sx, 1.38, 0.25);
      npc.add(eye);

      const cheek = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 6, 6),
        new THREE.MeshStandardMaterial({ color: '#ff8ea8', roughness: 0.8 })
      );
      cheek.scale.set(1.1, 0.7, 0.4);
      cheek.position.set(sx * 1.45, 1.32, 0.235);
      npc.add(cheek);
    }

    booth.add(npc);

    this.group.add(booth);
    this.interactiveMeshes.push(booth);
    return { booth, vendorHead };
  }

  private buildKrathongShop(obstacles: ObstacleBox[]): void {
    const x = -6.8;
    const z = 4.8;
    const { booth, vendorHead } = this.createBoothBase(
      'krathong_shop',
      '🪷 ร้านขายกระทงคุณยาย',
      'มีให้เลือก 6 แบบสุดน่ารัก',
      '#ff9ec6',
      '#fff5e4',
      '#3a1e47',
      [x, z],
      0.55
    );

    // Display 6 miniature 3D krathongs right on the counter!
    const ids: KrathongId[] = [
      'banana_lotus',
      'bread_turtle',
      'golden_marigold',
      'sweetheart_couple',
      'coconut_orchid',
      'crystal_lotus'
    ];
    ids.forEach((id, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const mk = createKrathongMesh(id, 0.62);
      mk.group.position.set(-0.95 + col * 0.95, 0.97, 0.25 + row * 0.55);
      mk.group.userData.zoneId = 'krathong_shop';
      booth.add(mk.group);
      this.displayKrathongs.push(mk);
    });

    const zone: InteractiveZone = {
      id: 'krathong_shop',
      label: 'ร้านขายกระทง',
      actionLabel: '🪷 เลือกซื้อกระทง (6 แบบ)',
      icon: '🪷',
      position: { x, z },
      interactionPos: { x: x + 1.9, z: z + 1.4 },
      radius: 3.1
    };
    this.zones.push(zone);
    this.stalls.push({ zone, group: booth, vendorHead });
    obstacles.push({ minX: x - 1.9, maxX: x + 1.9, minZ: z - 1.5, maxZ: z + 1.5 });
  }

  private buildSnackShop(obstacles: ObstacleBox[]): void {
    const x = -9.2;
    const z = -2.4;
    const { booth, vendorHead } = this.createBoothBase(
      'snack_shop',
      '🍡 ร้านขนมงานวัดโบราณ',
      'ขนมครก • สายไหม • ลูกชิ้นปิ้ง',
      '#ffb969',
      '#fff4dc',
      '#472518',
      [x, z],
      1.05
    );

    // 3D Khanom Krok clay pan + Cotton Candy rack + Meatball grill
    const pan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.38, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: '#423835', roughness: 0.9 })
    );
    pan.position.set(-0.9, 1.0, 0.5);
    booth.add(pan);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const kk = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#fff3cf', roughness: 0.6 })
      );
      kk.position.set(-0.9 + Math.cos(a) * 0.22, 1.05, 0.5 + Math.sin(a) * 0.22);
      booth.add(kk);
    }

    // Cotton candy puffs
    for (let i = 0; i < 3; i++) {
      const cc = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        new THREE.MeshStandardMaterial({
          color: i === 0 ? '#ffb7d5' : i === 1 ? '#9fe4ff' : '#ffe394',
          roughness: 0.85
        })
      );
      cc.position.set(0.05 + i * 0.34, 1.32, 0.45);
      booth.add(cc);
    }

    // Golden sweet tray
    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.25, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: '#f2c052', roughness: 0.4 })
    );
    tray.position.set(1.05, 1.0, 0.55);
    booth.add(tray);

    const zone: InteractiveZone = {
      id: 'snack_shop',
      label: 'ร้านขายขนม',
      actionLabel: '🍡 ซื้อขนมทานด้วยกัน',
      icon: '🍡',
      position: { x, z },
      interactionPos: { x: x + 2.3, z: z + 0.9 },
      radius: 3.1
    };
    this.zones.push(zone);
    this.stalls.push({ zone, group: booth, vendorHead });
    obstacles.push({ minX: x - 1.9, maxX: x + 1.9, minZ: z - 1.8, maxZ: z + 1.8 });
  }

  private buildDrinkShop(obstacles: ObstacleBox[]): void {
    const x = 9.2;
    const z = -2.4;
    const { booth, vendorHead } = this.createBoothBase(
      'drink_shop',
      '🧋 ร้านน้ำหวาน & ชาไทย',
      'ชาไทย • นมชมพู • เก๊กฮวย',
      '#78c9c4',
      '#fff5e8',
      '#163b47',
      [x, z],
      -1.05
    );

    // 4 glowing colorful drink dispensers on counter
    const drinkColors = ['#e87424', '#ff9ec4', '#f7d560', '#9c7aff'];
    drinkColors.forEach((col, i) => {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.52, 12),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.25,
          roughness: 0.25
        })
      );
      jar.position.set(-1.05 + i * 0.7, 1.22, 0.45);
      booth.add(jar);

      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: '#f2c464', roughness: 0.4 })
      );
      lid.position.set(-1.05 + i * 0.7, 1.5, 0.45);
      booth.add(lid);
    });

    const zone: InteractiveZone = {
      id: 'drink_shop',
      label: 'ร้านขายน้ำ',
      actionLabel: '🧋 ซื้อน้ำเย็นๆ ชื่นใจ',
      icon: '🧋',
      position: { x, z },
      interactionPos: { x: x - 2.3, z: z + 0.9 },
      radius: 3.1
    };
    this.zones.push(zone);
    this.stalls.push({ zone, group: booth, vendorHead });
    obstacles.push({ minX: x - 1.9, maxX: x + 1.9, minZ: z - 1.8, maxZ: z + 1.8 });
  }

  private buildFortuneBooth(obstacles: ObstacleBox[]): void {
    const x = 6.8;
    const z = 4.8;
    const { booth, vendorHead } = this.createBoothBase(
      'fortune_booth',
      '🎋 ซุ้มเซียมซีคู่ & ปาโป่ง',
      'เสี่ยงทายดวงคู่รักคืนวันเพ็ญ',
      '#c49bff',
      '#ffe8a3',
      '#311d4a',
      [x, z],
      -0.55
    );

    // Golden bamboo fortune stick cylinder (กระบอกเซียมซี)
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.15, 0.45, 12),
      new THREE.MeshStandardMaterial({ color: '#d98a3b', roughness: 0.7 })
    );
    cup.position.set(0, 1.18, 0.55);
    booth.add(cup);

    for (let i = 0; i < 8; i++) {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.48, 6),
        new THREE.MeshStandardMaterial({ color: '#f7d57a' })
      );
      stick.position.set((Math.random() - 0.5) * 0.16, 1.38, 0.55 + (Math.random() - 0.5) * 0.12);
      stick.rotation.z = (Math.random() - 0.5) * 0.25;
      booth.add(stick);
    }

    // Colorful balloons on back wall
    const bColors = ['#ff88b8', '#7cdfff', '#ffe073', '#a6ff9e'];
    for (let i = 0; i < 6; i++) {
      const balloon = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshStandardMaterial({ color: bColors[i % bColors.length], roughness: 0.35 })
      );
      balloon.position.set(-1.1 + i * 0.44, 2.0 + (i % 2) * 0.32, -0.55);
      booth.add(balloon);
    }

    const zone: InteractiveZone = {
      id: 'fortune_booth',
      label: 'ซุ้มเซียมซีคู่',
      actionLabel: '🎋 เสี่ยงเซียมซีคู่รัก',
      icon: '🎋',
      position: { x, z },
      interactionPos: { x: x - 1.9, z: z + 1.4 },
      radius: 3.1
    };
    this.zones.push(zone);
    this.stalls.push({ zone, group: booth, vendorHead });
    obstacles.push({ minX: x - 1.9, maxX: x + 1.9, minZ: z - 1.5, maxZ: z + 1.5 });
  }

  public update(time: number): void {
    this.stalls.forEach((s, idx) => {
      s.vendorHead.rotation.y = Math.sin(time * 2 + idx) * 0.22;
      s.vendorHead.position.y = 1.38 + Math.sin(time * 3.5 + idx) * 0.025;
    });
    this.displayKrathongs.forEach((k, idx) => {
      k.update(time, idx * 0.9);
    });
  }
}
