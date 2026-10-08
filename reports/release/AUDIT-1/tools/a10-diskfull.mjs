// AUDIT-1 A10: what the server does when its data folder fills up. Drives a container whose
// /app/data is a size-limited tmpfs (started separately), never the owner's data.
// Usage: node a10-diskfull.mjs <baseUrl> <bootstrapToken>
const [base, token] = process.argv.slice(2);
const j = { 'Content-Type': 'application/json' };

const setup = await fetch(`${base}/api/auth/setup`, {
  method: 'POST',
  headers: { ...j, 'x-bootstrap-token': token },
  body: JSON.stringify({ username: 'auditadmin', password: 'audit-password-1', team: 'Audit' }),
});
const cookie = setup.headers.get('set-cookie')?.split(';')[0];
console.log(`setup: ${setup.status}`);

const show = async (label, r) => console.log(`${label}: ${r.status} ${(await r.text()).slice(0, 90).replace(/\s+/g, ' ')}`);
const png = (mb) => {
  const b = Buffer.alloc(mb * 1048576, 0x41);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
  return b;
};
const tracks = await (await fetch(`${base}/api/tracks`, { headers: { cookie } })).json();
let full = false;
for (let i = 0; i < tracks.length * 3 && !full; i++) {
  const t = tracks[i % tracks.length];
  const form = new FormData();
  form.append('background', new Blob([png(9)], { type: 'image/png' }), 'bg.png');
  const r = await fetch(`${base}/api/tracks/${t.id}/background`, { method: 'POST', headers: { cookie }, body: form });
  if (!r.ok) {
    full = true;
    await show(`upload ${i + 1} (${t.id})`, r);
  }
}
console.log(full ? 'the data folder filled up' : 'never filled up — raise the upload count');
await show('health while full', await fetch(`${base}/api/health`));
await show('GET /api/tracks while full', await fetch(`${base}/api/tracks`, { headers: { cookie } }));
await show('login while full', await fetch(`${base}/api/auth/login`, { method: 'POST', headers: j, body: JSON.stringify({ username: 'auditadmin', password: 'audit-password-1' }) }));
const edit = await fetch(`${base}/api/tracks/${tracks[0].id}`, { headers: { cookie } });
const rec = await edit.json();
await show('PUT a track while full', await fetch(`${base}/api/tracks/${rec.id}`, { method: 'PUT', headers: { ...j, cookie }, body: JSON.stringify({ ...rec, name: rec.name + ' x' }) }));
const after = await fetch(`${base}/api/tracks/${rec.id}`, { headers: { cookie } });
console.log(`the track after the failed write still reads: ${after.status} name=${(await after.json()).name}`);
// Free space: remove one background, then the same write must succeed.
await show('DELETE a background (frees space)', await fetch(`${base}/api/tracks/${tracks[1].id}/background`, { method: 'DELETE', headers: { cookie } }));
await show('PUT the track again after freeing', await fetch(`${base}/api/tracks/${rec.id}`, { method: 'PUT', headers: { ...j, cookie }, body: JSON.stringify({ ...rec, name: rec.name + ' y' }) }));
