// Dev-Launcher: sets local default env so the server is reachable from the Vite client
// (localhost:5173) without setting variables per shell. Never overwrites already-set values.
// DEV ONLY — production uses `npm start` and MUST set its own secrets.
process.env.RA_CLIENT_ORIGIN ??= 'http://localhost:5173';
process.env.RA_SESSION_SECRET ??= 'dev-secret-not-for-production';
process.env.RA_BOOTSTRAP_TOKEN ??= 'dev-bootstrap-token-not-for-production';
process.env.PORT ??= '4000';
await import('../src/index.js');
