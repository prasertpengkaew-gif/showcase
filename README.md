# TheNerdStudio — AR & VR Portfolio

A responsive, bilingual (Thai / English) portfolio website for a WebAR, VR, Face AR and 3D studio, built with **React 19, TypeScript, Vite, Tailwind CSS v4, Three.js, React Three Fiber, `@react-three/xr`, Google's `<model-viewer>` and MediaPipe Face Landmarker**.

Everything on the site works for real: every 3D model is a valid glTF file you can rotate, zoom and place in AR, and every image and video was rendered from those models. The contact form never says a message was sent unless something actually delivered it.

> Brand name and default contact email (thenerdstudio@gmail.com) are set in `src/config/site.ts`.
> A 5-minute client presentation script (Thai) is in [`docs/PITCH-TH.md`](docs/PITCH-TH.md).

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
| `npm run test:e2e`        | End-to-end + accessibility (axe-core) checks in headless Chromium |
| `npm run render:media`    | Re-render posters, project images and videos from the GLBs       |
| `npm run render:panoramas`| Re-render the 360° tour panoramas from the GLBs                  |
| `npm run make:ar-card`    | Rebuild the printable AR card and its compiled MindAR target     |

---

## Pages

| Route              | Page            | Highlights                                                                                    |
| ------------------ | --------------- | --------------------------------------------------------------------------------------------- |
| `/`                | Home            | Real-time R3F hero (a phone showing an AR placement UI next to an animated robot), featured work, inline 3D/AR demo, services, process, CTA |
| `/projects`        | Projects        | Filter by Industrial, Product, Education, Marketing, Real Estate, Automotive. The filter is saved in the URL (`?category=real-estate`) |
| `/projects/:slug`  | Project details | 3D viewer with finish/animation pickers, overview, technologies, image gallery with lightbox, demo video **or** a hands-on "Test it yourself" section with a QR code, related projects |
| `/ar-playground`   | AR Playground   | Pick a chair, robot or car; rotate, zoom, change finish or animation; "View in your space" in AR |
| `/vr-showroom`     | VR Showroom     | Real-scale virtual gallery: orbit in 3D on any screen, **Enter VR** on Meta Quest and other WebXR headsets (thumbstick movement) |
| `/demos`           | Demos hub       | One page linking all six live demos (with a QR code to open it on a phone) |
| `/print-ar`        | Print AR        | Image tracking: point a phone at the printable sample card and a 3D chair stands up on it (MindAR) |
| `/try-on`          | Virtual Try-On  | Body tracking (MediaPipe Pose): cap, necklace, watch and a simple 2D T-shirt follow the person; save photo; photo fallback |
| `/hand-gestures`   | Hand gestures   | Camera hand tracking: 7 gestures (✋👍✌️☝️👎✊🤟) trigger robot animations; photo fallback (MediaPipe Gesture Recognizer) |
| `/virtual-tour`    | Virtual Tour 360° | 3-room 360° tour with door and info hotspots, drag/zoom, phone motion sensor, VR on headsets |
| `/face-ar`         | Face AR         | Live camera face tracking (468-point mesh, expressions, head tilt), sunglasses/crown effects, save photo, photo upload fallback — all on-device |
| `/services`        | Services        | WebAR Development, VR Development, Face AR & Face Tracking, 3D Visualization, Interactive Experiences, AR Consulting |
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
  config/site.ts     Company name, contact details (email, phone, LINE), social links
  i18n/              en.ts / th.ts interface text, content.th.ts (Thai project/service/model copy), hooks
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
VITE_CONTACT_EMAIL=thenerdstudio@gmail.com
VITE_CONTACT_PHONE=+66 2 123 4567
VITE_CONTACT_ADDRESS=123 Example Road, Bangkok 10110
VITE_CONTACT_HOURS=Mon–Fri, 9:00–18:00
VITE_FORM_ENDPOINT=https://formspree.io/f/yourFormId
VITE_LINE_URL=https://line.me/R/ti/p/@yourlineid
VITE_LINE_ID=@yourlineid
VITE_FACEBOOK_URL=https://www.facebook.com/yourpage
VITE_LINKEDIN_URL=https://www.linkedin.com/company/yourcompany
```

Restart `npm run dev` after editing. On Vercel, Netlify and similar hosts, add the same variables in the project's environment settings. Empty values are simply left off the site.

The company name, tagline and description are set in `src/config/site.ts`.

### How the contact form delivers messages

The form validates in the browser (required fields, email format, message length, plus a hidden honeypot field to catch spam bots) and then:

| Configuration                 | What happens on submit                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `VITE_FORM_ENDPOINT` is set   | Sends a JSON `POST` to that HTTPS URL. Shows "Message sent" only when the server replies `2xx`, and an error message otherwise. |
| Only an email set (default: thenerdstudio@gmail.com) | Opens the visitor's email app with the message already written. The page says clearly that nothing is sent until they press send. |
| Neither set                   | The form is shown but disabled, with a notice that it isn't connected yet.                      |

The JSON body is `{ name, email, company, projectType, message }`. This works with Formspree, Getform, Basin, a serverless function, or your own API. The endpoint has to accept cross-origin requests from your domain.

---

### LINE and Facebook

With `VITE_LINE_URL` set, the Contact page shows the LINE account and a **Chat on LINE** button, and the footer gets a LINE link. Use your LINE account's add-friend URL (for example `https://line.me/R/ti/p/@yourid`), plus `VITE_LINE_ID` for the ID shown on the page. `VITE_FACEBOOK_URL` adds a Facebook link.

---

## Languages (Thai / English)

The **EN / TH** button in the header switches the language. The choice is saved in the browser, and first-time visitors whose browser language is Thai get Thai automatically. `<html lang>` changes too, so screen readers and fonts behave correctly. Thai text uses Noto Sans Thai.

- Interface text lives in `src/i18n/en.ts` and `src/i18n/th.ts`. TypeScript reports an error if a Thai key is missing.
- Thai project, service and model copy lives in `src/i18n/content.th.ts`, keyed by project slug, service id and model id. Anything missing falls back to the English text in `src/data/*.ts`.
- Components read text with `useT()`, and localized data with `useProjects()`, `useServices()` and `useModels()`.

When you add a project, add its Thai copy to `projectsTh` too.

---

## VR Showroom

`/vr-showroom` is a small, real-scale gallery (sofa, chair, robot, car, fox) built with React Three Fiber and `@react-three/xr`:

| Device | Experience |
| ------ | ---------- |
| Meta Quest 2 / 3 / 3S / Pro (Meta Quest Browser), other WebXR headsets | **Enter VR** opens an immersive WebXR session. Left thumbstick moves, right thumbstick turns, and controllers are tracked. |
| Phones, tablets, desktop | Interactive 3D: drag to look around, scroll or pinch to move closer. The Enter VR button is disabled, and the page says why. |

The button is only enabled when the browser reports `immersive-vr` support. The WebXR emulator is turned off, so this check is real.

To test on a Quest:

1. Deploy the site (VR needs HTTPS).
2. Open the URL in Meta Quest Browser (type it, or open a bookmark synced from your account).
3. Press **Enter VR**.

Exhibits and their positions are listed in `EXHIBITS` in `src/components/VRScene.tsx`. Any model from `src/data/models.ts` can be added there.

---

## Face AR

`/face-ar` uses [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (Apache-2.0) in WebAssembly. Everything runs in the visitor's browser: no image or video is uploaded, and the page says so.

- **Camera:** starts only when the visitor presses **Start camera**, and stops on **Stop camera** or when they leave the page. If the camera is blocked, missing or the page isn't on HTTPS, the page explains why and offers **Use a photo instead**.
- **Effects:** a face mesh with tracking brackets, sunglasses and a crown, drawn on a 2D canvas from the face landmarks (`src/lib/faceEffects.ts`). **Save photo** downloads a PNG of what's on screen.
- **Live readings:** number of faces, smile, eye blinks, mouth open, head tilt and frame rate, all from the model's blendshapes.
- **What it doesn't do:** it doesn't identify people. It finds face landmarks and expressions only.

Files:

- `public/models/face/face_landmarker.task`: the face model (3.7 MB), committed with the site.
- `public/mediapipe/`: the WebAssembly runtime, copied from `node_modules` by `scripts/copy-mediapipe.mjs`. This runs automatically before `dev`, `build` and `test:e2e`, and the folder is gitignored.

To add your own effect, write a draw function in `src/lib/faceEffects.ts`, add its id to `FaceEffect` and `EFFECTS`, and add its label to `face.effects` in both language files.

---

## Print AR (image tracking)

`/print-ar` uses [MindAR](https://github.com/hiukim/mind-ar-js) (MIT) to track a printed image. The sample card is `public/ar-card/card.png`, and its tracking data is `public/ar-card/card.mind`.

- MindAR is vendored in `src/vendor/mindar/` instead of installed from npm, for two reasons:
  - The npm package pulls in the native `canvas` module, which often fails to install on hosting platforms.
  - Its three.js wrapper needed two small patches to work with current three.js. Both are noted at the top of the files.
- **To use your own artwork** (a poster, package or business card), replace `card.png`, or edit the HTML in `scripts/make-ar-card.mjs`, then run `npm run make:ar-card` to compile a new `card.mind`. Artwork with plenty of detail and contrast tracks best. Flat colour areas and repeating patterns track poorly.
- **To change what appears on the card**, edit the anchor content in `src/pages/PrintAR.tsx`. One card unit equals the card's width.

## Virtual Tour 360°

`/virtual-tour` displays 2:1 equirectangular panoramas as the scene background, so the same viewer works on desktop (drag + scroll zoom), phones (optional motion sensor; iOS asks permission) and VR headsets.

- **The included rooms are CG renders.** `scripts/render-panoramas.mjs` builds three rooms from the site's GLB models, renders them with a cube camera, and converts them to 4096×2048 JPEGs. The page says clearly that they are renders.
- **For a real property**, shoot 360° photos (any 360 camera exports 2:1 equirectangular JPEGs), put them in `public/tour/`, and update `src/data/tour.ts`:
  - each room's image
  - the direction the visitor faces on arrival
  - the hotspots: door hotspots link rooms, info hotspots open a product card that links to a project page
- **Hotspot positions** are 3D points in metres relative to the camera position `EYE`. For photos, estimate them from the direction of the door or object.
- **Accessibility:** hotspot labels are real HTML buttons that the 3D scene repositions every frame, so they work with a keyboard and a screen reader. A room list below the viewer gives the same navigation without the panorama. In VR, the 3D markers are selected with the controller ray.

## Virtual Try-On

`/try-on` uses MediaPipe Pose Landmarker (lite, Apache-2.0; model at `public/models/pose/pose_landmarker_lite.task`, 5.8 MB) to find the head, shoulders, elbows, wrists and hips. Each item is drawn on a 2D canvas from those points (`src/lib/tryOnEffects.ts`):

- **Cap:** sits on the head, using the ears or eyes and the body's "up" direction.
- **Necklace:** a curve between the shoulders, below the neck.
- **Watch:** drawn on each wrist along the forearm, only when the wrist is clearly visible.
- **T-shirt:** a flat shape following the shoulders, elbows and hips. **It is not cloth simulation, and the page says so.**

For real products, replace the drawn items with your product's photos (PNG with transparency) or 3D models, using the same anchor points.

## Hand gestures

`/hand-gestures` uses MediaPipe Gesture Recognizer (Apache-2.0; model at `public/models/hand/gesture_recognizer.task`, 8 MB). It shares the WebAssembly runtime with Face AR.

- **How a gesture triggers the robot:** the gesture has to be held for 4 frames at a score of at least 60%. The robot then plays the matching clip, and returns to idle 1.5 s after the hand drops.
- **Changing the mapping:** edit `GESTURE_ANIMATION` in `src/pages/HandGestures.tsx`.

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

### Videos vs. "Test it yourself"

Each project page ends with **one** of two demo sections:

- **Demo video** (`video` in the project data): 5 of the 9 sample projects have a 5-second turntable video. Put `<slug>.webm` (VP9) and `<slug>.mp4` (H.264) in `public/videos/` and use the `video('<slug>', 'description')` helper. The browser plays the first format it supports.
- **Test it yourself** (`tryIt`): the other 4 projects (scale model car, brand mascot, STEM robotics, velvet sofa) get a short list of things to try in the live viewer, a button that jumps back to the viewer, and a **QR code** that opens the same page on a phone so the visitor can try AR right away.

```ts
tryIt: {
  title: 'Swap all five colours live',
  steps: ['Pick each Finish…', 'Zoom into the tufted back…', 'On your phone, place the sofa…'],
},
```

If a project has a `video`, it is shown and `tryIt` is ignored. QR codes are generated in the browser (the `qrcode` package) from the current page URL. On `localhost` the site warns that a phone can't open that address. Desktop visitors also see a QR code in every viewer's AR notice.

### Re-rendering the included media

The posters, project images and videos were generated from the GLBs with headless Chromium. To regenerate them after changing a model:

```bash
npx playwright install chromium   # once
npm run render:media              # everything; needs ffmpeg with libx264 and libvpx-vp9
node scripts/render-media.mjs --images --only=lounge-chair-configurator,scale-model-showroom
node scripts/render-media.mjs --posters
```

Camera angles, backgrounds, variants and animation poses for each shot are set at the top of the script. Projects marked `video: true` there also get a turntable video. Rendering uses software WebGL, so each video takes a few minutes.

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

## Testing

```bash
npx playwright install chromium   # once
npm run test:e2e
```

`tests/e2e.mjs` starts two Vite dev servers: one with no contact settings, and one with a mocked form endpoint. It then checks:

- **Viewers:** model switching, finish and animation pickers (checked against the names inside each GLB), and the toolbar
- **Media:** gallery lightbox, video loading, and the "Test it yourself" sections with their QR codes
- **VR Showroom:** the canvas renders, the headset status message, and the disabled Enter VR button
- **Face AR:** the camera-unavailable message, and the model running on a photo with no face in it
- **Print AR, hand gestures and try-on:** the camera-unavailable messages, the card download, and the gesture and pose models running on a photo
- **Virtual tour:** the panorama loads, door hotspots, the info card, and the room list
- **Languages:** the TH/EN toggle, persistence after reload, and Thai copy (axe also scans the Thai pages)
- **Projects:** category filters and deep links, 404 pages, and every internal link
- **Contact form:** validation, focus on the error summary, a successful POST and a server error
- **Layout:** the mobile menu, and no horizontal scrolling at 390 px on any page
- **Fallbacks:** reduced motion and no-WebGL
- **Accessibility:** an axe-core WCAG 2.2 AA scan of every page

It exits non-zero on any failure, so it can run in CI. Each server reads its environment from an empty directory, so your `.env.local` doesn't affect the results.

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
