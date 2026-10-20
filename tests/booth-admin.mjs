// Runs scripts/booth-admin.mjs against the mock Supabase server: creating events, links, export and purge.
//   npm run test:admin
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ANON_KEY, FRAME_PNG, SERVICE_KEY, startMockSupabase } from './mock-supabase.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

const mock = await startMockSupabase();
const dir = await mkdtemp(path.join(os.tmpdir(), 'booth-admin-'));
const env = { ...process.env, SUPABASE_URL: mock.url, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SITE_URL: 'https://booth.example.test' };
delete env.VITE_PUBLIC_URL;

const admin = async (...args) => {
  try {
    const { stdout, stderr } = await run('node', [path.join(root, 'scripts/booth-admin.mjs'), ...args], { env, cwd: dir });
    return { code: 0, out: stdout + stderr };
  } catch (e) {
    return { code: e.code ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
};
const rpc = async (name, args) => (await fetch(`${mock.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: ANON_KEY, 'content-type': 'application/json' }, body: JSON.stringify(args) })).json();

// An event with a custom frame and logo.
await writeFile(path.join(dir, 'frame.png'), FRAME_PNG);
await writeFile(path.join(dir, 'logo.png'), FRAME_PNG);
await writeFile(
  path.join(dir, 'event.json'),
  JSON.stringify({
    slug: 'summer-fair',
    name: 'Summer Fair',
    maxPhotos: 50,
    retentionDays: 7,
    booth: { language: 'en', aspect: 'square', frame: { kind: 'image', file: 'frame.png' }, logoFile: 'logo.png', props: ['crown'] },
  }),
);

let r = await admin('create', 'event.json');
const link = r.out.match(/https:\/\/booth\.example\.test\/booth\/summer-fair\?k=([0-9a-f]+)/);
ok(r.code === 0 && link, 'create prints the booth link');
const ev = mock.state.events.find((e) => e.slug === 'summer-fair');
ok(ev && link && ev.kiosk_token === link[1], 'the link carries the new event\'s secret token');
ok(ev?.config.frame.kind === 'image' && ev.config.frame.url.startsWith(`${mock.url}/storage/v1/object/public/branding/summer-fair/frame-`), 'the frame file was uploaded and replaced by its URL');
ok(ev?.config.logoUrl?.includes('/branding/summer-fair/logo-') && !('logoFile' in ev.config), 'the logo file was uploaded and replaced by its URL');
ok([...mock.state.objects.keys()].filter((k) => k.startsWith('branding/summer-fair/')).length === 2, 'both branding files are in storage');
ok((await rpc('booth_config', { p_slug: 'summer-fair', p_token: ev.kiosk_token }))?.name === 'Summer Fair', 'the kiosk can load the new event with that token');

r = await admin('create', 'event.json');
ok(r.code !== 0 && /already exists/.test(r.out), 'creating the same event twice is refused');

await writeFile(path.join(dir, 'bad.json'), JSON.stringify({ slug: 'Bad Slug!', name: 'x' }));
r = await admin('create', 'bad.json');
ok(r.code !== 0 && /slug/.test(r.out), 'an invalid slug is explained');
await writeFile(path.join(dir, 'frame-bad.json'), JSON.stringify({ slug: 'bad-frame', name: 'x', booth: { frame: { file: 'missing.png' } } }));
r = await admin('create', 'frame-bad.json');
ok(r.code !== 0 && /not found/i.test(r.out), 'a missing frame file is reported');

r = await admin('link', 'summer-fair');
ok(r.out.trim() === link[0], 'link prints the same booth link');

// Photos as the booth would make them: register, upload, confirm.
const token = ev.kiosk_token;
const make = async (code, { confirm = true } = {}) => {
  const p = await rpc('booth_register_photo', { p_slug: 'summer-fair', p_token: token, p_code: code });
  if (confirm) {
    await fetch(`${mock.url}/storage/v1/object/photos/${p}`, { method: 'POST', headers: { apikey: ANON_KEY, 'content-type': 'image/jpeg', 'x-upsert': 'false' }, body: Buffer.from([0xff, 0xd8, code.charCodeAt(0)]) });
    await rpc('booth_confirm_photo', { p_slug: 'summer-fair', p_token: token, p_code: code });
  }
  return p;
};
const codes = ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc', 'dddddddddddd'];
for (const c of codes) await make(c);
await make('eeeeeeeeeeee', { confirm: false }); // registered, never uploaded

r = await admin('stats', 'summer-fair');
ok(/photos ready:\s+4 of 50/.test(r.out) && /still pending:\s+1/.test(r.out), 'stats counts ready and pending photos');
r = await admin('list');
ok(/summer-fair\s+4 photos \/ 50/.test(r.out) && /acme-launch/.test(r.out), 'list shows events with their photo counts');

// Export
const outDir = path.join(dir, 'out');
r = await admin('export', 'summer-fair', outDir);
const files = (await readdir(outDir)).sort();
ok(r.code === 0 && files.filter((f) => f.endsWith('.jpg')).length === 4 && files.includes('index.csv'), 'export downloads every ready photo and an index.csv');
const csv = (await readFile(path.join(outDir, 'index.csv'), 'utf8')).trim().split('\n');
ok(csv.length === 5 && csv.some((l) => l.includes('https://booth.example.test/p/aaaaaaaaaaaa')), 'index.csv lists the photos with their guest links');
ok((await readFile(path.join(outDir, files.find((f) => f.includes('aaaaaaaaaaaa'))))).equals(Buffer.from([0xff, 0xd8, 'a'.charCodeAt(0)])), 'exported files are the uploaded bytes');

// Purge: one expired, one deleted by the guest, one pending for over a week.
const byCode = (c) => mock.state.photos.find((p) => p.code === c);
byCode('bbbbbbbbbbbb').expires_at = new Date(Date.now() - 1000).toISOString();
await rpc('photo_delete', { p_code: 'cccccccccccc' });
byCode('eeeeeeeeeeee').created_at = new Date(Date.now() - 8 * 864e5).toISOString();
r = await admin('purge', '--dry-run');
ok(/Would delete 3 photo record/.test(r.out) && mock.state.photos.length === 5, 'purge --dry-run reports without deleting');
r = await admin('purge');
ok(/Deleted 3 photo record/.test(r.out), 'purge removes expired, deleted and never-uploaded photos');
ok(mock.state.photos.map((p) => p.code).sort().join() === 'aaaaaaaaaaaa,dddddddddddd', 'only the photos that should stay are left');
ok([...mock.state.objects.keys()].filter((k) => k.startsWith('photos/')).length === 2, 'their files were deleted from storage too');
ok((await rpc('photo_get', { p_code: 'aaaaaaaaaaaa' }))?.status === 'ready', 'a photo that stays is still available to the guest');

// Token rotation, update and close
r = await admin('rotate-token', 'summer-fair');
const newLink = r.out.match(/\?k=([0-9a-f]+)/);
ok(newLink && newLink[1] !== token, 'rotate-token prints a new link');
ok((await rpc('booth_config', { p_slug: 'summer-fair', p_token: token })) === null, 'the old link stops working');
ok((await rpc('booth_config', { p_slug: 'summer-fair', p_token: newLink[1] }))?.name === 'Summer Fair', 'the new link works');

await writeFile(path.join(dir, 'event.json'), JSON.stringify({ slug: 'summer-fair', name: 'Summer Fair 2', booth: { language: 'th', aspect: 'portrait' } }));
r = await admin('update', 'event.json');
ok(r.code === 0 && mock.state.events.find((e) => e.slug === 'summer-fair').name === 'Summer Fair 2', 'update changes the event');
ok(mock.state.events.find((e) => e.slug === 'summer-fair').kiosk_token === newLink[1], 'update keeps the booth link');
r = await admin('close', 'summer-fair');
ok(mock.state.events.find((e) => e.slug === 'summer-fair').active === false && (await rpc('booth_config', { p_slug: 'summer-fair', p_token: newLink[1] })) === null, 'close switches the booth off');

// Setup problems
const noEnv = await run('node', [path.join(root, 'scripts/booth-admin.mjs'), 'list'], { env: { PATH: process.env.PATH }, cwd: dir }).then(() => ({ code: 0, out: '' }), (e) => ({ code: e.code, out: e.stderr }));
ok(noEnv.code !== 0 && /SUPABASE_URL/.test(noEnv.out), 'missing settings are explained');
r = await admin('stats', 'nope');
ok(r.code !== 0 && /No event/.test(r.out), 'an unknown event is explained');

await mock.close();
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll admin checks passed.');
process.exit(failures ? 1 : 0);
