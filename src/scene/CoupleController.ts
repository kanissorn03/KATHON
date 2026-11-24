import * as THREE from 'three';
import {
  CharacterConfig,
  KrathongId,
  PlayerSlot,
  PlayerTransform,
  SessionMode,
  ShopItemDef,
  WishPayload
} from '../types';
import { ChibiCharacter } from './ChibiCharacter';
import { TempleEnvironment } from './TempleEnvironment';

export interface CoupleMoveInput {
  x: number;
  z: number;
}

export class CoupleController {
  public readonly char1: ChibiCharacter;
  public readonly char2: ChibiCharacter;
  private env: TempleEnvironment;

  private sessionMode: SessionMode = 'offline';
  private localSlot: PlayerSlot = 1;
  private remotePresent = true;
  private ceremonyLock = false;
  private localSeated = false;

  private localMoving = false;
  private remoteTargetPos = new THREE.Vector3(1.2, 0, 2.2);
  private remoteTargetRotY = 0;
  private remoteMoving = false;

  private waypoints: { x: number; z: number }[] = [];
  private onWalkArrive: (() => void) | null = null;
  private stuckTimer = 0;

  constructor(
    scene: THREE.Scene,
    _env: TempleEnvironment,
    configs: [CharacterConfig, CharacterConfig]
  ) {
    this.env = _env;

    this.char1 = new ChibiCharacter(configs[0]);
    this.char2 = new ChibiCharacter(configs[1]);

    // Start nicely separated; offline mode shows only your own avatar until a partner joins online
    this.char1.root.position.set(0, 0, 2.2);
    this.char2.root.position.set(1.15, 0, 2.2);
    scene.add(this.char1.root);
    scene.add(this.char2.root);
    this.syncVisibility();
  }

  public setSessionMode(mode: SessionMode, localSlot: PlayerSlot, remotePresent: boolean): void {
    this.sessionMode = mode;
    this.localSlot = localSlot;
    this.remotePresent = remotePresent;
    this.localSeated = false;
    this.cancelAutoWalk();
    this.syncVisibility();
  }

  public setRemotePresent(present: boolean): void {
    this.remotePresent = present;
    this.syncVisibility();
  }

  private syncVisibility(): void {
    if (this.sessionMode === 'offline') {
      this.char1.root.visible = true;
      this.char2.root.visible = false;
      return;
    }
    const localChar = this.getLocalChar();
    const remoteChar = this.getRemoteChar();
    localChar.root.visible = true;
    remoteChar.root.visible = this.remotePresent;
  }

  public getSessionMode(): SessionMode {
    return this.sessionMode;
  }

  public getLocalSlot(): PlayerSlot {
    return this.localSlot;
  }

  public getLocalChar(): ChibiCharacter {
    return this.localSlot === 1 ? this.char1 : this.char2;
  }

  public getRemoteChar(): ChibiCharacter {
    return this.localSlot === 1 ? this.char2 : this.char1;
  }

  public getCharBySlot(slot: PlayerSlot): ChibiCharacter {
    return slot === 1 ? this.char1 : this.char2;
  }

  public getLocalPosition(): THREE.Vector3 {
    return this.getLocalChar().root.position;
  }

  public getRemotePosition(): THREE.Vector3 {
    return this.remoteTargetPos;
  }

  public getLocalTransform(): PlayerTransform {
    const c = this.getLocalChar();
    return {
      x: c.root.position.x,
      y: c.root.position.y,
      z: c.root.position.z,
      rotY: c.root.rotation.y,
      moving: this.localMoving,
      pose: c.getPose()
    };
  }

  public applyRemoteState(pos: PlayerTransform, snap = false): void {
    this.remoteTargetPos.set(pos.x, pos.y, pos.z);
    this.remoteTargetRotY = pos.rotY;
    this.remoteMoving = pos.moving;

    const remote = this.getRemoteChar();
    if (snap) {
      remote.root.position.copy(this.remoteTargetPos);
      remote.root.rotation.y = this.remoteTargetRotY;
    }
    if (!this.ceremonyLock && pos.pose !== 'kneel_pray' && pos.pose !== 'place_krathong') {
      if (pos.pose === 'sit_wait') {
        remote.setPose('sit_wait');
      } else if (pos.pose === 'eat' || pos.pose === 'sip' || pos.pose === 'wave' || pos.pose === 'wai') {
        remote.setPose(pos.pose, 0.5);
      } else {
        remote.setPose('idle');
      }
    }
  }

  public updateConfigs(c1: CharacterConfig, c2: CharacterConfig): void {
    this.char1.updateConfig(c1);
    this.char2.updateConfig(c2);
  }

  public updateSlotConfig(slot: PlayerSlot, cfg: CharacterConfig): void {
    this.getCharBySlot(slot).updateConfig(cfg);
  }

  public isCeremonyLocked(): boolean {
    return this.ceremonyLock;
  }

  public cancelAutoWalk(): void {
    this.waypoints = [];
    this.onWalkArrive = null;
  }

  public walkTo(targetX: number, targetZ: number, onArrive?: () => void): void {
    if (this.ceremonyLock) return;
    const leader = this.getLocalChar();
    const curZ = leader.root.position.z;

    const pts: { x: number; z: number }[] = [];
    const crossingToPier = curZ <= 9.6 && targetZ > 9.6;
    const crossingToCourtyard = curZ > 9.6 && targetZ <= 9.6;

    if (crossingToPier) {
      pts.push({ x: 0, z: 8.8 });
      pts.push({ x: 0, z: 11.2 });
    } else if (crossingToCourtyard) {
      pts.push({ x: 0, z: 10.6 });
      pts.push({ x: 0, z: 8.4 });
    }
    pts.push({ x: targetX, z: targetZ });

    this.waypoints = pts;
    this.onWalkArrive = onArrive ?? null;
  }

  public walkToPartner(): void {
    if (!this.remotePresent && this.sessionMode !== 'offline') return;
    const partnerPos = this.getRemoteChar().root.position;
    const offsetX = partnerPos.x > 0 ? -0.95 : 0.95;
    const tx = this.env.isPointWalkable(partnerPos.x + offsetX, partnerPos.z)
      ? partnerPos.x + offsetX
      : partnerPos.x;
    this.walkTo(tx, partnerPos.z);
  }

  public giveKrathongToSlot(slot: PlayerSlot, id: KrathongId): void {
    this.getCharBySlot(slot).holdKrathong(id);
  }

  public seatSlotAtPier(slot: PlayerSlot): void {
    if (slot === this.localSlot) {
      this.localSeated = true;
      this.cancelAutoWalk();
    }
    const c = this.getCharBySlot(slot);
    const pierY = TempleEnvironment.getGroundHeight(0, 23.35);
    const targetX = this.sessionMode === 'offline' ? 0 : slot === 1 ? -0.55 : 0.55;
    c.root.position.set(targetX, pierY, 23.35);
    c.root.rotation.y = 0;
    c.setPose('sit_wait');
  }

  public standUpFromPier(slot: PlayerSlot): void {
    if (slot === this.localSlot) {
      this.localSeated = false;
    }
    const c = this.getCharBySlot(slot);
    const pierY = TempleEnvironment.getGroundHeight(0, 22.4);
    c.root.position.set(slot === 1 ? -0.55 : 0.55, pierY, 22.4);
    c.setPose('idle');
  }

  public giveItemToSlot(slot: PlayerSlot, item: ShopItemDef): void {
    this.holdShopItemOnSlot(slot, item, true);
  }

  public holdShopItemOnSlot(slot: PlayerSlot, item: ShopItemDef, animate = true): void {
    const c = this.getCharBySlot(slot);
    c.holdShopItem(item);
    if (animate) {
      c.setPose(item.category === 'drink' ? 'sip' : 'eat', 2.4);
      c.showBubble(item.reaction, 3.2);
    }
  }

  public clearSlotHeldItem(slot: PlayerSlot): void {
    this.getCharBySlot(slot).clearHeldItem();
  }

  public showChatBubble(slot: PlayerSlot, text: string): void {
    this.getCharBySlot(slot).showBubble(text, 4.0);
  }

  public triggerEmote(slot: PlayerSlot, emote: 'wave' | 'wai' | 'heart'): void {
    const c = this.getCharBySlot(slot);
    if (emote === 'wave') {
      c.setPose('wave', 2.4);
      c.showBubble('👋 ทักทาย~', 2.4);
    } else if (emote === 'wai') {
      c.setPose('wai', 2.4);
      c.showBubble('🙏 สวัสดีวันลอยกระทง!', 2.4);
    } else {
      c.triggerHeartBurst();
      c.showBubble('💖 ส่งหัวใจให้เลย!', 2.4);
    }
  }

  public startLoyKrathongSequence(
    payload: WishPayload,
    callbacks: {
      onPrayerStart: () => void;
      onReleaseKrathong: () => void;
      onComplete: () => void;
    }
  ): void {
    this.ceremonyLock = true;
    this.cancelAutoWalk();

    if (payload.solo) {
      const localChar = this.getLocalChar();
      localChar.holdKrathong(payload.krathongId1);
      const p = localChar.root.position;
      const pierY = TempleEnvironment.getGroundHeight(0, 23.35);
      const target = new THREE.Vector3(0, pierY, 23.35);

      const moveSolo = () => {
        if (p.distanceTo(target) > 0.08) {
          p.lerp(target, 0.14);
          localChar.root.rotation.y = THREE.MathUtils.lerp(localChar.root.rotation.y, 0, 0.2);
          requestAnimationFrame(moveSolo);
          return;
        }
        p.copy(target);
        localChar.root.rotation.y = 0;
        localChar.setPose('kneel_pray');
        localChar.showBubble(payload.wish1 ? `🙏 ${payload.wish1}` : '🙏 สาธุ...', 2.8);
        callbacks.onPrayerStart();

        window.setTimeout(() => {
          localChar.setPose('place_krathong');
          window.setTimeout(() => {
            localChar.clearHeldItem();
            callbacks.onReleaseKrathong();
            window.setTimeout(() => {
              localChar.setPose('wave', 4.5);
              localChar.showBubble('ลอยแล้ว~ สวยจังเลย ✨', 3.4);
              callbacks.onComplete();
            }, 650);
          }, 950);
        }, 2400);
      };

      if (p.z < 20.5) {
        this.ceremonyLock = false;
        this.walkTo(0, 23.0, () => {
          this.ceremonyLock = true;
          moveSolo();
        });
      } else {
        moveSolo();
      }
      return;
    }

    // Two-player / 2-character synchronized ceremony!
    this.char1.holdKrathong(payload.krathongId1);
    if (payload.mode === 'pair') {
      this.char2.holdKrathong(payload.krathongId2);
    } else {
      this.char2.clearHeldItem();
    }

    const p1 = this.char1.root.position;
    const p2 = this.char2.root.position;
    const pierY = TempleEnvironment.getGroundHeight(0, 23.35);
    const target1 = new THREE.Vector3(-0.55, pierY, 23.35);
    const target2 = new THREE.Vector3(0.55, pierY, 23.35);

    const runPierPose = () => {
      const moveStep = () => {
        const d1 = p1.distanceTo(target1);
        const d2 = p2.distanceTo(target2);
        if (d1 > 0.08 || d2 > 0.08) {
          p1.lerp(target1, 0.14);
          p2.lerp(target2, 0.14);
          this.char1.root.rotation.y = THREE.MathUtils.lerp(this.char1.root.rotation.y, 0, 0.2);
          this.char2.root.rotation.y = THREE.MathUtils.lerp(this.char2.root.rotation.y, 0, 0.2);
          requestAnimationFrame(moveStep);
          return;
        }
        p1.copy(target1);
        p2.copy(target2);
        this.char1.root.rotation.y = 0;
        this.char2.root.rotation.y = 0;

        this.char1.setPose('kneel_pray');
        this.char2.setPose('kneel_pray');
        this.char1.showBubble(payload.wish1 ? `🙏 ${payload.wish1}` : '🙏 สาธุ...', 2.8);
        this.char2.showBubble(payload.wish2 ? `🙏 ${payload.wish2}` : '🙏 ขอให้สมหวังนะ', 2.8);
        callbacks.onPrayerStart();

        window.setTimeout(() => {
          this.char1.setPose('place_krathong');
          this.char2.setPose('place_krathong');

          window.setTimeout(() => {
            this.char1.clearHeldItem();
            this.char2.clearHeldItem();
            callbacks.onReleaseKrathong();

            window.setTimeout(() => {
              this.char1.setPose('wave', 4.5);
              this.char2.setPose('wave', 4.5);
              this.char1.showBubble('ลอยแล้ว~ สวยจังเลย ✨', 3.4);
              this.char2.showBubble('ขอให้คำอธิษฐานเป็นจริงนะ 💖', 3.4);
              callbacks.onComplete();
            }, 650);
          }, 950);
        }, 2400);
      };

      requestAnimationFrame(moveStep);
    };

    const localPos = this.getLocalPosition();
    if (localPos.z < 20.5 && this.sessionMode === 'offline') {
      this.ceremonyLock = false;
      this.walkTo(0, 23.0, () => {
        this.ceremonyLock = true;
        runPierPose();
      });
    } else {
      // Snap far-away characters safely to pier stairs so they never glide across walls/water
      const stairsY = TempleEnvironment.getGroundHeight(0, 21.3);
      if (p1.z < 19.5) p1.set(-0.55, stairsY, 21.3);
      if (p2.z < 19.5) p2.set(0.55, stairsY, 21.3);
      runPierPose();
    }
  }

  public releaseCeremonyLock(): void {
    this.ceremonyLock = false;
    this.localSeated = false;
    this.char1.setPose('idle');
    this.char2.setPose('idle');
  }

  private moveCharacterStep(
    char: ChibiCharacter,
    dirX: number,
    dirZ: number,
    dt: number,
    cameraYaw: number
  ): boolean {
    if (Math.hypot(dirX, dirZ) <= 0.08) return false;

    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const forward = -dirZ;
    const right = dirX;
    const moveX = forward * sin - right * cos;
    const moveZ = forward * cos + right * sin;
    const len = Math.hypot(moveX, moveZ);
    if (len <= 0.05) return false;

    const speed = 3.75;
    const nx = moveX / len;
    const nz = moveZ / len;
    const nextX = char.root.position.x + nx * speed * dt;
    const nextZ = char.root.position.z + nz * speed * dt;

    if (this.env.isPointWalkable(nextX, nextZ)) {
      char.root.position.x = nextX;
      char.root.position.z = nextZ;
    } else if (this.env.isPointWalkable(nextX, char.root.position.z)) {
      char.root.position.x = nextX;
    } else if (this.env.isPointWalkable(char.root.position.x, nextZ)) {
      char.root.position.z = nextZ;
    }

    char.root.position.y = TempleEnvironment.getGroundHeight(
      char.root.position.x,
      char.root.position.z
    );

    const targetYaw = Math.atan2(nx, nz);
    char.root.rotation.y = this.lerpAngle(char.root.rotation.y, targetYaw, 0.24);
    return true;
  }

  private stepWaypoints(char: ChibiCharacter, dt: number): boolean {
    if (this.waypoints.length === 0) return false;
    const wp = this.waypoints[0];
    const dx = wp.x - char.root.position.x;
    const dz = wp.z - char.root.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.28) {
      this.stuckTimer = 0;
      this.waypoints.shift();
      if (this.waypoints.length === 0 && this.onWalkArrive) {
        const cb = this.onWalkArrive;
        this.onWalkArrive = null;
        cb();
      }
      return false;
    }

    const speed = 3.75;
    const nx = dx / dist;
    const nz = dz / dist;
    const prevX = char.root.position.x;
    const prevZ = char.root.position.z;
    const nextX = prevX + nx * speed * dt;
    const nextZ = prevZ + nz * speed * dt;

    if (this.env.isPointWalkable(nextX, nextZ)) {
      char.root.position.x = nextX;
      char.root.position.z = nextZ;
    } else if (this.env.isPointWalkable(nextX, prevZ)) {
      char.root.position.x = nextX;
    } else if (this.env.isPointWalkable(prevX, nextZ)) {
      char.root.position.z = nextZ;
    }

    const movedDist = Math.hypot(char.root.position.x - prevX, char.root.position.z - prevZ);
    if (movedDist < 0.01 * dt * 60) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.55) {
        this.stuckTimer = 0;
        this.cancelAutoWalk();
        return false;
      }
    } else {
      this.stuckTimer = 0;
    }

    char.root.position.y = TempleEnvironment.getGroundHeight(
      char.root.position.x,
      char.root.position.z
    );
    char.root.rotation.y = this.lerpAngle(char.root.rotation.y, Math.atan2(nx, nz), 0.24);
    return true;
  }

  public update(
    dt: number,
    time: number,
    moveInput: CoupleMoveInput,
    cameraYaw: number,
    controlsPaused = false
  ): void {
    let char1Moving = false;
    let char2Moving = false;

    if (!this.ceremonyLock) {
      const localChar = this.getLocalChar();
      let moved = false;

      if (!this.localSeated && !controlsPaused) {
        if (Math.hypot(moveInput.x, moveInput.z) > 0.08) {
          this.cancelAutoWalk();
          moved = this.moveCharacterStep(localChar, moveInput.x, moveInput.z, dt, cameraYaw);
        } else if (this.waypoints.length > 0) {
          moved = this.stepWaypoints(localChar, dt);
        }
      }
      this.localMoving = moved;

      if (this.sessionMode !== 'offline' && this.remotePresent) {
        const remoteChar = this.getRemoteChar();
        const smooth = 1 - Math.exp(-dt * 12);
        remoteChar.root.position.lerp(this.remoteTargetPos, smooth);
        remoteChar.root.rotation.y = this.lerpAngle(
          remoteChar.root.rotation.y,
          this.remoteTargetRotY,
          smooth
        );
      }

      const remoteIsMoving = this.sessionMode !== 'offline' && this.remotePresent && this.remoteMoving;
      char1Moving = this.localSlot === 1 ? moved : remoteIsMoving;
      char2Moving = this.localSlot === 2 ? moved : remoteIsMoving;
    }

    this.char1.update(dt, time, { isMoving: char1Moving, holdHandSide: 'none' });
    this.char2.update(dt, time, { isMoving: char2Moving, holdHandSide: 'none' });
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
}
