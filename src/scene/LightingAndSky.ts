import * as THREE from 'three';
import { buildFestivalBackdrop } from './FestivalBackdrop';
import { createGlowSprite, createMoonTexture, getGlowTexture } from './TextureHelpers';

interface SkyLantern {
  group: THREE.Group;
  speedY: number;
  driftX: number;
  phase: number;
}

interface FireworkBurst {
  points: THREE.Points;
  velocities: Float32Array;
  age: number;
  maxAge: number;
}

export class LightingAndSky {
  public readonly group = new THREE.Group();
  private lanterns: SkyLantern[] = [];
  private fireflies: THREE.Points;
  private fireflyBase: Float32Array;
  private fireworks: FireworkBurst[] = [];
  private riverMist: { sprite: THREE.Sprite; baseX: number; speed: number; phase: number }[] = [];
  private shootingStar: THREE.Mesh;
  private starActive = false;
  private starTimer = 6.5;
  private starVel = new THREE.Vector3();
  private ambientFireworkTimer = 10;

  constructor(scene: THREE.Scene) {
    // Soft night fog blending distant water into horizon
    scene.fog = new THREE.FogExp2('#151738', 0.0072);

    // Night Sky Dome gradient shader with subtle warm festival horizon haze
    const skyGeo = new THREE.SphereGeometry(165, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          vec3 direction = normalize(vPos);
          float h = clamp(direction.y, 0.0, 1.0);
          vec3 horizon = vec3(0.18, 0.14, 0.34);
          vec3 mid = vec3(0.08, 0.09, 0.24);
          vec3 zenith = vec3(0.03, 0.04, 0.13);
          vec3 col = mix(horizon, mid, smoothstep(0.0, 0.35, h));
          col = mix(col, zenith, smoothstep(0.35, 0.9, h));
          col += vec3(0.14, 0.078, 0.11) * (1.0 - smoothstep(0.0, 0.18, h));
          float azimuth = atan(direction.x, direction.z);
          float curl = sin(azimuth * 7.0 + h * 42.0) * 0.35 + sin(azimuth * 13.0 - h * 20.0) * 0.28;
          float clouds = smoothstep(0.60, 1.06, sin(azimuth * 4.0 + h * 53.0) + curl);
          clouds *= smoothstep(0.035, 0.10, h) * (1.0 - smoothstep(0.17, 0.35, h));
          col += vec3(0.050, 0.037, 0.067) * clouds;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.renderOrder = 2;
    this.group.add(sky);

    // Starfield
    const starCount = 420;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.44;
      const r = 148;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 8;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#fff8db',
      map: getGlowTexture(),
      size: 1.5,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.02,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    this.group.add(new THREE.Points(starGeo, starMat));

    // Giant luminous Full Moon (พระจันทร์เต็มดวง) over the river
    const moonGroup = new THREE.Group();
    moonGroup.position.set(10, 30, 96);
    const moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(6.2, 24, 20),
      new THREE.MeshBasicMaterial({ map: createMoonTexture(), fog: false })
    );
    moonGroup.add(moonDisc);

    const halo1 = createGlowSprite('#ffe8a3', 30, 0.5, false);
    moonGroup.add(halo1);
    const halo2 = createGlowSprite('#ffd175', 52, 0.24, false);
    moonGroup.add(halo2);
    this.group.add(moonGroup);

    this.group.add(buildFestivalBackdrop());

    // Balanced, mobile-friendly Lighting (Total PointLights <= 4)
    const hemi = new THREE.HemisphereLight('#a8beff', '#2b1e33', 1.05);
    this.group.add(hemi);

    const moonLight = new THREE.DirectionalLight('#ffecc4', 1.15);
    moonLight.position.set(10, 26, 48);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(1024, 1024);
    moonLight.shadow.camera.near = 2;
    moonLight.shadow.camera.far = 95;
    moonLight.shadow.camera.left = -24;
    moonLight.shadow.camera.right = 24;
    moonLight.shadow.camera.top = 24;
    moonLight.shadow.camera.bottom = -24;
    moonLight.shadow.bias = -0.0005;
    this.group.add(moonLight);

    const templeWarm = new THREE.PointLight('#ffb866', 2.4, 34, 1.4);
    templeWarm.position.set(0, 5.5, -5);
    this.group.add(templeWarm);

    const fairCenterWarm = new THREE.PointLight('#ffd27a', 2.2, 32, 1.4);
    fairCenterWarm.position.set(0, 5.0, 5);
    this.group.add(fairCenterWarm);

    const pierWarm = new THREE.PointLight('#ffca6e', 2.1, 22, 1.4);
    pierWarm.position.set(0, 3.2, 20.5);
    this.group.add(pierWarm);

    // Ambient Sky Lanterns (โคมลอย) across the moonlit river valley
    for (let i = 0; i < 26; i++) {
      this.spawnLantern(
        -42 + Math.random() * 84,
        6 + Math.random() * 26,
        22 + Math.random() * 68
      );
    }

    // Soft glowing river mist layers drifting across the water
    for (let i = 0; i < 10; i++) {
      const mist = createGlowSprite('#8da4e8', 16 + (i % 3) * 4, 0.09 + (i % 2) * 0.03, true);
      const bx = -32 + i * 7.2;
      mist.scale.set(22 + (i % 3) * 5, 3.2, 1);
      mist.position.set(bx, 0.28 + (i % 3) * 0.18, 26 + (i % 5) * 9.5);
      this.group.add(mist);
      this.riverMist.push({
        sprite: mist,
        baseX: bx,
        speed: 0.35 + (i % 4) * 0.12,
        phase: i * 1.1
      });
    }

    // Occasional distant shooting star (ดาวตก)
    this.shootingStar = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.07, 0.07),
      new THREE.MeshBasicMaterial({
        color: '#fff6d6',
        transparent: true,
        opacity: 0,
        fog: false
      })
    );
    this.shootingStar.visible = false;
    this.group.add(this.shootingStar);

    // Fireflies near riverbank & trees
    const ffCount = 84;
    const ffPos = new Float32Array(ffCount * 3);
    this.fireflyBase = new Float32Array(ffCount * 3);
    for (let i = 0; i < ffCount; i++) {
      const x = (Math.random() - 0.5) * 34;
      const y = 0.6 + Math.random() * 2.6;
      const z = -6 + Math.random() * 26;
      ffPos[i * 3] = x;
      ffPos[i * 3 + 1] = y;
      ffPos[i * 3 + 2] = z;
      this.fireflyBase[i * 3] = x;
      this.fireflyBase[i * 3 + 1] = y;
      this.fireflyBase[i * 3 + 2] = z;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    const ffMat = new THREE.PointsMaterial({
      color: '#ffe87c',
      map: getGlowTexture(),
      size: 0.45,
      transparent: true,
      opacity: 0.92,
      alphaTest: 0.02,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.fireflies = new THREE.Points(ffGeo, ffMat);
    this.group.add(this.fireflies);
  }

  private spawnLantern(x: number, y: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.22, 0.54, 10),
      new THREE.MeshBasicMaterial({
        color: '#ffae5c',
        transparent: true,
        opacity: 0.92
      })
    );
    g.add(body);

    const glow = createGlowSprite('#ffa74f', 1.5, 0.72);
    glow.position.y = -0.1;
    g.add(glow);

    this.group.add(g);
    this.lanterns.push({
      group: g,
      speedY: 0.45 + Math.random() * 0.35,
      driftX: (Math.random() - 0.3) * 0.35,
      phase: Math.random() * Math.PI * 2
    });
  }

  public launchFirework(
    cx = -10 + Math.random() * 22,
    cy = 12 + Math.random() * 9,
    cz = 36 + Math.random() * 18,
    count = 64,
    speedMin = 3.5,
    speedSpan = 4.5,
    size = 0.85
  ): void {
    const palette = ['#ffd46b', '#ff8ec6', '#7ceeff', '#c89bff'];
    const color = palette[Math.floor(Math.random() * palette.length)];

    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = cx;
      pos[i * 3 + 1] = cy;
      pos[i * 3 + 2] = cz;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = speedMin + Math.random() * speedSpan;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.cos(phi) * speed + 1.2;
      vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color,
      map: getGlowTexture(),
      size,
      transparent: true,
      opacity: 1,
      alphaTest: 0.02,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const pts = new THREE.Points(geo, mat);
    this.group.add(pts);
    this.fireworks.push({ points: pts, velocities: vel, age: 0, maxAge: 1.9 });
  }

  private launchDistantFirework(): void {
    this.launchFirework(
      -26 + Math.random() * 52,
      16 + Math.random() * 10,
      62 + Math.random() * 24,
      36,
      2.4,
      2.8,
      0.65
    );
  }

  public update(dt: number, time: number): void {
    // Update sky lanterns
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const l = this.lanterns[i];
      l.group.position.y += l.speedY * dt;
      l.group.position.x += (l.driftX + Math.sin(time * 0.7 + l.phase) * 0.22) * dt;
      l.group.rotation.z = Math.sin(time * 1.1 + l.phase) * 0.06;

      if (l.group.position.y > 46) {
        l.group.position.y = 6.5;
        l.group.position.x = -40 + Math.random() * 80;
      }
    }

    // Drift river mist softly across the water surface
    for (const m of this.riverMist) {
      m.sprite.position.x = m.baseX + Math.sin(time * m.speed * 0.25 + m.phase) * 4.5;
      (m.sprite.material as THREE.SpriteMaterial).opacity =
        0.08 + Math.sin(time * 0.6 + m.phase) * 0.03;
    }

    // Periodic shooting star high over the river
    this.starTimer -= dt;
    if (!this.starActive && this.starTimer <= 0) {
      this.starActive = true;
      this.starTimer = 1.15;
      const sx = -32 + Math.random() * 24;
      const sy = 36 + Math.random() * 12;
      const sz = 78 + Math.random() * 24;
      this.shootingStar.position.set(sx, sy, sz);
      this.starVel.set(28 + Math.random() * 10, -10 - Math.random() * 4, 0);
      this.shootingStar.rotation.z = Math.atan2(this.starVel.y, this.starVel.x);
      this.shootingStar.visible = true;
    } else if (this.starActive) {
      this.shootingStar.position.addScaledVector(this.starVel, dt);
      const starMat = this.shootingStar.material as THREE.MeshBasicMaterial;
      starMat.opacity = Math.sin((Math.max(0, this.starTimer) / 1.15) * Math.PI) * 0.9;
      if (this.starTimer <= 0) {
        this.starActive = false;
        this.shootingStar.visible = false;
        starMat.opacity = 0;
        this.starTimer = 12 + Math.random() * 6;
      }
    }

    // Distant ambient fireworks over the horizon
    this.ambientFireworkTimer -= dt;
    if (this.ambientFireworkTimer <= 0) {
      this.ambientFireworkTimer = 15 + Math.random() * 7;
      this.launchDistantFirework();
    }

    // Update fireflies
    const ffAttr = this.fireflies.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < ffAttr.count; i++) {
      const bx = this.fireflyBase[i * 3];
      const by = this.fireflyBase[i * 3 + 1];
      const bz = this.fireflyBase[i * 3 + 2];
      ffAttr.setXYZ(
        i,
        bx + Math.sin(time * 1.1 + i) * 0.55,
        by + Math.sin(time * 1.6 + i * 1.7) * 0.32,
        bz + Math.cos(time * 0.9 + i * 0.8) * 0.55
      );
    }
    ffAttr.needsUpdate = true;
    (this.fireflies.material as THREE.PointsMaterial).opacity = 0.72 + Math.sin(time * 2.1) * 0.22;

    // Update fireworks
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];
      fw.age += dt;
      if (fw.age >= fw.maxAge) {
        this.group.remove(fw.points);
        fw.points.geometry.dispose();
        (fw.points.material as THREE.Material).dispose();
        this.fireworks.splice(i, 1);
        continue;
      }
      const posAttr = fw.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let j = 0; j < posAttr.count; j++) {
        fw.velocities[j * 3 + 1] -= 4.2 * dt; // gentle gravity
        posAttr.setXYZ(
          j,
          posAttr.getX(j) + fw.velocities[j * 3] * dt,
          posAttr.getY(j) + fw.velocities[j * 3 + 1] * dt,
          posAttr.getZ(j) + fw.velocities[j * 3 + 2] * dt
        );
      }
      posAttr.needsUpdate = true;
      (fw.points.material as THREE.PointsMaterial).opacity = 1 - fw.age / fw.maxAge;
    }
  }
}
