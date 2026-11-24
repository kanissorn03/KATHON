import type { MultiplayerState, NetMessage } from '../types';

export interface MultiplayerCallbacks {
  onStateChange: (state: MultiplayerState) => void;
  onPartnerConnected: () => void;
  onPartnerDisconnected: () => void;
  onMessage: (msg: NetMessage) => void;
}

type RoomRequest = { type: 'create' } | { type: 'join'; code: string };
type RoomResponse =
  | { type: 'joined'; code: string; slot: 1 | 2 }
  | { type: 'room_error'; reason: string }
  | { type: 'partner_joined' | 'partner_left' | 'room_closed' }
  | { type: 'relay'; message: NetMessage };

const OFFLINE: MultiplayerState = {
  mode: 'offline', roomCode: null, playerCount: 1, localSlot: 1, connected: false, partnerName: null
};

const ROOM_ERRORS: Record<string, string> = {
  invalid_code: 'กรุณากรอกรหัสห้อง 5 ตัว',
  room_missing: 'ไม่พบห้องนี้ หรือเจ้าของห้องออกไปแล้ว',
  room_full: 'ห้องนี้เต็มแล้ว (2/2 คน)'
};

const CONNECTION_ERROR = 'เชื่อมต่อระบบห้องไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่';

export class MultiplayerManager {
  private socket: WebSocket | null = null;
  private state: MultiplayerState = { ...OFFLINE };

  constructor(private readonly callbacks: MultiplayerCallbacks) {}

  public getState(): MultiplayerState {
    return { ...this.state };
  }

  public setPartnerName(name: string | null): void {
    this.state.partnerName = name;
    this.emitState();
  }

  public getInviteUrl(code = this.state.roomCode): string {
    const url = new URL(window.location.pathname, window.location.origin);
    if (code) url.searchParams.set('room', code);
    return url.href;
  }

  private emitState(): void {
    this.callbacks.onStateChange(this.getState());
  }

  public createRoom(): Promise<string> {
    return this.openRoom({ type: 'create' });
  }

  public async joinRoom(rawCode: string): Promise<void> {
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) throw new Error(ROOM_ERRORS.invalid_code);
    await this.openRoom({ type: 'join', code });
  }

  private openRoom(request: RoomRequest): Promise<string> {
    this.disconnect(false);
    const url = new URL('/_multiplayer', window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    this.socket = socket;

    return new Promise((resolve, reject) => {
      let joined = false;
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (this.socket === socket) this.disconnect(false);
        reject(new Error(message));
      };
      const timer = window.setTimeout(() => fail(CONNECTION_ERROR), 10_000);
      const lost = () => {
        if (!joined) {
          fail(CONNECTION_ERROR);
        } else if (this.socket === socket) {
          this.disconnect();
          this.callbacks.onPartnerDisconnected();
        }
      };
      socket.addEventListener('open', () => {
        if (this.socket === socket) socket.send(JSON.stringify(request));
      });
      socket.addEventListener('close', lost);
      socket.addEventListener('error', lost);
      socket.addEventListener('message', event => {
        if (this.socket !== socket || typeof event.data !== 'string') return;
        let frame: RoomResponse;
        try { frame = JSON.parse(event.data) as RoomResponse; } catch { return; }
        if (!frame || typeof frame !== 'object') return;
        if (!joined) {
          if (frame.type === 'room_error') {
            fail(ROOM_ERRORS[frame.reason] ?? CONNECTION_ERROR);
          } else if (frame.type === 'joined') {
            joined = settled = true;
            window.clearTimeout(timer);
            const guest = frame.slot === 2;
            this.state = {
              mode: guest ? 'guest' : 'host', roomCode: frame.code,
              playerCount: guest ? 2 : 1, localSlot: frame.slot, connected: guest, partnerName: null
            };
            this.emitState();
            if (guest) this.callbacks.onPartnerConnected();
            resolve(frame.code);
          }
          return;
        }

        if (frame.type === 'partner_joined') {
          this.state.connected = true;
          this.state.playerCount = 2;
          this.emitState();
          this.callbacks.onPartnerConnected();
        } else if (frame.type === 'partner_left') {
          this.state.connected = false;
          this.state.playerCount = 1;
          this.state.partnerName = null;
          this.emitState();
          this.callbacks.onPartnerDisconnected();
        } else if (frame.type === 'room_closed') {
          lost();
        } else if (frame.type === 'relay' && this.state.connected) {
          this.callbacks.onMessage(frame.message);
        }
      });
    });
  }

  public send(message: NetMessage): void {
    const socket = this.socket;
    if (!this.state.connected || socket?.readyState !== WebSocket.OPEN) return;
    if (message.type === 'state' && socket.bufferedAmount > 32 * 1024) return;
    socket.send(JSON.stringify({ type: 'relay', message }));
  }

  public disconnect(emit = true): void {
    const socket = this.socket;
    this.socket = null;
    this.state = { ...OFFLINE };
    socket?.close();
    if (emit) this.emitState();
  }
}
