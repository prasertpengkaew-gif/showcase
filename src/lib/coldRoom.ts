/**
 * Cold-room locator demo: where each pallet is, and a rule-based picking order.
 *
 * Each cold room is split into slots (a lane from the door to the back); row 1 is nearest the
 * door. A pallet is blocked by every pallet in its slot with a smaller row, so those must be
 * moved out temporarily before it can be lifted. The plan picks the pallets that need the fewest
 * moves (oldest first on a tie), lifts them, then puts the moved pallets back. Stock only drops
 * when a dispatch is confirmed, never when pallets are merely lifted or moved.
 * This is a fixed rule, not machine learning, and it only knows the layout it is given.
 */
export type Lang = 'th' | 'en';
type Text = Record<Lang, string>;

export type ProductId = 'shrimp' | 'pork' | 'chicken' | 'fish' | 'icecream';
export const PRODUCTS: Record<ProductId, Text> = {
  shrimp: { th: 'กุ้งแช่แข็ง', en: 'Frozen shrimp' },
  pork: { th: 'เนื้อหมูแช่แข็ง', en: 'Frozen pork' },
  chicken: { th: 'ไก่แช่แข็ง', en: 'Frozen chicken' },
  fish: { th: 'ปลาแช่แข็ง', en: 'Frozen fish' },
  icecream: { th: 'ไอศกรีม', en: 'Ice cream' },
};
/** Short names that fit inside a floor-plan cell. */
export const PRODUCT_SHORT: Record<ProductId, Text> = {
  shrimp: { th: 'กุ้ง', en: 'Shrimp' },
  pork: { th: 'หมู', en: 'Pork' },
  chicken: { th: 'ไก่', en: 'Chicken' },
  fish: { th: 'ปลา', en: 'Fish' },
  icecream: { th: 'ไอศกรีม', en: 'Ice cream' },
};
export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];
/** Fill colours for the floor plan (always paired with a text label). */
export const PRODUCT_COLOR: Record<ProductId, string> = { shrimp: '#f97316', pork: '#e11d48', chicken: '#eab308', fish: '#0ea5e9', icecream: '#a855f7' };

export const ROOMS = ['A', 'B'] as const;
export const SLOTS_PER_ROOM = 4;
export const ROWS_PER_SLOT = 3;
export const slotsOf = (room: string): string[] => Array.from({ length: SLOTS_PER_ROOM }, (_, i) => `${room}${i + 1}`);

export interface Pallet {
  id: string;
  product: ProductId;
  slot: string;
  /** 1 = nearest the door */
  row: number;
  boxes: number;
  /** Day received; lower means older. */
  day: number;
}

type Seed = [slot: string, ...rows: [ProductId, number, number][]];
// Each seed lists a slot's pallets from the door to the back as [product, boxes, day received].
const SEEDS: Seed[] = [
  ['A1', ['pork', 40, 9], ['shrimp', 30, 2], ['chicken', 50, 5]],
  ['A2', ['shrimp', 30, 6], ['fish', 45, 3]],
  ['A3', ['chicken', 50, 8], ['pork', 40, 4], ['shrimp', 30, 1]],
  ['A4', ['icecream', 60, 7]],
  ['B1', ['fish', 45, 10], ['chicken', 50, 6], ['pork', 40, 2]],
  ['B2', ['icecream', 60, 3], ['icecream', 60, 1]],
  ['B3', ['shrimp', 30, 9], ['fish', 45, 5], ['pork', 40, 7]],
  ['B4', ['chicken', 50, 4], ['fish', 45, 8]],
];

export const SAMPLE_INVENTORY: Pallet[] = SEEDS.flatMap(([slot, ...rows]) =>
  rows.map(([product, boxes, day], i) => ({ id: `${slot}-${i + 1}`, product, slot, row: i + 1, boxes, day })),
);

export const totalBoxes = (inv: Pallet[], product: ProductId): number => inv.filter((p) => p.product === product).reduce((n, p) => n + p.boxes, 0);

export type Step = { type: 'moveOut'; pallet: Pallet } | { type: 'lift'; pallet: Pallet };

export interface Plan {
  steps: Step[];
  /** Pallets lifted for the order. */
  picked: Pallet[];
  /** Pallets moved out of the way, to put back after the lift (in their original places). */
  returns: Pallet[];
  /** Pallets the order wanted but the room does not hold. */
  shortBy: number;
}

/** Pallets in the same slot that sit nearer the door than `target` among `state`. */
const blockersOf = (state: Pallet[], target: Pallet): Pallet[] => state.filter((p) => p.slot === target.slot && p.row < target.row).sort((a, b) => a.row - b.row);

/** Plan how to pick `count` pallets of `product`. Does not change `inv`. */
export function planPick(inv: Pallet[], product: ProductId, count: number): Plan {
  let state = inv.slice();
  const steps: Step[] = [];
  const picked: Pallet[] = [];
  const returns: Pallet[] = [];
  const wanted = Math.max(0, Math.floor(count));
  while (picked.length < wanted) {
    const candidates = state.filter((p) => p.product === product);
    if (!candidates.length) break;
    const best = candidates
      .map((p) => ({ p, blockers: blockersOf(state, p) }))
      .sort((a, b) => a.blockers.length - b.blockers.length || a.p.day - b.p.day || a.p.id.localeCompare(b.p.id))[0];
    for (const b of best.blockers) {
      steps.push({ type: 'moveOut', pallet: b });
      returns.push(b);
    }
    steps.push({ type: 'lift', pallet: best.p });
    picked.push(best.p);
    const out = new Set([best.p, ...best.blockers]);
    state = state.filter((p) => !out.has(p));
  }
  return { steps, picked, returns, shortBy: wanted - picked.length };
}

/** Confirming the dispatch is the only thing that lowers stock: lifted pallets leave, moved ones stay. */
export const confirmDispatch = (inv: Pallet[], plan: Plan): Pallet[] => {
  const gone = new Set(plan.picked.map((p) => p.id));
  return inv.filter((p) => !gone.has(p.id));
};
