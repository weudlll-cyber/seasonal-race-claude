// ============================================================
// File:        index.js
// Path:        server/src/modules/socket/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Socket.IO event registration — bridges live race events to clients
// ============================================================

module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('race:join',  ({ raceId }) => {
      socket.join(`race:${raceId}`);
    });

    socket.on('race:input', (input) => {
      const raceId = [...socket.rooms].find((r) => r.startsWith('race:'));
      if (raceId) socket.to(raceId).emit('race:input', { id: socket.id, ...input });
    });

    socket.on('disconnect', () => {
      // Player cleanup handled by race engine on server
    });
  });
};
