import * as THREE from 'three';
import { createGlowSprite, getGlowTexture } from './TextureHelpers';

export type FestivalEffect = 'sky_lantern' | 'firework';
export const SHOW_DURATION = 5.8;

interface FloatingLantern {
  model: THREE.Group;
  halo: THREE.Sprite;
  light: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  age: number;
  origin: THREE.Vector3;
  drift: number;
}

interface Rocket {
  x: number;
  z: number;
  height: number;
  age: number;
  flight: number;
  color: string;
  core: THREE.Sprite;
  tail: THREE.Sprite;
}

interface Burst {
  sparks: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  trails: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  offsets: Float32Array;
  age: number;
}

export class FestivalEffects {
  public readonly group = new THREE.Group();
  private readonly lanterns: FloatingLantern[] = [];
  private readonly rockets: Rocket[] = [];
  private readonly bursts: Burst[] = [];
  private readonly paper = new THREE.LatheGeometry([
    [0.28, -0.38], [0.37, -0.31], [0.41, -0.10], [0.39, 0.25], [0.31, 0.38], [0.19, 0.42], [0, 0.42]
  ].map(([r, y]) => new THREE.Vector2(r, y)), 12);
  private readonly frame = new THREE.TorusGeometry(0.278, 0.018, 5, 12);
  private readonly flame = new THREE.SphereGeometry(0.102, 8, 6);
  private readonly frameMaterial = new THREE.MeshBasicMaterial({ color: '#88502c' });

  public play(effect: FestivalEffect, riverZ: number): void {
    if (effect === 'sky_lantern') {
      for (const [i, x] of [-2, 0, 2].entries()) {
        const model = new THREE.Group();
        const origin = new THREE.Vector3(x, 1.35 + i * 0.19, riverZ + 0.8 + i * 0.75);
        model.position.copy(origin);
        model.visible = false;
        const paper = new THREE.Mesh(this.paper, new THREE.MeshStandardMaterial({
          color: ['#ffc37f', '#ffd88f', '#ffae8d'][i], emissive: '#ff863b', emissiveIntensity: 0.58,
          side: THREE.DoubleSide, roughness: 0.93
        }));
        const rim = new THREE.Mesh(this.frame, this.frameMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = -0.38;
        const light = new THREE.Mesh(this.flame, new THREE.MeshBasicMaterial({ color: '#fff0ae' }));
        light.position.y = -0.31;
        const halo = createGlowSprite('#ffab59', 1.7, 0.62);
        halo.position.y = -0.26;
        model.add(paper, rim, light, halo);
        this.group.add(model);
        this.lanterns.push({ model, halo, light, origin, age: -i * 0.17, drift: (i - 1) * 0.12 });
      }
      return;
    }

    for (const [i, color] of ['#ffc169', '#ff92c3', '#99dbff'].entries()) {
      const core = createGlowSprite('#ffe8b8', 0.88, 0.95);
      const tail = createGlowSprite('#ff9962', 0.7, 0.68);
      tail.scale.set(0.30, 1.65, 1);
      core.visible = tail.visible = false;
      this.group.add(core, tail);
      this.rockets.push({
        x: [0, -3.35, 3.35][i], z: riverZ + 8 + (i % 2) * 1.4,
        height: [9.2, 7.7, 8.15][i], age: -0.24 - i * 0.62, flight: 1.04 + i * 0.08,
        color, core, tail
      });
    }
  }

  private burst(rocket: Rocket): void {
    const count = 52;
    const offsets = new Float32Array(count * 3);
    const origin = new THREE.Vector3(rocket.x, rocket.height, rocket.z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const sparks = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: rocket.color, map: getGlowTexture(), size: 0.39, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false
    }));
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3).setUsage(THREE.DynamicDrawUsage));
    const colors = new Float32Array(count * 6);
    const tint = new THREE.Color(rocket.color);
    for (let i = 0; i < count; i++) {
      const y = 1 - (i + 0.5) * 2 / count;
      const radial = Math.sqrt(1 - y * y);
      const angle = i * 2.399963 + rocket.x;
      const speed = 2.4 + Math.random() * 1.5;
      offsets.set([radial * Math.cos(angle) * speed, y * speed, radial * Math.sin(angle) * speed], i * 3);
      colors.set([tint.r, tint.g, tint.b, tint.r * 0.17, tint.g * 0.17, tint.b * 0.17], i * 6);
    }
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const trails = new THREE.LineSegments(trailGeometry, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false, toneMapped: false
    }));
    sparks.position.copy(origin);
    trails.position.copy(origin);
    sparks.frustumCulled = trails.frustumCulled = false;
    this.group.add(sparks, trails);
    this.bursts.push({ sparks, trails, offsets, age: 0 });
  }

  public update(dt: number, onBurst: () => void): void {
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const lantern = this.lanterns[i];
      lantern.age += dt;
      if (lantern.age < 0) continue;
      if (lantern.age >= 12) {
        const paper = lantern.model.children[0] as THREE.Mesh<THREE.LatheGeometry, THREE.MeshStandardMaterial>;
        paper.material.dispose();
        lantern.light.material.dispose();
        lantern.halo.material.dispose();
        lantern.model.removeFromParent();
        this.lanterns.splice(i, 1);
        continue;
      }
      lantern.model.visible = true;
      const sway = Math.sin(lantern.age * 1.7 + i) * 0.17;
      lantern.model.position.copy(lantern.origin).addScaledVector(THREE.Object3D.DEFAULT_UP, lantern.age * 1.08);
      lantern.model.position.x += sway + lantern.drift * lantern.age;
      lantern.model.position.z += lantern.age * 0.36;
      lantern.model.rotation.z = sway * 0.55;
      lantern.light.scale.y = 1.1 + Math.sin(lantern.age * 17 + i * 2) * 0.28;
      lantern.halo.material.opacity = 0.53 + Math.sin(lantern.age * 12 + i) * 0.09;
    }

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i];
      rocket.age += dt;
      if (rocket.age < 0) continue;
      const distance = rocket.age / rocket.flight;
      if (distance >= 1) {
        rocket.core.removeFromParent();
        rocket.tail.removeFromParent();
        rocket.core.material.dispose();
        rocket.tail.material.dispose();
        this.rockets.splice(i, 1);
        this.burst(rocket);
        onBurst();
        continue;
      }
      const y = 0.2 + (rocket.height - 0.2) * (1 - (1 - distance) ** 1.38);
      rocket.core.position.set(rocket.x, y, rocket.z);
      rocket.tail.position.set(rocket.x, y - 0.65, rocket.z);
      rocket.core.visible = rocket.tail.visible = true;
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const { sparks, trails, offsets } = this.bursts[i];
      const age = this.bursts[i].age += dt;
      if (age >= 2.45) {
        for (const object of [sparks, trails]) {
          object.removeFromParent();
          object.material.dispose();
          object.geometry.dispose();
        }
        this.bursts.splice(i, 1);
        continue;
      }
      const tips = sparks.geometry.attributes.position;
      const lines = trails.geometry.attributes.position;
      const back = Math.max(0, age - 0.19);
      const reach = (1 - Math.exp(-0.83 * age)) / 0.83;
      const tailReach = (1 - Math.exp(-0.83 * back)) / 0.83;
      for (let spark = 0; spark < tips.count; spark++) {
        const at = spark * 3;
        const x = offsets[at], y = offsets[at + 1], z = offsets[at + 2];
        tips.setXYZ(spark, x * reach, y * reach - age * age * 0.62, z * reach);
        lines.setXYZ(spark * 2, tips.getX(spark), tips.getY(spark), tips.getZ(spark));
        lines.setXYZ(spark * 2 + 1, x * tailReach, y * tailReach - back * back * 0.62, z * tailReach);
      }
      tips.needsUpdate = lines.needsUpdate = true;
      sparks.material.opacity = (1 - age / 2.45) ** 1.2;
      trails.material.opacity = sparks.material.opacity * 0.83;
    }
  }
}
