import { useCallback, useEffect, useRef, useState } from 'react';
import type { MindARThree } from '../vendor/mindar/mindar-image-three.prod.js';
import { Button, ButtonAnchor, ButtonLink } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { AlertIcon, CheckIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { requestCamera, type CameraProblem } from '../lib/camera';
import { useLanguage } from '../i18n';

const TARGET = '/restaurant-ar/coaster.mind';
type Status = 'idle' | 'loading' | 'scanning' | 'found' | CameraProblem;

const copy = {
  en: {
    title: 'A coaster that brings the menu to life',
    description: 'Point your phone at the coaster. A restaurant special appears above the table, with a simple offer guests can act on.',
    eyebrow: 'Restaurant WebAR · concept demo',
    stage: 'Restaurant coaster AR camera', idle: 'Set the coaster on the table, then scan it to reveal the special.',
    start: 'Start camera', stop: 'Stop camera', loading: 'Preparing camera…', scanning: 'Aim at the coaster', found: 'Coaster found · today’s special is ready',
    added: 'Added to your sample order', add: 'Add the special to a sample order',
    denied: 'Camera access is off', deniedText: 'Allow camera access in your browser settings, then try again.',
    noCamera: 'No camera found', noCameraText: 'Open this page on a phone or tablet with a camera.',
    insecure: 'Camera needs a secure connection', insecureText: 'Open this page over HTTPS to use the camera.',
    error: 'AR could not start', errorText: 'Try a recent version of Chrome, Safari, Edge or Firefox.',
    privacy: 'The camera stays on this device. The demo does not record or upload video.',
    print: 'Print the coaster', printText: 'Show this artwork on another screen or print it, then scan it with your phone.',
    download: 'Download coaster', item: 'Mango sticky rice', detail: 'Mango · coconut cream · toasted mung bean', price: '฿120', offer: '10% off with your next drink',
    how: 'One scan, a little more of the restaurant', steps: ['A coaster or plate carries the restaurant’s visual marker.', 'Guests scan it with the phone camera. No app to install.', 'The featured dish, story or offer appears in AR.'],
    cta: 'Make it yours', ctaText: 'Swap in your menu, brand and offer. We can shape the experience around your restaurant.', contact: 'Discuss a restaurant demo',
  },
  th: {
    title: 'ที่รองแก้วที่เปิดเมนูให้มีชีวิต',
    description: 'ใช้มือถือส่องที่รองแก้ว แล้วเมนูแนะนำจะลอยขึ้นเหนือโต๊ะ พร้อมโปรโมชันที่ลูกค้ากดต่อได้',
    eyebrow: 'Restaurant WebAR · เดโมแนวคิด',
    stage: 'กล้อง AR ที่รองแก้ว', idle: 'วางที่รองแก้วบนโต๊ะ แล้วส่องกล้องเพื่อดูเมนูแนะนำ',
    start: 'เปิดกล้อง', stop: 'ปิดกล้อง', loading: 'กำลังเตรียมกล้อง…', scanning: 'เล็งกล้องไปที่ที่รองแก้ว', found: 'เจอที่รองแก้วแล้ว · เมนูวันนี้พร้อมแล้ว',
    added: 'เพิ่มลงรายการตัวอย่างแล้ว', add: 'เพิ่มเมนูนี้ลงรายการตัวอย่าง',
    denied: 'ยังไม่ได้อนุญาตให้ใช้กล้อง', deniedText: 'เปิดสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์ แล้วลองอีกครั้ง',
    noCamera: 'ไม่พบกล้อง', noCameraText: 'เปิดหน้านี้บนมือถือหรือแท็บเล็ตที่มีกล้อง',
    insecure: 'กล้องต้องใช้การเชื่อมต่อที่ปลอดภัย', insecureText: 'เปิดหน้านี้ผ่าน HTTPS เพื่อใช้กล้อง',
    error: 'เปิด AR ไม่สำเร็จ', errorText: 'ลองใช้ Chrome, Safari, Edge หรือ Firefox เวอร์ชันล่าสุด',
    privacy: 'กล้องทำงานอยู่บนอุปกรณ์นี้ เดโมจะไม่บันทึกหรืออัปโหลดวิดีโอ',
    print: 'พิมพ์ที่รองแก้ว', printText: 'เปิดภาพนี้บนอีกหน้าจอหรือพิมพ์ออกมา แล้วใช้มือถือส่อง',
    download: 'ดาวน์โหลดที่รองแก้ว', item: 'ข้าวเหนียวมะม่วง', detail: 'มะม่วง · กะทิ · ถั่วเขียวคั่ว', price: '120 บาท', offer: 'ลด 10% เมื่อสั่งเครื่องดื่มแก้วถัดไป',
    how: 'ส่องครั้งเดียว แล้วรู้จักร้านมากขึ้น', steps: ['ใส่ลาย AR ของร้านลงบนที่รองแก้วหรือจาน', 'ลูกค้าใช้กล้องมือถือส่อง ไม่ต้องติดตั้งแอป', 'เมนูแนะนำ เรื่องราว หรือโปรโมชันปรากฏขึ้นใน AR'],
    cta: 'ทำเป็นแบบของร้านคุณ', ctaText: 'เปลี่ยนเป็นเมนู แบรนด์ และโปรโมชันของร้าน แล้วออกแบบประสบการณ์ให้เข้ากับร้านได้', contact: 'คุยเรื่องเดโมร้านอาหาร',
  },
} as const;

function makeMenuTexture(THREE: typeof import('three')) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#173d35';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff8e8';
  ctx.beginPath();
  ctx.roundRect(28, 28, 968, 664, 32);
  ctx.fill();
  ctx.strokeStyle = '#c98b3c';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#54745c';
  ctx.font = '700 28px system-ui';
  ctx.fillText('BASIL & BOWL  ·  TODAY’S SPECIAL', 76, 100);
  ctx.fillStyle = '#173d35';
  ctx.font = '700 59px Georgia, serif';
  ctx.fillText('Mango sticky rice', 76, 190);
  ctx.fillStyle = '#68766a';
  ctx.font = '28px system-ui';
  ctx.fillText('Mango · coconut cream · toasted mung bean', 76, 244);
  ctx.fillStyle = '#c98b3c';
  ctx.beginPath();
  ctx.roundRect(76, 290, 390, 210, 24);
  ctx.fill();
  ctx.fillStyle = '#fff1c9';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(165 + (i % 4) * 58, 360 + Math.floor(i / 4) * 60, 35, 21, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff8e8';
  ctx.beginPath();
  ctx.ellipse(378, 395, 59, 73, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#173d35';
  ctx.font = '700 52px system-ui';
  ctx.fillText('฿120', 525, 370);
  ctx.fillStyle = '#a34f32';
  ctx.font = '700 27px system-ui';
  ctx.fillText('10% OFF WITH YOUR NEXT DRINK', 525, 424);
  ctx.fillStyle = '#68766a';
  ctx.font = '24px system-ui';
  ctx.fillText('A sample menu · your restaurant, your story', 76, 620);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function RestaurantAR() {
  const { lang } = useLanguage();
  const t = copy[lang];
  useDocumentTitle(t.title);
  const containerRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<MindARThree | null>(null);
  const [status, setStatus] = useState<Status>(() => typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle');
  const [added, setAdded] = useState(false);

  const stop = useCallback(() => {
    const ar = arRef.current;
    arRef.current = null;
    if (!ar) return;
    ar.renderer.setAnimationLoop(null);
    try { ar.stop(); } catch { /* Camera may not have started. */ }
    ar.renderer.dispose();
    ar.renderer.domElement.remove();
    containerRef.current?.querySelectorAll('canvas, video, div').forEach((el) => el.remove());
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setAdded(false);
    const problem = await requestCamera('environment');
    if (problem) { setStatus(problem); return; }
    setStatus('loading');
    try {
      const [{ MindARThree }, THREE] = await Promise.all([
        import('../vendor/mindar/mindar-image-three.prod.js'),
        import('three'),
      ]);
      const ar = new MindARThree({ container: containerRef.current!, imageTargetSrc: TARGET, uiLoading: 'no', uiScanning: 'no', uiError: 'no', filterMinCF: 0.0005, filterBeta: 0.01 });
      arRef.current = ar;
      const { renderer, scene, camera } = ar;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x68766a, 2.2));
      const light = new THREE.DirectionalLight(0xffe2ae, 2.2);
      light.position.set(0.4, 0.8, 1);
      scene.add(light);
      const anchor = ar.addAnchor(0);
      const menu = new THREE.Mesh(
        new THREE.PlaneGeometry(0.88, 0.62),
        new THREE.MeshBasicMaterial({ map: makeMenuTexture(THREE), transparent: true, side: THREE.DoubleSide }),
      );
      menu.position.set(0, 0, 0.035);
      anchor.group.add(menu);
      anchor.onTargetFound = () => setStatus('found');
      anchor.onTargetLost = () => setStatus('scanning');
      await ar.start();
      setStatus('scanning');
      renderer.setAnimationLoop(() => renderer.render(scene, camera));
    } catch (error) {
      console.error('Restaurant AR failed to start', error);
      stop();
      setStatus('error');
    }
  };

  const running = status === 'loading' || status === 'scanning' || status === 'found';
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: t.denied, text: t.deniedText }, 'no-camera': { title: t.noCamera, text: t.noCameraText },
    insecure: { title: t.insecure, text: t.insecureText }, error: { title: t.error, text: t.errorText },
  };
  const problem = problems[status];

  return <>
    <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
    <section className="bg-[#f7f0e3] py-12 sm:py-16">
      <div className="container-page grid items-start gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div role="region" aria-label={t.stage} className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[6px] border-white bg-[#173d35] shadow-xl sm:aspect-video">
            <div ref={containerRef} className="absolute inset-0 isolate" />
            {!running && <div className="absolute inset-0 grid place-items-center p-6 text-center text-white"><div className="max-w-sm"><p aria-hidden className="text-6xl">🍚</p><p className="mt-4 font-display text-xl font-bold">{t.idle}</p></div></div>}
            {running && <p role="status" className={`absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm text-white ${status === 'found' ? 'bg-emerald-800/90' : 'bg-[#173d35]/90'}`}>
              {status === 'found' && <CheckIcon width={18} height={18} />}{status === 'loading' ? t.loading : status === 'found' ? t.found : t.scanning}
            </p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {running ? <Button variant="secondary" onClick={() => { stop(); setStatus('idle'); }}>{t.stop}</Button> : <Button onClick={start} disabled={status === 'insecure'}>{t.start}</Button>}
            {status === 'found' && <Button onClick={() => setAdded(true)}>{t.add}</Button>}
          </div>
          {added && <p role="status" className="mt-3 rounded-xl bg-emerald-100 px-4 py-3 font-semibold text-emerald-900">{t.added}</p>}
          {problem && <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertIcon className="mt-0.5 shrink-0" /><div><p className="font-semibold">{problem.title}</p><p className="mt-1">{problem.text}</p></div></div>}
          <p className="mt-4 flex items-start gap-2 text-sm text-muted"><InfoIcon className="mt-0.5 shrink-0" width={18} height={18} />{t.privacy}</p>
        </div>
        <aside className="space-y-5">
          <div className="rounded-3xl border border-[#e5d8c0] bg-white p-5 shadow-sm">
            <p className="font-display text-xl font-bold text-[#173d35]">{t.item}</p>
            <p className="mt-1 text-sm text-slate-600">{t.detail}</p>
            <div className="mt-5 flex items-center justify-between border-t border-[#eee4d3] pt-4"><span className="text-2xl font-bold text-[#173d35]">{t.price}</span><span className="rounded-full bg-[#f6e8c7] px-3 py-2 text-sm font-semibold text-[#8b542e]">{t.offer}</span></div>
          </div>
          <div className="rounded-3xl border border-[#e5d8c0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-[#173d35]">{t.print}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.printText}</p>
            <img className="mt-4 w-full rounded-full" src="/restaurant-ar/coaster.png" alt="Basil & Bowl mango sticky rice AR coaster" />
            <ButtonAnchor href="/restaurant-ar/coaster.png" download="restaurant-ar-coaster.png" className="mt-4">{t.download}</ButtonAnchor>
          </div>
        </aside>
      </div>
    </section>
    <section className="py-16 sm:py-20"><div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      <div><h2 className="font-display text-3xl font-bold text-[#173d35]">{t.how}</h2><p className="mt-3 text-muted">{t.description}</p></div>
      <ol className="grid gap-4 sm:grid-cols-3">{t.steps.map((step, i) => <li key={step} className="rounded-2xl border border-[#e5d8c0] bg-[#fffaf1] p-5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#173d35] font-bold text-white">{i + 1}</span><p className="mt-4 leading-relaxed text-slate-700">{step}</p></li>)}</ol>
    </div></section>
    <section className="bg-[#173d35] py-16 text-white sm:py-20"><div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between"><div className="max-w-2xl"><h2 className="font-display text-3xl font-bold">{t.cta}</h2><p className="mt-3 text-lg text-[#e6e5d7]">{t.ctaText}</p></div><ButtonLink to="/contact" size="lg">{t.contact}</ButtonLink></div></section>
  </>;
}
