/**
 * Enforced Content-Security-Policy for the static site.
 *
 * vercel.json, public/_headers and the dev/test servers all use cspHeader() so the
 * string cannot drift. The comments on each directive are the reason it is there.
 * There is no stricter Content-Security-Policy-Report-Only header: the exceptions
 * below are the ones the demos actually hit (inline styles, blob workers, wasm),
 * and reporting those again on every page would only add console noise. We have
 * no report collector.
 *
 * Optional deploy-time origins are NOT in this list. When you set them, add the
 * origin here too or the browser will block the request:
 *   - VITE_FORM_ENDPOINT  → connect-src (the contact form POSTs JSON with fetch)
 *   - VITE_TWIN_WS_URL    → connect-src (the digital twin's live plant feed)
 * Booth frames and logos are uploaded to the project's Supabase storage bucket,
 * which https://*.supabase.co already covers.
 */

/** @typedef {{ connect?: string[], img?: string[] }} CspExtra */

/** Directives in the order they are serialised. Values are CSP sources. */
export const CSP_DIRECTIVES = [
  // Everything not listed below is this origin only.
  ['default-src', ["'self'"]],
  // Stop <base href> from retargeting relative URLs.
  ['base-uri', ["'self'"]],
  // No plugins (Flash, PDF objects).
  ['object-src', ["'none'"]],
  // Clickjacking: only this site may frame these pages. Meta tags cannot set this,
  // so it has to be an HTTP header (vercel.json source "/(.*)" covers 404.html,
  // spa.html and the booth rewrites). X-Frame-Options: SAMEORIGIN is sent as well
  // for browsers that ignore frame-ancestors.
  ['frame-ancestors', ["'self'"]],
  // The contact form never navigates; it fetch()es. Block form posts elsewhere.
  ['form-action', ["'self'"]],
  // The app never embeds a frame. model-viewer and the AR engines do not create one.
  ['frame-src', ["'none'"]],
  // Scripts:
  //   'self'             — the Vite bundle, /mediapipe/*.js and /meshopt-decoder.js
  //   'wasm-unsafe-eval' — WebAssembly.instantiate / instantiateStreaming. MediaPipe,
  //                        model-viewer's Meshopt decoder, and the 8th Wall SLAM build
  //                        all compile Wasm. This is NOT 'unsafe-eval': it does not
  //                        allow eval() or new Function(). The one new Function() in
  //                        the 8th Wall loader only runs when globalThis is missing,
  //                        which it is not in the browsers we ship to (Chrome 103+,
  //                        Firefox 102+, Safari 16.4+ understand wasm-unsafe-eval).
  //   https://cdn.jsdelivr.net — 8th Wall is loaded on demand from
  //                        cdn.jsdelivr.net/npm/@8thwall/engine-binary (xr.js, then a
  //                        dynamic import of xr-slam.js). Host-source only; CSP ignores
  //                        paths, so the host is the tightest source we can write.
  //                        The engine also names cdn.8thwall.com Draco files, but this
  //                        site decodes GLBs with the local Meshopt decoder and never
  //                        calls that loader, so that host is not allowed.
  // No 'unsafe-inline' and no 'unsafe-eval'. JSON-LD blocks are type=application/ld+json,
  // which browsers do not treat as scripts.
  ['script-src', ["'self'", "'wasm-unsafe-eval'", 'https://cdn.jsdelivr.net']],
  // Styles:
  //   'unsafe-inline' — React style attributes (progress bars, charts, the map),
  //     the noindex 404.html shell's style attribute, and style attributes set by
  //     model-viewer / MindAR. A nonce would have to be injected into every static
  //     HTML file and every library that sets element.style, which this host cannot do.
  //   https://fonts.googleapis.com — the Inter / Manrope / Noto Sans Thai stylesheet
  //     linked from index.html. No other style host is used.
  ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
  // The font files that stylesheet requests. No data: font embeds.
  ['font-src', ["'self'", 'https://fonts.gstatic.com']],
  // Images:
  //   data: — Floor AR draws the 8th Wall screenshot (data:image/jpeg) into an <img>
  //   blob: — photo-booth and face-filter previews use URL.createObjectURL
  //   https://*.supabase.co — guest photos, booth logos and customer frames are
  //     public objects on the project's Supabase storage host
  // Not https: (any host). A logo pasted into the database from somewhere else will
  // not load; the booth admin uploads branding into that bucket.
  ['img-src', ["'self'", 'data:', 'blob:', 'https://*.supabase.co']],
  // Video files are same-origin. blob: is MindAR assigning the camera stream with
  // video.src = URL.createObjectURL(stream) (a media URL, not a script).
  ['media-src', ["'self'", 'blob:']],
  // Fetches:
  //   'self' — models, MediaPipe wasm, panoramas
  //   blob:  — three.js GLTFLoader turns embedded GLB images into blob: URLs and
  //            then fetch()es them. img-src blob: covers <img>, not fetch().
  //            The URLs are created by this page; this does not allow a remote host.
  //   data:  — the 8th Wall SLAM build embeds its Wasm as a data: URL and then
  //            fetch()es it (Emscripten). That is connect-src, not script-src.
  //   https://fonts.googleapis.com and https://fonts.gstatic.com — index.html
  //     preconnects to both. A preconnect is a connection, so the browser checks
  //     connect-src, not style-src or font-src (those still cover the stylesheet
  //     and the font files). These hosts cannot run scripts.
  //   https://*.supabase.co — booth REST RPCs and storage uploads
  //   https://cdn.jsdelivr.net — added only if a test shows the engine fetch()es
  //     the CDN. Dynamic import() of xr-slam.js is script-src, not connect-src.
  // No https: and no wss:. The app does not open a Supabase realtime socket.
  // Test servers append their mock origins (see CSP_EXTRA_CONNECT); those are not
  // part of the deployed policy.
  ['connect-src', ["'self'", 'blob:', 'data:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://*.supabase.co']],
  // Workers. MediaPipe runs Wasm on the main thread. These libraries spawn blob:
  // workers (the worker source is a Blob, not a file on the CDN):
  //   - MindAR / TensorFlow.js (image tracking on /print-ar and /ar-hunt)
  //   - model-viewer and three.js MeshoptDecoder (every compressed GLB)
  //   - 8th Wall (semantics / camera workers inside the SLAM chunk)
  // 'self' covers a worker served as a same-origin file if one is added later.
  // TF.js also has a data:application/javascript worker fallback. We do not allow
  // data: workers; the blob: path is the one that runs when blob: is permitted.
  ['worker-src', ["'self'", 'blob:']],
  // Browsers that predate worker-src (Safari before 15.5) fall back to child-src,
  // then script-src. Mirror worker-src so those phones can still start the blob workers.
  ['child-src', ["'self'", 'blob:']],
];

const EXTRA_KEYS = { connect: 'connect-src', img: 'img-src' };

/**
 * @param {CspExtra} [extra] Origins added for a test server. Ignored when empty.
 * @returns {string}
 */
export function cspHeader(extra = {}) {
  /** @type {Map<string, string[]>} */
  const map = new Map(CSP_DIRECTIVES.map(([name, sources]) => [name, [...sources]]));
  for (const [field, directive] of Object.entries(EXTRA_KEYS)) {
    const sources = extra[field] ?? [];
    const list = map.get(directive);
    for (const source of sources) {
      if (source && !list.includes(source)) list.push(source);
    }
  }
  return [...map].map(([name, sources]) => `${name} ${sources.join(' ')}`).join('; ');
}

/** Headers sent on every response, including 404.html and spa.html. */
export function securityHeaders(extra = {}) {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), xr-spatial-tracking=(self)' },
    { key: 'Content-Security-Policy', value: cspHeader(extra) },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  ];
}

/** @returns {CspExtra} */
export function cspExtraFromEnv(env = process.env) {
  const split = (value) => (value ?? '').split(/\s+/).filter(Boolean);
  return { connect: split(env.CSP_EXTRA_CONNECT), img: split(env.CSP_EXTRA_IMG) };
}
