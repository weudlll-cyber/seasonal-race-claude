// AUDIT-1 A5M-01 confirmation: do mixed-case paths skip the auth, admin and CSRF guards?
// Imports the UNCHANGED app from a clone into this process (supertest, no server left listening),
// with a throwaway data folder. Usage: node case-bypass-probe.mjs <repoRoot> <throwawayDataDir>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const [root, data] = process.argv.slice(2);
process.env.RA_DATA_DIR = data;
process.env.NODE_ENV = 'test'; // in-memory session store, rate limiters skipped — the guards are the subject
const require = createRequire(join(root, 'server', 'package.json'));
const request = require('supertest');
const { createApp } = await import(pathToFileURL(join(root, 'server/src/app.js')).href);
const app = createApp();

const show = (label, r) => console.log(`${label.padEnd(58)} → ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
show('GET  /api/users (no session)', await request(app).get('/api/users').set('Accept', 'application/json'));
show('GET  /API/users (no session)', await request(app).get('/API/users').set('Accept', 'application/json'));
show('POST /api/users (no session, no Origin)', await request(app).post('/api/users').send({ username: 'x1', password: 'p'.repeat(12), role: 'admin', team: 'Probe', allowNewTeam: true }));
show('POST /API/users (no session, no Origin)', await request(app).post('/API/users').send({ username: 'probe-admin', password: 'p'.repeat(12), role: 'admin', team: 'Probe', allowNewTeam: true }));
show('GET  /API/users after that (no session)', await request(app).get('/API/users').set('Accept', 'application/json'));
show('GET  /api/Tracks (no session)', await request(app).get('/api/Tracks').set('Accept', 'application/json'));
