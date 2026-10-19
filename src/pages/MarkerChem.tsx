import { useMemo, useRef, useState } from 'react';
import { CylinderGeometry, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PageHeader } from '../components/PageHeader';
import { MarkerPanel } from '../components/MarkerPanel';
import { MarkerImage } from '../components/MarkerImage';
import { Button } from '../components/Button';
import { useMarkerCamera, type MarkerFrame, type MarkerScene } from '../hooks/useMarkerCamera';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ATOM_CARDS, ELEMENT_INFO, MOLECULES, findMolecule, prettyFormula, type Element } from '../data/molecules';
import { assignBonds, groupByDistance, type AtomPos } from '../lib/chemMatch';
import { buildSheet, downloadCanvas } from '../lib/markerSheet';
import { useT } from '../i18n';

/** Cards closer than this (in marker edges) join a molecule; once joined they stay until this far apart. */
const NEAR = 2.3;
const KEEP = 2.8;
const ONLY = new Set(ATOM_CARDS.map((c) => c.id));
const Y_AXIS = new Vector3(0, 1, 0);

interface Label {
  x: number;
  y: number;
  text: string;
  big?: boolean;
}

const composition = (atoms: readonly Element[]) => {
  const n = new Map<Element, number>();
  for (const a of atoms) n.set(a, (n.get(a) ?? 0) + 1);
  return [...n].map(([el, c]) => (c > 1 ? `${c} × ${el}` : el)).join(' + ');
};

export default function MarkerChem() {
  const t = useT();
  const c = t.markerChem;
  useDocumentTitle(c.metaTitle);

  const atomsRef = useRef(new Map<number, Mesh>());
  const bondsRef = useRef<Mesh[]>([]);
  const bondResRef = useRef<{ geo: CylinderGeometry; mat: MeshStandardMaterial } | null>(null);
  const linkedRef = useRef<Set<string>>(new Set());
  const labelsRef = useRef<Label[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const foundKey = useRef('');

  const cam = useMarkerCamera({
    only: ONLY,
    setup: ({ scene }: MarkerScene) => {
      const geo = new SphereGeometry(1, 32, 20);
      const materials = new Map<Element, MeshStandardMaterial>();
      for (const card of ATOM_CARDS) {
        const info = ELEMENT_INFO[card.element];
        let mat = materials.get(card.element);
        if (!mat) materials.set(card.element, (mat = new MeshStandardMaterial({ color: info.color, roughness: 0.35, metalness: 0.05 })));
        const mesh = new Mesh(geo, mat);
        mesh.scale.setScalar(info.radius);
        mesh.visible = false;
        scene.add(mesh);
        atomsRef.current.set(card.id, mesh);
      }
      const bondGeo = new CylinderGeometry(0.07, 0.07, 1, 12);
      const bondMat = new MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 });
      bondResRef.current = { geo: bondGeo, mat: bondMat };
      bondsRef.current = [];
      return () => {
        geo.dispose();
        bondGeo.dispose();
        bondMat.dispose();
        materials.forEach((m) => m.dispose());
        atomsRef.current.clear();
        bondsRef.current = [];
        bondResRef.current = null;
      };
    },
    frame: (f: MarkerFrame, { scene, camera }: MarkerScene) => {
      const w = f.width;
      const h = f.height;
      const toScreen = (v: Vector3) => {
        const p = v.clone().project(camera);
        return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
      };
      const labels: Label[] = [];
      const items: (AtomPos & { pos: Vector3; element: Element })[] = [];
      const visibleIds = new Set<number>();
      for (const m of f.markers) {
        const card = ATOM_CARDS.find((a) => a.id === m.id);
        const mesh = atomsRef.current.get(m.id);
        if (!card || !mesh || m.missed > 2) continue;
        visibleIds.add(m.id);
        const r = ELEMENT_INFO[card.element].radius;
        // Lift the atom off the card so it sits on it like a ball.
        const pos = new Vector3(0, 0, r + 0.05).applyMatrix4(m.matrix);
        mesh.position.copy(pos);
        mesh.visible = true;
        items.push({ id: m.id, element: card.element, x: pos.x, y: pos.y, z: pos.z, pos });
        const s = toScreen(pos);
        labels.push({ x: s.x, y: s.y, text: card.element });
      }
      for (const [id, mesh] of atomsRef.current) if (!visibleIds.has(id)) mesh.visible = false;

      const { groups, links } = groupByDistance(items, linkedRef.current, NEAR, KEEP);
      linkedRef.current = links;
      const bonds: { a: Vector3; b: Vector3; order: 1 | 2 }[] = [];
      const names: string[] = [];
      for (const g of groups) {
        if (g.length < 2) continue;
        const mol = findMolecule(g.map((x) => x.element));
        if (!mol) continue;
        const byId = new Map(g.map((x) => [x.id, x]));
        for (const [a, b, order] of assignBonds(mol, g)) bonds.push({ a: byId.get(a)!.pos, b: byId.get(b)!.pos, order });
        // Put the name just above the highest atom so it never covers the molecule.
        const screens = g.map((x) => toScreen(x.pos));
        const top = Math.min(...screens.map((p) => p.y));
        const midX = screens.reduce((acc, p) => acc + p.x, 0) / screens.length;
        labels.push({ x: midX, y: Math.max(h * 0.08, top - h * 0.12), text: mol.formula, big: true });
        names.push(mol.formula);
      }
      labelsRef.current = labels;

      // Bonds: one cylinder per single bond, two parallel ones for a double bond.
      const cylinders = bondsRef.current;
      const needed = bonds.reduce((n, b) => n + b.order, 0);
      while (cylinders.length < needed) {
        const res = bondResRef.current!;
        const mesh = new Mesh(res.geo, res.mat);
        scene.add(mesh);
        cylinders.push(mesh);
      }
      let i = 0;
      for (const b of bonds) {
        const dir = b.b.clone().sub(b.a);
        const len = dir.length();
        const side = new Vector3().crossVectors(dir, new Vector3(0, 0, 1)).normalize().multiplyScalar(0.09);
        for (let k = 0; k < b.order; k++) {
          const mesh = cylinders[i++];
          mesh.visible = true;
          const off = b.order === 2 ? side.clone().multiplyScalar(k === 0 ? 1 : -1) : new Vector3();
          mesh.position.copy(b.a).addScaledVector(dir, 0.5).add(off);
          mesh.scale.set(1, len, 1);
          mesh.quaternion.copy(new Quaternion().setFromUnitVectors(Y_AXIS, dir.clone().normalize()));
        }
      }
      for (; i < cylinders.length; i++) cylinders[i].visible = false;

      const key = names.sort().join(',');
      if (key !== foundKey.current) {
        foundKey.current = key;
        setFound(names);
      }
    },
    overlay: (ctx, f) => {
      const u = Math.min(f.width, f.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const l of labelsRef.current) {
        if (l.big) {
          const text = prettyFormula(l.text);
          ctx.font = `800 ${u * 0.07}px Manrope, sans-serif`;
          const wdt = ctx.measureText(text).width + u * 0.06;
          ctx.fillStyle = 'rgba(11,18,32,0.88)';
          ctx.beginPath();
          ctx.roundRect(l.x - wdt / 2, l.y - u * 0.05, wdt, u * 0.1, u * 0.05);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(text, l.x, l.y);
        } else {
          ctx.font = `800 ${u * 0.04}px Manrope, sans-serif`;
          ctx.lineWidth = u * 0.008;
          ctx.strokeStyle = 'rgba(11,18,32,0.85)';
          ctx.strokeText(l.text, l.x, l.y);
          ctx.fillStyle = '#fff';
          ctx.fillText(l.text, l.x, l.y);
        }
      }
    },
  });

  const cards = useMemo(() => {
    const count = new Map<Element, number>();
    return ATOM_CARDS.map((card) => {
      const n = (count.get(card.element) ?? 0) + 1;
      count.set(card.element, n);
      return { ...card, n };
    });
  }, []);

  const downloadSheet = () =>
    downloadCanvas(
      buildSheet({
        heading: c.sheetHeading,
        note: t.markers.printTip,
        columns: 3,
        cards: cards.map((card) => ({
          id: card.id,
          title: `${card.element}${card.n}`,
          subtitle: c.elements[card.element],
          color: ELEMENT_INFO[card.element].css === '#f8fafc' ? '#94a3b8' : ELEMENT_INFO[card.element].css,
        })),
      }),
      'thenerdstudio-atom-cards.png',
    );

  return (
    <>
      <PageHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <MarkerPanel
            cam={cam}
            label={c.stageLabel}
            idleTitle={c.idleTitle}
            idleText={c.idleText}
            hint={c.hint}
            photoName="thenerdstudio-molecule.png"
          >
            <Button variant="ghost" onClick={downloadSheet}>
              {t.markers.downloadSheet}
            </Button>
          </MarkerPanel>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{c.nowTitle}</h2>
              <div aria-live="polite" className="mt-3 text-sm">
                {found.length ? (
                  <ul className="space-y-2">
                    {found.map((f) => (
                      <li key={f} className="flex items-baseline gap-3">
                        <span className="font-display text-2xl font-extrabold">{prettyFormula(f)}</span>
                        <span className="text-muted">{c.molecules[f as keyof typeof c.molecules]}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">{cam.ids.length ? c.nowNear : c.nowNone}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{c.tryTitle}</h2>
              <p className="mt-1 text-sm text-muted">{c.tryText}</p>
              <ul className="mt-3 divide-y divide-line text-sm">
                {MOLECULES.filter((m) => m.atoms.length > 2 || m.formula === 'O2').map((m) => (
                  <li key={m.formula} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <span className="font-display font-bold">{prettyFormula(m.formula)}</span>{' '}
                      <span className="text-muted">{c.molecules[m.formula as keyof typeof c.molecules]}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-700">{composition(m.atoms)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{t.markers.onScreen}</h2>
              <p className="mt-1 text-sm text-muted">{t.markers.onScreenText}</p>
              <ul className="mt-4 grid grid-cols-4 gap-3">
                {cards.map((card) => (
                  <li key={card.id} className="text-center">
                    <MarkerImage id={card.id} size={76} label={t.markers.markerAlt(`${card.element}${card.n}`)} className="mx-auto" />
                    <span className="mt-1 block text-sm font-semibold">
                      {card.element}
                      {card.n}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="chem-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="chem-uses-title" className="font-display text-3xl font-bold">
            {c.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {c.uses.map((u) => (
              <li key={u.title} className="rounded-2xl border border-line p-6">
                <h3 className="font-display text-lg font-bold">{u.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{u.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">{t.markers.versus}</p>
        </div>
      </section>
    </>
  );
}
