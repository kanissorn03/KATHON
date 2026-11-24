import { defineConfig } from 'vite';
import { attachRooms } from './server/rooms.mjs';

export default defineConfig({
  plugins: [{
    name: 'multiplayer-rooms',
    configureServer(server) {
      if (server.httpServer) attachRooms(server.httpServer);
    },
    configurePreviewServer(server) {
      attachRooms(server.httpServer);
    }
  }],
  server: {
    host: true,
    port: 5173
  }
});
