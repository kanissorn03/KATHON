import * as THREE from 'three';
import { createKrathongMesh } from './KrathongFactory';
import { TempleEnvironment } from './TempleEnvironment';
import { QUEST_STATIONS } from '../data/festivalQuests';
import {
  createGlowSprite,
  createNpcBubbleTexture,
  getContactShadowTexture
} from './TextureHelpers';

interface PoiSpot {
  x: number;
  z: number;
  lookX: number;
  lookZ: number;
}

interface NpcActor {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  lanternGroup?: THREE.Group;
  bubbleSprite: THREE.Sprite;
  bubbleTimer: number;
  targetX: number;
  targetZ: number;
  lookX: number;
  lookZ: number;
  speed: number;
  pauseTimer: number;
  phase: number;
  scale: number;
  pairLeaderIndex?: number;
  pairOffsetX: number;
  pairOffsetZ: number;
}

const FAIR_POIS: PoiSpot[] = [
  { x: -4.2, z: 6.6, lookX: -6.8, lookZ: 4.8 },
  { x: -6.2, z: -1.2, lookX: -9.2, lookZ: -2.4 },
  { x: 6.2, z: -1.2, lookX: 9.2, lookZ: -2.4 },
  { x: 4.2, z: 6.6, lookX: 6.8, lookZ: 4.8 },
  { x: 0.0, z: -7.2, lookX: 0.0, lookZ: -13.5 },
  { x: -8.6, z: -7.4, lookX: -12.5, lookZ: -11.5 },
  { x: 8.8, z: -7.0, lookX: 14.5, lookZ: -11.5 },
  { x: -6.5, z: 8.1, lookX: -6.5, lookZ: 18.0 },
  { x: 6.5, z: 8.1, lookX: 6.5, lookZ: 18.0 },
  { x: -13.5, z: 8.0, lookX: -13.5, lookZ: 18.0 },
  { x: 13.5, z: 8.0, lookX: 13.5, lookZ: 18.0 },
  { x: -12.2, z: 2.2, lookX: -9.2, lookZ: -2.4 },
  { x: 12.2, z: 2.2, lookX: 9.2, lookZ: -2.4 },
  { x: -1.2, z: -2.8, lookX: 0.0, lookZ: -12.0 },
  { x: 1.3, z: 4.2, lookX: 0.0, lookZ: 12.0 }
];

const NPC_CHATTER_LINES = [
  'คืนนี้จันทร์สวยจัง 🌕',
  'กระทงสวยทุกแบบเลย ✨',
  'ไปซื้อขนมครกกันมั้ย 🍡',
  'สุขสันต์วันลอยกระทง!',
  'โคมลอยเต็มฟ้าเลย 🏮',
  'ชิงช้าสวรรค์สวยมาก 🎡',
  'ขอพรให้มีความสุขนะ 🙏',
  'น้ำเย็นสบายจัง 🌊',
  'บรรยากาศดีสุดๆ เลย'
];

interface NpcSpec {
  role: string;
  shirt: string;
  bottom: string;
  hair: string;
  skin: string;
  scale: number;
  startX: number;
  startZ: number;
  prop: 'none' | 'hat' | 'lantern' | 'krathong' | 'cotton_candy';
  hairBun?: boolean;
  pairLeaderIndex?: number;
  pairOffsetX?: number;
  pairOffsetZ?: number;
}

const NPC_SPECS: NpcSpec[] = [
  {
    role: 'ชาวบ้าน',
    shirt: '#8f5b52',
    bottom: '#3a303f',
    hair: '#241c1c',
    skin: '#eec2a4',
    scale: 0.84,
    startX: -5.4,
    startZ: 7.5,
    prop: 'lantern'
  },
  {
    role: 'คุณยาย',
    shirt: '#a89a85',
    bottom: '#4c3842',
    hair: '#c8c6cc',
    skin: '#e7b99a',
    scale: 0.80,
    startX: -4.2,
    startZ: 6.4,
    prop: 'krathong',
    hairBun: true
  },
  {
    role: 'คุณลุง',
    shirt: '#5a6f8a',
    bottom: '#333b4a',
    hair: '#9698a4',
    skin: '#dfb090',
    scale: 0.84,
    startX: -12.4,
    startZ: 2.0,
    prop: 'hat'
  },
  {
    role: 'คู่รัก',
    shirt: '#9c6c78',
    bottom: '#3d2e42',
    hair: '#2e2120',
    skin: '#f6ceb4',
    scale: 0.83,
    startX: 6.4,
    startZ: 7.7,
    prop: 'krathong',
    hairBun: true
  },
  {
    role: 'คู่รัก',
    shirt: '#587a72',
    bottom: '#2d3540',
    hair: '#1e1a1b',
    skin: '#e5b89a',
    scale: 0.85,
    startX: 7.1,
    startZ: 7.6,
    prop: 'none',
    pairLeaderIndex: 3,
    pairOffsetX: 0.72,
    pairOffsetZ: 0.15
  },
  {
    role: 'น้องหนู',
    shirt: '#9e824e',
    bottom: '#41475c',
    hair: '#281e1d',
    skin: '#f7d2ba',
    scale: 0.68,
    startX: -6.8,
    startZ: -1.1,
    prop: 'lantern',
    hairBun: true
  },
  {
    role: 'นักท่องเที่ยว',
    shirt: '#665c87',
    bottom: '#2f3246',
    hair: '#3a2b22',
    skin: '#f3cbb0',
    scale: 0.83,
    startX: 8.6,
    startZ: -6.8,
    prop: 'hat'
  },
  {
    role: 'วัยรุ่น',
    shirt: '#7c8258',
    bottom: '#363b38',
    hair: '#241e1f',
    skin: '#f0c4a6',
    scale: 0.82,
    startX: 11.8,
    startZ: 2.1,
    prop: 'cotton_candy'
  },
  {
    role: 'วัยรุ่น',
    shirt: '#8c7654',
    bottom: '#393230',
    hair: '#322521',
    skin: '#eab999',
    scale: 0.83,
    startX: 12.5,
    startZ: 2.3,
    prop: 'none',
    pairLeaderIndex: 7,
    pairOffsetX: 0.68,
    pairOffsetZ: -0.22
  },
  {
    role: 'ชาวบ้าน',
    shirt: '#7e597a',
    bottom: '#342c3c',
    hair: '#261e1d',
    skin: '#e9bb9c',
    scale: 0.81,
    startX: -8.5,
    startZ: -7.1,
    prop: 'hat',
    hairBun: true
  },
  {
    role: 'นักท่องเที่ยว',
    shirt: '#547380',
    bottom: '#2e3542',
    hair: '#423026',
    skin: '#f5ceb3',
    scale: 0.82,
    startX: 13.2,
    startZ: 7.6,
    prop: 'lantern'
  }
];

export class FestivalNPCs {
  public readonly group = new THREE.Group();
  private env: TempleEnvironment;
  private actors: NpcActor[] = [];
  private chatterCooldown = 4.2;
  private readonly questStations = new Map([...QUEST_STATIONS[1], ...QUEST_STATIONS[2]].map(station => [station.actor, station]));
  private readonly questMarker = this.createQuestMarker();

  // Shared lightweight geometries across all ambient NPCs
  private shadowGeo = new THREE.PlaneGeometry(0.84, 0.84);
  private torsoGeo = new THREE.CylinderGeometry(0.15, 0.22, 0.56, 10);
  private skirtGeo = new THREE.CylinderGeometry(0.19, 0.25, 0.22, 10);
  private headGeo = new THREE.SphereGeometry(0.24, 12, 10);
  private hairCapGeo = new THREE.SphereGeometry(0.252, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56);
  private bunGeo = new THREE.SphereGeometry(0.1, 8, 8);
  private armGeo = new THREE.CapsuleGeometry(0.052, 0.2, 4, 8);
  private legGeo = new THREE.CapsuleGeometry(0.062, 0.14, 4, 8);
  private eyeGeo = new THREE.SphereGeometry(0.024, 6, 6);
  private eyeMat = new THREE.MeshBasicMaterial({ color: '#211824' });
  private shadowMat: THREE.MeshBasicMaterial;

  constructor(env: TempleEnvironment) {
    this.env = env;
    this.shadowGeo.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });

    NPC_SPECS.forEach((spec, index) => {
      const actor = this.buildNpc(spec, index);
      this.actors.push(actor);
      this.group.add(actor.root);
    });
    this.questMarker.renderOrder = 4;
  }

  private createQuestMarker(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffd573';
    ctx.strokeStyle = '#fff3cc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(13, 6, 70, 70, 21);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(34, 69);
    ctx.lineTo(62, 69);
    ctx.lineTo(48, 91);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#44304a';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 48, 42);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map, transparent: true, depthWrite: false, depthTest: false, toneMapped: false
    }));
    sprite.scale.set(0.47, 0.47, 1);
    return sprite;
  }

  public showQuestMarker(actor: number | undefined): void {
    this.questMarker.removeFromParent();
    if (actor === undefined) return;
    const npc = this.actors[actor];
    this.questMarker.position.set(0, npc.bubbleSprite.position.y + 0.14, 0);
    npc.root.add(this.questMarker);
  }

  private buildNpc(spec: NpcSpec, index: number): NpcActor {
    const root = new THREE.Group();
    const station = this.questStations.get(index);
    const x = station?.x ?? spec.startX;
    const z = station?.z ?? spec.startZ;
    root.position.set(x, TempleEnvironment.getGroundHeight(x, z), z);

    // Subtle dark contact shadow ONLY (no glowing halo ring like real players)
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.position.y = 0.022;
    root.add(shadow);

    const bodyPivot = new THREE.Group();
    bodyPivot.scale.setScalar(spec.scale);
    root.add(bodyPivot);

    const skinMat = new THREE.MeshStandardMaterial({ color: spec.skin, roughness: 0.78 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: spec.shirt, roughness: 0.8 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: spec.bottom, roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: spec.hair, roughness: 0.82 });

    // Legs
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.1, 0.34, 0);
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.1, 0.34, 0);
    for (const lp of [leftLeg, rightLeg]) {
      const legMesh = new THREE.Mesh(this.legGeo, bottomMat);
      legMesh.position.y = -0.14;
      lp.add(legMesh);
      bodyPivot.add(lp);
    }

    // Torso + lower cloth
    const torso = new THREE.Mesh(this.torsoGeo, shirtMat);
    torso.position.y = 0.64;
    torso.castShadow = true;
    bodyPivot.add(torso);

    const lower = new THREE.Mesh(this.skirtGeo, bottomMat);
    lower.position.y = 0.42;
    bodyPivot.add(lower);

    // Arms
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.22, 0.84, 0);
    const rightArm = new THREE.Group();
    rightArm.position.set(0.22, 0.84, 0);
    for (const ap of [leftArm, rightArm]) {
      const am = new THREE.Mesh(this.armGeo, skinMat);
      am.position.y = -0.13;
      ap.add(am);
      bodyPivot.add(ap);
    }

    // Head + simple hair & face
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.15;
    bodyPivot.add(headGroup);

    const head = new THREE.Mesh(this.headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    const hairCap = new THREE.Mesh(this.hairCapGeo, hairMat);
    hairCap.position.y = 0.03;
    headGroup.add(hairCap);

    if (spec.hairBun) {
      const bun = new THREE.Mesh(this.bunGeo, hairMat);
      bun.position.set(0, 0.24, -0.1);
      headGroup.add(bun);
    }

    for (const sx of [-0.08, 0.08]) {
      const eye = new THREE.Mesh(this.eyeGeo, this.eyeMat);
      eye.position.set(sx, 0, 0.22);
      headGroup.add(eye);
    }

    // Festive props differentiating crowd visitors
    let lanternGroup: THREE.Group | undefined;
    if (spec.prop === 'hat') {
      // Traditional Thai Ngob conical bamboo hat (งอบ)
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(0.36, 0.16, 14),
        new THREE.MeshStandardMaterial({ color: '#c8a46e', roughness: 0.88 })
      );
      hat.position.y = 0.25;
      headGroup.add(hat);
    } else if (spec.prop === 'lantern') {
      lanternGroup = new THREE.Group();
      lanternGroup.position.set(0, -0.24, 0.18);
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6),
        new THREE.MeshStandardMaterial({ color: '#6b472b' })
      );
      stick.rotation.x = 0.7;
      stick.position.set(0, 0.05, 0.08);
      lanternGroup.add(stick);

      const paper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.15, 8),
        new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? '#ffd573' : '#ff9ec6' })
      );
      paper.position.set(0, -0.02, 0.21);
      lanternGroup.add(paper);

      const glow = createGlowSprite(index % 2 === 0 ? '#ffd573' : '#ff9ec6', 0.48, 0.6);
      glow.position.copy(paper.position);
      lanternGroup.add(glow);

      rightArm.add(lanternGroup);
    } else if (spec.prop === 'krathong') {
      const mini = createKrathongMesh(index === 1 ? 'banana_lotus' : 'golden_marigold', 0.42);
      mini.group.position.set(0, 0.62, 0.28);
      bodyPivot.add(mini.group);
    } else if (spec.prop === 'cotton_candy') {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6),
        new THREE.MeshBasicMaterial({ color: '#f7efe3' })
      );
      stick.position.set(0, -0.18, 0.12);
      stick.rotation.x = 0.5;
      rightArm.add(stick);

      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#ffa8cf', roughness: 0.85 })
      );
      puff.position.set(0, -0.08, 0.18);
      rightArm.add(puff);
    }

    // Warm translucent ambient NPC speech bubble (no overhead name tag)
    const bubbleY = spec.scale < 0.75 ? 1.48 : 1.74;
    const bubbleMat = new THREE.SpriteMaterial({
      map: createNpcBubbleTexture(''),
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });
    const bubbleSprite = new THREE.Sprite(bubbleMat);
    bubbleSprite.position.set(0, bubbleY, 0);
    bubbleSprite.scale.set(1.22, 0.32, 1);
    bubbleSprite.visible = false;
    root.add(bubbleSprite);

    const poi = FAIR_POIS[index % FAIR_POIS.length];
    return {
      root,
      bodyPivot,
      headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      lanternGroup,
      bubbleSprite,
      bubbleTimer: 0,
      targetX: poi.x,
      targetZ: poi.z,
      lookX: poi.lookX,
      lookZ: poi.lookZ,
      speed: 1.05 + (index % 5) * 0.11,
      pauseTimer: 0.8 + (index % 4) * 1.1,
      phase: index * 1.37,
      scale: spec.scale,
      pairLeaderIndex: spec.pairLeaderIndex,
      pairOffsetX: spec.pairOffsetX ?? 0.7,
      pairOffsetZ: spec.pairOffsetZ ?? 0.2
    };
  }

  private pickNextWaypoint(actor: NpcActor, playerPos: THREE.Vector3, customizeCloseup: boolean): void {
    for (let attempt = 0; attempt < 8; attempt++) {
      const poi = FAIR_POIS[Math.floor(Math.random() * FAIR_POIS.length)];
      const jx = (Math.random() - 0.5) * 1.4;
      const jz = (Math.random() - 0.5) * 1.2;
      const tx = THREE.MathUtils.clamp(poi.x + jx, -15.2, 15.2);
      const tz = THREE.MathUtils.clamp(poi.z + jz, -8.8, 8.4);

      if (!this.env.isPointWalkable(tx, tz)) continue;
      if (customizeCloseup && Math.hypot(tx, tz - 2.2) < 3.6) continue;
      if (Math.hypot(tx - playerPos.x, tz - playerPos.z) < 1.5) continue;

      actor.targetX = tx;
      actor.targetZ = tz;
      actor.lookX = poi.lookX;
      actor.lookZ = poi.lookZ;
      return;
    }
    actor.pauseTimer = 1.8;
  }

  private showBubble(actor: NpcActor, text: string): void {
    const mat = actor.bubbleSprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = createNpcBubbleTexture(text);
    mat.needsUpdate = true;
    actor.bubbleSprite.visible = true;
    actor.bubbleTimer = 3.5;
  }

  public update(dt: number, time: number, playerPos: THREE.Vector3, customizeCloseup: boolean): void {
    // Periodic quiet Thai festival chatter among paused NPCs
    this.chatterCooldown -= dt;
    if (this.chatterCooldown <= 0) {
      this.chatterCooldown = 5.0 + Math.random() * 4.0;
      const activeBubbles = this.actors.filter((a) => a.bubbleTimer > 0).length;
      if (activeBubbles < 2) {
        const candidates = this.actors.filter((a, index) =>
          !this.questStations.has(index) && a.pauseTimer > 0.6 && a.bubbleTimer <= 0);
        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          const line = NPC_CHATTER_LINES[Math.floor(Math.random() * NPC_CHATTER_LINES.length)];
          this.showBubble(chosen, line);
        }
      }
    }

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];

      if (a.bubbleTimer > 0) {
        a.bubbleTimer -= dt;
        if (a.bubbleTimer <= 0) {
          a.bubbleSprite.visible = false;
        }
      }

      // Sync strolling pair companion to leader's waypoint
      if (a.pairLeaderIndex !== undefined) {
        const leader = this.actors[a.pairLeaderIndex];
        const cx = THREE.MathUtils.clamp(leader.targetX + a.pairOffsetX, -15.2, 15.2);
        const cz = THREE.MathUtils.clamp(leader.targetZ + a.pairOffsetZ, -8.8, 8.4);
        if (this.env.isPointWalkable(cx, cz)) {
          a.targetX = cx;
          a.targetZ = cz;
          a.lookX = leader.lookX;
          a.lookZ = leader.lookZ;
        }
      }

      // If lobby camera close-up is active, gently nudge NPCs out of the preview center
      const station = this.questStations.get(i);
      if (customizeCloseup && !station) {
        const distCenter = Math.hypot(a.root.position.x, a.root.position.z - 2.2);
        if (distCenter < 3.5) {
          this.pickNextWaypoint(a, playerPos, true);
          a.pauseTimer = 0;
        }
      }

      let isMoving = false;
      if (station) {
        const dx = playerPos.x - station.x;
        const dz = playerPos.z - station.z;
        const yaw = Math.hypot(dx, dz) < 4 ? Math.atan2(dx, dz) : 0;
        a.root.rotation.y += Math.atan2(Math.sin(yaw - a.root.rotation.y), Math.cos(yaw - a.root.rotation.y)) * Math.min(1, dt * 4.5);
      } else if (a.pauseTimer > 0) {
        a.pauseTimer -= dt;
        // Face landmark while pausing
        const faceYaw = Math.atan2(a.lookX - a.root.position.x, a.lookZ - a.root.position.z);
        const diff = Math.atan2(Math.sin(faceYaw - a.root.rotation.y), Math.cos(faceYaw - a.root.rotation.y));
        a.root.rotation.y += diff * Math.min(1, dt * 4.5);

        if (a.pauseTimer <= 0 && a.pairLeaderIndex === undefined) {
          this.pickNextWaypoint(a, playerPos, customizeCloseup);
        }
      } else {
        const dx = a.targetX - a.root.position.x;
        const dz = a.targetZ - a.root.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.35) {
          a.pauseTimer = 2.6 + Math.random() * 3.8;
        } else {
          let dirX = dx / dist;
          let dirZ = dz / dist;

          // Polite separation away from real player
          const pdx = a.root.position.x - playerPos.x;
          const pdz = a.root.position.z - playerPos.z;
          const pDist = Math.hypot(pdx, pdz);
          if (pDist > 0.01 && pDist < 1.35) {
            const push = (1.35 - pDist) / 1.35;
            dirX += (pdx / pDist) * push * 1.1;
            dirZ += (pdz / pDist) * push * 1.1;
            const dLen = Math.hypot(dirX, dirZ) || 1;
            dirX /= dLen;
            dirZ /= dLen;
          }

          const step = a.speed * dt;
          const nx = a.root.position.x + dirX * step;
          const nz = a.root.position.z + dirZ * step;

          if (nz <= 8.5 && this.env.isPointWalkable(nx, nz)) {
            a.root.position.x = nx;
            a.root.position.z = nz;
            a.root.position.y = TempleEnvironment.getGroundHeight(nx, nz);

            const targetYaw = Math.atan2(dirX, dirZ);
            const diff = Math.atan2(
              Math.sin(targetYaw - a.root.rotation.y),
              Math.cos(targetYaw - a.root.rotation.y)
            );
            a.root.rotation.y += diff * Math.min(1, dt * 7);
            isMoving = true;
          } else if (a.pairLeaderIndex === undefined) {
            this.pickNextWaypoint(a, playerPos, customizeCloseup);
          } else {
            a.pauseTimer = 1.2;
          }
        }
      }

      // Calm walking / idle doll animation
      if (isMoving) {
        const stride = Math.sin(time * 7.2 + a.phase);
        a.bodyPivot.position.y = Math.abs(Math.sin(time * 7.2 + a.phase)) * 0.04;
        a.leftLeg.rotation.x = stride * 0.45;
        a.rightLeg.rotation.x = -stride * 0.45;
        a.leftArm.rotation.x = -stride * 0.35;
        a.rightArm.rotation.x = a.lanternGroup ? -0.45 + stride * 0.12 : stride * 0.35;
        a.headGroup.rotation.z = stride * 0.03;
      } else {
        a.bodyPivot.position.y = Math.sin(time * 2.1 + a.phase) * 0.012;
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, 0.2);
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, 0.2);
        a.leftArm.rotation.x = THREE.MathUtils.lerp(a.leftArm.rotation.x, 0, 0.2);
        a.rightArm.rotation.x = THREE.MathUtils.lerp(
          a.rightArm.rotation.x,
          a.lanternGroup ? -0.42 : 0,
          0.2
        );
        a.headGroup.rotation.z = Math.sin(time * 1.3 + a.phase) * 0.045;
      }

      if (a.lanternGroup) {
        a.lanternGroup.rotation.z = Math.sin(time * 3.1 + a.phase) * 0.12;
      }
    }
  }
}
