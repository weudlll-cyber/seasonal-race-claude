// ============================================================
// File:        index.js
// Path:        server/src/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Express server entry point — bootstraps HTTP and Socket.IO
// ============================================================

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`RaceArena server running on :${PORT}`));

module.exports = { app, io };
