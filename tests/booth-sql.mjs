// Checks the Supabase migration for the booth platform against a real Postgres (PGlite, in WebAssembly):
// what the public "anon" key may and may not do, quotas, expiry, and the upload policy.
//   npm run test:sql
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = await readFile(path.join(root, 'supabase/migrations/20261020000000_booth_studio.sql'), 'utf8');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

const db = new PGlite();
// Minimal stand-ins for what Supabase provides.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant insert on storage.objects to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`);
await db.exec(sql);
await db.exec(sql); // must be safe to run twice
ok(true, 'migration runs, and runs again without errors');

const asAnon = async (fn) => {
  await db.exec('set role anon');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
};
const fails = async (fn, text) => {
  try {
    await fn();
    return false;
  } catch (e) {
    return text ? String(e.message).includes(text) : true;
  }
};
const one = async (query, params = []) => (await db.query(query, params)).rows[0];
const rpc = (name, ...args) =>
  asAnon(async () => {
    const marks = args.map((_, i) => `$${i + 1}`).join(', ');
    return (await db.query(`select public.${name}(${marks}) as r`, args)).rows[0].r;
  });

const code = (n) => 'abcdefghjkmn'.slice(0, 11) + 'abcdefghjkmn'[n % 12];

// --- events -------------------------------------------------------------------------------
const ev = await one(
  `insert into public.booth_events (slug, name, config, max_photos, retention_days)
   values ('acme-launch', 'Acme Launch', '{"subtitle":"20 Oct","accent":"#2563EB"}', 3, 30) returning id, kiosk_token as token`,
);
ok(ev.token.length === 64, 'kiosk token is long and random');

ok(await asAnon(() => fails(() => db.query('select * from public.booth_events'), 'permission denied')), 'anon cannot read events directly');
ok(await asAnon(() => fails(() => db.query('select * from public.booth_photos'), 'permission denied')), 'anon cannot read photos directly');
ok(await asAnon(() => fails(() => db.query(`insert into public.booth_photos (event_id, code, path, expires_at) values ('${ev.id}','aaaaaaaaaaaa','x',now())`), 'permission denied')), 'anon cannot insert photos directly');
ok(await asAnon(() => fails(() => db.query(`select public.booth_find_event('acme-launch','x','0')`), 'permission denied')), 'internal helper is not callable by anon');

// --- booth_config -------------------------------------------------------------------------
ok((await rpc('booth_config', 'acme-launch', 'wrong')) === null, 'wrong kiosk token gets no config');
ok((await rpc('booth_config', 'nope', ev.token)) === null, 'unknown event gets no config');
const cfg = await rpc('booth_config', 'acme-launch', ev.token);
ok(cfg?.name === 'Acme Launch' && cfg.config.accent === '#2563EB', 'right token gets the config');
ok(!JSON.stringify(cfg).includes(ev.token), 'config never contains the token');
await db.query(`update public.booth_events set active = false where id = $1`, [ev.id]);
ok((await rpc('booth_config', 'acme-launch', ev.token)) === null, 'inactive event gets no config');
await db.query(`update public.booth_events set active = true, starts_at = now() + interval '1 hour' where id = $1`, [ev.id]);
ok((await rpc('booth_config', 'acme-launch', ev.token)) === null, 'event that has not started gets no config');
await db.query(`update public.booth_events set starts_at = null, ends_at = now() - interval '1 hour' where id = $1`, [ev.id]);
ok((await rpc('booth_config', 'acme-launch', ev.token)) === null, 'event that has ended gets no config');
ok((await rpc('booth_register_photo', 'acme-launch', ev.token, code(0))) !== null, 'but queued photos can still be registered shortly after the end');
await db.query(`delete from public.booth_photos`);
await db.query(`update public.booth_events set ends_at = now() - interval '4 days' where id = $1`, [ev.id]);
ok(await fails(() => rpc('booth_register_photo', 'acme-launch', ev.token, code(0)), 'invalid_event'), 'not after the 3-day grace period');
await db.query(`update public.booth_events set ends_at = null where id = $1`, [ev.id]);

// --- register / upload / confirm ----------------------------------------------------------
ok(await fails(() => rpc('booth_register_photo', 'acme-launch', ev.token, 'short'), 'invalid_code'), 'bad photo codes are rejected');
ok(await fails(() => rpc('booth_register_photo', 'acme-launch', 'wrong', code(1)), 'invalid_event'), 'registering needs the kiosk token');
const p1 = await rpc('booth_register_photo', 'acme-launch', ev.token, code(1));
ok(p1 === `${ev.id}/${code(1)}.jpg`, 'registering returns the storage path');
ok((await rpc('booth_register_photo', 'acme-launch', ev.token, code(1))) === p1, 'registering the same code again is a no-op (queue retries)');

const upload = (name) => asAnon(() => db.query(`insert into storage.objects (bucket_id, name) values ('photos', $1)`, [name]));
ok(await fails(() => upload(`${ev.id}/${code(9)}.jpg`)), 'anon cannot upload to a path nobody registered');
ok(await fails(() => asAnon(() => db.query(`insert into storage.objects (bucket_id, name) values ('branding', $1)`, [p1]))), 'anon cannot upload to the branding bucket');
ok(await fails(() => rpc('booth_confirm_photo', 'acme-launch', ev.token, code(1)), 'not_uploaded'), 'confirming before the file arrived fails');
ok((await rpc('photo_get', code(1)))?.status === 'pending', 'guest sees "pending" until the photo is confirmed');
await upload(p1);
ok(true, 'anon can upload to a registered, pending path');
ok(await fails(() => upload(p1)), 'the same path cannot be uploaded twice');
ok((await rpc('booth_confirm_photo', 'acme-launch', ev.token, code(1))) === true, 'confirming after the upload works');
ok((await rpc('booth_confirm_photo', 'acme-launch', ev.token, code(1))) === true, 'confirming twice is fine');

// --- guest -------------------------------------------------------------------------------
const got = await rpc('photo_get', code(1));
ok(got?.status === 'ready' && got.path === p1 && got.event.name === 'Acme Launch' && got.event.accent === '#2563EB', 'guest gets the photo with event branding');
ok((await rpc('photo_get', code(5))) === null, 'unknown code gets nothing');
ok((await rpc('photo_get', 'not a code')) === null, 'malformed code gets nothing');
await db.query(`update public.booth_photos set expires_at = now() - interval '1 minute' where code = $1`, [code(1)]);
ok((await rpc('photo_get', code(1))) === null, 'expired photos are not shown');
await db.query(`update public.booth_photos set expires_at = now() + interval '1 day' where code = $1`, [code(1)]);
ok((await rpc('photo_delete', code(1))) === true, 'guest can delete their photo');
ok((await rpc('photo_get', code(1))) === null, 'a deleted photo is gone immediately');
ok((await rpc('photo_delete', code(1))) === false, 'deleting twice reports nothing to delete');
ok((await rpc('booth_confirm_photo', 'acme-launch', ev.token, code(1))) === false, 'a deleted photo cannot be confirmed again');

// --- quota -------------------------------------------------------------------------------
// Limit is 3. code(1) was deleted, so only code(2) and code(3) count so far.
await rpc('booth_register_photo', 'acme-launch', ev.token, code(2));
await rpc('booth_register_photo', 'acme-launch', ev.token, code(3));
ok((await rpc('booth_register_photo', 'acme-launch', ev.token, code(4))) !== null, 'deleted photos do not count towards the limit');
ok(await fails(() => rpc('booth_register_photo', 'acme-launch', ev.token, code(6)), 'quota_reached'), 'photo limit is enforced');
ok((await rpc('booth_register_photo', 'acme-launch', ev.token, code(2))) !== null, 'retrying an already registered photo still works at the limit');

// --- isolation between events -------------------------------------------------------------
const ev2 = await one(`insert into public.booth_events (slug, name) values ('other-event', 'Other') returning id, kiosk_token as token`);
ok(await fails(() => rpc('booth_register_photo', 'other-event', ev2.token, code(2)), 'invalid_code'), "one event cannot claim another event's photo code");
ok(await fails(() => rpc('booth_confirm_photo', 'other-event', ev2.token, code(2)), 'invalid_code'), "one event cannot confirm another event's photo");

// --- retention ---------------------------------------------------------------------------
const row = await one(
  `select (expires_at - created_at) between interval '29 days 23 hours' and interval '30 days 1 hour' as good from public.booth_photos where code = $1`,
  [code(2)],
);
ok(row.good === true, 'photos expire after the event retention period (30 days)');

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll SQL checks passed.');
await db.close();
process.exit(failures ? 1 : 0);
