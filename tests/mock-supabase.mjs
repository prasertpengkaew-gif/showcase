// A small stand-in for the parts of Supabase the booth uses, implementing the same rules as
// supabase/migrations/…_booth_studio.sql so the browser code and scripts/booth-admin.mjs can be tested
// end to end: the public RPC functions and storage (with the anon key), and a tiny PostgREST-style
// table API (with the service-role key). The SQL itself is tested against real Postgres in tests/booth-sql.mjs.
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';

export const ANON_KEY = 'test-anon-key';
export const SERVICE_KEY = 'test-service-key';
const CODE = /^[a-z2-7]{12}$/;
// 1x1 transparent PNG, used as a customer frame.
export const FRAME_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

export async function startMockSupabase() {
  const state = {
    // Rows have the same columns as the real tables.
    events: [
      {
        id: 'event-1',
        slug: 'acme-launch',
        kiosk_token: 'kiosk-token-for-acme-launch-0123456789abcdef0123456789abcdef',
        name: 'Acme Launch Night',
        config: { language: 'en', aspect: 'portrait', subtitle: '20 Oct · Bangkok', countdown: 1, reviewSeconds: 30, accent: '#0ea5e9', props: ['glasses', 'none'], frame: { kind: 'preset', theme: 'neon' } },
        starts_at: null,
        ends_at: null,
        max_photos: null,
        retention_days: 30,
        active: true,
        created_at: new Date().toISOString(),
      },
    ],
    photos: [],
    objects: new Map(), // "bucket/path" -> { type, bytes }
    failUploads: false,
    requests: [],
  };

  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const fail = (res, message) => json(res, 400, { code: 'P0001', message });
  const inWindow = (e, graceMs) => (!e.starts_at || Date.now() >= Date.parse(e.starts_at)) && (!e.ends_at || Date.now() <= Date.parse(e.ends_at) + graceMs);
  const event = (slug, token, graceMs = 0) => state.events.find((e) => e.slug === slug && e.kiosk_token === token && e.active && inWindow(e, graceMs));
  const photoByCode = (code) => state.photos.find((p) => p.code === code);

  const rpc = {
    booth_config: ({ p_slug, p_token }) => {
      const e = event(p_slug, p_token);
      return e ? { slug: e.slug, name: e.name, config: e.config, retentionDays: e.retention_days, endsAt: e.ends_at } : null;
    },
    booth_register_photo: ({ p_slug, p_token, p_code }) => {
      if (!CODE.test(p_code ?? '')) throw new Error('invalid_code');
      const e = event(p_slug, p_token, 3 * 864e5);
      if (!e) throw new Error('invalid_event');
      const existing = photoByCode(p_code);
      if (existing) {
        if (existing.event_id !== e.id) throw new Error('invalid_code');
        return existing.path;
      }
      const used = state.photos.filter((p) => p.event_id === e.id && p.status !== 'deleted').length;
      if (e.max_photos !== null && used >= e.max_photos) throw new Error('quota_reached');
      const path = `${e.id}/${p_code}.jpg`;
      state.photos.push({ id: randomUUID(), event_id: e.id, code: p_code, path, status: 'pending', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + e.retention_days * 864e5).toISOString() });
      return path;
    },
    booth_confirm_photo: ({ p_slug, p_token, p_code }) => {
      const e = event(p_slug, p_token, 3 * 864e5);
      if (!e) throw new Error('invalid_event');
      const p = photoByCode(p_code);
      if (!p || p.event_id !== e.id) throw new Error('invalid_code');
      if (p.status === 'deleted') return false;
      if (!state.objects.has(`photos/${p.path}`)) throw new Error('not_uploaded');
      p.status = 'ready';
      return true;
    },
    photo_get: ({ p_code }) => {
      const p = CODE.test(p_code ?? '') ? photoByCode(p_code) : null;
      if (!p || p.status === 'deleted' || Date.parse(p.expires_at) <= Date.now()) return null;
      if (p.status === 'pending') return { status: 'pending' };
      const e = state.events.find((x) => x.id === p.event_id);
      return {
        status: 'ready',
        path: p.path,
        createdAt: p.created_at,
        expiresAt: p.expires_at,
        event: { name: e.name, subtitle: e.config.subtitle ?? null, logoUrl: e.config.logoUrl ?? null, accent: e.config.accent ?? null },
      };
    },
    photo_delete: ({ p_code }) => {
      const p = photoByCode(p_code);
      if (!p || p.status === 'deleted') return false;
      p.status = 'deleted';
      return true;
    },
  };

  /** PostgREST-style filters (eq / lt / in) on top-level columns. */
  const filtered = (table, params) => {
    let list = [...state[table]];
    for (const [key, value] of params) {
      if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
      const m = value.match(/^(eq|lt|in)\.(.*)$/);
      if (!m) continue;
      const [, op, arg] = m;
      list = list.filter((row) => {
        const v = String(row[key]);
        if (op === 'eq') return v === arg;
        if (op === 'lt') return v < arg;
        return arg.replace(/^\(|\)$/g, '').split(',').includes(v);
      });
    }
    const order = params.get('order');
    if (order) {
      const [col, dir] = order.split('.');
      list.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    return list;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'apikey, authorization, content-type, x-upsert, x-client-info');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    res.setHeader('access-control-expose-headers', 'content-range');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    state.requests.push(`${req.method} ${url.pathname}`);

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const publicObject = url.pathname.match(/^\/storage\/v1\/object\/public\/(photos|branding)\/(.+)$/);
      if (req.method === 'GET' && publicObject) {
        const [, bucket, key] = publicObject;
        if (bucket === 'branding' && key === 'frame.png') {
          res.writeHead(200, { 'content-type': 'image/png' });
          return res.end(FRAME_PNG);
        }
        const obj = state.objects.get(`${bucket}/${key}`);
        if (!obj) return json(res, 404, { message: 'not found' });
        res.writeHead(200, { 'content-type': obj.type, ...(url.searchParams.has('download') ? { 'content-disposition': 'attachment' } : {}) });
        return res.end(obj.bytes);
      }

      const admin = req.headers.apikey === SERVICE_KEY;
      if (req.headers.apikey !== ANON_KEY && !admin) return json(res, 401, { message: 'Invalid API key' });

      // Public functions: anon key (the service key may call them too).
      const fn = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      if (req.method === 'POST' && fn && rpc[fn[1]]) {
        try {
          return json(res, 200, rpc[fn[1]](JSON.parse(body.toString() || '{}')));
        } catch (e) {
          return fail(res, e.message);
        }
      }

      const upload = url.pathname.match(/^\/storage\/v1\/object\/photos\/(.+)$/);
      if (req.method === 'POST' && upload) {
        if (state.failUploads) return json(res, 503, { message: 'unavailable' });
        const key = `photos/${upload[1]}`;
        const registered = state.photos.find((p) => p.path === upload[1] && p.status === 'pending');
        if (!admin && !registered) return json(res, 403, { message: 'new row violates row-level security policy' });
        if (state.objects.has(key)) return json(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
        state.objects.set(key, { type: req.headers['content-type'], bytes: body });
        return json(res, 200, { Key: key });
      }

      // Everything below is admin-only (service-role key), like the real tables and branding bucket.
      if (!admin) return json(res, 403, { message: 'permission denied' });

      const branding = url.pathname.match(/^\/storage\/v1\/object\/branding\/(.+)$/);
      if (req.method === 'POST' && branding) {
        state.objects.set(`branding/${branding[1]}`, { type: req.headers['content-type'], bytes: body });
        return json(res, 200, { Key: `branding/${branding[1]}` });
      }
      if (req.method === 'DELETE' && url.pathname === '/storage/v1/object/photos') {
        const { prefixes = [] } = JSON.parse(body.toString() || '{}');
        for (const p of prefixes) state.objects.delete(`photos/${p}`);
        return json(res, 200, prefixes.map((name) => ({ name })));
      }

      const table = url.pathname.match(/^\/rest\/v1\/(booth_events|booth_photos)$/);
      if (table) {
        const name = table[1] === 'booth_events' ? 'events' : 'photos';
        if (req.method === 'GET' || req.method === 'HEAD') {
          let list = filtered(name, url.searchParams);
          const total = list.length;
          const offset = Number(url.searchParams.get('offset') ?? 0);
          const limit = Number(url.searchParams.get('limit') ?? 1000);
          list = list.slice(offset, offset + limit);
          res.setHeader('content-range', `${list.length ? `${offset}-${offset + list.length - 1}` : '*'}/${total}`);
          if (req.method === 'HEAD') return res.writeHead(200).end();
          return json(res, 200, list);
        }
        if (req.method === 'POST' && name === 'events') {
          const row = JSON.parse(body.toString());
          if (state.events.some((e) => e.slug === row.slug)) return json(res, 409, { message: 'duplicate key value violates unique constraint' });
          const created = { id: randomUUID(), kiosk_token: randomBytes(32).toString('hex'), created_at: new Date().toISOString(), ...row };
          state.events.push(created);
          return json(res, 201, [created]);
        }
        if (req.method === 'PATCH') {
          const patch = JSON.parse(body.toString());
          const list = filtered(name, url.searchParams);
          list.forEach((row) => Object.assign(row, patch));
          return json(res, 200, list);
        }
        if (req.method === 'DELETE') {
          const ids = new Set(filtered(name, url.searchParams).map((r) => r.id));
          state[name] = state[name].filter((r) => !ids.has(r.id));
          return json(res, 200, []);
        }
      }
      json(res, 404, { message: 'not found' });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    state,
    event: state.events[0],
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
