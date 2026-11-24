import * as THREE from 'three';
import { SoundManager } from '../audio/SoundManager';
import { DRINK_CATALOG, SNACK_CATALOG } from '../data/catalog';
import { makeFestivalQuestDraw, QUEST_INTERVAL, type FestivalPuzzle, type FestivalQuest, type QuestStation } from '../data/festivalQuests';
import { MultiplayerManager } from '../network/MultiplayerManager';
import {
  CameraMode,
  CharacterConfig,
  FerrisRideState,
  InteractiveZone,
  KrathongId,
  MultiplayerState,
  NetMessage,
  PierWaitState,
  PlayerSlot,
  RoomKrathongState,
  ShopItemDef,
  WishPayload,
  WishReadyInfo,
  ZoneId
} from '../types';
import { CoupleController, CoupleMoveInput } from './CoupleController';
import { FestivalNPCs } from './FestivalNPCs';
import { FestivalEffects, SHOW_DURATION, type FestivalEffect } from './FestivalEffects';
import { LightingAndSky } from './LightingAndSky';
import { StallsBuilder } from './StallsBuilder';
import { FERRIS_PLATFORM, TempleEnvironment } from './TempleEnvironment';
import { WaterSystem } from './WaterSystem';

const FERRIS_ZONE: InteractiveZone = {
  id: 'ferris_wheel', label: 'ชิงช้าสวรรค์', actionLabel: '🎡 ขึ้นชิงช้าสวรรค์',
  icon: '🎡', position: FERRIS_PLATFORM, interactionPos: FERRIS_PLATFORM, radius: 2.3
};
const FERRIS_BOARDING_SECONDS = 10;
const FERRIS_RIDE_SECONDS = 26;

export interface WorldCallbacks {
  onQuestChange: (station: QuestStation | null) => void;
  onZoneProximity: (zone: InteractiveZone | null) => void;
  onCeremonyStateChange: (phase: 'idle' | 'praying' | 'watching', payload?: WishPayload) => void;
  onMultiplayerChange: (state: MultiplayerState) => void;
  onWishReadyChange: (localReady: WishReadyInfo | null, remoteReady: WishReadyInfo | null) => void;
  onRoomKrathongChange: (state: RoomKrathongState) => void;
  onPierWaitChange: (state: PierWaitState) => void;
  onOpenWishScreen: () => void;
  onPhoneChatMessage: (senderName: string, text: string) => void;
  onBankTransferReceived: (senderName: string, amount: number, note?: string) => void;
  onToast: (message: string) => void;
}

export class WorldEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private env: TempleEnvironment;
  private water: WaterSystem;
  private sky: LightingAndSky;
  private readonly festivalEffects = new FestivalEffects();
  private showView: { riverZ: number; until: number } | null = null;
  private readonly effectReadyAt: Record<FestivalEffect, number> = { sky_lantern: 0, firework: 0 };
  private stalls: StallsBuilder;
  private npcs: FestivalNPCs;
  public readonly couple: CoupleController;
  public readonly net: MultiplayerManager;
  private sound: SoundManager;
  private callbacks: WorldCallbacks;

  private clock = new THREE.Clock();
  private elapsed = 0;

  // Input state
  private keys = new Set<string>();
  private joystickInput: CoupleMoveInput = { x: 0, z: 0 };

  // Orbit camera state
  private camYaw = 0.08;
  private camPitch = 0.36;
  private camDistance = 8.8;
  private camTarget = new THREE.Vector3(0, 1.0, 2.2);
  private camMode: CameraMode = 'follow_couple';
  private customizeCloseup = true;
  private orientationBlocked = false;

  // Touch & mouse pointer tracking on canvas (camera orbit & pinch zoom only)
  private activePointers = new Map<number, { x: number; y: number }>();
  private prevPinchDist = 0;

  private lastZoneId: ZoneId | null = null;
  private readonly questProgress: Record<PlayerSlot, {
    draw: () => FestivalQuest;
    quest: FestivalQuest | null;
    readyAt: number;
  }> = {
    1: { draw: makeFestivalQuestDraw(1), quest: null, readyAt: 0 },
    2: { draw: makeFestivalQuestDraw(2), quest: null, readyAt: 0 }
  };
  private activeQuest: FestivalQuest | null = null;
  private questZone: InteractiveZone | null = null;
  private ferrisRide: FerrisRideState | null = null;
  private readonly ferrisSeat = new THREE.Vector3();

  // Multiplayer sync, krathong ownership & pier wait state
  private localKrathongId: KrathongId | null = null;
  private roomKrathong: RoomKrathongState = {
    ownerSlot: null,
    krathongId: null,
    ownerName: null
  };
  private localPierWaiting = false;
  private remotePierWaiting = false;
  private localWishReady: WishReadyInfo | null = null;
  private remoteWishReady: WishReadyInfo | null = null;
  private netSyncAccum = 0;
  private netIdleAccum = 0;

  constructor(
    canvas: HTMLCanvasElement,
    sound: SoundManager,
    initialCouple: [CharacterConfig, CharacterConfig],
    callbacks: WorldCallbacks
  ) {
    this.canvas = canvas;
    this.sound = sound;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.resizeRenderBuffer(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      240
    );

    this.sky = new LightingAndSky(this.scene);
    this.scene.add(this.sky.group, this.festivalEffects.group);

    this.env = new TempleEnvironment();
    this.scene.add(this.env.group);

    this.water = new WaterSystem();
    this.scene.add(this.water.group);

    this.stalls = new StallsBuilder(this.env.obstacles);
    this.scene.add(this.stalls.group);

    this.npcs = new FestivalNPCs(this.env);
    this.scene.add(this.npcs.group);

    this.couple = new CoupleController(this.scene, this.env, initialCouple);

    this.net = new MultiplayerManager({
      onStateChange: (state) => this.callbacks.onMultiplayerChange(state),
      onPartnerConnected: () => this.handlePartnerConnected(),
      onPartnerDisconnected: () => this.handlePartnerDisconnected(),
      onMessage: (msg) => this.handleNetMessage(msg)
    });

    this.bindEvents();
    this.animate();
  }

  public getZones(): InteractiveZone[] {
    return this.questZone ? [...this.stalls.zones, FERRIS_ZONE, this.questZone] : [...this.stalls.zones, FERRIS_ZONE];
  }

  public getNearbyQuest(): FestivalQuest | null {
    if (!this.questZone || this.customizeCloseup || this.camMode !== 'follow_couple') return null;
    if (this.ferrisRide?.riders.includes(this.couple.getLocalSlot())) return null;
    const pos = this.couple.getLocalPosition();
    const { position, radius } = this.questZone;
    if (Math.hypot(pos.x - position.x, pos.z - position.z) > radius) return null;
    const slot = this.couple.getLocalSlot();
    return this.activeQuest === this.questProgress[slot].quest ? this.activeQuest : null;
  }

  public answerFestivalQuest(puzzle: FestivalPuzzle, choice: number): 'correct' | 'wrong' | 'unavailable' {
    if (this.getNearbyQuest()?.puzzle !== puzzle) return 'unavailable';
    if (choice !== puzzle.answer) return 'wrong';
    const progress = this.questProgress[this.couple.getLocalSlot()];
    progress.quest = null;
    progress.readyAt = this.elapsed + QUEST_INTERVAL;
    this.updateFestivalQuest();
    this.checkZoneProximity();
    return 'correct';
  }

  private updateFestivalQuest(): void {
    const slot = this.couple.getLocalSlot();
    const progress = this.questProgress[slot];
    const quest = !this.customizeCloseup && this.elapsed >= progress.readyAt
      ? (progress.quest ??= progress.draw()) : null;
    if (quest === this.activeQuest) return;
    this.activeQuest = quest;
    const station = quest?.station ?? null;
    this.npcs.showQuestMarker(station?.actor);
    this.questZone = station ? {
      id: 'npc_quest', label: station.name, actionLabel: `คุยกับ${station.name} · รับเควส`,
      icon: '!', position: station, interactionPos: station, radius: 2.15
    } : null;
    this.callbacks.onQuestChange(station);
  }

  public boardFerrisWheel(): void {
    const slot = this.couple.getLocalSlot();
    if (!this.canBoardFerris(slot)) return;
    if (this.net.getState().mode === 'guest') {
      // The host uses the latest position to confirm the guest is at the gate.
      this.net.send({ type: 'state', pos: this.couple.getLocalTransform() });
      this.net.send({ type: 'ferris_board' });
    } else {
      this.addFerrisRider(slot);
    }
  }

  private canBoardFerris(slot: PlayerSlot): boolean {
    const pos = slot === this.couple.getLocalSlot() ? this.couple.getLocalPosition() : this.couple.getRemotePosition();
    return !this.couple.isCeremonyLocked() && this.ferrisRide?.phase !== 'riding' &&
      !this.ferrisRide?.riders.includes(slot) &&
      Math.hypot(pos.x - FERRIS_PLATFORM.x, pos.z - FERRIS_PLATFORM.z) <= FERRIS_ZONE.radius;
  }

  private addFerrisRider(slot: PlayerSlot): void {
    if (!this.canBoardFerris(slot)) return;
    const riders = [...(this.ferrisRide?.riders ?? []), slot];
    const waiting = this.net.getState().connected && riders.length < 2;
    this.publishFerrisRide({ riders, phase: waiting ? 'boarding' : 'riding', elapsed: 0 });
  }

  private publishFerrisRide(ride: FerrisRideState | null): void {
    this.setFerrisRide(ride);
    this.net.send({ type: 'ferris_ride', ride });
  }

  private setFerrisRide(ride: FerrisRideState | null): void {
    const previous = this.ferrisRide;
    const localSlot = this.couple.getLocalSlot();
    for (const slot of previous?.riders ?? []) {
      if (ride?.riders.includes(slot)) continue;
      const transform = {
        x: FERRIS_PLATFORM.x - 0.35, y: 0, z: FERRIS_PLATFORM.z + (slot === 1 ? -0.62 : 0.62),
        rotY: FERRIS_PLATFORM.facing, moving: false, pose: 'idle' as const
      };
      const char = this.couple.getCharBySlot(slot);
      char.setPose('idle');
      char.root.position.set(transform.x, transform.y, transform.z);
      char.root.rotation.y = transform.rotY;
      if (slot !== localSlot) this.couple.applyRemoteState(transform, true);
    }
    this.ferrisRide = ride;
    if (ride?.riders.includes(localSlot)) {
      this.couple.cancelAutoWalk();
      if (ride.phase !== previous?.phase || !previous?.riders.includes(localSlot)) {
        this.callbacks.onToast(ride.phase === 'boarding' ? '🎡 รอเพื่อนขึ้นกระเช้าได้อีก 10 วินาที' : '🎡 ชิงช้าสวรรค์เริ่มหมุนแล้ว');
      }
    } else if (previous?.riders.includes(localSlot)) {
      this.callbacks.onToast('🎡 ถึงจุดลงชิงช้าสวรรค์แล้ว');
    }
  }

  private updateFerrisRide(dt: number): void {
    const ride = this.ferrisRide;
    if (!ride) {
      this.env.setFerrisProgress(0);
      return;
    }
    ride.elapsed += dt;
    const isGuest = this.net.getState().mode === 'guest';
    if (!isGuest && ride.phase === 'boarding' && ride.elapsed >= FERRIS_BOARDING_SECONDS) {
      this.publishFerrisRide({ riders: ride.riders, phase: 'riding', elapsed: 0 });
    } else if (!isGuest && ride.phase === 'riding' && ride.elapsed >= FERRIS_RIDE_SECONDS) {
      this.publishFerrisRide(null);
      this.env.setFerrisProgress(0);
      return;
    }
    const progress = ride.phase === 'riding' ? Math.min(ride.elapsed / FERRIS_RIDE_SECONDS, 1) : 0;
    this.env.setFerrisProgress(progress - Math.sin(progress * Math.PI * 2) / (Math.PI * 2));
    for (const slot of ride.riders) {
      const char = this.couple.getCharBySlot(slot);
      char.root.position.copy(this.env.getFerrisSeat(slot, this.ferrisSeat));
      char.root.rotation.y = FERRIS_PLATFORM.facing;
      char.setPose('sit_wait');
    }
  }

  public getMultiplayerState(): MultiplayerState {
    return this.net.getState();
  }

  public getRoomKrathong(): RoomKrathongState {
    return { ...this.roomKrathong };
  }

  public getPierWaitState(): PierWaitState {
    return {
      localWaiting: this.localPierWaiting,
      remoteWaiting: this.remotePierWaiting,
      bothSeated: this.localPierWaiting && this.remotePierWaiting
    };
  }

  private emitRoomKrathong(): void {
    this.callbacks.onRoomKrathongChange({ ...this.roomKrathong });
  }

  private emitPierWait(): void {
    this.callbacks.onPierWaitChange(this.getPierWaitState());
  }

  private resetRoundStates(): void {
    this.localKrathongId = null;
    this.roomKrathong = { ownerSlot: null, krathongId: null, ownerName: null };
    this.localPierWaiting = false;
    this.remotePierWaiting = false;
    this.localWishReady = null;
    this.remoteWishReady = null;
    this.emitRoomKrathong();
    this.emitPierWait();
    this.callbacks.onWishReadyChange(null, null);
  }

  public async createOnlineRoom(myConfig: CharacterConfig): Promise<string> {
    const code = await this.net.createRoom();
    const cfg: CharacterConfig = { ...myConfig, id: 1 };
    this.couple.setSessionMode('host', 1, false);
    this.couple.updateSlotConfig(1, cfg);
    this.resetRoundStates();
    this.couple.char1.clearHeldItem();
    this.couple.char2.clearHeldItem();
    return code;
  }

  public async joinOnlineRoom(code: string, myConfig: CharacterConfig): Promise<void> {
    const cfg: CharacterConfig = { ...myConfig, id: 2 };
    this.setFerrisRide(null);
    this.couple.setSessionMode('guest', 2, false);
    this.couple.updateSlotConfig(2, cfg);
    this.couple.char2.root.position.set(1.15, 0, 2.2);
    this.couple.char2.root.rotation.y = 0;
    this.couple.char2.setPose('idle');
    this.resetRoundStates();
    this.couple.char1.clearHeldItem();
    this.couple.char2.clearHeldItem();
    try {
      await this.net.joinRoom(code);
    } catch (err) {
      this.couple.setSessionMode('offline', 1, true);
      throw err;
    }
  }

  public leaveOnlineRoom(): void {
    this.setFerrisRide(null);
    this.net.disconnect();
    this.restoreOfflinePlayer();
    this.resetRoundStates();
    this.couple.char1.clearHeldItem();
    this.couple.char2.clearHeldItem();
  }

  private restoreOfflinePlayer(): void {
    const local = this.couple.getLocalChar();
    if (this.couple.getLocalSlot() === 2) {
      this.couple.updateSlotConfig(1, { ...local.getConfig(), id: 1 });
      this.couple.char1.root.position.copy(local.root.position);
      this.couple.char1.root.rotation.y = local.root.rotation.y;
      this.couple.char1.setPose('idle');
    }
    this.couple.setSessionMode('offline', 1, true);
  }

  private handlePartnerConnected(): void {
    const st = this.net.getState();
    this.sound.playBuy();
    if (st.mode === 'host') {
      this.couple.setRemotePresent(true);
      this.net.send({
        type: 'welcome',
        hostConfig: this.couple.char1.getConfig(),
        hostPos: this.couple.getLocalTransform(),
        hostKrathong: this.localKrathongId,
        roomKrathong: this.roomKrathong,
        hostPierWaiting: this.localPierWaiting
      });
      if (this.ferrisRide) this.net.send({ type: 'ferris_ride', ride: this.ferrisRide });
      this.callbacks.onToast('เพื่อนเข้าห้องมาแล้ว! (2/2 คน เต็มห้อง) 🎉');
    } else if (st.mode === 'guest') {
      this.couple.setRemotePresent(true);
      this.net.send({
        type: 'hello',
        config: this.couple.char2.getConfig(),
        pos: this.couple.getLocalTransform(),
        krathong: this.localKrathongId
      });
      this.callbacks.onToast('เข้าห้องสำเร็จ! เดินเที่ยวงานวัดด้วยกันได้เลย 🏮');
    }
  }

  private handlePartnerDisconnected(): void {
    this.setFerrisRide(null);
    const remoteSlot: PlayerSlot = this.couple.getLocalSlot() === 1 ? 2 : 1;
    this.remoteWishReady = null;
    this.remotePierWaiting = false;
    this.callbacks.onWishReadyChange(this.localWishReady, null);

    if (this.roomKrathong.ownerSlot === remoteSlot) {
      this.roomKrathong = { ownerSlot: null, krathongId: null, ownerName: null };
      this.emitRoomKrathong();
    }
    this.emitPierWait();

    const st = this.net.getState();
    if (st.mode === 'host') {
      this.couple.setRemotePresent(false);
      this.callbacks.onToast('เพื่อนออกจากห้องแล้ว (1/2 คน)');
    } else {
      this.restoreOfflinePlayer();
      this.callbacks.onToast('หลุดการเชื่อมต่อจากห้อง (สลับเป็นโหมดเดี่ยว)');
    }
  }

  private handleNetMessage(msg: NetMessage): void {
    const remoteSlot: PlayerSlot = this.couple.getLocalSlot() === 1 ? 2 : 1;
    const mode = this.net.getState().mode;

    if (msg.type === 'ferris_board' && mode === 'host') {
      this.addFerrisRider(remoteSlot);
      return;
    }
    if (msg.type === 'ferris_ride' && mode === 'guest') {
      this.setFerrisRide(msg.ride);
      return;
    }

    if (msg.type === 'welcome') {
      this.couple.updateSlotConfig(1, { ...msg.hostConfig, id: 1 });
      this.couple.applyRemoteState(msg.hostPos, true);
      this.net.setPartnerName(msg.hostConfig.name);
      this.roomKrathong = { ...msg.roomKrathong };
      if (this.roomKrathong.ownerSlot && this.roomKrathong.krathongId) {
        this.couple.giveKrathongToSlot(this.roomKrathong.ownerSlot, this.roomKrathong.krathongId);
      }
      this.emitRoomKrathong();

      this.remotePierWaiting = msg.hostPierWaiting;
      if (msg.hostPierWaiting) {
        this.couple.seatSlotAtPier(1);
      }
      this.emitPierWait();
      return;
    }

    if (msg.type === 'hello') {
      this.couple.updateSlotConfig(2, { ...msg.config, id: 2 });
      this.couple.applyRemoteState(msg.pos, true);
      if (msg.krathong) this.couple.giveKrathongToSlot(2, msg.krathong);
      this.net.setPartnerName(msg.config.name);
      return;
    }

    if (msg.type === 'config') {
      this.couple.updateSlotConfig(remoteSlot, { ...msg.config, id: remoteSlot });
      this.net.setPartnerName(msg.config.name);
      return;
    }

    if (msg.type === 'state') {
      this.couple.applyRemoteState(msg.pos, false);
      return;
    }

    if (msg.type === 'held_krathong') {
      this.couple.giveKrathongToSlot(remoteSlot, msg.krathongId);
      return;
    }

    if (msg.type === 'room_krathong') {
      const st = this.net.getState();
      if (
        st.mode === 'host' &&
        this.roomKrathong.ownerSlot !== null &&
        msg.state.ownerSlot !== null &&
        msg.state.ownerSlot !== this.roomKrathong.ownerSlot
      ) {
        // Host already owns a krathong; re-broadcast authoritative state
        this.net.send({ type: 'room_krathong', state: this.roomKrathong });
        return;
      }
      const hadOwner = this.roomKrathong.ownerSlot !== null;
      this.roomKrathong = { ...msg.state };
      if (this.roomKrathong.ownerSlot && this.roomKrathong.krathongId) {
        this.couple.giveKrathongToSlot(this.roomKrathong.ownerSlot, this.roomKrathong.krathongId);
        this.sound.playBuy();
        this.callbacks.onToast(
          `🪷 ${this.roomKrathong.ownerName ?? 'เพื่อน'} ซื้อกระทงแล้ว! เดินไปเจอกันที่ท่าน้ำได้เลย 🌉`
        );
      } else if (hadOwner && this.roomKrathong.ownerSlot === null) {
        this.couple.clearSlotHeldItem(remoteSlot);
        this.callbacks.onToast('🗑️ กระทงถูกทิ้งแล้ว — สามารถไปซื้อกระทงใหม่ได้');
      }
      this.emitRoomKrathong();
      return;
    }

    if (msg.type === 'pier_wait') {
      this.remotePierWaiting = msg.waiting;
      if (msg.waiting) {
        this.couple.seatSlotAtPier(remoteSlot);
        const partnerName = this.couple.getRemoteChar().getConfig().name;
        this.sound.playTap();
        this.callbacks.onToast(`🪑 ${partnerName} นั่งรอที่ท่าน้ำลอยกระทงแล้ว!`);
      } else {
        this.couple.standUpFromPier(remoteSlot);
      }
      this.emitPierWait();

      if (this.net.getState().mode === 'host' && this.localPierWaiting && this.remotePierWaiting) {
        this.net.send({ type: 'open_wish_screen' });
        this.callbacks.onOpenWishScreen();
      }
      return;
    }

    if (msg.type === 'open_wish_screen') {
      this.callbacks.onOpenWishScreen();
      return;
    }

    if (msg.type === 'held_item') {
      const list = msg.category === 'snack' ? SNACK_CATALOG : DRINK_CATALOG;
      const item = list.find((i) => i.id === msg.itemId);
      if (item) {
        this.couple.holdShopItemOnSlot(remoteSlot, item, !msg.silent);
      }
      return;
    }

    if (msg.type === 'clear_held_item') {
      this.couple.clearSlotHeldItem(remoteSlot);
      return;
    }

    if (msg.type === 'chat') {
      const sender = msg.senderName ?? this.couple.getRemoteChar().getConfig().name;
      this.callbacks.onPhoneChatMessage(sender, msg.text);
      return;
    }

    if (msg.type === 'bank_transfer') {
      this.callbacks.onBankTransferReceived(msg.senderName, msg.amount, msg.note);
      return;
    }

    if (msg.type === 'emote') {
      this.sound.playBuy();
      this.couple.triggerEmote(remoteSlot, msg.emote);
      return;
    }

    if (msg.type === 'wish_ready') {
      this.remoteWishReady = msg.ready
        ? {
            ready: true,
            krathongId: msg.krathongId,
            wish: msg.wish,
            floatMode: msg.floatMode
          }
        : null;
      this.callbacks.onWishReadyChange(this.localWishReady, this.remoteWishReady);

      if (msg.ready) {
        const partnerName = this.couple.getRemoteChar().getConfig().name;
        this.sound.playBuy();
        this.callbacks.onToast(`🌉 ${partnerName} พร้อมลอยกระทงแล้ว!`);
        this.tryHostStartCeremony();
      }
      return;
    }

    if (msg.type === 'start_ceremony') {
      this.localWishReady = null;
      this.remoteWishReady = null;
      this.callbacks.onWishReadyChange(null, null);
      this.runCeremony(msg.payload);
      return;
    }

    if (msg.type === 'world_event') {
      this.playFestivalEffect(msg.event, msg.riverZ, this.camMode !== 'follow_couple');
    }
  }

  private tryHostStartCeremony(): void {
    const st = this.net.getState();
    if (st.mode !== 'host' || !st.connected) return;
    if (!this.localWishReady || !this.remoteWishReady) return;

    const krathongId = this.roomKrathong.krathongId ?? this.localWishReady.krathongId;
    const payload: WishPayload = {
      mode: 'shared',
      krathongId1: krathongId,
      krathongId2: krathongId,
      wish1: this.localWishReady.wish,
      wish2: this.remoteWishReady.wish,
      names: [this.couple.char1.getConfig().name, this.couple.char2.getConfig().name]
    };

    this.net.send({ type: 'start_ceremony', payload });
    this.localWishReady = null;
    this.remoteWishReady = null;
    this.callbacks.onWishReadyChange(null, null);
    this.runCeremony(payload);
  }

  public updateMyConfig(cfg: CharacterConfig): void {
    const slot = this.couple.getLocalSlot();
    const normalized: CharacterConfig = { ...cfg, id: slot };
    this.couple.updateSlotConfig(slot, normalized);
    if (this.net.getState().connected) {
      this.net.send({ type: 'config', config: normalized });
    }
  }

  public sendPhoneChat(text: string): void {
    const cleaned = text.trim();
    if (!cleaned) return;
    this.sound.playTap();
    if (this.net.getState().connected) {
      this.net.send({
        type: 'chat',
        text: cleaned,
        senderName: this.couple.getLocalChar().getConfig().name
      });
    }
  }

  public sendBankTransfer(amount: number, note?: string): boolean {
    if (!this.net.getState().connected || amount <= 0) return false;
    this.net.send({
      type: 'bank_transfer',
      amount,
      senderName: this.couple.getLocalChar().getConfig().name,
      note
    });
    return true;
  }

  public frameDressingRoom(stage: DOMRect): void {
    if (!this.customizeCloseup || !stage.height || !stage.width) return;
    const w = window.innerWidth, h = window.innerHeight;
    const x = (w - stage.width) / 2 - stage.left;
    const y = (h - stage.height) / 2 - stage.top;
    const view = this.camera.view;
    if (view?.enabled && view.fullWidth === w && view.fullHeight === h && view.offsetX === x && view.offsetY === y) return;
    this.camera.setViewOffset(w, h, x, y, w, h);
    this.camDistance = Math.max(3.4, 3.25 * h / stage.height, 2.3 * h / stage.width);
    const pos = this.couple.getLocalPosition();
    this.camTarget.set(pos.x, pos.y + 0.95, pos.z);
    const horizontal = Math.cos(this.camPitch) * this.camDistance;
    this.camera.position.set(pos.x - Math.sin(this.camYaw) * horizontal,
      this.camTarget.y + Math.sin(this.camPitch) * this.camDistance, pos.z - Math.cos(this.camYaw) * horizontal);
    this.camera.lookAt(this.camTarget);
  }

  public setCustomizeCloseup(active: boolean): void {
    this.customizeCloseup = active;
    if (active) {
      this.camYaw = Math.PI + 0.12;
      this.camPitch = 0.16;
      this.camDistance = 3.6;
    } else {
      this.camera.clearViewOffset();
      this.camYaw = 0.08;
      this.camPitch = 0.34;
      this.camDistance = 8.8;
    }
  }

  public setOrientationBlocked(blocked: boolean): void {
    this.orientationBlocked = blocked;
    if (blocked) {
      this.keys.clear();
      this.joystickInput = { x: 0, z: 0 };
      this.activePointers.clear();
      this.prevPinchDist = 0;
    }
  }

  public setJoystickInput(x: number, z: number): void {
    if (this.orientationBlocked) return;
    this.joystickInput.x = x;
    this.joystickInput.z = z;
  }

  public setCameraMode(mode: CameraMode): void {
    this.showView = null;
    this.camMode = mode;
  }

  public getCameraMode(): CameraMode {
    return this.camMode;
  }

  public triggerSnackOrDrink(item: ShopItemDef): void {
    this.equipLocalShopItem(item, true);
  }

  public equipLocalShopItem(item: ShopItemDef, animate = false): void {
    if (animate) {
      this.sound.playEatSip();
    } else {
      this.sound.playTap();
    }
    const st = this.net.getState();
    const slot = this.couple.getLocalSlot();
    this.couple.holdShopItemOnSlot(slot, item, animate);
    if (st.connected) {
      this.net.send({
        type: 'held_item',
        itemId: item.id,
        category: item.category,
        silent: !animate
      });
    }
  }

  public equipLocalKrathong(id: KrathongId): void {
    this.sound.playTap();
    const slot = this.couple.getLocalSlot();
    this.couple.giveKrathongToSlot(slot, id);
    if (this.net.getState().connected) {
      this.net.send({ type: 'held_krathong', krathongId: id });
    }
  }

  public clearLocalHeldItem(): void {
    this.couple.clearSlotHeldItem(this.couple.getLocalSlot());
    if (this.net.getState().connected) {
      this.net.send({ type: 'clear_held_item' });
    }
  }

  public discardRoomKrathong(): void {
    const slot = this.couple.getLocalSlot();
    this.clearLocalHeldItem();
    if (this.roomKrathong.ownerSlot === slot) {
      this.localKrathongId = null;
      this.roomKrathong = { ownerSlot: null, krathongId: null, ownerName: null };
      if (this.localPierWaiting) {
        this.standUpFromPier();
      }
      this.emitRoomKrathong();
      if (this.net.getState().connected) {
        this.net.send({ type: 'room_krathong', state: this.roomKrathong });
      }
    }
  }

  public buyRoomKrathong(id: KrathongId): boolean {
    if (this.roomKrathong.ownerSlot !== null) {
      return false;
    }
    this.sound.playBuy();
    this.localKrathongId = id;
    const slot = this.couple.getLocalSlot();
    const myName = this.couple.getLocalChar().getConfig().name;
    this.roomKrathong = { ownerSlot: slot, krathongId: id, ownerName: myName };
    this.couple.giveKrathongToSlot(slot, id);
    this.emitRoomKrathong();
    if (this.net.getState().connected) {
      this.net.send({ type: 'room_krathong', state: this.roomKrathong });
    }
    return true;
  }

  public sitAtPierToWait(): boolean {
    if (this.roomKrathong.ownerSlot === null || !this.roomKrathong.krathongId) {
      this.callbacks.onToast('🪷 ยังไม่มีกระทง! กรุณาเดินไปซื้อที่ร้านขายกระทงก่อนนะ');
      return false;
    }
    const slot = this.couple.getLocalSlot();
    this.sound.playTap();
    this.couple.seatSlotAtPier(slot);
    this.localPierWaiting = true;
    this.camMode = 'pier_ceremony';
    this.emitPierWait();

    const st = this.net.getState();
    if (st.connected) {
      this.net.send({ type: 'pier_wait', waiting: true });
      if (this.remotePierWaiting && st.mode === 'host') {
        this.net.send({ type: 'open_wish_screen' });
        this.callbacks.onOpenWishScreen();
      }
    } else {
      // Offline / solo mode opens Wish Modal immediately once seated
      this.callbacks.onOpenWishScreen();
    }
    return true;
  }

  public standUpFromPier(): void {
    const slot = this.couple.getLocalSlot();
    this.localPierWaiting = false;
    this.couple.standUpFromPier(slot);
    this.camMode = 'follow_couple';
    this.cancelWishReady();
    this.emitPierWait();
    if (this.net.getState().connected) {
      this.net.send({ type: 'pier_wait', waiting: false });
    }
  }

  public launchSkyLanterns(): boolean {
    return this.launchFestivalEffect('sky_lantern');
  }

  public launchFireworks(): void {
    this.launchFestivalEffect('firework');
  }

  private launchFestivalEffect(effect: FestivalEffect): boolean {
    const riverZ = THREE.MathUtils.clamp(this.showView?.riverZ ??
      (this.water.getUserKrathongFocusPoint()?.z ?? 31) + 4, 35, 47);
    if (!this.playFestivalEffect(effect, riverZ, true)) return false;
    this.sound.unlock();
    if (this.net.getState().connected) this.net.send({ type: 'world_event', event: effect, riverZ });
    return true;
  }

  private playFestivalEffect(effect: FestivalEffect, riverZ: number | undefined, showCamera: boolean): boolean {
    if ((effect !== 'sky_lantern' && effect !== 'firework') || this.elapsed < this.effectReadyAt[effect]) return false;
    const origin = typeof riverZ === 'number' && Number.isFinite(riverZ) ? THREE.MathUtils.clamp(riverZ, 35, 47) : 35;
    this.effectReadyAt[effect] = this.elapsed + SHOW_DURATION;
    this.festivalEffects.play(effect, origin);
    if (effect === 'sky_lantern') this.sound.playBuy();
    if (showCamera && !this.customizeCloseup) {
      this.showView = { riverZ: origin, until: this.elapsed + SHOW_DURATION };
    }
    return true;
  }

  public submitWishAndFloat(
    wish: string,
    soloConfirm = false
  ): void {
    const krathongId = this.roomKrathong.krathongId ?? this.localKrathongId ?? 'banana_lotus';
    const st = this.net.getState();

    // Online 2/2 synchronized ceremony handshake
    if (st.mode !== 'offline' && st.connected && !soloConfirm) {
      this.localWishReady = {
        ready: true,
        krathongId,
        wish,
        floatMode: 'shared'
      };
      this.callbacks.onWishReadyChange(this.localWishReady, this.remoteWishReady);
      this.net.send({
        type: 'wish_ready',
        ready: true,
        krathongId,
        wish,
        floatMode: 'shared'
      });
      this.tryHostStartCeremony();
      return;
    }

    // Solo mode (offline or online 1/2 waiting)
    this.runCeremony({
      mode: 'shared',
      krathongId1: krathongId,
      krathongId2: krathongId,
      wish1: wish,
      wish2: wish,
      names: [this.couple.getLocalChar().getConfig().name, ''],
      solo: true
    });
  }

  public cancelWishReady(): void {
    this.localWishReady = null;
    this.callbacks.onWishReadyChange(null, this.remoteWishReady);
    if (this.net.getState().connected) {
      this.net.send({
        type: 'wish_ready',
        ready: false,
        krathongId: this.localKrathongId ?? 'banana_lotus',
        wish: '',
        floatMode: 'pair'
      });
    }
  }

  private runCeremony(payload: WishPayload): void {
    this.showView = null;
    this.camMode = 'pier_ceremony';
    this.callbacks.onCeremonyStateChange('praying', payload);

    this.couple.startLoyKrathongSequence(payload, {
      onPrayerStart: () => {
        this.sound.playPrayerChime();
      },
      onReleaseKrathong: () => {
        this.sound.playWaterSplash();
        this.water.spawnUserKrathongs(payload);
        this.festivalEffects.play('sky_lantern', 23);
        // Reset krathong ownership & pier wait after floating into the river
        this.localKrathongId = null;
        this.roomKrathong = { ownerSlot: null, krathongId: null, ownerName: null };
        this.localPierWaiting = false;
        this.remotePierWaiting = false;
        this.emitRoomKrathong();
        this.emitPierWait();
      },
      onComplete: () => {
        this.camMode = 'watch_krathong';
        this.callbacks.onCeremonyStateChange('watching', payload);
      }
    });
  }

  public returnToTempleFair(): void {
    this.showView = null;
    this.couple.releaseCeremonyLock();
    this.camMode = 'follow_couple';
    this.callbacks.onCeremonyStateChange('idle');
    this.couple.walkTo(this.couple.getLocalSlot() === 1 ? -1.1 : 1.1, 6.8);
  }

  public capturePostcard(wishText: string, namesLabel: string): void {
    this.renderer.render(this.scene, this.camera);
    const src = this.canvas;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(src, 0, 0);

    const barH = Math.max(96, Math.floor(out.height * 0.16));
    const grad = ctx.createLinearGradient(0, out.height - barH, 0, out.height);
    grad.addColorStop(0, 'rgba(18, 20, 44, 0)');
    grad.addColorStop(0.35, 'rgba(18, 20, 44, 0.84)');
    grad.addColorStop(1, 'rgba(18, 20, 44, 0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, out.height - barH, out.width, barH);

    ctx.strokeStyle = 'rgba(255, 213, 115, 0.85)';
    ctx.lineWidth = Math.max(4, out.width * 0.004);
    ctx.strokeRect(10, 10, out.width - 20, out.height - 20);

    const fontScale = Math.max(0.75, Math.min(1.45, out.width / 1000));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd573';
    ctx.font = `bold ${Math.round(28 * fontScale)}px "Mali", "Prompt", sans-serif`;
    ctx.fillText(`🪷 ลอยกระทงคืนวันเพ็ญ — ${namesLabel} 🪷`, out.width / 2, out.height - barH * 0.52);

    if (wishText.trim()) {
      ctx.fillStyle = '#fff5fa';
      ctx.font = `500 ${Math.round(21 * fontScale)}px "Prompt", "Mali", sans-serif`;
      ctx.fillText(`"${wishText.trim()}"`, out.width / 2, out.height - barH * 0.2);
    }

    const link = document.createElement('a');
    link.download = `loy-krathong-${Date.now()}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('contextmenu', this.onContextMenu);

    this.canvas.addEventListener('dragstart', this.onPreventDefault);
    this.canvas.addEventListener('selectstart', this.onPreventDefault);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onPreventDefault = (e: Event): void => {
    e.preventDefault();
  };

  private resizeRenderBuffer(width: number, height: number): void {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const pixelBudget = touch ? 1_350_000 : 2_200_000;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.5,
      Math.sqrt(pixelBudget / (width * height)));
    if (this.renderer.getPixelRatio() !== pixelRatio) this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.resizeRenderBuffer(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.orientationBlocked) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onWindowBlur = (): void => {
    this.keys.clear();
  };

  private onPointerDown = (e: PointerEvent): void => {
    // Ignore right-click mouse button
    if (e.pointerType === 'mouse' && e.button === 2) return;
    this.sound.unlock();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activePointers.size >= 2) {
      this.prevPinchDist = this.getPinchDistance();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const prev = this.activePointers.get(e.pointerId);
    if (!prev) return;

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 1) {
      this.camYaw -= dx * 0.0065;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.005, 0.14, 1.05);
    } else if (this.activePointers.size === 2) {
      const dist = this.getPinchDistance();
      if (this.prevPinchDist > 0) {
        const delta = this.prevPinchDist - dist;
        this.camDistance = THREE.MathUtils.clamp(this.camDistance + delta * 0.025, 3.8, 17);
      }
      this.prevPinchDist = dist;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) {
      this.prevPinchDist = 0;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.camDistance = THREE.MathUtils.clamp(this.camDistance + e.deltaY * 0.005, 3.8, 17);
  };

  private getPinchDistance(): number {
    const pts = Array.from(this.activePointers.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private getMovementInput(): CoupleMoveInput {
    let x = this.joystickInput.x;
    let z = this.joystickInput.z;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;

    const len = Math.hypot(x, z);
    return len > 1 ? { x: x / len, z: z / len } : { x, z };
  }

  private updateCamera(dt: number): void {
    const smooth = 1 - Math.exp(-dt * 6.5);

    if (this.showView && this.elapsed < this.showView.until && !this.customizeCloseup) {
      const z = this.showView.riverZ;
      const distance = 11.2 + Math.max(0, 1 - this.camera.aspect) * 5;
      this.camTarget.lerp(new THREE.Vector3(0, 4.5, z + 4), smooth);
      this.camera.position.lerp(new THREE.Vector3(-0.45, 2.4, z - distance), smooth);
      this.camera.lookAt(this.camTarget);
      return;
    }
    this.showView = null;

    if (this.camMode === 'pier_ceremony') {
      const desiredTarget = new THREE.Vector3(0, 0.25, 23.6);
      const desiredPos = new THREE.Vector3(-3.3, 1.55, 19.6);
      this.camTarget.lerp(desiredTarget, smooth);
      this.camera.position.lerp(desiredPos, smooth);
      this.camera.lookAt(this.camTarget);
      return;
    }

    if (this.camMode === 'watch_krathong') {
      const fkPos = this.water.getUserKrathongFocusPoint();
      if (fkPos) {
        const desiredTarget = new THREE.Vector3(fkPos.x, fkPos.y + 0.35, fkPos.z + 1.2);
        const desiredPos = new THREE.Vector3(
          fkPos.x - 2.6,
          Math.max(0.85, fkPos.y + 1.75),
          fkPos.z - 4.4
        );
        this.camTarget.lerp(desiredTarget, smooth * 0.75);
        this.camera.position.lerp(desiredPos, smooth * 0.75);
        this.camera.lookAt(this.camTarget);
        return;
      }
    }

    const focusPos = this.couple.getLocalPosition();
    const desiredTarget = new THREE.Vector3(
      focusPos.x,
      focusPos.y + (this.customizeCloseup ? 0.95 : 1.05),
      focusPos.z
    );
    this.camTarget.lerp(desiredTarget, smooth);

    const horiz = Math.cos(this.camPitch) * this.camDistance;
    const vert = Math.sin(this.camPitch) * this.camDistance;
    const desiredPos = new THREE.Vector3(
      this.camTarget.x - Math.sin(this.camYaw) * horiz,
      Math.max(0.45, this.camTarget.y + vert),
      this.camTarget.z - Math.cos(this.camYaw) * horiz
    );
    this.camera.position.lerp(desiredPos, smooth);
    this.camera.lookAt(this.camTarget);
  }

  private checkZoneProximity(): void {
    if (this.customizeCloseup || this.camMode !== 'follow_couple' ||
        this.ferrisRide?.riders.includes(this.couple.getLocalSlot())) {
      if (this.lastZoneId !== null) {
        this.lastZoneId = null;
        this.callbacks.onZoneProximity(null);
      }
      return;
    }

    const pos = this.couple.getLocalPosition();
    let closest: InteractiveZone | null = null;
    let bestDist = Infinity;

    for (const z of this.getZones()) {
      if (z.id === 'ferris_wheel' && this.ferrisRide?.phase === 'riding') continue;
      const d = Math.hypot(pos.x - z.position.x, pos.z - z.position.z);
      if (d <= z.radius && d < bestDist) {
        bestDist = d;
        closest = z;
      }
    }

    const nextId = closest?.id ?? null;
    if (nextId !== this.lastZoneId) {
      this.lastZoneId = nextId;
      this.callbacks.onZoneProximity(closest);

      // If partner is already waiting at the pier and krathong is bought, auto-sit beside them!
      if (
        nextId === 'pier' &&
        this.roomKrathong.ownerSlot !== null &&
        this.remotePierWaiting &&
        !this.localPierWaiting &&
        this.net.getState().connected
      ) {
        this.sitAtPierToWait();
      }
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const frameTime = this.clock.getDelta();
    const dt = Math.min(frameTime, 0.05);
    this.elapsed += dt;

    const onFerris = this.ferrisRide?.riders.includes(this.couple.getLocalSlot());
    const moveInput = this.customizeCloseup || onFerris ? { x: 0, z: 0 } : this.getMovementInput();

    this.couple.update(dt, this.elapsed, moveInput, this.camYaw, this.orientationBlocked);
    this.updateFerrisRide(frameTime);
    this.updateFestivalQuest();
    this.npcs.update(dt, this.elapsed, this.couple.getLocalPosition(), this.customizeCloseup);
    this.water.update(dt, this.elapsed);
    this.sky.update(dt, this.elapsed);
    this.festivalEffects.update(dt, () => this.sound.playFestivalBurst());
    this.env.update(dt, this.elapsed);
    this.stalls.update(this.elapsed);

    // Broadcast player transform at 20Hz while connected
    const netSt = this.net.getState();
    if (netSt.connected && !this.couple.isCeremonyLocked()) {
      const tf = this.couple.getLocalTransform();
      this.netSyncAccum += dt;
      this.netIdleAccum += dt;
      if (tf.moving && this.netSyncAccum >= 0.05) {
        this.netSyncAccum = 0;
        this.netIdleAccum = 0;
        this.net.send({ type: 'state', pos: tf });
      } else if (!tf.moving && this.netIdleAccum >= 0.45) {
        this.netIdleAccum = 0;
        this.net.send({ type: 'state', pos: tf });
      }
    }

    this.checkZoneProximity();
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  };
}
