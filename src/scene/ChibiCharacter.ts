import * as THREE from 'three';
import { dressCharacter } from './ThaiWardrobe';
import { clothProfile, flower, paintedEye, sculptHair } from './DollSculpt';
import { CharacterConfig, CharacterPose, KrathongId, ShopItemDef } from '../types';
import { AnimatedKrathong, createKrathongMesh } from './KrathongFactory';
import {
  createGlowSprite,
  createGroundGlowDisc,
  createNamePillTexture,
  createSpeechBubbleTexture,
  getContactShadowTexture
} from './TextureHelpers';

export type { CharacterPose };

export class ChibiCharacter {
  public readonly root = new THREE.Group();
  private bodyPivot = new THREE.Group();
  private headGroup = new THREE.Group();
  private faceDetailsGroup = new THREE.Group();
  private hairGroup = new THREE.Group();
  private glassesGroup = new THREE.Group();
  private hatGroup = new THREE.Group();
  private outfitGroup = new THREE.Group();
  private accessoryGroup = new THREE.Group();
  private leftArmPivot = new THREE.Group();
  private rightArmPivot = new THREE.Group();
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private heldSocket = new THREE.Group();

  private eyes: THREE.Mesh[] = [];
  private sleeveGroups: THREE.Group[] = [];
  private trouserGroups: THREE.Group[] = [];
  private wingRefs: THREE.Group[] = [];

  private playerRing: THREE.Mesh;
  private playerAuraDisc: THREE.Mesh;
  private nameSprite: THREE.Sprite;
  private bubbleSprite: THREE.Sprite;
  private bubbleTimer = 0;

  private heldKrathong: AnimatedKrathong | null = null;
  private pose: CharacterPose = 'idle';
  private poseTimer = 0;
  private blinkTimer = 1.5 + Math.random() * 2.5;
  private config: CharacterConfig;

  private skinMat: THREE.MeshStandardMaterial;

  constructor(config: CharacterConfig) {
    this.config = {
      ...config,
      gender: config.gender ?? 'female',
      glasses: config.glasses ?? 'none',
      hat: config.hat ?? 'none',
      accessory: config.accessory ?? 'none'
    };
    this.skinMat = new THREE.MeshStandardMaterial({
      color: this.config.skinTone,
      roughness: 0.7,
      emissive: this.config.skinTone,
      emissiveIntensity: 0.055,
      metalness: 0.02
    });

    this.root.add(this.bodyPivot);

    // Soft radial contact shadow on ground under feet
    const shadowDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.98),
      new THREE.MeshBasicMaterial({
        map: getContactShadowTexture(),
        transparent: true,
        depthWrite: false
      })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.025;
    this.root.add(shadowDisc);

    this.buildLegs();
    this.buildArms();
    this.buildTorsoAndOutfit();
    this.buildHead();
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.12,0.14,24),this.skinMat);
    neck.position.y = 0.897;
    this.bodyPivot.add(neck);

    // Player-exclusive glowing aura disc & golden ground ring (never shown on NPCs)
    this.playerAuraDisc = createGroundGlowDisc(this.config.outfitColor, 0.68, 0.24);
    this.playerAuraDisc.position.y = 0.028;
    this.root.add(this.playerAuraDisc);

    this.playerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.5, 32),
      new THREE.MeshBasicMaterial({
        color: '#ffd573',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
        depthWrite: false
      })
    );
    this.playerRing.rotation.x = -Math.PI / 2;
    this.playerRing.position.y = 0.036;
    this.root.add(this.playerRing);

    // Name tag pill
    const nameTex = createNamePillTexture(this.config.name, this.config.outfitColor);
    this.nameSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthWrite: false })
    );
    this.nameSprite.position.set(0, 1.98, 0);
    this.nameSprite.scale.set(1.04, 0.3, 1);
    this.root.add(this.nameSprite);

    // Speech bubble
    const bubbleTex = createSpeechBubbleTexture('');
    this.bubbleSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false })
    );
    this.bubbleSprite.position.set(0, 2.38, 0);
    this.bubbleSprite.scale.set(1.65, 0.51, 1);
    this.bubbleSprite.visible = false;
    this.root.add(this.bubbleSprite);
  }

  private buildLegs(): void {
    const legGeo = new THREE.CapsuleGeometry(0.085, 0.16, 6, 10);
    const shoeGeo = new THREE.SphereGeometry(0.1, 22, 14);
    shoeGeo.scale(0.95, 0.65, 1.3);
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#4d3b4e', roughness: 0.55 });

    this.leftLegPivot.position.set(-0.13, 0.38, 0);
    this.rightLegPivot.position.set(0.13, 0.38, 0);

    for (const pivot of [this.leftLegPivot, this.rightLegPivot]) {
      const leg = new THREE.Mesh(legGeo, this.skinMat);
      leg.position.y = -0.15;
      leg.castShadow = true;
      pivot.add(leg);

      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, -0.31, 0.03);
      shoe.castShadow = true;
      pivot.add(shoe);
      const garment = new THREE.Group();
      garment.position.y = 0.26;
      pivot.add(garment);
      this.trouserGroups.push(garment);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.074,0.012,8,24,Math.PI),
        new THREE.MeshStandardMaterial({color:'#c7a38b',roughness:0.6}));
      strap.scale.y = 0.62;
      strap.position.set(0,-0.282,0.065);
      pivot.add(strap);

      this.bodyPivot.add(pivot);
    }
  }

  private buildArms(): void {
    const armGeo = clothProfile([[0,-0.36],[0.043,-0.355],[0.065,-0.329],[0.07,-0.305],
      [0.062,-0.267],[0.058,-0.245],[0.067,-0.14],[0.069,-0.065],[0.052,-0.014],[0,0]]);
    const handGeo = new THREE.SphereGeometry(0.028, 12, 10);
    this.leftArmPivot.position.set(-0.27, 0.86, 0);
    this.rightArmPivot.position.set(0.27, 0.86, 0);


    for (const pivot of [this.leftArmPivot, this.rightArmPivot]) {
      const sleeve = new THREE.Group();
      this.sleeveGroups.push(sleeve);
      pivot.add(sleeve);
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.074,18,12),this.skinMat);
      shoulder.position.set(pivot === this.leftArmPivot ? 0.019 : -0.019,-0.013,0);
      pivot.add(shoulder);

      const arm = new THREE.Mesh(armGeo, this.skinMat);

      arm.castShadow = true;
      pivot.add(arm);

      const hand = new THREE.Mesh(handGeo, this.skinMat);
      hand.position.set(pivot === this.leftArmPivot ? 0.04 : -0.04, -0.295, 0.032);
      pivot.add(hand);

      this.bodyPivot.add(pivot);
    }

    this.heldSocket.position.set(0, -0.32, 0.1);
    this.rightArmPivot.add(this.heldSocket);
  }

  private buildTorsoAndOutfit(): void {
    this.outfitGroup.position.set(0, 0.64, 0);
    this.bodyPivot.add(this.outfitGroup);
    const shoulders = new THREE.Mesh(clothProfile([[0.175,0.05],[0.202,0.14],
      [0.226,0.17],[0.207,0.197],[0.13,0.228],[0.10,0.237]]),this.skinMat);
    shoulders.position.y = 0.64;
    this.bodyPivot.add(shoulders);
    this.bodyPivot.add(this.accessoryGroup);
    this.accessoryGroup.position.set(0, 0.64, 0);
    this.rebuildOutfit();
    this.rebuildAccessory();
  }

  private buildHead(): void {
    this.headGroup.position.set(0, 1.24, 0);
    this.bodyPivot.add(this.headGroup);

    // Soft clay chibi head
    const head = new THREE.SphereGeometry(0.35, 64, 48);
    const complexion = this.skinMat.clone();
    complexion.color = this.skinMat.color;
    complexion.emissive = this.skinMat.emissive;
    complexion.vertexColors = true;
    const colors: number[] = [];
    const skin = new THREE.Color('#ffffff');
    const rouge = new THREE.Color('#f3959e');
    const pos = head.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const blush = z > 0 ? Math.exp(-(((Math.abs(x)-0.218)/0.067)**2 + ((y+0.064)/0.043)**2)) : 0;
      colors.push(...skin.clone().lerp(rouge, blush * 0.78).toArray());
    }
    head.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const headMesh = new THREE.Mesh(head, complexion);
    headMesh.scale.set(1.06, 0.96, 1);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Cute rounded ears
    const earGeo = new THREE.SphereGeometry(0.072, 10, 8);
    for (const sx of [-0.355, 0.355]) {
      const ear = new THREE.Mesh(earGeo, this.skinMat);
      ear.position.set(sx, -0.02, 0);
      this.headGroup.add(ear);
    }

    for (const side of [-1, 1]) {
      const eye = paintedEye();
      eye.position.set(side * 0.119, -0.012, 0.34);
      eye.rotation.y = side * 0.31;
      this.headGroup.add(eye);
      this.eyes.push(eye);
    }

    // Soft eyebrows (well below hairline!)
    const browGeo = new THREE.CapsuleGeometry(0.008, 0.044, 4, 6);
    const browMat = new THREE.MeshBasicMaterial({ color: '#452c27' });
    for (const sx of [-0.118, 0.118]) {
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.rotation.z = Math.PI / 2 + (sx < 0 ? 0.08 : -0.08);
      brow.position.set(sx, 0.085, 0.324);
      this.headGroup.add(brow);
    }

    // Tiny cute nose button
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.017, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#f2ac95', roughness: 0.7 })
    );
    nose.position.set(0, -0.05, 0.348);
    this.headGroup.add(nose);

    // Sweet curved smile
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.036, 0.0085, 6, 12, Math.PI * 0.85),
      new THREE.MeshBasicMaterial({ color: '#7a3c48' })
    );
    smile.position.set(0, -0.102, 0.326);
    smile.rotation.z = Math.PI * 1.075;
    this.headGroup.add(smile);

    this.headGroup.add(this.faceDetailsGroup);
    this.headGroup.add(this.hairGroup);
    this.headGroup.add(this.glassesGroup);
    this.headGroup.add(this.hatGroup);

    this.rebuildFaceDetails();
    this.rebuildHair();
    this.rebuildGlasses();
    this.rebuildHat();
  }

  private rebuildFaceDetails(): void {
    this.faceDetailsGroup.clear();
    if (this.config.gender === 'female') {
      const lashMat = new THREE.MeshBasicMaterial({ color: '#2b1822' });
      const lashGeo = new THREE.CapsuleGeometry(0.005, 0.032, 4, 6);
      for (const sx of [-1, 1]) {
        const l1 = new THREE.Mesh(lashGeo, lashMat);
        l1.position.set(sx * 0.16, 0.025, 0.324);
        l1.rotation.z = sx * -0.95;
        this.faceDetailsGroup.add(l1);

        const l2 = new THREE.Mesh(lashGeo, lashMat);
        l2.position.set(sx * 0.165, 0.005, 0.324);
        l2.rotation.z = sx * -1.25;
        this.faceDetailsGroup.add(l2);
      }
    }
  }

  private rebuildOutfit(): void {
    const materials = new Set<THREE.Material>();
    for (const group of [this.outfitGroup,...this.sleeveGroups,...this.trouserGroups]) {
      group.traverse(part => {
        if (part instanceof THREE.Mesh) {
          part.geometry.dispose();
          for (const mat of Array.isArray(part.material) ? part.material : [part.material]) materials.add(mat);
        }
      });
      group.clear();
    }
    for (const mat of materials) mat.dispose();
    dressCharacter(this.outfitGroup,this.sleeveGroups,this.trouserGroups,this.config);
  }

  private rebuildHair(): void {
    this.hairGroup.clear();
    this.hairGroup.add(sculptHair(this.config));
  }

  private rebuildGlasses(): void {
    this.glassesGroup.clear();
    const g = this.config.glasses;
    if (!g || g === 'none') return;

    const frameColor =
      g === 'round_gold'
        ? '#ffd36b'
        : g === 'heart_pink'
          ? '#ff7eb6'
          : g === 'star_sun'
            ? '#2c2240'
            : '#8ee6df';

    const frameMat = new THREE.MeshStandardMaterial({
      color: frameColor,
      roughness: 0.28,
      metalness: g === 'round_gold' ? 0.55 : 0.15
    });

    const lensMat = new THREE.MeshStandardMaterial({
      color: g === 'star_sun' ? '#3c2954' : g === 'heart_pink' ? '#ffb8d9' : '#e6f7ff',
      transparent: true,
      opacity: g === 'star_sun' ? 0.72 : 0.08,
      roughness: 0.1
    });

    const eyeY = -0.015;
    const zFront = 0.379;

    for (const sx of [-0.118, 0.118]) {
      if (g === 'heart_pink') {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.014, 8, 16), frameMat);
        rim.scale.set(1.12, 0.94, 1);
        rim.position.set(sx, eyeY, zFront);
        this.glassesGroup.add(rim);

        // Cute heart ear-corner gem
        const gem = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 6, 6),
          new THREE.MeshBasicMaterial({ color: '#ffe5f3' })
        );
        gem.position.set(sx + (sx < 0 ? -0.07 : 0.07), eyeY + 0.055, zFront + 0.01);
        this.glassesGroup.add(gem);
      } else if (g === 'cat_eye') {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.013, 8, 16), frameMat);
        rim.scale.set(1.18, 0.85, 1);
        rim.rotation.z = sx < 0 ? -0.18 : 0.18;
        rim.position.set(sx, eyeY, zFront);
        this.glassesGroup.add(rim);
      } else {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.008, 8, 36), frameMat);
        rim.position.set(sx, eyeY, zFront);
        this.glassesGroup.add(rim);

        if (g === 'star_sun') {
          const star = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.024, 0),
            new THREE.MeshBasicMaterial({ color: '#ffd86b' })
          );
          star.position.set(sx + (sx < 0 ? -0.075 : 0.075), eyeY + 0.06, zFront + 0.01);
          this.glassesGroup.add(star);
        }
      }

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.074, 16), lensMat);
      lens.position.set(sx, eyeY, zFront - 0.004);
      this.glassesGroup.add(lens);

      // Side temple arm reaching ear
      const side = Math.sign(sx);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side*0.197,eyeY+0.008,zFront),
        new THREE.Vector3(side*0.245,eyeY+0.012,0.337),
        new THREE.Vector3(side*0.355,eyeY+0.022,0.085),
        new THREE.Vector3(side*0.357,eyeY-0.005,0.018)
      ]);
      const arm = new THREE.Mesh(new THREE.TubeGeometry(curve,16,0.006,8,false),frameMat);
      this.glassesGroup.add(arm);
    }

    // Nose bridge
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6), frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, eyeY + 0.01, zFront);
    this.glassesGroup.add(bridge);
  }

  private rebuildHat(): void {
    this.hatGroup.clear();
    const h = this.config.hat;
    if (!h || h === 'none') return;

    if (h === 'beret') {
      const beretGroup = new THREE.Group();
      beretGroup.position.set(0.04, 0.34, -0.02);
      beretGroup.rotation.z = -0.22;

      const mat = new THREE.MeshStandardMaterial({ color: '#d95b7e', roughness: 0.78 });
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat);
      puff.scale.set(1.15, 0.42, 1.15);
      beretGroup.add(puff);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.07, 6), mat);
      stem.position.y = 0.13;
      beretGroup.add(stem);
      this.hatGroup.add(beretGroup);
    } else if (h === 'bucket') {
      const mat = new THREE.MeshStandardMaterial({ color: '#fff1d6', roughness: 0.75 });
      const bandMat = new THREE.MeshStandardMaterial({ color: '#ff9ec6', roughness: 0.65 });

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.16, 16), mat);
      crown.position.set(0, 0.36, -0.01);
      this.hatGroup.add(crown);

      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.285, 0.045, 16), bandMat);
      band.position.set(0, 0.3, -0.01);
      this.hatGroup.add(band);

      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.43, 0.055, 18), mat);
      brim.position.set(0, 0.275, -0.01);
      this.hatGroup.add(brim);
    } else if (h === 'flower_crown') {
      const leafMat = new THREE.MeshStandardMaterial({ color: '#64b86a', roughness: 0.7 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.011, 8, 40), leafMat);
      ring.rotation.x = Math.PI / 2 - 0.18;
      ring.position.set(0, 0.27, -0.01);
      this.hatGroup.add(ring);

      const colors = ['#ff9ec6', '#ffe07d', '#ffffff', '#b8e8ff', '#ff9ec6'];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const fl = flower(colors[i % colors.length]);
        fl.rotation.y = Math.PI / 2 - a;
        fl.position.set(Math.cos(a) * 0.315, 0.27 - Math.sin(a) * 0.054, Math.sin(a) * 0.315 - 0.01);
        this.hatGroup.add(fl);
      }
    } else if (h === 'cat_ears') {
      const bandMat = new THREE.MeshStandardMaterial({ color: '#2e2438', roughness: 0.6 });
      const innerMat = new THREE.MeshStandardMaterial({ color: '#ff9ec6', roughness: 0.6 });

      const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 8, 20, Math.PI), bandMat);
      band.position.set(0, 0.06, 0.02);
      this.hatGroup.add(band);

      for (const sx of [-0.21, 0.21]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.18, 6), bandMat);
        ear.position.set(sx, 0.36, 0.02);
        ear.rotation.z = sx < 0 ? 0.26 : -0.26;
        this.hatGroup.add(ear);

        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 6), innerMat);
        inner.position.set(sx, 0.35, 0.055);
        inner.rotation.z = sx < 0 ? 0.26 : -0.26;
        this.hatGroup.add(inner);
      }
    } else if (h === 'thai_chada') {
      const goldMat = new THREE.MeshStandardMaterial({
        color: '#f5c44e',
        roughness: 0.32,
        metalness: 0.5
      });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.11, 14), goldMat);
      base.position.set(0, 0.34, -0.02);
      this.hatGroup.add(base);

      const tier = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 12), goldMat);
      tier.position.set(0, 0.56, -0.02);
      this.hatGroup.add(tier);

      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.042, 0),
        new THREE.MeshBasicMaterial({ color: '#ff6ba8' })
      );
      gem.position.set(0, 0.35, 0.22);
      this.hatGroup.add(gem);
    }
  }

  private rebuildAccessory(): void {
    this.accessoryGroup.clear();
    this.wingRefs = [];
    const acc = this.config.accessory;
    if (!acc || acc === 'none') return;

    if (acc === 'gold_necklace') {
      const goldMat = new THREE.MeshStandardMaterial({
        color: '#f7c956',
        roughness: 0.3,
        metalness: 0.55
      });
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.018, 8, 18), goldMat);
      chain.rotation.x = Math.PI / 2 + 0.15;
      chain.position.set(0, 0.16, 0.02);
      this.accessoryGroup.add(chain);

      const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), goldMat);
      pendant.position.set(0, 0.11, 0.2);
      this.accessoryGroup.add(pendant);
    } else if (acc === 'jasmine_garland') {
      const jasMat = new THREE.MeshStandardMaterial({ color: '#fffef5', roughness: 0.45 });
      const roseMat = new THREE.MeshStandardMaterial({ color: '#ff8cb8', roughness: 0.5 });

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), jasMat);
        bead.position.set(Math.cos(a) * 0.195, 0.165 - Math.max(0, Math.sin(a)) * 0.02, Math.sin(a) * 0.195);
        this.accessoryGroup.add(bead);
      }
      const rose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), roseMat);
      rose.position.set(0, 0.11, 0.21);
      this.accessoryGroup.add(rose);
    } else if (acc === 'ribbon_bow') {
      const bowMat = new THREE.MeshStandardMaterial({ color: '#ff7eb6', roughness: 0.48 });
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), bowMat);
      knot.position.set(0, 0.16, 0.205);
      this.accessoryGroup.add(knot);

      for (const sx of [-0.06, 0.06]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.095, 6), bowMat);
        wing.rotation.z = sx < 0 ? -Math.PI / 2 : Math.PI / 2;
        wing.position.set(sx, 0.16, 0.2);
        this.accessoryGroup.add(wing);
      }
    } else if (acc === 'angel_wings') {
      const wingMat = new THREE.MeshStandardMaterial({
        color: '#fff8fc',
        emissive: '#ffd5e8',
        emissiveIntensity: 0.2,
        roughness: 0.4
      });
      for (const sx of [-1, 1]) {
        const wg = new THREE.Group();
        wg.position.set(sx * 0.12, 0.08, -0.2);
        wg.rotation.y = sx * -0.4;

        const feather1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), wingMat);
        feather1.scale.set(1.3, 0.72, 0.28);
        feather1.position.set(sx * 0.14, 0.05, 0);
        feather1.rotation.z = sx * 0.45;
        wg.add(feather1);

        const feather2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), wingMat);
        feather2.scale.set(1.2, 0.65, 0.25);
        feather2.position.set(sx * 0.1, -0.05, 0);
        feather2.rotation.z = sx * 0.15;
        wg.add(feather2);

        this.accessoryGroup.add(wg);
        this.wingRefs.push(wg);
      }
    }
  }

  public updateConfig(next: CharacterConfig): void {
    this.config = {
      ...next,
      gender: next.gender ?? 'female',
      glasses: next.glasses ?? 'none',
      hat: next.hat ?? 'none',
      accessory: next.accessory ?? 'none'
    };
    this.skinMat.color.set(this.config.skinTone);
    this.skinMat.emissive.set(this.config.skinTone);
    this.rebuildFaceDetails();
    this.rebuildOutfit();
    this.rebuildHair();
    this.rebuildGlasses();
    this.rebuildHat();
    this.rebuildAccessory();

    const oldMat = this.nameSprite.material as THREE.SpriteMaterial;
    oldMat.map?.dispose();
    oldMat.map = createNamePillTexture(this.config.name, this.config.outfitColor);
    oldMat.needsUpdate = true;

    (this.playerAuraDisc.material as THREE.MeshBasicMaterial).color.set(this.config.outfitColor);
  }

  public getConfig(): CharacterConfig {
    return this.config;
  }

  public clearHeldItem(): void {
    this.heldSocket.clear();
    this.heldKrathong = null;
  }

  public holdKrathong(id: KrathongId): void {
    this.clearHeldItem();
    const k = createKrathongMesh(id, 0.52);
    k.group.position.set(0, 0.04, 0.06);
    this.heldSocket.add(k.group);
    this.heldKrathong = k;
  }

  public holdShopItem(item: ShopItemDef): void {
    this.clearHeldItem();
    const g = new THREE.Group();
    if (item.category === 'drink') {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.048, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.35 })
      );
      cup.position.y = 0.08;
      g.add(cup);

      const cream = new THREE.Mesh(
        new THREE.CylinderGeometry(0.067, 0.067, 0.03, 12),
        new THREE.MeshStandardMaterial({ color: item.secondaryColor, roughness: 0.45 })
      );
      cream.position.y = 0.155;
      g.add(cream);

      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6),
        new THREE.MeshStandardMaterial({ color: '#ff5d9e' })
      );
      straw.position.set(0.02, 0.21, 0);
      straw.rotation.z = -0.22;
      g.add(straw);
    } else if (item.id === 'cotton_candy') {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.16, 6),
        new THREE.MeshStandardMaterial({ color: '#fff8ee' })
      );
      stick.position.y = 0.08;
      g.add(stick);

      const puff1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 10, 8),
        new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.85 })
      );
      puff1.position.y = 0.2;
      g.add(puff1);

      const puff2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 10, 8),
        new THREE.MeshStandardMaterial({ color: item.secondaryColor, roughness: 0.85 })
      );
      puff2.position.set(0.03, 0.26, 0);
      g.add(puff2);
    } else if (item.id === 'meatball_skewer') {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.007, 0.007, 0.24, 6),
        new THREE.MeshStandardMaterial({ color: '#d8aa6e' })
      );
      stick.position.y = 0.12;
      g.add(stick);

      for (let i = 0; i < 3; i++) {
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 8, 8),
          new THREE.MeshStandardMaterial({
            color: i === 2 ? item.secondaryColor : item.color,
            roughness: 0.6
          })
        );
        ball.position.y = 0.11 + i * 0.055;
        g.add(ball);
      }
    } else {
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.06, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: '#78b86b', roughness: 0.7 })
      );
      bowl.position.y = 0.03;
      g.add(bowl);

      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const piece = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 8, 8),
          new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? item.color : item.secondaryColor,
            roughness: 0.5
          })
        );
        piece.position.set(Math.cos(a) * 0.035, 0.065, Math.sin(a) * 0.035);
        g.add(piece);
      }
    }

    this.heldSocket.add(g);
  }

  public showBubble(text: string, duration = 3.2): void {
    const mat = this.bubbleSprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = createSpeechBubbleTexture(text);
    mat.needsUpdate = true;
    this.bubbleSprite.visible = true;
    this.bubbleTimer = duration;
  }

  public setPose(pose: CharacterPose, duration = 0): void {
    this.pose = pose;
    this.poseTimer = duration;
  }

  public getPose(): CharacterPose {
    return this.pose;
  }

  public triggerHeartBurst(): void {
    for (let i = 0; i < 4; i++) {
      const sp = createGlowSprite('#ff88bc', 0.34, 0.9);
      sp.position.set(
        (Math.random() - 0.5) * 0.7,
        1.55 + Math.random() * 0.45,
        (Math.random() - 0.5) * 0.4
      );
      this.root.add(sp);
      window.setTimeout(() => {
        this.root.remove(sp);
        sp.material.dispose();
      }, 1100);
    }
  }

  public update(
    dt: number,
    time: number,
    options: { isMoving: boolean; holdHandSide: 'none' | 'left' | 'right' }
  ): void {
    // Pulse player-exclusive ground ring & aura so real players are unmistakable
    const ringPulse = 1 + Math.sin(time * 3.0) * 0.05;
    this.playerRing.scale.set(ringPulse, ringPulse, 1);
    (this.playerRing.material as THREE.MeshBasicMaterial).opacity =
      0.68 + Math.sin(time * 3.0) * 0.16;
    (this.playerAuraDisc.material as THREE.MeshBasicMaterial).opacity =
      0.18 + Math.sin(time * 3.0) * 0.06;

    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) {
        this.bubbleSprite.visible = false;
      }
    }

    if (this.poseTimer > 0) {
      this.poseTimer -= dt;
      if (
        this.poseTimer <= 0 &&
        (this.pose === 'eat' || this.pose === 'sip' || this.pose === 'wave' || this.pose === 'wai')
      ) {
        this.pose = 'idle';
      }
    }

    // Gentle wing flutter when wearing angel wings
    if (this.wingRefs.length === 2) {
      const flap = Math.sin(time * 4.5) * 0.14;
      this.wingRefs[0].rotation.y = 0.4 + flap;
      this.wingRefs[1].rotation.y = -0.4 - flap;
    }

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.4 + Math.random() * 2.8;
    }
    const isBlinking = this.blinkTimer < 0.12;
    for (const eye of this.eyes) {
      eye.scale.y = THREE.MathUtils.lerp(eye.scale.y, isBlinking ? 0.12 : 1, 0.45);
    }

    if (this.heldKrathong) {
      this.heldKrathong.update(time, this.config.id * 1.3);
    }

    let bodyY = 0;
    let bodyRotX = 0;
    let headRotX = 0;
    let headRotZ = 0;
    let lArmX = 0;
    let lArmZ = 0.12;
    let rArmX = 0;
    let rArmZ = -0.12;
    let lLegX = 0;
    let rLegX = 0;

    const activePose: CharacterPose =
      this.pose === 'sit_wait' ||
      this.pose === 'kneel_pray' ||
      this.pose === 'place_krathong' ||
      this.pose === 'eat' ||
      this.pose === 'sip' ||
      this.pose === 'wai' ||
      this.pose === 'wave'
        ? this.pose
        : options.isMoving
          ? 'walk'
          : 'idle';

    if (activePose === 'walk') {
      const stride = Math.sin(time * 9.5 + this.config.id * 0.4);
      bodyY = Math.abs(Math.sin(time * 9.5)) * 0.055;
      headRotZ = stride * 0.04;
      lLegX = stride * 0.55;
      rLegX = -stride * 0.55;
      lArmX = -stride * 0.45;
      rArmX = stride * 0.45;
    } else if (activePose === 'idle') {
      bodyY = Math.sin(time * 2.4 + this.config.id) * 0.018;
      headRotZ = Math.sin(time * 1.4 + this.config.id) * 0.03;
    } else if (activePose === 'sit_wait') {
      // Sitting calmly on the wooden pier edge waiting for partner
      bodyY = -0.24;
      lLegX = -1.35 + Math.sin(time * 2.2) * 0.08;
      rLegX = -1.35 - Math.sin(time * 2.2) * 0.08;
      lArmX = -0.25;
      rArmX = -0.25;
      lArmZ = 0.18;
      rArmZ = -0.18;
      headRotZ = Math.sin(time * 1.1 + this.config.id) * 0.05;
    } else if (activePose === 'eat' || activePose === 'sip') {
      bodyY = Math.abs(Math.sin(time * 8)) * 0.03;
      rArmX = -1.28 + Math.sin(time * 8) * 0.18;
      rArmZ = -0.34;
      headRotX = 0.14 + Math.sin(time * 8) * 0.08;
    } else if (activePose === 'wai') {
      bodyY = Math.sin(time * 2.2) * 0.015;
      lArmX = -1.05;
      lArmZ = 0.56;
      rArmX = -1.05;
      rArmZ = -0.56;
      headRotX = 0.24 + Math.sin(time * 3) * 0.04;
    } else if (activePose === 'kneel_pray') {
      bodyY = -0.26;
      lLegX = -1.15;
      rLegX = -1.15;
      lArmX = -1.05;
      lArmZ = 0.56;
      rArmX = -1.05;
      rArmZ = -0.56;
      headRotX = 0.22 + Math.sin(time * 2.2) * 0.04;
    } else if (activePose === 'place_krathong') {
      bodyY = -0.22;
      bodyRotX = 0.36;
      lLegX = -1.0;
      rLegX = -1.0;
      lArmX = -1.25;
      rArmX = -1.25;
      lArmZ = 0.2;
      rArmZ = -0.2;
      headRotX = 0.15;
    } else if (activePose === 'wave') {
      bodyY = Math.abs(Math.sin(time * 5)) * 0.035;
      rArmX = -0.32;
      rArmZ = 2.35 + Math.sin(time * 10) * 0.35;
      headRotZ = -0.06;
    }

    if ((activePose === 'walk' || activePose === 'idle') && options.holdHandSide !== 'none') {
      if (options.holdHandSide === 'right') {
        rArmX = -0.42;
        rArmZ = 0.46;
      } else {
        lArmX = -0.42;
        lArmZ = -0.46;
      }
    }

    const s = 0.22;
    this.bodyPivot.position.y = THREE.MathUtils.lerp(this.bodyPivot.position.y, bodyY, s);
    this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, bodyRotX, s);
    this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, headRotX, s);
    this.headGroup.rotation.z = THREE.MathUtils.lerp(this.headGroup.rotation.z, headRotZ, s);
    this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, lArmX, s);
    this.leftArmPivot.rotation.z = THREE.MathUtils.lerp(this.leftArmPivot.rotation.z, lArmZ, s);
    this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, rArmX, s);
    this.rightArmPivot.rotation.z = THREE.MathUtils.lerp(this.rightArmPivot.rotation.z, rArmZ, s);
    this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, lLegX, s);
    this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, rLegX, s);
  }
}
