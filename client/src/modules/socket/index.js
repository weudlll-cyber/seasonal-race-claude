// ============================================================
// File:        index.js
// Path:        client/src/modules/socket/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Socket.IO client module — connection lifecycle and event helpers
// ============================================================

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connect(token) {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });
  return socket;
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
}

export function emit(event, payload) {
  socket?.emit(event, payload);
}

export function on(event, handler) {
  socket?.on(event, handler);
}

export function off(event, handler) {
  socket?.off(event, handler);
}
