import './styles/main.css';
import { SoundManager } from './audio/SoundManager';
import { DEFAULT_COUPLE } from './data/catalog';
import { WorldEngine } from './scene/WorldEngine';
import { UIController } from './ui/UIController';

function bootstrap(): void {
  const canvas = document.getElementById('world-canvas') as HTMLCanvasElement | null;
  const uiRoot = document.getElementById('ui-root') as HTMLElement | null;

  if (!canvas || !uiRoot) {
    throw new Error('Missing #world-canvas or #ui-root mount elements');
  }

  const sound = new SoundManager();
  let ui: UIController | null = null;

  const world = new WorldEngine(canvas, sound, DEFAULT_COUPLE, {
    onQuestChange: (station) => ui?.setQuestStation(station),
    onZoneProximity: (zone) => {
      ui?.setNearbyZone(zone);
    },
    onCeremonyStateChange: (phase, payload) => {
      ui?.setCeremonyPhase(phase, payload);
    },
    onMultiplayerChange: (state) => {
      ui?.setMultiplayerState(state);
    },
    onWishReadyChange: (localReady, remoteReady) => {
      ui?.setWishReadyState(localReady, remoteReady);
    },
    onRoomKrathongChange: (state) => {
      ui?.setRoomKrathongState(state);
    },
    onPierWaitChange: (state) => {
      ui?.setPierWaitState(state);
    },
    onOpenWishScreen: () => {
      ui?.openWishScreenFromWorld();
    },
    onPhoneChatMessage: (senderName, text) => {
      ui?.handleIncomingPhoneChat(senderName, text);
    },
    onBankTransferReceived: (senderName, amount, note) => {
      ui?.handleIncomingBankTransfer(senderName, amount, note);
    },
    onToast: (message) => {
      ui?.showToast(message);
    }
  });

  ui = new UIController(uiRoot, world, sound, DEFAULT_COUPLE);
}

bootstrap();
