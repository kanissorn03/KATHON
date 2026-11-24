import { SoundManager } from '../audio/SoundManager';
import { QUEST_INTERVAL, QUEST_REWARD, type QuestStation } from '../data/festivalQuests';
import {
  ACCESSORY_STYLES,
  DRINK_CATALOG,
  FORTUNE_CATALOG,
  GENDER_PRESETS,
  GLASSES_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  HAT_STYLES,
  KRATHONG_CATALOG,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  QUICK_WISH_CHIPS,
  SKIN_TONES,
  SNACK_CATALOG
} from '../data/catalog';
import { KrathongPreviewController } from '../scene/KrathongFactory';
import { WorldEngine } from '../scene/WorldEngine';
import {
  BankTransaction,
  CharacterConfig,
  GenderId,
  InteractiveZone,
  InventoryItem,
  KrathongId,
  MultiplayerState,
  PhoneChatMessage,
  PierWaitState,
  RoomKrathongState,
  ShopItemDef,
  WishPayload,
  WishReadyInfo
} from '../types';

const PHONE_QUICK_CHAT_CHIPS = [
  'อยู่ไหนแล้ว?',
  'มาซื้อขนมกัน 🍡',
  'ไปท่าน้ำกัน! 🌉',
  'คิดถึงนะ 💖'
];

export class UIController {
  private root: HTMLElement;
  private world: WorldEngine;
  private sound: SoundManager;
  private previewCtrl = new KrathongPreviewController();

  private myConfig: CharacterConfig;

  private selectedKrathong: KrathongId = 'banana_lotus';
  private roomKrathong: RoomKrathongState = {
    ownerSlot: null,
    krathongId: null,
    ownerName: null
  };
  private pierWait: PierWaitState = {
    localWaiting: false,
    remoteWaiting: false,
    bothSeated: false
  };
  private lastWishText = '';
  private lastCeremonyPayload: WishPayload | null = null;

  private nearbyZone: InteractiveZone | null = null;
  private ceremonyPhase: 'idle' | 'praying' | 'watching' = 'idle';
  private mpState: MultiplayerState;
  private localWishReady: WishReadyInfo | null = null;
  private remoteWishReady: WishReadyInfo | null = null;
  private wishModalOpen = false;
  private refreshRoomDialog: (() => void) | null = null;
  private krathongShopOpen = false;
  private foodDrinkModalCat: 'snack' | 'drink' | null = null;
  private phoneOpen = false;
  private phoneScreen: 'home' | 'chat' | 'bank' = 'home';
  private unreadChatCount = 0;
  private unreadBankCount = 0;
  private chatMessages: PhoneChatMessage[] = [];
  private inventorySlots: (InventoryItem | null)[] = [null, null, null];
  private equippedSlot: number | null = null;
  private bankBalance = 100;
  private bankHistory: BankTransaction[] = [
    {
      id: 'init',
      title: 'เงินขวัญถุงงานวัดเริ่มต้น',
      icon: '🎁',
      amount: 100,
      timestamp: Date.now()
    }
  ];
  private balloonCleanup: (() => void) | null = null;

  // DOM Containers
  private hudWrap!: HTMLElement;
  private welcomeWrap!: HTMLElement;
  private modalBackdrop!: HTMLElement;
  private ceremonyWrap!: HTMLElement;
  private contextBtnWrap!: HTMLElement;
  private questTracker!: HTMLElement;
  private pierWaitBar!: HTMLElement;
  private badgeText!: HTMLElement;
  private krathongStatusChip!: HTMLElement;
  private actionLeftBtn!: HTMLButtonElement;
  private muteBtn!: HTMLButtonElement;
  private desktopHintEl!: HTMLElement;
  private phoneFab!: HTMLButtonElement;
  private phoneFabBadge!: HTMLElement;
  private phoneShell!: HTMLElement;
  private phoneNotifHost!: HTMLElement;
  private inventoryDock!: HTMLElement;
  private notifDismissTimer: number | null = null;
  private consumeClearTimer: number | null = null;

  constructor(
    root: HTMLElement,
    world: WorldEngine,
    sound: SoundManager,
    initialConfigs: [CharacterConfig, CharacterConfig]
  ) {
    this.root = root;
    this.world = world;
    this.sound = sound;
    this.myConfig = { ...initialConfigs[0] };
    this.mpState = world.getMultiplayerState();

    this.renderBaseLayout();
    this.openWelcomeLobby(true);
  }

  private renderBaseLayout(): void {
    this.root.innerHTML = `
      <div id="hud-wrap" class="hidden">
        <div class="hud-top">
          <div class="couple-badge pointer-auto">
            <span id="room-status-dot">🌸</span>
            <span id="couple-names-badge"></span>
            <span id="krathong-chip" class="krathong-status-chip"></span>
            <button id="btn-room-action" class="btn btn-pill-sm" style="min-height:30px; padding:4px 10px; font-size:12px;">🌐 เล่น 2 คนออนไลน์</button>
          </div>
          <div class="hud-actions pointer-auto">
            <button id="btn-customize" class="btn btn-pill-sm" title="แต่งตัว">✨ แต่งตัว</button>
            <button id="btn-sound" class="btn btn-pill-sm" aria-label="เพลง">🎵 เพลง</button>
          </div>
          <div id="quest-tracker" class="quest-tracker hidden" role="status"></div>
        </div>

        <div id="pier-wait-bar" class="pier-wait-bar glass-card hidden pointer-auto"></div>
        <div id="context-cta-wrap" class="context-cta-wrap hidden pointer-auto"></div>

        <div id="joystick-zone" class="joystick-zone pointer-auto" aria-label="จอยสติ๊กเดิน">
          <span class="joy-arrow joy-up">▲</span>
          <span class="joy-arrow joy-down">▼</span>
          <span class="joy-arrow joy-left">◀</span>
          <span class="joy-arrow joy-right">▶</span>
          <div id="joystick-knob" class="joystick-knob"></div>
        </div>

        <div id="inventory-dock" class="inventory-dock pointer-auto"></div>

        <button id="btn-phone-fab" class="phone-fab pointer-auto" title="เปิดมือถือ (แชท & ธนาคาร)">
          <span>📱</span>
          <span id="phone-fab-badge" class="phone-badge hidden">0</span>
        </button>
        <div id="phone-shell" class="phone-shell hidden pointer-auto"></div>

        <div id="desktop-hint" class="desktop-hint"></div>
      </div>

      <div id="phone-notif-host" class="phone-notif-host"></div>
      <div id="ceremony-wrap" class="hidden"></div>
      <div id="welcome-wrap" class="welcome-overlay hidden"></div>
      <div id="modal-backdrop" class="modal-backdrop hidden pointer-auto"></div>
    `;

    this.hudWrap = this.root.querySelector('#hud-wrap')!;
    this.welcomeWrap = this.root.querySelector('#welcome-wrap')!;
    this.modalBackdrop = this.root.querySelector('#modal-backdrop')!;
    this.ceremonyWrap = this.root.querySelector('#ceremony-wrap')!;
    this.contextBtnWrap = this.root.querySelector('#context-cta-wrap')!;
    this.questTracker = this.root.querySelector('#quest-tracker')!;
    this.pierWaitBar = this.root.querySelector('#pier-wait-bar')!;
    this.badgeText = this.root.querySelector('#couple-names-badge')!;
    this.krathongStatusChip = this.root.querySelector('#krathong-chip')!;
    this.actionLeftBtn = this.root.querySelector('#btn-room-action')!;
    this.muteBtn = this.root.querySelector('#btn-sound')!;
    this.desktopHintEl = this.root.querySelector('#desktop-hint')!;
    this.phoneFab = this.root.querySelector('#btn-phone-fab')!;
    this.phoneFabBadge = this.root.querySelector('#phone-fab-badge')!;
    this.phoneShell = this.root.querySelector('#phone-shell')!;
    this.phoneNotifHost = this.root.querySelector('#phone-notif-host')!;
    this.inventoryDock = this.root.querySelector('#inventory-dock')!;

    this.refreshTopHud();
    this.renderInventoryDock();
    this.bindHudEvents();
    this.bindJoystick();
    this.setupTouchControlDetection();
  }

  private detectTouchDevice(): boolean {
    const ua = navigator.userAgent || '';
    const isMobileOrTabletUA = /Android|iPhone|iPad|iPod/i.test(ua);
    const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return isMobileOrTabletUA || isIpadOS || hasCoarsePointer;
  }

  private setupTouchControlDetection(): void {
    const portrait = window.matchMedia('(orientation: portrait)');
    const rotateScreen = document.getElementById('rotate-screen')!;
    const game = document.getElementById('app')!;
    let touchSeen = false;
    const sync = (forceTouch = false) => {
      touchSeen ||= forceTouch;
      const enabled = touchSeen || this.detectTouchDevice();
      this.root.classList.toggle('touch-controls-enabled', enabled);
      const blocked = enabled && portrait.matches;
      game.inert = blocked;
      rotateScreen.classList.toggle('hidden', !blocked);
      this.world.setOrientationBlocked(blocked);
    };
    sync();

    window.addEventListener('resize', () => sync());
    const mq = window.matchMedia('(pointer: coarse)');
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', () => sync());
      portrait.addEventListener('change', () => sync());
    }
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'touch') {
          sync(true);
        }
      },
      { passive: true }
    );
  }

  public setMultiplayerState(state: MultiplayerState): void {
    this.mpState = state;
    this.refreshTopHud();
    this.refreshRoomDialog?.();
    if (this.wishModalOpen) {
      this.openWishModal();
    }
  }

  public setWishReadyState(localReady: WishReadyInfo | null, remoteReady: WishReadyInfo | null): void {
    this.localWishReady = localReady;
    this.remoteWishReady = remoteReady;
    if (this.wishModalOpen) {
      this.openWishModal();
    }
  }

  public setRoomKrathongState(state: RoomKrathongState): void {
    this.roomKrathong = state;
    if (state.ownerSlot === null) {
      let changed = false;
      for (let i = 0; i < this.inventorySlots.length; i++) {
        if (this.inventorySlots[i]?.kind === 'krathong') {
          this.inventorySlots[i] = null;
          if (this.equippedSlot === i) {
            this.equippedSlot = null;
          }
          changed = true;
        }
      }
      if (changed) {
        this.renderInventoryDock();
      }
    }
    this.refreshTopHud();
    this.setNearbyZone(this.nearbyZone);
    if (this.krathongShopOpen) {
      this.openKrathongShopModal();
    }
  }

  public setPierWaitState(state: PierWaitState): void {
    this.pierWait = state;
    this.refreshPierWaitBar();
    this.setNearbyZone(this.nearbyZone);
  }

  public openWishScreenFromWorld(): void {
    if (this.ceremonyPhase !== 'idle') return;
    this.openWishModal();
  }

  private refreshPierWaitBar(): void {
    if (!this.pierWait.localWaiting || this.wishModalOpen || this.ceremonyPhase !== 'idle') {
      this.pierWaitBar.classList.add('hidden');
      this.pierWaitBar.innerHTML = '';
      return;
    }

    const partnerName =
      this.mpState.partnerName ?? this.world.couple.getRemoteChar().getConfig().name;
    const isOnlineConnected = this.mpState.mode !== 'offline' && this.mpState.connected;

    this.pierWaitBar.classList.remove('hidden');
    this.pierWaitBar.innerHTML = `
      <div style="font-size:14px; color:#ffe8a3; margin-bottom:8px;">
        ${
          isOnlineConnected
            ? `🪑 กำลังนั่งรอ <strong>${this.escapeHtml(partnerName)}</strong> เดินมาที่ท่าน้ำลอยกระทง...`
            : '🪑 กำลังนั่งรอคู่ของคุณเข้าห้องมาที่ท่าน้ำ...'
        }
      </div>
      <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        <button id="btn-stand-pier" class="btn btn-pill-sm">🚶 ลุกขึ้น</button>
        ${
          !isOnlineConnected
            ? `<button id="btn-solo-wish" class="btn btn-primary btn-pill-sm">✨ อธิษฐาน & ลอยคนเดียวก่อน</button>`
            : ''
        }
      </div>
    `;

    this.pierWaitBar.querySelector('#btn-stand-pier')!.addEventListener('click', () => {
      this.sound.playTap();
      this.world.standUpFromPier();
    });

    const soloBtn = this.pierWaitBar.querySelector('#btn-solo-wish');
    if (soloBtn) {
      soloBtn.addEventListener('click', () => {
        this.sound.playTap();
        this.openWishModal();
      });
    }
  }

  private refreshTopHud(): void {
    const dot = this.root.querySelector('#room-status-dot')!;
    const st = this.mpState;
    const k = KRATHONG_CATALOG.find((item) => item.id === this.roomKrathong.krathongId);
    this.krathongStatusChip.textContent =
      this.roomKrathong.ownerSlot && k
        ? `${k.icon} ${this.roomKrathong.ownerName ?? ''} ถือกระทงแล้ว`
        : '🪷 ยังไม่มีกระทง';

    if (st.mode === 'offline') {
      dot.textContent = '🌸';
      this.badgeText.textContent = this.myConfig.name;
      this.actionLeftBtn.textContent = '🌐 เล่น 2 คนออนไลน์';
    } else {
      const myName = this.myConfig.name;
      if (st.connected) {
        dot.textContent = '🟢';
        const partner = st.partnerName ?? this.world.couple.getRemoteChar().getConfig().name;
        this.badgeText.textContent = `ห้อง ${st.roomCode} (2/2 เต็ม) • ${myName} & ${partner}`;
        this.actionLeftBtn.textContent = '🚪 ห้อง';
      } else {
        dot.textContent = '🟡';
        this.badgeText.textContent = `ห้อง ${st.roomCode} (1/2 รอเพื่อน)`;
        this.actionLeftBtn.textContent = '📋 ชวนเพื่อน';
      }
    }
    this.desktopHintEl.textContent =
      'WASD เดิน • ลากหมุนกล้อง • กด 1-3 ถือของ';
  }

  private bindHudEvents(): void {
    this.root.querySelector('#btn-customize')!.addEventListener('click', () => {
      this.sound.playTap();
      this.openWelcomeLobby(false);
    });

    this.actionLeftBtn.addEventListener('click', () => {
      this.sound.playTap();
      this.openRoomManagerModal();
    });

    this.muteBtn.addEventListener('click', () => {
      const muted = this.sound.toggleMute();
      this.muteBtn.textContent = muted ? '🔇 ปิดเสียง' : '🎵 เพลง';
    });

    this.phoneFab.addEventListener('click', () => {
      this.sound.playTap();
      this.togglePhone();
    });

    window.addEventListener('keydown', (e) => {
      if (this.hudWrap.classList.contains('hidden')) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!this.modalBackdrop.classList.contains('hidden')) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        this.toggleInventorySlot(Number(e.key) - 1);
      }
    });

    this.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop && !this.modalBackdrop.querySelector('[data-room-busy]')) {
        this.closeModal();
      }
    });
  }

  private getInventoryCount(): number {
    return this.inventorySlots.filter((s) => s !== null).length;
  }

  private findFreeInventorySlot(): number {
    return this.inventorySlots.findIndex((s) => s === null);
  }

  private addItemToInventory(
    item: InventoryItem,
    animateHold = false,
    syncToWorld = true
  ): boolean {
    const idx = this.findFreeInventorySlot();
    if (idx === -1) {
      this.sound.playTap();
      this.showToast('🎒 ช่องเก็บของเต็มแล้ว (สูงสุด 3 ชิ้น) กดทิ้งของที่ถืออยู่ก่อนนะ');
      return false;
    }
    this.inventorySlots[idx] = item;
    this.equippedSlot = idx;
    if (syncToWorld) {
      this.applyEquippedSlotToWorld(animateHold);
    }
    this.renderInventoryDock();
    return true;
  }

  private toggleInventorySlot(index: number): void {
    if (this.ceremonyPhase !== 'idle' || this.pierWait.localWaiting) return;
    if (!this.inventorySlots[index] || this.equippedSlot === index) {
      this.equippedSlot = null;
      this.sound.playTap();
      this.world.clearLocalHeldItem();
      this.renderInventoryDock();
    } else {
      this.equippedSlot = index;
      this.applyEquippedSlotToWorld(false);
      this.renderInventoryDock();
    }
  }

  private clearPendingConsumeTimer(): void {
    if (this.consumeClearTimer !== null) {
      window.clearTimeout(this.consumeClearTimer);
      this.consumeClearTimer = null;
    }
  }

  private applyEquippedSlotToWorld(animateShopAction: boolean): void {
    this.clearPendingConsumeTimer();
    if (this.equippedSlot === null) {
      this.world.clearLocalHeldItem();
      return;
    }
    const item = this.inventorySlots[this.equippedSlot];
    if (!item) {
      this.world.clearLocalHeldItem();
      return;
    }
    if (item.kind === 'krathong') {
      this.world.equipLocalKrathong(item.id);
    } else {
      this.world.equipLocalShopItem(item.itemDef, animateShopAction);
    }
  }

  private useHeldItem(): void {
    if (this.equippedSlot === null) return;
    const idx = this.equippedSlot;
    const item = this.inventorySlots[idx];
    if (!item || item.kind === 'krathong') return;

    this.clearPendingConsumeTimer();
    this.world.equipLocalShopItem(item.itemDef, true);

    this.inventorySlots[idx] = null;
    this.equippedSlot = null;
    this.renderInventoryDock();

    if (this.krathongShopOpen) {
      this.openKrathongShopModal();
    } else if (this.foodDrinkModalCat) {
      this.openFoodDrinkModal(this.foodDrinkModalCat);
    }

    this.showToast(`${item.kind === 'drink' ? '🥤 ดื่ม' : '🍽️ กิน'}${item.name}หมดแล้ว!`);

    this.consumeClearTimer = window.setTimeout(() => {
      this.consumeClearTimer = null;
      if (this.equippedSlot === null) {
        this.world.clearLocalHeldItem();
      }
    }, 2100);
  }

  private discardHeldItem(): void {
    if (this.equippedSlot === null) return;
    const idx = this.equippedSlot;
    const item = this.inventorySlots[idx];
    if (!item) return;

    this.clearPendingConsumeTimer();
    this.inventorySlots[idx] = null;
    this.equippedSlot = null;
    this.sound.playTap();

    if (item.kind === 'krathong') {
      this.world.discardRoomKrathong();
      this.showToast(`🗑️ ทิ้ง${item.name}แล้ว (สามารถซื้อกระทงใหม่ได้)`);
    } else {
      this.world.clearLocalHeldItem();
      this.showToast(`🗑️ ทิ้ง${item.name}แล้ว`);
    }

    this.renderInventoryDock();
    if (this.krathongShopOpen) {
      this.openKrathongShopModal();
    } else if (this.foodDrinkModalCat) {
      this.openFoodDrinkModal(this.foodDrinkModalCat);
    }
  }

  private renderInventoryDock(): void {
    if (!this.inventoryDock) return;
    const held = this.equippedSlot !== null ? this.inventorySlots[this.equippedSlot] : null;
    const count = this.getInventoryCount();

    const heldBarHtml = held
      ? `
        <div class="held-action-bar glass-card">
          <span class="held-item-label">ถืออยู่: ${held.icon} ${this.escapeHtml(held.name)}</span>
          ${
            held.kind !== 'krathong'
              ? `<button type="button" id="btn-inv-use" class="btn-use-item">${
                  held.kind === 'drink' ? '🥤 ดื่ม' : '🍽️ กิน'
                }</button>`
              : ''
          }
          <button type="button" id="btn-inv-discard" class="btn-discard">🗑️ ทิ้ง</button>
        </div>
      `
      : '';

    const slotsHtml = this.inventorySlots
      .map((item, i) => {
        const isActive = this.equippedSlot === i && item !== null;
        return `
          <button type="button" class="inv-slot ${isActive ? 'active' : ''}" data-slot="${i}" title="${
            item ? `${item.name} (แตะเพื่อถือ/เก็บ)` : `ช่องเก็บของ ${i + 1} (ว่าง)`
          }">
            <span class="inv-slot-num">${i + 1}</span>
            <span class="inv-slot-icon">${item ? item.icon : '＋'}</span>
            <span class="inv-slot-name">${item ? this.escapeHtml(item.name) : 'ว่าง'}</span>
          </button>
        `;
      })
      .join('');

    this.inventoryDock.innerHTML = `
      ${heldBarHtml}
      <div class="inventory-bar glass-card">
        <span class="inv-count-pill">🎒 ${count}/3</span>
        ${slotsHtml}
      </div>
    `;

    this.inventoryDock.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.toggleInventorySlot(Number(btn.dataset.slot));
      });
    });

    const useBtn = this.inventoryDock.querySelector('#btn-inv-use');
    if (useBtn) {
      useBtn.addEventListener('click', () => this.useHeldItem());
    }

    const discardBtn = this.inventoryDock.querySelector('#btn-inv-discard');
    if (discardBtn) {
      discardBtn.addEventListener('click', () => this.discardHeldItem());
    }
  }

  private formatClockTime(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private refreshPhoneBadge(): void {
    const total = this.unreadChatCount + this.unreadBankCount;
    if (total > 0) {
      this.phoneFabBadge.textContent = total > 9 ? '9+' : String(total);
      this.phoneFabBadge.classList.remove('hidden');
    } else {
      this.phoneFabBadge.textContent = '0';
      this.phoneFabBadge.classList.add('hidden');
    }
  }

  private togglePhone(): void {
    if (this.phoneOpen) {
      this.closePhone();
    } else {
      this.openPhone();
    }
  }

  private openPhone(screen?: 'home' | 'chat' | 'bank'): void {
    if (screen) {
      this.phoneScreen = screen;
    }
    this.phoneOpen = true;
    this.phoneShell.classList.remove('hidden');
    this.renderPhone();
  }

  private closePhone(): void {
    this.phoneOpen = false;
    this.phoneShell.classList.add('hidden');
    this.phoneShell.innerHTML = '';
  }

  private showPhoneNotification(targetApp: 'chat' | 'bank', title: string, body: string): void {
    this.sound.playPhoneNotify();

    this.phoneFab.classList.remove('phone-fab-ring');
    void this.phoneFab.offsetWidth;
    this.phoneFab.classList.add('phone-fab-ring');

    if (this.notifDismissTimer !== null) {
      window.clearTimeout(this.notifDismissTimer);
      this.notifDismissTimer = null;
    }

    const icon = targetApp === 'chat' ? '💬' : '🏦';
    this.phoneNotifHost.innerHTML = `
      <button type="button" class="phone-notif-banner pointer-auto">
        <span class="phone-notif-icon">${icon}</span>
        <span class="phone-notif-body">
          <span class="phone-notif-title">${this.escapeHtml(title)}</span>
          <span class="phone-notif-text">${this.escapeHtml(body)}</span>
        </span>
        <span class="phone-notif-cta">เปิดดู</span>
      </button>
    `;

    this.phoneNotifHost.querySelector('.phone-notif-banner')!.addEventListener('click', () => {
      this.sound.playTap();
      this.phoneNotifHost.innerHTML = '';
      if (this.notifDismissTimer !== null) {
        window.clearTimeout(this.notifDismissTimer);
        this.notifDismissTimer = null;
      }
      this.openPhone(targetApp);
    });

    this.notifDismissTimer = window.setTimeout(() => {
      this.phoneNotifHost.innerHTML = '';
      this.notifDismissTimer = null;
    }, 4200);
  }

  public handleIncomingPhoneChat(senderName: string, text: string): void {
    this.chatMessages.push({
      id: `${Date.now()}-${Math.random()}`,
      sender: 'partner',
      senderName,
      text,
      timestamp: Date.now()
    });

    if (this.phoneOpen && this.phoneScreen === 'chat') {
      this.sound.playPhoneNotify();
      this.renderPhone();
      return;
    }

    this.unreadChatCount += 1;
    this.refreshPhoneBadge();
    if (this.phoneOpen) {
      this.renderPhone();
    }
    this.showPhoneNotification('chat', `💬 ${senderName}`, text);
  }

  public handleIncomingBankTransfer(senderName: string, amount: number, note?: string): void {
    const title = note ? `รับโอนจาก ${senderName} (${note})` : `รับโอนจาก ${senderName}`;
    this.creditBank(amount, title, '💸', false);

    if (!(this.phoneOpen && this.phoneScreen === 'bank')) {
      this.unreadBankCount += 1;
      this.refreshPhoneBadge();
    }
    if (this.phoneOpen) {
      this.renderPhone();
    }
    this.showPhoneNotification(
      'bank',
      '🏦 ลอยกระทงแบงก์',
      `${senderName} โอนเงินให้คุณ +฿${amount.toLocaleString()}`
    );
  }

  private spendFromBank(amount: number, title: string, icon: string): boolean {
    if (this.bankBalance < amount) {
      this.sound.playTap();
      this.showToast(
        `💸 เงินในธนาคารไม่พอ! (มี ฿${this.bankBalance.toLocaleString()} / ราคา ฿${amount.toLocaleString()})`
      );
      return false;
    }
    this.bankBalance -= amount;
    this.bankHistory.unshift({
      id: `${Date.now()}-${Math.random()}`,
      title,
      icon,
      amount: -amount,
      timestamp: Date.now()
    });
    if (this.phoneOpen) {
      this.renderPhone();
    }
    return true;
  }

  private creditBank(amount: number, title: string, icon: string, playSound = true): void {
    if (playSound) {
      this.sound.playCoinTransfer();
    }
    this.bankBalance += amount;
    this.bankHistory.unshift({
      id: `${Date.now()}-${Math.random()}`,
      title,
      icon,
      amount,
      timestamp: Date.now()
    });
    if (this.phoneOpen) {
      this.renderPhone();
    }
    if (this.krathongShopOpen) {
      this.openKrathongShopModal();
    } else if (this.foodDrinkModalCat) {
      this.openFoodDrinkModal(this.foodDrinkModalCat);
    }
  }

  private renderPhone(): void {
    if (!this.phoneOpen) return;

    if (this.phoneScreen === 'chat') {
      this.unreadChatCount = 0;
      this.refreshPhoneBadge();
    } else if (this.phoneScreen === 'bank') {
      this.unreadBankCount = 0;
      this.refreshPhoneBadge();
    }

    const nowText = this.formatClockTime(Date.now());
    const st = this.mpState;
    const partnerName = st.partnerName ?? this.world.couple.getRemoteChar().getConfig().name;
    const isConnected = st.mode !== 'offline' && st.connected;

    let bodyHtml = '';
    if (this.phoneScreen === 'home') {
      bodyHtml = `
        <div class="phone-app-header">
          <span class="phone-app-title">📱 ${this.escapeHtml(this.myConfig.name)}</span>
          <span class="phone-online-pill ${isConnected ? 'online' : ''}">
            ${isConnected ? `🟢 ${this.escapeHtml(partnerName)}` : '🌙 ออฟไลน์'}
          </span>
        </div>

        <div class="phone-app-grid" style="margin-top:12px;">
          <button type="button" id="phone-open-chat" class="phone-app-tile">
            <span class="phone-tile-icon" style="background:linear-gradient(135deg,#ff7aa8,#ff9e7d);">💬</span>
            <span class="phone-tile-label">แชทหาคู่</span>
            ${
              this.unreadChatCount > 0
                ? `<span class="phone-tile-badge">${this.unreadChatCount}</span>`
                : ''
            }
          </button>

          <button type="button" id="phone-open-bank" class="phone-app-tile">
            <span class="phone-tile-icon" style="background:linear-gradient(135deg,#ffd573,#e69d38);">🏦</span>
            <span class="phone-tile-label">ธนาคาร</span>
            ${
              this.unreadBankCount > 0
                ? `<span class="phone-tile-badge">${this.unreadBankCount}</span>`
                : ''
            }
          </button>
        </div>
      `;
    } else if (this.phoneScreen === 'chat') {
      const chatListHtml =
        this.chatMessages.length === 0
          ? `<div class="phone-empty-chat">ยังไม่มีข้อความ 💬<br/>พิมพ์ทักทาย ${this.escapeHtml(partnerName)} ได้เลย!</div>`
          : this.chatMessages
              .map(
                (m) => `
              <div class="phone-msg-row ${m.sender}">
                ${
                  m.sender === 'partner'
                    ? `<div class="phone-msg-sender">${this.escapeHtml(m.senderName)}</div>`
                    : ''
                }
                <div class="phone-msg-bubble">${this.escapeHtml(m.text)}</div>
                <div class="phone-msg-time">${this.formatClockTime(m.timestamp)}</div>
              </div>
            `
              )
              .join('');

      bodyHtml = `
        <div class="phone-app-header">
          <button type="button" id="phone-back-home" class="phone-back-btn">‹</button>
          <div style="flex:1; min-width:0;">
            <div class="phone-app-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              💬 ${this.escapeHtml(partnerName)}
            </div>
            <div style="font-size:10px; color:${isConnected ? '#94f2b8' : '#ffd573'};">
              ${isConnected ? '● ออนไลน์ — ส่งถึงคู่ทันทีพร้อมแจ้งเตือน' : '● ยังไม่ได้เชื่อมต่อห้อง 2 คน'}
            </div>
          </div>
        </div>

        <div id="phone-chat-list" class="phone-chat-list">${chatListHtml}</div>

        <div class="phone-quick-row">
          ${PHONE_QUICK_CHAT_CHIPS.map(
            (q) => `<button type="button" class="phone-quick-chip" data-pchip="${this.escapeHtml(q)}">${q}</button>`
          ).join('')}
        </div>

        <div class="phone-chat-composer">
          <input id="phone-chat-input" class="text-input phone-chat-input" maxlength="80" placeholder="พิมพ์ข้อความหาคู่..." />
          <button type="button" id="phone-chat-send" class="btn btn-primary phone-send-btn">ส่ง</button>
        </div>
      `;
    } else {
      const txHtml = this.bankHistory
        .slice(0, 12)
        .map(
          (tx) => `
          <div class="phone-tx-item">
            <span class="phone-tx-icon">${tx.icon}</span>
            <div class="phone-tx-info">
              <div class="phone-tx-title">${this.escapeHtml(tx.title)}</div>
              <div class="phone-tx-time">${this.formatClockTime(tx.timestamp)}</div>
            </div>
            <div class="phone-tx-amount ${tx.amount >= 0 ? 'pos' : 'neg'}">
              ${tx.amount >= 0 ? `+฿${tx.amount.toLocaleString()}` : `-฿${Math.abs(tx.amount).toLocaleString()}`}
            </div>
          </div>
        `
        )
        .join('');

      bodyHtml = `
        <div class="phone-app-header">
          <button type="button" id="phone-back-home" class="phone-back-btn">‹</button>
          <span class="phone-app-title" style="flex:1;">🏦 ลอยกระทงแบงก์</span>
        </div>

        <div class="phone-bank-card">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#f2e2b6;">
            <span>บัญชี: ${this.escapeHtml(this.myConfig.name)}</span>
            <span>🪷 KrathongPay</span>
          </div>
          <div style="font-family:'Mali',sans-serif; font-size:26px; font-weight:700; color:#ffd573; margin:6px 0 2px;">
            ฿${this.bankBalance.toLocaleString()}
          </div>
          <div style="font-size:10px; color:#d8d0ec;">ใช้ซื้อกระทง ขนม และน้ำในงานวัด</div>
        </div>

        <div class="phone-bank-actions">
          <div style="font-size:11px; color:#ffe6a3; margin-bottom:4px;">
            💸 โอนเงินให้ ${this.escapeHtml(partnerName)} ${isConnected ? '' : '(ต้องเข้าห้อง 2 คนก่อน)'}
          </div>
          <div style="display:flex; gap:6px;">
            ${[20, 50, 100]
              .map(
                (amt) =>
                  `<button type="button" class="btn btn-pill-sm phone-xfer-btn" data-xfer="${amt}" ${
                    isConnected ? '' : 'disabled'
                  }>฿${amt}</button>`
              )
              .join('')}
          </div>
        </div>

        <div style="font-size:11px; font-weight:600; color:#ffd573; margin:8px 0 4px;">
          📜 รายการเดินบัญชี
        </div>
        <div class="phone-tx-list">${txHtml}</div>
      `;
    }

    this.phoneShell.innerHTML = `
      <div class="phone-notch"></div>
      <div class="phone-status-bar">
        <span>${nowText}</span>
        <span>5G 🔋</span>
        <button type="button" id="phone-close-btn" class="phone-close-btn" title="ปิดมือถือ">✕</button>
      </div>
      <div class="phone-screen">${bodyHtml}</div>
      <div class="phone-home-bar"></div>
    `;

    this.phoneShell.querySelector('#phone-close-btn')!.addEventListener('click', () => {
      this.sound.playTap();
      this.closePhone();
    });

    const backBtn = this.phoneShell.querySelector('#phone-back-home');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.sound.playTap();
        this.openPhone('home');
      });
    }

    if (this.phoneScreen === 'home') {
      this.phoneShell.querySelector('#phone-open-chat')!.addEventListener('click', () => {
        this.sound.playTap();
        this.openPhone('chat');
      });
      this.phoneShell.querySelector('#phone-open-bank')!.addEventListener('click', () => {
        this.sound.playTap();
        this.openPhone('bank');
      });
    } else if (this.phoneScreen === 'chat') {
      const listEl = this.phoneShell.querySelector('#phone-chat-list') as HTMLElement;
      listEl.scrollTop = listEl.scrollHeight;

      const input = this.phoneShell.querySelector('#phone-chat-input') as HTMLInputElement;
      const sendMessage = (raw?: string) => {
        const val = (raw ?? input.value).trim();
        if (!val) return;
        this.chatMessages.push({
          id: `${Date.now()}-${Math.random()}`,
          sender: 'me',
          senderName: this.myConfig.name,
          text: val,
          timestamp: Date.now()
        });
        this.world.sendPhoneChat(val);
        this.renderPhone();
        const nextInput = this.phoneShell.querySelector('#phone-chat-input') as HTMLInputElement | null;
        nextInput?.focus();
      };

      this.phoneShell.querySelector('#phone-chat-send')!.addEventListener('click', () => sendMessage());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
      this.phoneShell.querySelectorAll<HTMLButtonElement>('[data-pchip]').forEach((b) => {
        b.addEventListener('click', () => sendMessage(b.dataset.pchip!));
      });
    } else if (this.phoneScreen === 'bank') {
      this.phoneShell.querySelectorAll<HTMLButtonElement>('[data-xfer]').forEach((b) => {
        b.addEventListener('click', () => {
          const amt = Number(b.dataset.xfer);
          if (!amt || !isConnected) return;
          if (!this.spendFromBank(amt, `โอนเงินให้ ${partnerName}`, '💸')) return;
          this.world.sendBankTransfer(amt, 'ซื้อขนมในงาน');
          this.sound.playCoinTransfer();
          this.showToast(`โอนเงิน ฿${amt} ให้ ${partnerName} แล้ว! 💸`);
        });
      });
    }
  }

  private bindJoystick(): void {
    const zone = this.root.querySelector('#joystick-zone') as HTMLElement;
    const knob = this.root.querySelector('#joystick-knob') as HTMLElement;
    let activeId: number | null = null;
    const maxR = 38;

    const updateStick = (clientX: number, clientY: number) => {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.world.setJoystickInput(dx / maxR, dy / maxR);
    };

    const resetStick = () => {
      activeId = null;
      knob.style.transform = 'translate(0, 0)';
      this.world.setJoystickInput(0, 0);
    };

    zone.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      activeId = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      updateStick(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activeId) return;
      updateStick(e.clientX, e.clientY);
    });
    zone.addEventListener('pointerup', (e) => {
      if (e.pointerId === activeId) resetStick();
    });
    zone.addEventListener('pointercancel', (e) => {
      if (e.pointerId === activeId) resetStick();
    });
    zone.addEventListener('lostpointercapture', (e) => {
      if (e.pointerId === activeId) resetStick();
    });
  }

  public setNearbyZone(zone: InteractiveZone | null): void {
    this.nearbyZone = zone;
    if (!zone || this.ceremonyPhase !== 'idle' || this.pierWait.localWaiting) {
      this.contextBtnWrap.classList.add('hidden');
      this.contextBtnWrap.innerHTML = '';
      return;
    }

    if (zone.id === 'pier') {
      const hasKrathong = this.roomKrathong.ownerSlot !== null;
      this.contextBtnWrap.classList.remove('hidden');
      if (!hasKrathong) {
        this.contextBtnWrap.innerHTML = `
          <button class="btn context-cta" id="btn-context-open" style="background:rgba(48,28,32,0.92); border-color:#ff9e7d; color:#ffd6b8;">
            🪷 ยังไม่มีกระทง — กรุณาเดินไปซื้อที่ร้านขายกระทงก่อน!
          </button>
        `;
        this.contextBtnWrap.querySelector('#btn-context-open')!.addEventListener('click', () => {
          this.sound.playTap();
          this.showToast('🪷 เดินไปซื้อกระทงที่ร้านขายกระทงก่อนนะ (ซื้อได้ 1 คนในห้อง)');
        });
      } else {
        this.contextBtnWrap.innerHTML = `
          <button class="btn btn-gold context-cta" id="btn-context-open">
            🪑 นั่งรอลอยกระทงที่ท่าน้ำ
          </button>
        `;
        this.contextBtnWrap.querySelector('#btn-context-open')!.addEventListener('click', () => {
          this.world.sitAtPierToWait();
        });
      }
      return;
    }

    this.contextBtnWrap.classList.remove('hidden');
    this.contextBtnWrap.innerHTML = `
      <button class="btn btn-gold context-cta" id="btn-context-open">
        ${zone.actionLabel}
      </button>
    `;
    this.contextBtnWrap.querySelector('#btn-context-open')!.addEventListener('click', () => {
      this.sound.playTap();
      this.openZoneModal(zone.id);
    });
  }

  public setCeremonyPhase(phase: 'idle' | 'praying' | 'watching', payload?: WishPayload): void {
    this.ceremonyPhase = phase;
    if (payload) {
      this.lastCeremonyPayload = payload;
    }
    if (phase === 'idle') {
      this.hudWrap.classList.remove('hidden');
      this.ceremonyWrap.classList.add('hidden');
      this.ceremonyWrap.innerHTML = '';
      this.setNearbyZone(this.nearbyZone);
      return;
    }

    this.closeModal();
    if (this.phoneOpen) this.closePhone();
    this.pierWaitBar.classList.add('hidden');
    this.hudWrap.classList.add('hidden');
    this.contextBtnWrap.classList.add('hidden');
    this.ceremonyWrap.classList.remove('hidden');

    const activePayload = this.lastCeremonyPayload;
    const namesLabel = activePayload
      ? activePayload.solo
        ? activePayload.names[0]
        : `${activePayload.names[0]} & ${activePayload.names[1]}`
      : `${this.world.couple.char1.getConfig().name} & ${this.world.couple.char2.getConfig().name}`;

    if (phase === 'praying') {
      this.ceremonyWrap.innerHTML = `
        <div class="ceremony-banner glass-card pointer-auto">
          <div style="font-family: 'Mali', sans-serif; font-size: 18px; color: #ffd573;">
            🙏 กำลังพนมมืออธิษฐานและปล่อยกระทง...
          </div>
          ${this.renderWishRectBoxesHtml(activePayload)}
        </div>
      `;
    } else {
      this.renderWatchingHud(namesLabel, activePayload);
    }
  }

  private renderWishRectBoxesHtml(payload: WishPayload | null): string {
    if (!payload) return '';
    const entries = payload.solo
      ? [{ name: payload.names[0], wish: payload.wish1 }]
      : [
          { name: payload.names[0], wish: payload.wish1 },
          { name: payload.names[1], wish: payload.wish2 }
        ];

    return `
      <div class="wish-boxes-row">
        ${entries
          .map(
            (e) => `
          <div class="wish-rect-box">
            <div class="wish-rect-name">🪷 ${this.escapeHtml(e.name)}</div>
            <div class="wish-rect-text">"${this.escapeHtml(e.wish)}"</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderWatchingHud(namesLabel: string, payload: WishPayload | null): void {
    const camIsKrathong = this.world.getCameraMode() === 'watch_krathong';
    this.ceremonyWrap.innerHTML = `
      <div class="ceremony-banner glass-card pointer-auto">
        <div style="font-family: 'Mali', sans-serif; font-size: 17px; color: #ffd573;">
          🪷 กระทงของ ${this.escapeHtml(namesLabel)} กำลังลอยสู่สายน้ำ
        </div>
        ${this.renderWishRectBoxesHtml(payload)}
      </div>

      <div class="ceremony-controls pointer-auto">
        <button id="btn-cam-toggle" class="btn btn-primary">
          ${camIsKrathong ? '💑 ดูตัวละครบนสะพาน' : '👀 ตามดูกระทงลอย'}
        </button>
        <button id="btn-sky-lantern" class="btn">🏮 ปล่อยโคมลอย</button>
        <button id="btn-firework" class="btn">🎆 จุดพลุฉลอง</button>
        <button id="btn-postcard" class="btn btn-gold">📸 บันทึกภาพ</button>
        <button id="btn-back-fair" class="btn">🚶 กลับเดินเล่นงานวัด</button>
      </div>
    `;

    this.ceremonyWrap.querySelector('#btn-cam-toggle')!.addEventListener('click', () => {
      this.sound.playTap();
      const next =
        this.world.getCameraMode() === 'watch_krathong' ? 'pier_ceremony' : 'watch_krathong';
      this.world.setCameraMode(next);
      this.renderWatchingHud(namesLabel, payload);
    });

    this.ceremonyWrap.querySelector('#btn-sky-lantern')!.addEventListener('click', () => {
      if (this.world.launchSkyLanterns()) this.showToast('ปล่อยโคมลอยขึ้นสู่ท้องฟ้าแล้ว 🏮✨');
    });

    this.ceremonyWrap.querySelector('#btn-firework')!.addEventListener('click', () => {
      this.world.launchFireworks();
    });

    this.ceremonyWrap.querySelector('#btn-postcard')!.addEventListener('click', () => {
      this.sound.playBuy();
      this.world.capturePostcard(this.lastWishText, namesLabel);
      this.showToast('บันทึกภาพความทรงจำแล้ว 📸💖');
    });

    this.ceremonyWrap.querySelector('#btn-back-fair')!.addEventListener('click', () => {
      this.sound.playTap();
      this.world.returnToTempleFair();
    });
  }

  public openWelcomeLobby(isFirstLaunch: boolean): void {
    this.world.setCustomizeCloseup(true);
    this.hudWrap.classList.add('hidden');
    this.welcomeWrap.classList.remove('hidden');

    const urlRoom = new URLSearchParams(window.location.search).get('room') ?? '';
    let roomInputVal = urlRoom.toUpperCase();
    let roomError = '';
    let busyMsg = '';

    const tabs = { profile: 'ตัวละคร', hair: 'ทรงผม', outfit: 'เสื้อผ้า', gear: 'ของแต่ง' };
    type Category = keyof typeof tabs;
    let custTab: Category = isFirstLaunch ? 'profile' : 'hair';
    let playing = isFirstLaunch && Boolean(roomInputVal);
    let stageObserver: ResizeObserver | undefined;

    const choices = (label: string, key: string, current: string | undefined,
      items: {id: string; label: string}[]) => `
      <fieldset><legend>${label}</legend><div class="studio-options ${key === 'hair' || key === 'outfit' ? 'hair-options' : ''}">
      ${items.map((item, index) => `<button type="button" data-${key}="${item.id}" aria-pressed="${item.id === current}">
        ${key === 'hair' ? `<span class="hair-thumb" aria-hidden="true" style="background-position:${index%5*25}% ${Math.floor(index/5)*100}%"></span>` : ''}
        ${key === 'outfit' ? `<span class="outfit-thumb" aria-hidden="true" style="background-position:${index*50}% ${this.myConfig.gender === 'male' ? 100 : 0}%"></span>` : ''}
        <span>${item.label}</span></button>`).join('')}</div></fieldset>`;
    const colors = (label: string, key: string, current: string,
      items: {color:string;label:string;accent?:string}[]) => `
      <fieldset><legend>${label} <small>${items.find(item => item.color === current)?.label ?? ''}</small></legend>
        <div class="studio-colors">${items.map(item => `<button data-${key}="${item.color}" ${item.accent ? `data-oacc="${item.accent}"` : ''}
          aria-label="${item.label}" title="${item.label}" aria-pressed="${item.color === current}" style="--swatch:${item.color}"></button>`).join('')}</div>
      </fieldset>`;

    const render = () => {
      stageObserver?.disconnect();
      const previous = this.welcomeWrap.querySelector('.studio-content');
      const scroll = previous?.getAttribute('data-page') === (playing ? 'play' : custTab) ? previous.scrollTop : 0;
      const focused = document.activeElement as HTMLElement | null;
      const focusKey = focused && this.welcomeWrap.contains(focused) ? Object.keys(focused.dataset)[0] : undefined;
      const cfg = this.myConfig;
      const pages = {
        profile: `<label for="cust-name" class="studio-label">ชื่อตัวละคร</label>
          <input id="cust-name" class="text-input" maxlength="12" value="${this.escapeHtml(cfg.name)}" placeholder="ชื่อเล่น">
          ${choices('ตัวละครต้นแบบ','gender',cfg.gender,[{id:'female',label:'ผู้หญิง'},{id:'male',label:'ผู้ชาย'}])}
          ${colors('สีผิว','skin',cfg.skinTone,SKIN_TONES)}`,
        hair: `${colors('สีผม','hcol',cfg.hairColor,HAIR_COLORS)}${choices('เลือกทรงผม','hair',cfg.hairStyle,HAIR_STYLES)}`,
        outfit: `${choices('แบบชุด','outfit',cfg.outfitStyle,OUTFIT_STYLES[cfg.gender ?? 'female'])}${colors('สีชุด','ocol',cfg.outfitColor,OUTFIT_COLORS)}`,
        gear: `${choices('หมวกและที่คาดผม','hat',cfg.hat,HAT_STYLES)}${choices('แว่นตา','glasses',cfg.glasses,GLASSES_STYLES)}
          ${choices('เครื่องประดับ','acc',cfg.accessory,ACCESSORY_STYLES)}`
      };
      this.welcomeWrap.innerHTML = `
        <div class="studio-stage"><span class="studio-game">ลอยกระทงกับ 2 เรา</span><span class="studio-orbit">↔ ลากเพื่อหมุนดู</span></div>
        <section class="studio-panel pointer-auto" aria-labelledby="studio-title">
          <header class="studio-heading"><h1 id="studio-title">${playing ? 'เข้างานวัด' : 'ห้องแต่งตัว'}</h1>
          ${playing ? `<button data-edit ${busyMsg?'disabled':''}>‹ กลับไปแต่งตัว</button>` : ''}</header>
          ${playing ? '' : `<nav aria-label="หมวดแต่งตัว" class="studio-tabs">${Object.entries(tabs).map(([id,label]) =>
            `<button data-ctab="${id}" aria-pressed="${custTab === id}">${label}</button>`).join('')}</nav>`}
          <div class="studio-content" data-page="${playing ? 'play' : custTab}">
          ${playing ? `<fieldset><legend>เล่นกับเพื่อน <small>2 คน</small></legend>
            <button class="studio-room" id="btn-create-room" ${busyMsg?'disabled':''}>สร้างห้องใหม่ <span>＋</span></button></fieldset>
            <label for="room-code-input" class="studio-label">เข้าห้องของเพื่อน</label>
            <form class="studio-join"><input id="room-code-input" class="text-input" maxlength="5" placeholder="รหัสห้อง 5 ตัว" autocomplete="off"
              value="${this.escapeHtml(roomInputVal)}" ${busyMsg?'disabled':''}>
            <button id="btn-join-room" type="submit" ${busyMsg?'disabled':''}>เข้าห้อง</button></form>
            <p class="studio-status" role="status">${this.escapeHtml(roomError || busyMsg)}</p>` : pages[custTab]}
          </div>
          <footer class="studio-footer"><button class="studio-primary" id="${playing?'btn-enter-offline':isFirstLaunch?'btn-play-options':'btn-save-close'}" ${busyMsg?'disabled':''}>
            ${playing?'เล่นคนเดียว':isFirstLaunch?'เลือกโหมดเล่น':'บันทึกและกลับเข้างานวัด'} <span aria-hidden="true">→</span></button></footer>
        </section>`;
      const stage = this.welcomeWrap.querySelector<HTMLElement>('.studio-stage')!;
      const frame = () => this.world.frameDressingRoom(stage.getBoundingClientRect());
      stageObserver = new ResizeObserver(frame);
      stageObserver.observe(stage);
      frame();
      this.welcomeWrap.querySelector('.studio-content')!.scrollTop = scroll;
      if (focusKey && focused) {
        const next = Array.from(this.welcomeWrap.querySelectorAll<HTMLElement>('button')).find(el =>
          el.dataset[focusKey] !== undefined && el.dataset[focusKey] === focused.dataset[focusKey]);
        next?.focus({preventScroll:true});
      }
      this.welcomeWrap.querySelector('#btn-play-options')?.addEventListener('click', () => {
        playing = true; render(); this.welcomeWrap.querySelector<HTMLButtonElement>('[data-edit]')?.focus();
      });
      this.welcomeWrap.querySelector('[data-edit]')?.addEventListener('click', () => {
        playing = false; render(); this.welcomeWrap.querySelector<HTMLButtonElement>('[data-ctab][aria-pressed="true"]')?.focus();
      });

      const applyLive = () => {
        this.world.updateMyConfig(this.myConfig);
        this.refreshTopHud();
      };

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-gender]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          const g = b.dataset.gender as GenderId;
          if (this.myConfig.gender === g) return;
          this.myConfig = { ...this.myConfig, ...GENDER_PRESETS[g], gender: g };
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-ctab]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          custTab = b.dataset.ctab as Category;
          render();
        });
      });

      const nameInput = this.welcomeWrap.querySelector('#cust-name') as HTMLInputElement | null;
      if (nameInput) {
        nameInput.addEventListener('input', () => {
          this.myConfig.name = nameInput.value.trim() || 'นักเดินทาง';
          applyLive();
        });
      }

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-hair]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.hairStyle = b.dataset.hair as CharacterConfig['hairStyle'];
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-hcol]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.hairColor = b.dataset.hcol!;
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-outfit]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.outfitStyle = b.dataset.outfit as CharacterConfig['outfitStyle'];
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-ocol]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.outfitColor = b.dataset.ocol!;
          this.myConfig.accentColor = b.dataset.oacc!;
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.skinTone = b.dataset.skin!;
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-hat]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.hat = b.dataset.hat as CharacterConfig['hat'];
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-glasses]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.glasses = b.dataset.glasses as CharacterConfig['glasses'];
          applyLive();
          render();
        });
      });

      this.welcomeWrap.querySelectorAll<HTMLButtonElement>('[data-acc]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          this.myConfig.accessory = b.dataset.acc as CharacterConfig['accessory'];
          applyLive();
          render();
        });
      });

      const enterWorld = () => {
        stageObserver?.disconnect();
        this.welcomeWrap.classList.add('hidden');
        this.welcomeWrap.innerHTML = '';
        this.world.setCustomizeCloseup(false);
        this.hudWrap.classList.remove('hidden');
        this.refreshTopHud();
      };

      if (playing) {
        const roomIn = this.welcomeWrap.querySelector('#room-code-input') as HTMLInputElement;
        roomIn.addEventListener('input', () => {
          roomInputVal = roomIn.value.toUpperCase();
        });

        this.welcomeWrap.querySelector('#btn-create-room')!.addEventListener('click', async () => {
          this.sound.playTap();
          roomError = '';
          busyMsg = 'กำลังสร้างห้องออนไลน์...';
          render();
          try {
            const code = await this.world.createOnlineRoom(this.myConfig);
            busyMsg = '';
            enterWorld();
            this.openRoomManagerModal();
            this.showToast(`สร้างห้อง ${code} สำเร็จ! ส่งลิงก์ให้เพื่อนได้เลย 🏮`);
          } catch (err) {
            busyMsg = '';
            roomError = err instanceof Error ? err.message : 'สร้างห้องไม่สำเร็จ';
            render();
          }
        });

        this.welcomeWrap.querySelector('.studio-join')!.addEventListener('submit', async (event) => {
          event.preventDefault();
          if (busyMsg) return;
          this.sound.playTap();
          roomError = '';
          busyMsg = `กำลังเข้าห้อง ${roomInputVal}...`;
          render();
          try {
            await this.world.joinOnlineRoom(roomInputVal, this.myConfig);
            busyMsg = '';
            enterWorld();
          } catch (err) {
            busyMsg = '';
            roomError = err instanceof Error ? err.message : 'เข้าห้องไม่สำเร็จ';
            render();
          }
        });

        this.welcomeWrap.querySelector('#btn-enter-offline')!.addEventListener('click', () => {
          this.sound.playBuy();
          enterWorld();
          this.showToast('เข้าสู่งานวัดคืนวันเพ็ญแล้ว! 🌸');
        });
      } else if (!isFirstLaunch) {
        this.welcomeWrap.querySelector('#btn-save-close')!.addEventListener('click', () => {
          this.sound.playBuy();
          enterWorld();
        });
      }
    };

    render();
  }

  private openRoomManagerModal(): void {
    let joinInput = '';
    let roomError = '';
    let busyMsg = '';

    const render = () => {
      const st = this.mpState;
      this.modalBackdrop.classList.remove('hidden');

      if (st.mode === 'offline') {
        this.refreshRoomDialog = null;
        this.modalBackdrop.innerHTML = `
          <div class="modal-panel" ${busyMsg ? 'data-room-busy' : ''}>
            <div class="modal-header">
              <h2 class="modal-title">🌐 เล่นออนไลน์ 2 คน (คนละไวไฟ)</h2>
              <button class="btn btn-pill-sm" id="modal-close" ${busyMsg ? 'disabled' : ''}>✕</button>
            </div>
            <p style="font-size:13px; color:var(--text-muted); margin-top:0;">
              สร้างห้อง (เซิร์ฟเต็ม 2 คน) แล้วส่งลิงก์หรือรหัสให้แฟน/เพื่อน เข้ามาเดินแยกกันคนละเครื่องได้เลย!
            </p>
            <button id="m-create" class="btn btn-gold" style="width:100%;" ${busyMsg ? 'disabled' : ''}>
              🏠 สร้างห้องใหม่ (รับสูงสุด 2 คน)
            </button>
            <form id="m-join-form" class="room-join-row" style="margin-top:12px;">
              <input id="m-join-code" class="text-input" maxlength="5" placeholder="ใส่รหัสห้อง 5 ตัว..." aria-label="รหัสห้อง" value="${this.escapeHtml(joinInput)}" style="text-transform:uppercase; flex:1;" ${busyMsg ? 'disabled' : ''} />
              <button id="m-join" class="btn btn-primary" type="submit" ${busyMsg ? 'disabled' : ''}>🔑 เข้าห้อง</button>
            </form>
            ${busyMsg ? `<div style="margin-top:8px; font-size:13px; color:#ffe6a3;">⏳ ${busyMsg}</div>` : ''}
            ${roomError ? `<div class="room-error">⚠️ ${this.escapeHtml(roomError)}</div>` : ''}
          </div>
        `;

        this.modalBackdrop.querySelector('#modal-close')!.addEventListener('click', () => this.closeModal());
        const inEl = this.modalBackdrop.querySelector('#m-join-code') as HTMLInputElement;
        inEl.addEventListener('input', () => {
          joinInput = inEl.value.toUpperCase();
        });

        this.modalBackdrop.querySelector('#m-create')!.addEventListener('click', async () => {
          busyMsg = 'กำลังสร้างห้อง...';
          roomError = '';
          render();
          try {
            await this.world.createOnlineRoom(this.myConfig);
            busyMsg = '';
            render();
          } catch (err) {
            busyMsg = '';
            roomError = err instanceof Error ? err.message : 'สร้างห้องไม่สำเร็จ';
            render();
          }
        });

        this.modalBackdrop.querySelector('#m-join-form')!.addEventListener('submit', async (event) => {
          event.preventDefault();
          if (busyMsg) return;
          busyMsg = 'กำลังเชื่อมต่อห้อง...';
          roomError = '';
          render();
          try {
            await this.world.joinOnlineRoom(joinInput, this.myConfig);
            busyMsg = '';
            this.closeModal();
          } catch (err) {
            busyMsg = '';
            roomError = err instanceof Error ? err.message : 'เข้าห้องไม่สำเร็จ';
            render();
          }
        });
      } else {
        this.refreshRoomDialog = render;
        const inviteUrl = this.world.net.getInviteUrl();
        const localAddress = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        this.modalBackdrop.innerHTML = `
          <div class="modal-panel" style="text-align:center;">
            <div class="modal-header">
              <h2 class="modal-title">🏮 ห้องออนไลน์ (${st.playerCount}/2 คน)</h2>
              <button class="btn btn-pill-sm" id="modal-close">✕</button>
            </div>

            <div style="margin:10px 0;">
              <div style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">รหัสห้องของคุณ</div>
              <span class="room-code-pill">${st.roomCode}</span>
            </div>

            <div style="font-size:14px; margin:12px 0; color:${st.connected ? '#94f2b8' : '#ffd573'};">
              ${
                st.connected
                  ? `🟢 เซิร์ฟเต็มแล้ว (2/2 คน) • เพื่อน: ${this.escapeHtml(st.partnerName ?? 'เพื่อนรัก')}`
                  : '🟡 กำลังรอเพื่อนคนที่ 2 เข้าห้อง... (แชร์ลิงก์ด้านล่างให้เพื่อนได้เลย)'
              }
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button id="m-copy-link" class="btn btn-primary" style="flex:1;">📋 คัดลอกลิงก์ชวนเพื่อน</button>
              <button id="m-copy-code" class="btn btn-gold">📄 คัดลอกรหัส</button>
            </div>
            ${localAddress ? '<p class="room-error">ลิงก์ localhost เปิดได้บนเครื่องนี้เท่านั้น ให้เพื่อนเข้า URL ของเซิร์ฟเวอร์เกมแล้วใช้รหัสด้านบน</p>' : ''}

            <button id="m-leave" class="btn" style="width:100%; margin-top:12px; border-color:rgba(255,130,150,0.45); color:#ffb3c1;">
              🚪 ออกจากห้องออนไลน์
            </button>
          </div>
        `;

        this.modalBackdrop.querySelector('#modal-close')!.addEventListener('click', () => this.closeModal());
        this.modalBackdrop.querySelector('#m-copy-link')!.addEventListener('click', () => {
          void this.copyRoomInvite(inviteUrl, 'คัดลอกลิงก์ชวนเพื่อนแล้ว');
        });
        this.modalBackdrop.querySelector('#m-copy-code')!.addEventListener('click', () => {
          if (st.roomCode) void this.copyRoomInvite(st.roomCode, `คัดลอกรหัสห้อง ${st.roomCode} แล้ว`);
        });
        this.modalBackdrop.querySelector('#m-leave')!.addEventListener('click', () => {
          this.sound.playTap();
          this.world.leaveOnlineRoom();
          this.closeModal();
          this.showToast('ออกจากห้องออนไลน์แล้ว');
        });
      }
    };

    render();
  }

  private async copyRoomInvite(value: string, copied: string): Promise<void> {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value);
        this.showToast(copied);
        return;
      } catch { /* Let players select and copy when clipboard access is unavailable. */ }
    }
    window.prompt('คัดลอกแล้วส่งให้เพื่อน', value);
  }

  public openZoneModal(zoneId: InteractiveZone['id']): void {
    if (zoneId === 'krathong_shop') this.openKrathongShopModal();
    else if (zoneId === 'snack_shop') this.openFoodDrinkModal('snack');
    else if (zoneId === 'drink_shop') this.openFoodDrinkModal('drink');
    else if (zoneId === 'fortune_booth') this.openFortuneModal();
    else if (zoneId === 'pier') this.openWishModal();
    else if (zoneId === 'ferris_wheel') this.world.boardFerrisWheel();
    else if (zoneId === 'npc_quest') this.openFestivalQuest();
  }

  public setQuestStation(station: QuestStation | null): void {
    this.questTracker.classList.toggle('hidden', !station);
    this.questTracker.textContent = station ? `❗ เควสของคุณ · ${station.name} · ${station.landmark}` : '';
  }

  private openFestivalQuest(): void {
    const quest = this.world.getNearbyQuest();
    if (!quest) return;
    this.closeModal();
    const { station, puzzle } = quest;
    this.modalBackdrop.classList.remove('hidden');
    this.modalBackdrop.innerHTML = `
      <section class="modal-panel quest-panel" role="dialog" aria-modal="true" aria-labelledby="quest-title">
        <header class="modal-header">
          <h2 class="modal-title" id="quest-title">ปริศนาของ${station.name}</h2>
          <button type="button" class="btn btn-pill-sm" id="modal-close" aria-label="ปิด">✕</button>
        </header>
        <span class="quest-reward">รางวัล ฿${QUEST_REWARD}</span>
        <p class="quest-question">${puzzle.question}</p>
        <div class="quest-choices">
          ${puzzle.choices.map((label, index) => `
            <button type="button" class="btn" data-quest-answer="${index}">${label}</button>`).join('')}
        </div>
        <p class="quest-feedback" role="status"></p>
      </section>`;
    const close = this.modalBackdrop.querySelector<HTMLButtonElement>('#modal-close')!;
    const feedback = this.modalBackdrop.querySelector<HTMLParagraphElement>('.quest-feedback')!;
    const choices = this.modalBackdrop.querySelectorAll<HTMLButtonElement>('[data-quest-answer]');
    close.addEventListener('click', () => this.closeModal());
    choices[0]?.focus();
    choices.forEach(button => {
      button.addEventListener('click', () => {
        const result = this.world.answerFestivalQuest(puzzle, Number(button.dataset.questAnswer));
        if (result === 'wrong') {
          this.sound.playTap();
          feedback.textContent = `ลองอีกครั้ง · คำใบ้ ${puzzle.hint}`;
          return;
        }
        choices.forEach(choice => { choice.disabled = true; });
        if (result === 'unavailable') {
          feedback.textContent = 'เดินกลับไปใกล้ NPC แล้วเปิดปริศนาอีกครั้ง';
        } else {
          this.creditBank(QUEST_REWARD, `ตอบปริศนาของ${station.name}`, '🧩');
          feedback.classList.add('quest-success');
          feedback.textContent = `ตอบถูก! ฿${QUEST_REWARD} เข้าธนาคารแล้ว เควสถัดไปจะเปิดใน ${QUEST_INTERVAL} วินาที`;
        }
        close.focus();
      });
    });
  }

  private closeModal(): void {
    this.refreshRoomDialog = null;
    this.wishModalOpen = false;
    this.krathongShopOpen = false;
    this.foodDrinkModalCat = null;
    if (this.balloonCleanup) {
      this.balloonCleanup();
      this.balloonCleanup = null;
    }
    this.previewCtrl.stop();
    this.modalBackdrop.classList.add('hidden');
    this.modalBackdrop.innerHTML = '';
    this.refreshPierWaitBar();
  }

  private openKrathongShopModal(): void {
    this.krathongShopOpen = true;
    let previewId: KrathongId = this.roomKrathong.krathongId ?? this.selectedKrathong;

    const render = () => {
      const def = KRATHONG_CATALOG.find((k) => k.id === previewId)!;
      const alreadyOwned = this.roomKrathong.ownerSlot !== null;

      this.modalBackdrop.classList.remove('hidden');
      this.modalBackdrop.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h2 class="modal-title">🪷 ร้านขายกระทงคุณยาย (6 แบบ)</h2>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="krathong-status-chip">🎒 ${this.getInventoryCount()}/3</span>
              <span class="krathong-status-chip">🏦 ฿${this.bankBalance.toLocaleString()}</span>
              <button class="btn btn-pill-sm" id="modal-close">✕</button>
            </div>
          </div>

          ${
            alreadyOwned
              ? `
            <div class="glass-card" style="padding:12px 14px; margin-bottom:12px; background:rgba(56,30,68,0.85); border-color:#ff9ec6;">
              <div style="font-size:14px; color:#ffd573; font-weight:600;">
                🪷 ${this.escapeHtml(this.roomKrathong.ownerName ?? 'คู่ของคุณ')} ซื้อกระทงให้แล้ว!
              </div>
              <div style="font-size:12px; color:#ffe8f2; margin-top:4px;">
                ใน 1 ห้องซื้อกระทงได้แค่ 1 คนต่อรอบนะ — เดินไปเจอกันที่ท่าน้ำลอยกระทงได้เลย 🌉
              </div>
            </div>
          `
              : `
            <div style="font-size:12px; color:#ffe6a3; margin-bottom:8px;">
              💡 ซื้อได้เพียง 1 ใบต่อรอบ (ชำระผ่านธนาคารในมือถือ)
            </div>
          `
          }

          <div class="preview-box">
            <canvas id="krathong-preview-canvas"></canvas>
            <div>
              <div style="font-family:'Mali',sans-serif; font-size:18px; color:${def.themeColor}; font-weight:700;">
                ${def.icon} ${def.name}
              </div>
              <div style="font-size:13px; color:#fff3cc; margin:4px 0;">${def.subtitle} • <strong style="color:#ffd573;">฿${def.price}</strong></div>
              <div style="font-size:12px; color:var(--text-muted);">${def.description}</div>
              <div style="font-size:11px; color:#9fd8ff; margin-top:6px;">👆 ลากหมุนดูกระทง 3D ได้เลย</div>
            </div>
          </div>

          <div class="krathong-grid">
            ${KRATHONG_CATALOG.map(
              (k) => `
                <button class="item-card ${k.id === previewId ? 'active' : ''}" data-kid="${k.id}">
                  <span class="item-icon">${k.icon}</span>
                  <span class="item-name">${k.name}</span>
                  <span class="item-sub">${k.subtitle}</span>
                  <span class="item-price-tag">฿${k.price}</span>
                </button>
              `
            ).join('')}
          </div>

          ${
            alreadyOwned
              ? `<button id="btn-shop-ok" class="btn" style="width:100%;">รับทราบ — ไปเจอกันที่ท่าน้ำ 🌉</button>`
              : `<button id="btn-pick-krathong" class="btn btn-primary" style="width:100%;">ซื้อกระทงนี้ (฿${def.price}) 🪷</button>`
          }
        </div>
      `;

      const pCanvas = this.modalBackdrop.querySelector('#krathong-preview-canvas') as HTMLCanvasElement;
      this.previewCtrl.attachCanvas(pCanvas, previewId);

      this.modalBackdrop.querySelector('#modal-close')!.addEventListener('click', () => {
        this.sound.playTap();
        this.closeModal();
      });

      this.modalBackdrop.querySelectorAll<HTMLButtonElement>('[data-kid]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.sound.playTap();
          previewId = btn.dataset.kid as KrathongId;
          render();
        });
      });

      const okBtn = this.modalBackdrop.querySelector('#btn-shop-ok');
      if (okBtn) {
        okBtn.addEventListener('click', () => {
          this.sound.playTap();
          this.closeModal();
        });
      }

      const buyBtn = this.modalBackdrop.querySelector('#btn-pick-krathong');
      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          if (this.findFreeInventorySlot() === -1) {
            this.sound.playTap();
            this.showToast('🎒 ช่องเก็บของเต็มแล้ว (สูงสุด 3 ชิ้น) กดทิ้งของที่ถืออยู่ก่อนนะ');
            return;
          }
          if (this.bankBalance < def.price) {
            this.spendFromBank(def.price, `ซื้อ${def.name}`, def.icon);
            return;
          }
          const ok = this.world.buyRoomKrathong(previewId);
          if (!ok) {
            this.showToast('มีคนซื้อกระทงไปแล้ว! ซื้อได้แค่ 1 คนต่อรอบนะ');
            render();
            return;
          }
          this.spendFromBank(def.price, `ซื้อ${def.name}`, def.icon);
          this.addItemToInventory(
            {
              uid: `${Date.now()}-${Math.random()}`,
              kind: 'krathong',
              id: def.id,
              name: def.name,
              icon: def.icon
            },
            false,
            false
          );
          this.selectedKrathong = previewId;
          this.refreshTopHud();
          this.closeModal();
          this.showToast(`ซื้อ ${def.name} (฿${def.price}) แล้ว! เดินไปนั่งรอคู่ของคุณที่ท่าน้ำได้เลย 🌉`);
        });
      }
    };

    render();
  }

  private openFoodDrinkModal(category: 'snack' | 'drink'): void {
    this.foodDrinkModalCat = category;
    const items: ShopItemDef[] = category === 'snack' ? SNACK_CATALOG : DRINK_CATALOG;
    const title = category === 'snack' ? '🍡 ร้านขนมงานวัดโบราณ' : '🧋 ร้านน้ำหวาน & ชาไทย';

    const render = () => {
      this.modalBackdrop.classList.remove('hidden');
      this.modalBackdrop.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h2 class="modal-title">${title}</h2>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="krathong-status-chip">🎒 ${this.getInventoryCount()}/3</span>
              <span class="krathong-status-chip">🏦 ฿${this.bankBalance.toLocaleString()}</span>
              <button class="btn btn-pill-sm" id="modal-close">✕</button>
            </div>
          </div>

          <div style="font-size:13px; color:#ffe3f1; margin-bottom:10px;">
            เลือกซื้อให้ตัวละครของคุณ (${this.escapeHtml(this.myConfig.name)}) • หักเงินจากธนาคารในมือถือ
          </div>

          <div class="shop-grid-2">
            ${items
              .map(
                (item) => `
              <button class="item-card" data-itemid="${item.id}" style="padding:14px 10px;">
                <span class="item-icon">${item.icon}</span>
                <span class="item-name">${item.name}</span>
                <span class="item-sub">${item.subtitle}</span>
                <span class="item-price-tag">฿${item.price}</span>
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      `;

      this.modalBackdrop.querySelector('#modal-close')!.addEventListener('click', () => {
        this.sound.playTap();
        this.closeModal();
      });

      this.modalBackdrop.querySelectorAll<HTMLButtonElement>('[data-itemid]').forEach((b) => {
        b.addEventListener('click', () => {
          const item = items.find((i) => i.id === b.dataset.itemid)!;
          if (this.findFreeInventorySlot() === -1) {
            this.sound.playTap();
            this.showToast('🎒 ช่องเก็บของเต็มแล้ว (สูงสุด 3 ชิ้น) กดทิ้งของที่ถืออยู่ก่อนนะ');
            return;
          }
          if (!this.spendFromBank(item.price, `ซื้อ${item.name}`, item.icon)) {
            return;
          }
          this.addItemToInventory(
            {
              uid: `${Date.now()}-${Math.random()}`,
              kind: item.category,
              id: item.id,
              name: item.name,
              icon: item.icon,
              itemDef: item
            },
            false,
            true
          );
          this.sound.playBuy();
          this.closeModal();
          this.showToast(`ซื้อ ${item.name} (฿${item.price}) เก็บลงช่องแล้ว! กดปุ่มกิน/ดื่มเมื่อต้องการใช้ได้เลย ${item.icon}`);
        });
      });
    };

    render();
  }

  private openFortuneModal(): void {
    let tab: 'fortune' | 'balloon' = 'fortune';
    let drawnIndex: number | null = null;
    let shaking = false;

    const render = () => {
      if (this.balloonCleanup) {
        this.balloonCleanup();
        this.balloonCleanup = null;
      }

      const f = drawnIndex !== null ? FORTUNE_CATALOG[drawnIndex] : null;
      this.modalBackdrop.classList.remove('hidden');
      this.modalBackdrop.innerHTML = `
        <div class="modal-panel" style="text-align:center;">
          <div class="modal-header">
            <h2 class="modal-title">🎪 ซุ้มเซียมซีคู่ & ปาโป่งงานวัด</h2>
            <button class="btn btn-pill-sm" id="modal-close">✕</button>
          </div>

          <div class="tab-row">
            <button class="tab-btn ${tab === 'fortune' ? 'active' : ''}" data-btab="fortune">🎋 เสี่ยงเซียมซีคู่</button>
            <button class="tab-btn ${tab === 'balloon' ? 'active' : ''}" data-btab="balloon">🎈 มินิเกมปาโป่ง</button>
          </div>

          ${
            tab === 'fortune'
              ? `
            <div id="fortune-cup" class="${shaking ? 'shake-anim' : ''}" style="font-size:64px; margin:8px 0;">
              🎋
            </div>

            ${
              f
                ? `
              <div class="glass-card" style="padding:16px; margin:10px 0; text-align:left; background:rgba(44,24,62,0.72);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <strong style="color:#ffd573; font-family:'Mali',sans-serif; font-size:17px;">${f.title}</strong>
                  <span class="krathong-status-chip">${f.luckLevel}</span>
                </div>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#fff5fa;">${f.poem}</p>
              </div>
            `
                : `<p style="color:var(--text-muted); font-size:14px;">มาเขย่ากระบอกเซียมซีดูคำทำนายความรักและโชคลาภคืนนี้กัน!</p>`
            }

            <button id="btn-shake" class="btn btn-gold" style="width:100%; margin-top:8px;">
              ${f ? 'เขย่าใหม่อีกครั้ง 🎋' : 'เขย่ากระบอกเซียมซี 🎋'}
            </button>
          `
              : `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:14px;">
              <span>🎯 คะแนน: <strong id="bg-score" style="color:#ffd573;">0</strong></span>
              <span>⏱️ เวลา: <strong id="bg-time" style="color:#ff9ec6;">15</strong> วิ</span>
            </div>
            <div id="balloon-arena" class="balloon-arena"></div>
            <div id="balloon-result" style="font-size:14px; color:#ffe6a3; min-height:24px; margin-top:8px;">
              แตะลูกโป่งที่ลอยให้แตกมากที่สุดใน 15 วินาที!
            </div>
            <button id="btn-balloon-start" class="btn btn-primary" style="width:100%; margin-top:8px;">
              🎈 เริ่มปาโป่งเลย!
            </button>
          `
          }
        </div>
      `;

      this.modalBackdrop.querySelector('#modal-close')!.addEventListener('click', () => {
        this.sound.playTap();
        this.closeModal();
      });

      this.modalBackdrop.querySelectorAll<HTMLButtonElement>('[data-btab]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          tab = b.dataset.btab as 'fortune' | 'balloon';
          render();
        });
      });

      if (tab === 'fortune') {
        this.modalBackdrop.querySelector('#btn-shake')!.addEventListener('click', () => {
          this.sound.playFortuneShake();
          shaking = true;
          render();
          window.setTimeout(() => {
            shaking = false;
            drawnIndex = Math.floor(Math.random() * FORTUNE_CATALOG.length);
            render();
          }, 480);
        });
      } else {
        this.setupBalloonMiniGame();
      }
    };

    render();
  }

  private setupBalloonMiniGame(): void {
    const arena = this.modalBackdrop.querySelector('#balloon-arena') as HTMLElement;
    const scoreEl = this.modalBackdrop.querySelector('#bg-score') as HTMLElement;
    const timeEl = this.modalBackdrop.querySelector('#bg-time') as HTMLElement;
    const resultEl = this.modalBackdrop.querySelector('#balloon-result') as HTMLElement;
    const startBtn = this.modalBackdrop.querySelector('#btn-balloon-start') as HTMLButtonElement;

    let running = false;
    let score = 0;
    let timeLeft = 15;
    let spawnTimer: number | null = null;
    let countdownTimer: number | null = null;

    const cleanup = () => {
      running = false;
      if (spawnTimer !== null) window.clearInterval(spawnTimer);
      if (countdownTimer !== null) window.clearInterval(countdownTimer);
      spawnTimer = null;
      countdownTimer = null;
    };
    this.balloonCleanup = cleanup;

    const colors = ['#ff7aa8', '#78e0d6', '#ffd573', '#b89eff', '#ff9f68'];

    const spawnBalloon = () => {
      if (!running) return;
      const b = document.createElement('button');
      b.className = 'game-balloon';
      b.textContent = '🎈';
      const left = 8 + Math.random() * 80;
      const top = 12 + Math.random() * 68;
      b.style.left = `${left}%`;
      b.style.top = `${top}%`;
      b.style.filter = `drop-shadow(0 0 8px ${colors[Math.floor(Math.random() * colors.length)]})`;

      const pop = (e: Event) => {
        e.preventDefault();
        if (!running) return;
        score += 1;
        scoreEl.textContent = String(score);
        this.sound.playTap();
        b.textContent = '💥';
        b.style.pointerEvents = 'none';
        window.setTimeout(() => b.remove(), 140);
      };
      b.addEventListener('pointerdown', pop);
      arena.appendChild(b);

      window.setTimeout(() => {
        if (b.parentElement) b.remove();
      }, 1500);
    };

    startBtn.addEventListener('click', () => {
      cleanup();
      arena.innerHTML = '';
      score = 0;
      timeLeft = 15;
      scoreEl.textContent = '0';
      timeEl.textContent = '15';
      resultEl.textContent = 'ลุยเลย! แตะลูกโป่งให้ไว!';
      running = true;
      startBtn.disabled = true;
      this.sound.playBuy();

      spawnBalloon();
      spawnTimer = window.setInterval(spawnBalloon, 460);
      countdownTimer = window.setInterval(() => {
        timeLeft -= 1;
        timeEl.textContent = String(Math.max(0, timeLeft));
        if (timeLeft <= 0) {
          cleanup();
          arena.innerHTML = '';
          startBtn.disabled = false;
          startBtn.textContent = '🎈 เล่นอีกรอบ!';
          const prize =
            score >= 18
              ? '🏆 แชมป์ปาโป่งงานวัด!'
              : score >= 10
                ? '🧸 ตุ๊กตาหมีสุดน่ารัก!'
                : '🌸 พวงมาลัยดอกมะลิ!';
          const reward = score > 0 ? Math.max(10, score * 5) : 0;
          if (reward > 0) {
            this.creditBank(reward, `รางวัลปาโป่ง (${score} ลูก)`, '🎈');
          }
          resultEl.textContent =
            reward > 0
              ? `ได้ ${score} คะแนน! ${prize} (+฿${reward} เข้าธนาคาร 🏦)`
              : `ได้ ${score} คะแนน! รางวัล: ${prize}`;
          this.sound.playFirework();
        }
      }, 1000);
    });
  }

  private openWishModal(): void {
    if (this.roomKrathong.ownerSlot === null || !this.roomKrathong.krathongId) {
      this.showToast('🪷 ยังไม่มีกระทง! กรุณาเดินไปซื้อที่ร้านขายกระทงก่อนนะ');
      return;
    }
    this.wishModalOpen = true;
    this.refreshPierWaitBar();
    let wishText = this.lastWishText;

    const render = () => {
      const activeKrathongId = this.roomKrathong.krathongId ?? this.selectedKrathong;
      const kDef = KRATHONG_CATALOG.find((k) => k.id === activeKrathongId)!;
      const st = this.mpState;
      const partnerName = st.partnerName ?? this.world.couple.getRemoteChar().getConfig().name;
      const isOnlineConnected = st.mode !== 'offline' && st.connected;
      const waitingPartner = Boolean(this.localWishReady && isOnlineConnected && !this.remoteWishReady);

      this.modalBackdrop.classList.remove('hidden');
      this.modalBackdrop.innerHTML = `
        <div class="modal-panel">
          <div class="modal-header">
            <h2 class="modal-title">✨ อธิษฐานก่อนลอยกระทง</h2>
            <button class="btn btn-pill-sm" id="modal-close">✕</button>
          </div>

          <div style="font-size:13px; color:#ffe3f1; margin-bottom:10px;">
            กระทงคู่ของเรา: <strong style="color:#ffd573;">${kDef.icon} ${kDef.name}</strong>
          </div>

          ${
            isOnlineConnected
              ? `
            <div class="glass-card" style="padding:10px 14px; margin-bottom:10px; font-size:13px; background:rgba(36,28,68,0.65);">
              ${
                this.remoteWishReady
                  ? `✅ <strong>${this.escapeHtml(partnerName)}</strong> พิมพ์คำอธิษฐานเสร็จแล้ว! กดปุ่มด้านล่างเพื่อลอยกระทงเลย`
                  : waitingPartner
                    ? `⏳ คุณพิมพ์เสร็จแล้ว! กำลังรอ <strong>${this.escapeHtml(partnerName)}</strong> พิมพ์คำอธิษฐานให้เสร็จ...`
                    : `🤝 ทั้งคู่มาถึงท่าน้ำแล้ว! ต่างคนต่างพิมพ์คำอธิษฐานของตัวเอง แล้วรอกันลอยพร้อมกัน`
              }
            </div>
          `
              : ''
          }

          <label class="field-label">พิมพ์คำอธิษฐานของคุณ (${this.escapeHtml(this.myConfig.name)})</label>
          <textarea id="wish-input" class="textarea-input" rows="2" maxlength="90" placeholder="เช่น ขอให้สมหวัง มีความสุขตลอดไป..." ${waitingPartner ? 'disabled' : ''}>${this.escapeHtml(wishText)}</textarea>

          ${
            !waitingPartner
              ? `
            <label class="field-label">หรือแตะเลือกคำอวยพรยอดฮิต</label>
            <div class="chip-group" style="margin-bottom:14px;">
              ${QUICK_WISH_CHIPS.map(
                (w) => `<button class="choice-chip" data-chip="${this.escapeHtml(w)}">${w}</button>`
              ).join('')}
            </div>
          `
              : '<div style="height:12px;"></div>'
          }

          ${
            waitingPartner
              ? `<button id="btn-cancel-ready" class="btn" style="width:100%;">✏️ แก้ไขคำอธิษฐาน</button>`
              : `
            <button id="btn-float-now" class="btn btn-primary" style="width:100%; font-size:16px;">
              ${
                isOnlineConnected
                  ? '🙏 พิมพ์เสร็จแล้ว! รอลอยพร้อมกัน'
                  : '🙏 พิมพ์เสร็จแล้ว! ลอยกระทงเลย'
              }
            </button>
          `
          }
        </div>
      `;

      const input = this.modalBackdrop.querySelector('#wish-input') as HTMLTextAreaElement;
      input.addEventListener('input', () => {
        wishText = input.value;
      });

      this.modalBackdrop.querySelector('#modal-close')!.addEventListener('click', () => {
        this.sound.playTap();
        this.closeModal();
        this.world.standUpFromPier();
      });

      this.modalBackdrop.querySelectorAll<HTMLButtonElement>('[data-chip]').forEach((b) => {
        b.addEventListener('click', () => {
          this.sound.playTap();
          wishText = b.dataset.chip!;
          input.value = wishText;
        });
      });

      const cancelBtn = this.modalBackdrop.querySelector('#btn-cancel-ready');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.sound.playTap();
          this.world.cancelWishReady();
        });
      }

      const floatBtn = this.modalBackdrop.querySelector('#btn-float-now');
      if (floatBtn) {
        floatBtn.addEventListener('click', () => {
          const finalWish = input.value.trim() || 'ขอให้มีความสุขและสมหวังตลอดไป 💖';
          this.lastWishText = finalWish;
          if (!isOnlineConnected) {
            this.closeModal();
          }
          this.world.submitWishAndFloat(finalWish, !isOnlineConnected);
        });
      }
    };

    render();
  }

  public showToast(msg: string): void {
    const existing = this.root.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    this.root.appendChild(el);
    window.setTimeout(() => el.remove(), 2600);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
