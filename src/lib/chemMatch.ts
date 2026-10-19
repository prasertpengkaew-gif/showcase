import type { Molecule } from '../data/molecules';

/** Every ordering of `items` (only used for groups of at most four same-element cards). */
function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield items;
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) yield [items[i], ...p];
  }
}

export interface AtomPos {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Assigns the cards of a group to the atoms of `molecule` so the bonds are as short as possible
 * (so a water molecule doesn't draw a bond across the card that is furthest away).
 * Returns bonds as pairs of card ids.
 */
export function assignBonds(molecule: Molecule, cards: AtomPos[]): [number, number, 1 | 2][] {
  const byElement = new Map<string, AtomPos[]>();
  for (const c of cards) byElement.set(c.element, [...(byElement.get(c.element) ?? []), c]);
  const elements = [...byElement.keys()];
  let best: { cost: number; bonds: [number, number, 1 | 2][] } | null = null;

  const search = (ei: number, chosen: Map<string, AtomPos[]>) => {
    if (ei === elements.length) {
      const used = new Map<string, number>();
      const slot = molecule.atoms.map((el) => {
        const n = used.get(el) ?? 0;
        used.set(el, n + 1);
        return chosen.get(el)![n];
      });
      let cost = 0;
      const bonds = molecule.bonds.map(([a, b, order]) => {
        cost += Math.hypot(slot[a].x - slot[b].x, slot[a].y - slot[b].y, slot[a].z - slot[b].z);
        return [slot[a].id, slot[b].id, order] as [number, number, 1 | 2];
      });
      if (!best || cost < best.cost) best = { cost, bonds };
      return;
    }
    for (const p of permutations(byElement.get(elements[ei])!)) search(ei + 1, new Map(chosen).set(elements[ei], p));
  };
  search(0, new Map());
  return (best as { bonds: [number, number, 1 | 2][] } | null)?.bonds ?? [];
}

/** Connected groups of items closer than the (hysteretic) link distance. */
export function groupByDistance<T extends { id: number; x: number; y: number; z: number }>(
  items: T[],
  linked: ReadonlySet<string>,
  near: number,
  keep: number,
): { groups: T[][]; links: Set<string> } {
  const parent = new Map(items.map((i) => [i.id, i.id]));
  const find = (a: number): number => (parent.get(a) === a ? a : (parent.set(a, find(parent.get(a)!)), parent.get(a)!));
  const links = new Set<string>();
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const k = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
      const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (d < (linked.has(k) ? keep : near)) {
        links.add(k);
        parent.set(find(a.id), find(b.id));
      }
    }
  const groups = new Map<number, T[]>();
  for (const it of items) groups.set(find(it.id), [...(groups.get(find(it.id)) ?? []), it]);
  return { groups: [...groups.values()], links };
}
