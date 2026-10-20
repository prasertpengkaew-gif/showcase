#!/usr/bin/env node
// Admin tool for the AR Photo Booth Studio: set up events for customers, get the booth link,
// export the photos and delete expired ones. It uses the Supabase SERVICE-ROLE key, which can do
// anything, so it must only ever run on your own computer (or a CI secret) — never in the website.
//
//   node scripts/booth-admin.mjs create events/acme.json     create an event, print the booth link
//   node scripts/booth-admin.mjs update events/acme.json     change settings (the link stays the same)
//   node scripts/booth-admin.mjs link <slug>                 print the booth link again
//   node scripts/booth-admin.mjs rotate-token <slug>         new link; the old one stops working
//   node scripts/booth-admin.mjs list                        all events with photo counts
//   node scripts/booth-admin.mjs stats <slug>                photo counts for one event
//   node scripts/booth-admin.mjs close <slug>                switch the booth off
//   node scripts/booth-admin.mjs export <slug> [folder]      download all photos + an index.csv
//   node scripts/booth-admin.mjs purge [--dry-run]           delete expired and guest-deleted photos
//
// Settings come from the environment or a file named .env.booth in the project folder:
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//   SITE_URL=https://your-site.vercel.app        (used to print booth links)
import { mkdir, readFile, utimes, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadEnv() {
  try {
    for (const line of (await readFile(path.join(root, '.env.booth'), 'utf8')).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // No file: use the real environment.
  }
}
await loadEnv();

const URL_ = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SITE = (process.env.SITE_URL ?? process.env.VITE_PUBLIC_URL ?? '').replace(/\/+$/, '');

const die = (msg) => {
  console.error(`\nError: ${msg}\n`);
  process.exit(1);
};

const ASPECTS = { landscape: 3 / 2, portrait: 2 / 3, square: 1 };

// --- HTTP helpers ---------------------------------------------------------------------------
const headers = (extra = {}) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra });

async function api(method, pathAndQuery, { body, extra, raw } = {}) {
  const res = await fetch(`${URL_}${pathAndQuery}`, {
    method,
    headers: headers({ ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}), ...extra }),
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${pathAndQuery.split('?')[0]} failed: HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  return res;
}

const rows = async (query) => (await api('GET', `/rest/v1/${query}`)).json();

/** Row count for a PostgREST filter, without downloading the rows. */
async function count(table, filter) {
  const res = await api('HEAD', `/rest/v1/${table}?select=id${filter ? `&${filter}` : ''}`, { extra: { Prefer: 'count=exact' } });
  return Number((res.headers.get('content-range') ?? '*/0').split('/')[1]);
}

const boothLink = (slug, token) => `${SITE || 'https://YOUR-SITE'}/booth/${slug}?k=${token}`;

async function findEvent(slug) {
  const [event] = await rows(`booth_events?slug=eq.${encodeURIComponent(slug)}&select=*`);
  if (!event) die(`No event with slug "${slug}". Run "list" to see the events.`);
  return event;
}

// --- Event files ----------------------------------------------------------------------------
function pngSize(buf) {
  return buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG' ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null;
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

async function uploadBranding(slug, dir, file) {
  const full = path.resolve(dir, file);
  const data = await readFile(full).catch(() => die(`File not found: ${full}`));
  if (data.length > 5 * 1024 * 1024) die(`${file} is larger than 5 MB.`);
  const ext = path.extname(file).toLowerCase();
  if (!MIME[ext]) die(`${file}: use PNG, JPG, WebP or SVG.`);
  const name = `${slug}/${path.basename(file, ext).replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}-${randomBytes(3).toString('hex')}${ext}`;
  await api('POST', `/storage/v1/object/branding/${name}`, { body: data, raw: true, extra: { 'Content-Type': MIME[ext], 'x-upsert': 'true' } });
  return { url: `${URL_}/storage/v1/object/public/branding/${name}`, size: pngSize(data) };
}

/** Reads an event file and turns file references (frame, logo) into uploaded URLs. */
async function buildEvent(file) {
  const dir = path.dirname(path.resolve(file));
  let spec;
  try {
    spec = JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    die(`Cannot read ${file}: ${e.message}`);
  }
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(spec.slug ?? '')) die('"slug" must be 3–40 characters: lower-case letters, digits and dashes (e.g. "acme-launch").');
  if (!spec.name || spec.name.length > 80) die('"name" is required (up to 80 characters).');
  const booth = { ...(spec.booth ?? {}) };
  const aspect = booth.aspect ?? 'portrait';
  if (!ASPECTS[aspect]) die(`booth.aspect must be one of: ${Object.keys(ASPECTS).join(', ')}.`);

  if (booth.frame?.file) {
    const { url, size } = await uploadBranding(spec.slug, dir, booth.frame.file);
    if (size) {
      const ratio = size.w / size.h;
      if (Math.abs(ratio / ASPECTS[aspect] - 1) > 0.02) {
        console.warn(`Warning: the frame is ${size.w}×${size.h} but "${aspect}" photos are ${aspect === 'square' ? '1:1' : aspect === 'portrait' ? '2:3' : '3:2'}. It will be cropped to fit.`);
      }
    }
    booth.frame = { kind: 'image', url };
  }
  if (booth.logoFile) {
    booth.logoUrl = (await uploadBranding(spec.slug, dir, booth.logoFile)).url;
    delete booth.logoFile;
  }
  return {
    slug: spec.slug,
    name: spec.name,
    config: booth,
    starts_at: spec.startsAt ?? null,
    ends_at: spec.endsAt ?? null,
    max_photos: spec.maxPhotos ?? null,
    retention_days: spec.retentionDays ?? 30,
    active: spec.active ?? true,
  };
}

// --- Commands -------------------------------------------------------------------------------
const commands = {
  async create(file) {
    if (!file) die('Usage: create <event.json>');
    const event = await buildEvent(file);
    const [exists] = await rows(`booth_events?slug=eq.${event.slug}&select=id`);
    if (exists) die(`An event "${event.slug}" already exists. Use "update" to change it.`);
    const [created] = await (await api('POST', '/rest/v1/booth_events', { body: event, extra: { Prefer: 'return=representation' } })).json();
    console.log(`Created "${created.name}".\n\nBooth link (keep it private, open it on the booth device):\n  ${boothLink(created.slug, created.kiosk_token)}\n`);
  },

  async update(file) {
    if (!file) die('Usage: update <event.json>');
    const event = await buildEvent(file);
    const current = await findEvent(event.slug);
    await api('PATCH', `/rest/v1/booth_events?id=eq.${current.id}`, { body: event });
    console.log(`Updated "${event.name}". Booth devices pick up the new settings the next time the booth page is loaded.\n  ${boothLink(current.slug, current.kiosk_token)}`);
  },

  async link(slug) {
    if (!slug) die('Usage: link <slug>');
    const e = await findEvent(slug);
    console.log(boothLink(e.slug, e.kiosk_token));
  },

  async 'rotate-token'(slug) {
    if (!slug) die('Usage: rotate-token <slug>');
    const e = await findEvent(slug);
    const token = randomBytes(32).toString('hex');
    await api('PATCH', `/rest/v1/booth_events?id=eq.${e.id}`, { body: { kiosk_token: token } });
    console.log(`New booth link (the old one no longer works):\n  ${boothLink(e.slug, token)}`);
  },

  async close(slug) {
    if (!slug) die('Usage: close <slug>');
    const e = await findEvent(slug);
    await api('PATCH', `/rest/v1/booth_events?id=eq.${e.id}`, { body: { active: false } });
    console.log(`"${e.name}" is switched off. Photos already taken stay available until they expire.`);
  },

  async list() {
    const events = await rows('booth_events?select=*&order=created_at.desc');
    if (!events.length) return console.log('No events yet. Create one with: create events/example.json');
    for (const e of events) {
      const ready = await count('booth_photos', `event_id=eq.${e.id}&status=eq.ready`);
      const window = `${e.starts_at ? e.starts_at.slice(0, 10) : '…'} → ${e.ends_at ? e.ends_at.slice(0, 10) : '…'}`;
      console.log(`${e.active ? '●' : '○'} ${e.slug.padEnd(28)} ${String(ready).padStart(5)} photos${e.max_photos ? ` / ${e.max_photos}` : ''}   ${window}   ${e.name}`);
    }
  },

  async stats(slug) {
    if (!slug) die('Usage: stats <slug>');
    const e = await findEvent(slug);
    const by = {};
    for (const s of ['ready', 'pending', 'deleted']) by[s] = await count('booth_photos', `event_id=eq.${e.id}&status=eq.${s}`);
    console.log(`${e.name} (${e.slug}) — ${e.active ? 'active' : 'switched off'}`);
    console.log(`  photos ready:   ${by.ready}${e.max_photos ? ` of ${e.max_photos}` : ''}`);
    console.log(`  still pending:  ${by.pending}   (taken but not uploaded yet)`);
    console.log(`  deleted by guests: ${by.deleted}`);
    console.log(`  kept for:       ${e.retention_days} days after each photo`);
  },

  async export(slug, folder) {
    if (!slug) die('Usage: export <slug> [folder]');
    const e = await findEvent(slug);
    const out = path.resolve(folder ?? `export-${slug}`);
    await mkdir(out, { recursive: true });
    const csv = ['number,file,code,taken_at,guest_link'];
    let n = 0;
    for (let offset = 0; ; offset += 500) {
      const batch = await rows(`booth_photos?event_id=eq.${e.id}&status=eq.ready&select=code,path,created_at&order=created_at.asc&limit=500&offset=${offset}`);
      if (!batch.length) break;
      // Five downloads at a time.
      for (let i = 0; i < batch.length; i += 5) {
        await Promise.all(
          batch.slice(i, i + 5).map(async (p, k) => {
            const num = offset + i + k + 1;
            const res = await fetch(`${URL_}/storage/v1/object/public/photos/${p.path}`);
            if (!res.ok) return console.warn(`  skipped ${p.code}: HTTP ${res.status}`);
            const name = `photo-${String(num).padStart(4, '0')}-${p.code}.jpg`;
            await writeFile(path.join(out, name), Buffer.from(await res.arrayBuffer()));
            await utimes(path.join(out, name), new Date(p.created_at), new Date(p.created_at)).catch(() => {});
            csv.push(`${num},${name},${p.code},${p.created_at},${SITE ? `${SITE}/p/${p.code}` : ''}`);
            n++;
          }),
        );
      }
    }
    await writeFile(path.join(out, 'index.csv'), csv.join('\n') + '\n');
    console.log(`Exported ${n} photos to ${out}`);
  },

  async purge(...args) {
    const dry = args.includes('--dry-run');
    const now = new Date().toISOString();
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    // Expired, deleted by the guest, or registered but never uploaded for a week.
    const filters = [`expires_at=lt.${now}`, 'status=eq.deleted', `status=eq.pending&created_at=lt.${weekAgo}`];
    let files = 0;
    let removed = 0;
    for (const filter of filters) {
      for (;;) {
        const batch = await rows(`booth_photos?${filter}&select=id,path,status&limit=200`);
        if (!batch.length) break;
        if (dry) {
          removed += await count('booth_photos', filter);
          break; // a dry run does not remove anything, so it would loop forever
        }
        // Storage first: if this fails nothing is lost, and the rows are tried again next time.
        // (A photo that never finished uploading may still have a file, so those paths are included.)
        const paths = batch.map((p) => p.path);
        await api('DELETE', '/storage/v1/object/photos', { body: { prefixes: paths } });
        files += paths.length;
        await api('DELETE', `/rest/v1/booth_photos?id=in.(${batch.map((p) => p.id).join(',')})`);
        removed += batch.length;
      }
    }
    console.log(`${dry ? 'Would delete' : 'Deleted'} ${removed} photo record(s)${dry ? '' : ` and ${files} file(s)`}.`);
  },
};

const [cmd, ...args] = process.argv.slice(2);
if (!cmd || cmd === 'help' || cmd === '--help' || !commands[cmd]) {
  console.log(usage());
  process.exit(cmd && !['help', '--help'].includes(cmd) ? 1 : 0);
}
if (!URL_ || !KEY) die('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in the environment or in a .env.booth file).');

try {
  await commands[cmd](...args);
} catch (e) {
  die(e.message);
}

function usage() {
  return [
    'Usage: node scripts/booth-admin.mjs <command>',
    '',
    '  create <event.json>        create an event and print its booth link',
    '  update <event.json>        change an event (the link stays the same)',
    '  link <slug>                print the booth link',
    '  rotate-token <slug>        new link; the old one stops working',
    '  list                       all events',
    '  stats <slug>               photo counts for an event',
    '  close <slug>               switch the booth off',
    '  export <slug> [folder]     download all photos and an index.csv',
    '  purge [--dry-run]          delete expired and guest-deleted photos',
  ].join('\n');
}
