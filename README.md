# Vantage XR — AR Portfolio

A responsive portfolio website for a WebAR / 3D studio, built with **React 19, TypeScript, Vite, Tailwind CSS v4, Three.js, React Three Fiber and Google's `<model-viewer>`**.

Everything on the site works for real: every 3D model is a valid glTF file you can rotate, zoom and place in AR, and every image and video was rendered from those models. The contact form never says a message was sent unless something actually delivered it.

> "Vantage XR" is a placeholder brand name. Change it in `src/config/site.ts`.

---

## Quick start

Requires **Node.js 20.19+** (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script                    | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `npm run dev`             | Start the dev server (also reachable from your LAN)             |
| `npm run build`           | Type-check and build to `dist/`                                 |
| `npm run preview`         | Serve the production build locally                              |
| `npm run typecheck`       | TypeScript only                                                 |
| `npm run validate:models` | Check every file in `public/models` with the Khronos glTF Validator |

---

## Pages

| Route              | Page            | Highlights                                                                                    |
| ------------------ | --------------- | --------------------------------------------------------------------------------------------- |
| `/`                | Home            | Real-time R3F hero (a phone showing an AR placement UI next to an animated robot), featured work, inline 3D/AR demo, services, process, CTA |
| `/projects`        | Projects        | Filter by Industrial, Product, Education, Marketing, Real Estate, Automotive. The filter is saved in the URL (`?category=real-estate`) |
| `/projects/:slug`  | Project details | 3D viewer with finish/animation pickers, overview, technologies, image gallery with lightbox, demo video, related projects |
| `/ar-playground`   | AR Playground   | Pick a chair, robot or car; rotate, zoom, change finish or animation; "View in your space" in AR |
| `/services`        | Services        | WebAR Development, 3D Visualization, Interactive Experiences, AR Consulting                   |
| `/about`           | About           | Company introduction, capabilities, principles, 3D asset credits (no invented credentials)    |
| `/contact`         | Contact         | Validated form, contact details from config                                                   |
| anything else      | 404             | Friendly not-found page                                                                        |

## Project structure

```
public/
  models/            GLB files (chair, robot, car, fox, sofa, sneaker)
  images/posters/    Poster stills shown while each model loads
  images/projects/   Cover + gallery renders per project
  videos/            Turntable videos per project (.webm + .mp4)
scripts/
  validate-models.mjs   Khronos glTF validation for public/models
  render-media.mjs      Re-renders posters, project images and videos from the GLBs
src/
  components/        Navbar, HeroSection, HeroScene, ProjectCard, ProjectGrid, ProjectFilters,
                     ModelViewer, ModelExplorer, ARSupportNotice, ServiceCard, ContactForm, …
  pages/             Home, Projects, ProjectDetail, ARPlayground, Services, About, Contact, NotFound
  data/              projects.ts, models.ts, services.ts
  types/             project.ts, model-viewer.d.ts (JSX types for <model-viewer>)
  config/site.ts     Company name, contact details, social links
  hooks/, lib/       Reduced motion, lazy-in-view, device/AR capability detection
  App.tsx, main.tsx, index.css
```

---

## Adding your company's contact details

Contact details come from environment variables so you don't have to edit code:

```bash
cp .env.example .env.local
```

```ini
VITE_CONTACT_EMAIL=hello@yourcompany.com
VITE_CONTACT_PHONE=+66 2 123 4567
VITE_CONTACT_ADDRESS=123 Example Road, Bangkok 10110
VITE_CONTACT_HOURS=Mon–Fri, 9:00–18:00
VITE_FORM_ENDPOINT=https://formspree.io/f/yourFormId
VITE_LINKEDIN_URL=https://www.linkedin.com/company/yourcompany
```

Restart `npm run dev` after editing. On Vercel, Netlify and similar hosts, add the same variables in the project's environment settings. Empty values are simply left off the site.

The company name, tagline and description are set in `src/config/site.ts`.

### How the contact form delivers messages

The form validates in the browser (required fields, email format, message length, plus a hidden honeypot field to catch spam bots) and then:

| Configuration                 | What happens on submit                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `VITE_FORM_ENDPOINT` is set   | Sends a JSON `POST` to that HTTPS URL. Shows "Message sent" only when the server replies `2xx`, and an error message otherwise. |
| Only `VITE_CONTACT_EMAIL` set | Opens the visitor's email app with the message already written. The page says clearly that nothing is sent until they press send. |
| Neither set                   | The form is shown but disabled, with a notice that it isn't connected yet.                      |

The JSON body is `{ name, email, company, projectType, message }`. This works with Formspree, Getform, Basin, a serverless function, or your own API. The endpoint has to accept cross-origin requests from your domain.

---

## Adding your own 3D models (GLB / glTF)

1. **Export or convert** the model to **glTF 2.0**. A single `.glb` file is easiest. Blender, 3ds Max, Cinema 4D, Maya and most CAD tools can export it, or you can convert with [gltf-transform](https://gltf-transform.dev/).
2. **Use real-world units**: 1 unit = 1 metre, Y axis up, origin at the base of the object, so it sits on the floor in AR at the right size.
3. **Optimize for phones.** Aim for under about 5 MB, textures at 1024–2048 px, and under about 100k triangles. For example:
   ```bash
   npx @gltf-transform/cli resize in.glb out.glb --width 1024 --height 1024
   ```
4. **Copy** the file to `public/models/`, for example `public/models/lamp.glb`.
5. **Validate** it:
   ```bash
   npm run validate:models
   ```
6. **Register it** in `src/data/models.ts`. Add the id to the `ModelId` union in `src/types/project.ts` first:
   ```ts
   lamp: {
     id: 'lamp',
     name: 'Desk Lamp',
     src: '/models/lamp.glb',
     poster: '/images/posters/lamp.webp',
     alt: 'Brass desk lamp with an adjustable arm',
     dimensions: '45 cm tall',
     variants: ['Brass', 'Black'],      // optional: KHR_materials_variants names, exactly as in the file
     animations: ['Open'],              // optional: animation clip names, exactly as in the file
     cameraOrbit: '30deg 75deg auto',
     credit: { title: 'Desk Lamp', author: 'Your Studio', license: 'CC BY 4.0', sourceUrl: 'https://…' },
   },
   ```
   To use your own credit wording, widen the `license` type in `ModelCredit` first.
7. To show it in the **AR Playground**, add the id to `playgroundModelIds` in the same file.

**iOS (Quick Look):** `<model-viewer>` turns the GLB into USDZ on the fly, so iOS works without extra files. For the best Quick Look result (or for features that can't be converted), export a `.usdz` yourself and set `iosSrc: '/models/lamp.usdz'`.

**External hosting:** `src` can be an absolute HTTPS URL, but that server must send CORS headers allowing your domain.

---

## Adding images, videos and projects

### Project images

Each project uses `public/images/projects/<slug>/cover.webp` plus `1.webp`, `2.webp`, `3.webp` (1440 × 960, 3:2). To use photography or your own renders, replace those files and keep the same names, or edit the `image()` calls in `src/data/projects.ts`. Use WebP or AVIF at about 80% quality, and always write a meaningful `alt`.

All images load lazily, reserve their space so the layout doesn't jump, and show a fallback if a file is missing.

### Videos

Put `<slug>.webm` (VP9) and `<slug>.mp4` (H.264) in `public/videos/`. The browser plays the first format it supports. Leave `video` out of a project to hide its video section.

### Re-rendering the included media

The posters, project images and videos were generated from the GLBs with headless Chromium. To regenerate them after changing a model:

```bash
npx playwright install chromium   # once
node scripts/render-media.mjs     # needs ffmpeg with libx264 and libvpx-vp9
node scripts/render-media.mjs --images --only=lounge-chair-configurator
```

Camera angles, backgrounds, variants and animation poses for each shot are set at the top of the script.

### Adding a project

Add an entry to `projects` in `src/data/projects.ts`. The `Project` type in `src/types/project.ts` describes every field. Set `kind: 'client'` only for real, approved case studies. The site labels `kind: 'concept'` entries as "Studio concept".

---

## AR: how it works and device support

The `ModelViewer` component wraps `<model-viewer>` with `ar-modes="webxr scene-viewer quick-look"`:

| Device                  | AR mode used                    | Requirements                                                  |
| ----------------------- | ------------------------------- | ------------------------------------------------------------- |
| iPhone / iPad           | Apple AR Quick Look             | iOS 12+, Safari (some in-app browsers block Quick Look)       |
| Android                 | WebXR, else Google Scene Viewer | Chrome + a device certified for Google Play Services for AR   |
| Desktop / other devices | Interactive 3D only             | WebGL                                                         |

The viewer has a state for everything that can happen:

- **Loading:** a poster image plus a progress bar.
- **Load error:** a message and a "Try again" button.
- **No WebGL:** a still image with an explanation.
- **AR session:** status messages while AR starts and after the model is placed.
- **AR unavailable:** an explanation suited to the device (for example, desktop users get a copy-link button to open the page on their phone).

### Testing AR on a phone

AR only works over **HTTPS**. Browsers block camera access and WebXR on insecure pages, except on `localhost`. Also, Android's **Scene Viewer downloads the model from the page's public URL**, so it can't reach a dev server on your laptop.

Options:

- **Deploy a preview** (Vercel, Netlify, Cloudflare Pages). This is the easiest and most realistic test.
- **Use an HTTPS tunnel** to your dev server, e.g. `npx cloudflared tunnel --url http://localhost:5173` or ngrok, then open the HTTPS URL on your phone. Vite may block unknown hosts; if so, add the tunnel host to `server.allowedHosts` in `vite.config.ts`.

---

## Accessibility & performance

- Semantic landmarks, a skip link, page titles, keyboard-operable menu (with focus trap and Escape to close), radio-based pickers, `aria-pressed` filters, a lightbox using native `<dialog>`, and form errors linked with `aria-describedby` plus an error summary.
- `prefers-reduced-motion`: the hero stops animating and renders one still frame, auto-rotate turns off, animations pause, and CSS transitions are removed.
- Route-level code splitting. three.js, R3F and model-viewer load only when a 3D view is needed. Viewers load when they scroll near the viewport.
- The hero has fallbacks for no WebGL and for render errors.

## Deployment

`npm run build` outputs a static site to `dist/`. Because it's a single-page app, the host must serve `index.html` for unknown paths:

- **Vercel:** `vercel.json` is included.
- **Netlify:** `public/_redirects` is included.
- **Others:** configure an SPA fallback to `/index.html`.

## 3D asset credits

The sample models are openly licensed (CC0 1.0 or CC BY 4.0). Full credits are on the About page and in `src/data/models.ts`.

| Model   | Source                                                     | License |
| ------- | ---------------------------------------------------------- | ------- |
| Chair   | SheenChair — Eric Chadwick / Wayfair (Khronos samples)     | CC0 1.0 |
| Robot   | RobotExpressive — Tomás Laulhé / Don McCurdy (three.js)    | CC0 1.0 |
| Car     | ToyCar — Guido Odendahl, Eric Chadwick (Khronos samples)   | CC0 1.0 |
| Fox     | Fox — PixelMannen, tomkranis, AsoboStudio & scurest        | CC BY 4.0 |
| Sofa    | GlamVelvetSofa — Eric Chadwick / Wayfair (Khronos samples) | CC BY 4.0 |
| Sneaker | MaterialsVariantsShoe — Shopify (Khronos samples)          | CC BY 4.0 |

Changes made here: the robot was rescaled to 1.2 m and its skin weights were normalized to pass validation; the car was enlarged 10×; the fox was scaled to real-world size; and the sneaker's textures were resized to 1024 px.
