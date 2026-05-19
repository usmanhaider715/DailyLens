import { io } from 'socket.io-client';

const base = import.meta.env.VITE_API_URL || '';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(base || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
