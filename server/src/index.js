// ============================================================
// File:        index.js
// Path:        server/src/index.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Server entry point — binds the Express app to a port
// ============================================================

import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`RaceArena server running on port ${PORT}`);
});
