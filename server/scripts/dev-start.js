// Dev-Launcher: setzt lokale Standard-Env, damit der Server vom Vite-Client (localhost:5173)
// erreichbar ist, ohne pro Shell Variablen setzen zu müssen. Überschreibt nichts bereits Gesetztes.
// NUR für die lokale Entwicklung — Produktion nutzt `npm start` und MUSS RA_SESSION_SECRET selbst setzen.
process.env.RA_CLIENT_ORIGIN ??= 'http://localhost:5173';
process.env.RA_SESSION_SECRET ??= 'dev-secret-not-for-production';
process.env.PORT ??= '4000';
await import('../src/index.js');
