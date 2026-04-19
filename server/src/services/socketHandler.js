// ============================================================
// File:        socketHandler.js
// Path:        server/src/services/socketHandler.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Socket.IO event handler — bridges live race events to clients
// ============================================================

module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('race:join',  ({ raceId }) => { socket.join(raceId); });
    socket.on('race:input', (input)       => { /* forward input to engine */ });
    socket.on('disconnect', ()            => { /* cleanup player state */ });
  });
};
