import { randomInt } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';

const path = '/_multiplayer';
const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function send(socket, message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function report(socket, reason) {
  send(socket, { type: 'room_error', reason });
  socket.close(1008, reason);
}

export function attachRooms(server) {
  const rooms = new Map();
  const relay = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });

  server.on('upgrade', (request, socket, head) => {
    if (request.url?.split('?')[0] !== path) return;
    const origin = request.headers.origin;
    if (origin) {
      let host;
      try { host = new URL(origin).host; } catch { /* Reject invalid origins. */ }
      const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME;
      if (!host || (host !== request.headers.host && host !== renderHost)) {
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
    }
    relay.handleUpgrade(request, socket, head, client => relay.emit('connection', client));
  });

  relay.on('connection', socket => {
    let room;
    let slot;
    socket.alive = true;
    socket.on('pong', () => { socket.alive = true; });
    socket.on('error', () => socket.terminate());
    const deadline = setTimeout(() => {
      if (!room) report(socket, 'timeout');
    }, 8000);

    socket.on('message', (data, binary) => {
      if (binary) return report(socket, 'invalid_request');
      let frame;
      try { frame = JSON.parse(data.toString()); } catch { return report(socket, 'invalid_request'); }
      if (!frame || typeof frame !== 'object') return report(socket, 'invalid_request');

      if (room) {
        if (frame.type !== 'relay' || typeof frame.message?.type !== 'string') return;
        const recipient = slot === 1 ? room.guest : room.host;
        // Drop only position updates for a slow client. Reliable game actions keep their order.
        if (frame.message.type === 'state' && recipient?.bufferedAmount > 32 * 1024) return;
        if (recipient?.bufferedAmount > 256 * 1024) {
          recipient.terminate();
          return;
        }
        send(recipient, frame);
        return;
      }

      if (frame.type === 'create') {
        let code;
        do {
          code = Array.from({ length: 5 }, () => codeChars[randomInt(codeChars.length)]).join('');
        } while (rooms.has(code));
        room = { code, host: socket, guest: null };
        slot = 1;
        rooms.set(code, room);
        clearTimeout(deadline);
        send(socket, { type: 'joined', code, slot });
        return;
      }

      if (frame.type !== 'join' || typeof frame.code !== 'string' || !/^[A-Z0-9]{5}$/.test(frame.code)) {
        return report(socket, 'invalid_code');
      }
      const target = rooms.get(frame.code);
      if (target?.host.readyState !== WebSocket.OPEN) return report(socket, 'room_missing');
      if (target.guest) return report(socket, 'room_full');
      room = target;
      slot = 2;
      target.guest = socket;
      clearTimeout(deadline);
      send(socket, { type: 'joined', code: room.code, slot });
      send(room.host, { type: 'partner_joined' });
    });

    socket.on('close', () => {
      clearTimeout(deadline);
      if (!room) return;
      if (slot === 1) {
        rooms.delete(room.code);
        const guest = room.guest;
        room.guest = null;
        send(guest, { type: 'room_closed' });
        guest?.close(1000, 'room_closed');
      } else if (room.guest === socket) {
        room.guest = null;
        send(room.host, { type: 'partner_left' });
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const socket of relay.clients) {
      if (socket.readyState !== WebSocket.OPEN || !socket.alive) socket.terminate();
      else {
        socket.alive = false;
        socket.ping();
      }
    }
  }, 15_000).unref();
  server.once('close', () => {
    clearInterval(heartbeat);
    for (const socket of relay.clients) socket.terminate();
    relay.close();
  });
}
