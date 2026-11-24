export type GenderId = 'female' | 'male';
export type HairStyleId = 'bob' | 'twin_buns' | 'long_jasmine' | 'fluffy_short'
  | 'side_pony' | 'twin_braids' | 'swept_quiff'
  | 'curtain_part' | 'french_crop' | 'soft_mullet';
export type OutfitStyleId = 'thai_sabai' | 'ruean_ton' | 'dusit' | 'thai_cotton' | 'raj_pattern' | 'short_royal' | 'fair_pastel';
export type GlassesId = 'none' | 'round_gold' | 'heart_pink' | 'star_sun' | 'cat_eye';
export type HatId = 'none' | 'beret' | 'bucket' | 'flower_crown' | 'cat_ears' | 'thai_chada';
export type AccessoryId = 'none' | 'jasmine_garland' | 'gold_necklace' | 'angel_wings' | 'ribbon_bow';

export type CharacterPose =
  | 'idle'
  | 'walk'
  | 'eat'
  | 'sip'
  | 'wai'
  | 'sit_wait'
  | 'kneel_pray'
  | 'place_krathong'
  | 'wave';

export interface CharacterConfig {
  id: 1 | 2;
  name: string;
  gender: GenderId;
  hairStyle: HairStyleId;
  hairColor: string;
  outfitStyle: OutfitStyleId;
  outfitColor: string;
  accentColor: string;
  skinTone: string;
  glasses: GlassesId;
  hat: HatId;
  accessory: AccessoryId;
}

export type KrathongId =
  | 'banana_lotus'
  | 'bread_turtle'
  | 'golden_marigold'
  | 'sweetheart_couple'
  | 'coconut_orchid'
  | 'crystal_lotus';

export interface KrathongDef {
  id: KrathongId;
  name: string;
  subtitle: string;
  icon: string;
  price: number;
  themeColor: string;
  description: string;
}

export interface ShopItemDef {
  id: string;
  category: 'snack' | 'drink';
  name: string;
  subtitle: string;
  icon: string;
  price: number;
  color: string;
  secondaryColor: string;
  reaction: string;
}

export interface PhoneChatMessage {
  id: string;
  sender: 'me' | 'partner';
  senderName: string;
  text: string;
  timestamp: number;
}

export interface BankTransaction {
  id: string;
  title: string;
  icon: string;
  amount: number;
  timestamp: number;
}

export type InventoryItem =
  | {
      uid: string;
      kind: 'krathong';
      id: KrathongId;
      name: string;
      icon: string;
    }
  | {
      uid: string;
      kind: 'snack' | 'drink';
      id: string;
      name: string;
      icon: string;
      itemDef: ShopItemDef;
    };

export interface FortuneDef {
  number: number;
  title: string;
  poem: string;
  luckLevel: string;
}

export type ZoneId =
  | 'krathong_shop'
  | 'snack_shop'
  | 'drink_shop'
  | 'fortune_booth'
  | 'pier'
  | 'ferris_wheel'
  | 'npc_quest';

export type FloatMode = 'shared' | 'pair';

export interface WishPayload {
  mode: FloatMode;
  krathongId1: KrathongId;
  krathongId2: KrathongId;
  wish1: string;
  wish2: string;
  names: [string, string];
  solo?: boolean;
}

export interface InteractiveZone {
  id: ZoneId;
  label: string;
  actionLabel: string;
  icon: string;
  position: { x: number; z: number };
  interactionPos: { x: number; z: number };
  radius: number;
}

export type CameraMode = 'follow_couple' | 'pier_ceremony' | 'watch_krathong';

export type SessionMode = 'offline' | 'host' | 'guest';
export type PlayerSlot = 1 | 2;

export interface FerrisRideState {
  riders: PlayerSlot[];
  phase: 'boarding' | 'riding';
  elapsed: number;
}

export interface PlayerTransform {
  x: number;
  y: number;
  z: number;
  rotY: number;
  moving: boolean;
  pose: CharacterPose;
}

export interface MultiplayerState {
  mode: SessionMode;
  roomCode: string | null;
  playerCount: 1 | 2;
  localSlot: PlayerSlot;
  connected: boolean;
  partnerName: string | null;
}

export interface WishReadyInfo {
  ready: boolean;
  krathongId: KrathongId;
  wish: string;
  floatMode: FloatMode;
}

export interface RoomKrathongState {
  ownerSlot: PlayerSlot | null;
  krathongId: KrathongId | null;
  ownerName: string | null;
}

export interface PierWaitState {
  localWaiting: boolean;
  remoteWaiting: boolean;
  bothSeated: boolean;
}

export type NetMessage =
  | {
      type: 'welcome';
      hostConfig: CharacterConfig;
      hostPos: PlayerTransform;
      hostKrathong: KrathongId | null;
      roomKrathong: RoomKrathongState;
      hostPierWaiting: boolean;
    }
  | {
      type: 'hello';
      config: CharacterConfig;
      pos: PlayerTransform;
      krathong: KrathongId | null;
    }
  | { type: 'config'; config: CharacterConfig }
  | { type: 'state'; pos: PlayerTransform }
  | { type: 'ferris_board' }
  | { type: 'ferris_ride'; ride: FerrisRideState | null }
  | { type: 'held_krathong'; krathongId: KrathongId }
  | { type: 'room_krathong'; state: RoomKrathongState }
  | { type: 'pier_wait'; waiting: boolean }
  | { type: 'open_wish_screen' }
  | { type: 'held_item'; itemId: string; category: 'snack' | 'drink'; silent?: boolean }
  | { type: 'clear_held_item' }
  | { type: 'chat'; text: string; senderName?: string }
  | { type: 'bank_transfer'; amount: number; senderName: string; note?: string }
  | { type: 'emote'; emote: 'wave' | 'wai' | 'heart' }
  | ({ type: 'wish_ready' } & WishReadyInfo)
  | { type: 'start_ceremony'; payload: WishPayload }
  | { type: 'world_event'; event: 'sky_lantern' | 'firework'; riverZ?: number };
