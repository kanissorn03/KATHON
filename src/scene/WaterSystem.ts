import * as THREE from 'three';
import { KrathongId, WishPayload } from '../types';
import { AnimatedKrathong, createKrathongMesh } from './KrathongFactory';
import {
  createGlowSprite,
  createRectangularWishBoxesTexture,
  createWishLabelTexture
} from './TextureHelpers';

export const WATER_SURFACE_Y = -0.75;

interface RippleRing {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
}

interface FloatingKrathong {
  anim: AnimatedKrathong;
  baseX: number;
  baseZ: number;
  driftSpeedZ: number;
  driftSpeedX: number;
  phase: number;
  isUser: boolean;
  rippleCooldown: number;
  wishLabel?: THREE.Sprite;
}

interface SparkleParticle {
  sprite: THREE.Sprite;
  age: number;
  maxAge: number;
  vy: number;
}

export class WaterSystem {
  public readonly group = new THREE.Group();
  private waterMat: THREE.ShaderMaterial;
  private ripples: RippleRing[] = [];
  private floated: FloatingKrathong[] = [];
  private sparkles: SparkleParticle[] = [];
  private userKrathongs: FloatingKrathong[] = [];

  constructor() {
    // Moonlit animated water surface shader
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vWaterPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWaterPos = wp.xz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vWaterPos;
        void main() {
          // Deep indigo river base shifting toward warm moonlit teal in distance
          float distZ = clamp((vWaterPos.y - 10.0) / 85.0, 0.0, 1.0);
          vec3 nearCol = vec3(0.04, 0.11, 0.24);
          vec3 farCol = vec3(0.08, 0.16, 0.34);
          vec3 col = mix(nearCol, farCol, distZ);

          // Shimmering Full Moon reflection path along river toward X~10, Z~92
          float dx = abs(vWaterPos.x - mix(0.0, 9.0, distZ));
          float wave = sin(vWaterPos.y * 1.9 - uTime * 2.3 + sin(vWaterPos.x * 1.7) * 1.7);
          col += vec3(0.025, 0.052, 0.087) * smoothstep(0.25, 0.96, wave);
          if (dx < 34.0) {
            float beam = (1.0 - smoothstep(0.0, 34.0, dx)) * exp(-dx * 0.17);
            col += vec3(1.0, 0.88, 0.56) * beam * smoothstep(-0.2, 0.9, wave) * (0.28 + 0.35 * distZ);
            float glint = smoothstep(0.88, 1.0, wave * sin(vWaterPos.x * 3.1 + uTime * 1.6));
            col += vec3(1.0, 0.95, 0.8) * glint * beam * 0.42;
            float pierGlow = (1.0 - smoothstep(0.0, 9.0, abs(vWaterPos.x))) *
              (1.0 - smoothstep(12.0, 31.0, vWaterPos.y));
            col += vec3(1.0, 0.72, 0.32) * pierGlow * 0.18;
          }
          vec2 viewOffset = cameraPosition.xz - vWaterPos;
          float haze = smoothstep(1296.0, 21025.0, dot(viewOffset, viewOffset));
          col = mix(col, vec3(0.18, 0.155, 0.28), 0.78 * haze);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(420, 320), this.waterMat);
    plane.renderOrder = 1;
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, WATER_SURFACE_Y, 25);
    this.group.add(plane);

    // Spawn a few distant ambient krathongs so the river feels alive on arrival
    const ambientTypes: KrathongId[] = [
      'banana_lotus',
      'golden_marigold',
      'crystal_lotus',
      'bread_turtle',
      'coconut_orchid'
    ];
    for (let i = 0; i < 8; i++) {
      const id = ambientTypes[i % ambientTypes.length];
      const ax = -16 + Math.random() * 34;
      const az = 28 + Math.random() * 36;
      this.spawnKrathong(id, ax, az, false, undefined, undefined, 0.85);
    }

    // Decorative lotus pads & blossoms clustered along the stone riverbank
    this.buildRiverbankLilies();
  }

  private buildRiverbankLilies(): void {
    const padGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 12, 1, false, 0.25, Math.PI * 1.85);
    const padMat = new THREE.MeshStandardMaterial({ color: '#397d54', roughness: 0.75 });
    const budGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const budMat = new THREE.MeshStandardMaterial({
      color: '#ff9ec6',
      emissive: '#591c38',
      emissiveIntensity: 0.25,
      roughness: 0.5
    });

    const spots: [number, number][] = [
      [-14, 12.2],
      [-10.5, 11.4],
      [-6.5, 12.0],
      [6.2, 11.8],
      [10.8, 11.5],
      [14.5, 12.4],
      [-4.2, 14.5],
      [4.5, 15.0]
    ];
    spots.forEach(([lx, lz], idx) => {
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(lx, WATER_SURFACE_Y + 0.03, lz);
      pad.rotation.y = idx * 1.1;
      this.group.add(pad);

      if (idx % 2 === 0) {
        const bud = new THREE.Mesh(budGeo, budMat);
        bud.position.set(lx + 0.08, WATER_SURFACE_Y + 0.1, lz);
        this.group.add(bud);
      }
    });
  }

  public spawnRipple(x: number, z: number, maxScale = 2.4): void {
    const geo = new THREE.RingGeometry(0.18, 0.24, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: '#a8e8ff',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, WATER_SURFACE_Y + 0.03, z);
    mesh.userData.maxScale = maxScale;
    this.group.add(mesh);
    this.ripples.push({ mesh, age: 0, maxAge: 2.2 });
  }

  public spawnUserKrathongs(payload: WishPayload): void {
    this.userKrathongs = [];
    if (payload.solo) {
      const fk = this.spawnKrathong(
        payload.krathongId1,
        0,
        24.7,
        true,
        undefined,
        undefined,
        1.15,
        [{ name: payload.names[0], wish: payload.wish1 }]
      );
      this.userKrathongs.push(fk);
      this.spawnRipple(0, 24.7, 3.0);
      return;
    }

    if (payload.mode === 'shared') {
      const fk = this.spawnKrathong(
        payload.krathongId1,
        0,
        24.7,
        true,
        undefined,
        undefined,
        1.2,
        [
          { name: payload.names[0], wish: payload.wish1 },
          { name: payload.names[1], wish: payload.wish2 }
        ]
      );
      this.userKrathongs.push(fk);
      this.spawnRipple(0, 24.7, 3.2);
    } else {
      const k1 = this.spawnKrathong(
        payload.krathongId1,
        -0.58,
        24.7,
        true,
        undefined,
        undefined,
        1.05,
        [{ name: payload.names[0], wish: payload.wish1 }]
      );
      const k2 = this.spawnKrathong(
        payload.krathongId2,
        0.58,
        24.7,
        true,
        undefined,
        undefined,
        1.05,
        [{ name: payload.names[1], wish: payload.wish2 }]
      );
      k2.driftSpeedX = k1.driftSpeedX;
      k2.driftSpeedZ = k1.driftSpeedZ;
      this.userKrathongs.push(k1, k2);
      this.spawnRipple(-0.58, 24.7, 2.8);
      this.spawnRipple(0.58, 24.7, 2.8);
    }
  }

  private spawnKrathong(
    id: KrathongId,
    x: number,
    z: number,
    isUser: boolean,
    wishText?: string,
    namesLabel?: string,
    scale = 1,
    wishBoxes?: { name: string; wish: string }[]
  ): FloatingKrathong {
    const anim = createKrathongMesh(id, scale);
    anim.group.position.set(x, WATER_SURFACE_Y + 0.02, z);
    this.group.add(anim.group);

    // Subtle glowing reflection halo underneath on the water
    const waterGlow = createGlowSprite('#ffbe55', 1.35, isUser ? 0.55 : 0.35);
    waterGlow.position.set(0, 0.03, 0);
    anim.group.add(waterGlow);

    let wishLabel: THREE.Sprite | undefined;
    if (isUser && wishBoxes && wishBoxes.length > 0) {
      const tex = createRectangularWishBoxesTexture(wishBoxes);
      wishLabel = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: 0.96,
          depthWrite: false
        })
      );
      wishLabel.position.set(0, 0.95, 0);
      wishLabel.scale.set(wishBoxes.length >= 2 ? 3.2 : 1.95, 0.78, 1);
      anim.group.add(wishLabel);
    } else if (isUser && wishText && namesLabel) {
      const tex = createWishLabelTexture(wishText, namesLabel);
      wishLabel = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: 0.94,
          depthWrite: false
        })
      );
      wishLabel.position.set(0, 0.85, 0);
      wishLabel.scale.set(2.15, 0.64, 1);
      anim.group.add(wishLabel);
    }

    const fk: FloatingKrathong = {
      anim,
      baseX: x,
      baseZ: z,
      driftSpeedZ: isUser ? 0.58 : 0.32 + Math.random() * 0.16,
      driftSpeedX: isUser ? 0.14 : 0.08 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      isUser,
      rippleCooldown: 0.8,
      wishLabel
    };
    this.floated.push(fk);
    return fk;
  }

  public getUserKrathongFocusPoint(): THREE.Vector3 | null {
    if (this.userKrathongs.length === 0) return null;
    const sum = new THREE.Vector3();
    for (const k of this.userKrathongs) {
      sum.add(k.anim.group.position);
    }
    sum.divideScalar(this.userKrathongs.length);
    return sum;
  }

  public update(dt: number, time: number): void {
    this.waterMat.uniforms.uTime.value = time;

    // Update floating krathongs
    for (const fk of this.floated) {
      fk.baseZ += fk.driftSpeedZ * dt;
      fk.baseX += fk.driftSpeedX * dt;

      // Wrap ambient krathongs gently if too far
      if (!fk.isUser && fk.baseZ > 75) {
        fk.baseZ = 27 + Math.random() * 6;
        fk.baseX = -16 + Math.random() * 32;
      }

      const swayX = Math.sin(time * 0.8 + fk.phase) * 0.18;
      const bobY =
        WATER_SURFACE_Y +
        0.02 +
        Math.sin(time * 2.1 + fk.phase) * 0.025 +
        Math.cos((fk.baseX + fk.baseZ) * 0.4 + time) * 0.012;

      fk.anim.group.position.set(fk.baseX + swayX, bobY, fk.baseZ);
      fk.anim.group.rotation.z = Math.sin(time * 1.6 + fk.phase) * 0.045;
      fk.anim.group.rotation.x = Math.cos(time * 1.3 + fk.phase) * 0.035;
      fk.anim.update(time, fk.phase);

      if (fk.isUser) {
        fk.rippleCooldown -= dt;
        if (fk.rippleCooldown <= 0) {
          fk.rippleCooldown = 1.4;
          this.spawnRipple(fk.anim.group.position.x, fk.anim.group.position.z, 1.7);
          this.spawnSparkle(fk.anim.group.position.x, bobY + 0.18, fk.anim.group.position.z);
        }
      }
    }

    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      if (r.age >= r.maxAge) {
        this.group.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }
      const p = r.age / r.maxAge;
      const maxS = (r.mesh.userData.maxScale as number) || 2.2;
      const s = 1 + p * maxS;
      r.mesh.scale.set(s, 1, s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.6;
    }

    // Update sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.age += dt;
      if (sp.age >= sp.maxAge) {
        this.group.remove(sp.sprite);
        sp.sprite.material.dispose();
        this.sparkles.splice(i, 1);
        continue;
      }
      sp.sprite.position.y += sp.vy * dt;
      const p = sp.age / sp.maxAge;
      sp.sprite.material.opacity = (1 - p) * 0.85;
    }
  }

  private spawnSparkle(x: number, y: number, z: number): void {
    const sp = createGlowSprite('#ffe894', 0.28, 0.85);
    sp.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4);
    this.group.add(sp);
    this.sparkles.push({
      sprite: sp,
      age: 0,
      maxAge: 1.6,
      vy: 0.25 + Math.random() * 0.25
    });
  }
}
