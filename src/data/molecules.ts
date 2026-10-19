export type Element = 'H' | 'C' | 'N' | 'O';

/** Printable atom cards; each needs its own marker because the tracker tells cards apart by id. */
export const ATOM_CARDS: { id: number; element: Element }[] = [
  { id: 0, element: 'H' },
  { id: 1, element: 'H' },
  { id: 2, element: 'H' },
  { id: 3, element: 'H' },
  { id: 4, element: 'O' },
  { id: 5, element: 'O' },
  { id: 6, element: 'C' },
  { id: 7, element: 'N' },
];

export const ELEMENT_INFO: Record<Element, { color: number; css: string; radius: number }> = {
  H: { color: 0xf8fafc, css: '#f8fafc', radius: 0.26 },
  C: { color: 0x334155, css: '#334155', radius: 0.38 },
  N: { color: 0x3b82f6, css: '#3b82f6', radius: 0.38 },
  O: { color: 0xef4444, css: '#ef4444', radius: 0.38 },
};

export interface Molecule {
  formula: string;
  /** Atoms in a fixed order; `bonds` refer to these positions. */
  atoms: Element[];
  bonds: [number, number, 1 | 2][];
}

export const MOLECULES: Molecule[] = [
  { formula: 'H2', atoms: ['H', 'H'], bonds: [[0, 1, 1]] },
  { formula: 'O2', atoms: ['O', 'O'], bonds: [[0, 1, 2]] },
  { formula: 'H2O', atoms: ['O', 'H', 'H'], bonds: [[0, 1, 1], [0, 2, 1]] },
  { formula: 'H2O2', atoms: ['H', 'O', 'O', 'H'], bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1]] },
  { formula: 'CO', atoms: ['C', 'O'], bonds: [[0, 1, 2]] },
  { formula: 'CO2', atoms: ['O', 'C', 'O'], bonds: [[0, 1, 2], [1, 2, 2]] },
  { formula: 'NO', atoms: ['N', 'O'], bonds: [[0, 1, 2]] },
  { formula: 'NH3', atoms: ['N', 'H', 'H', 'H'], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
  { formula: 'CH4', atoms: ['C', 'H', 'H', 'H', 'H'], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  { formula: 'CH2O', atoms: ['C', 'H', 'H', 'O'], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 2]] },
  { formula: 'CH3OH', atoms: ['C', 'H', 'H', 'H', 'O', 'H'], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [4, 5, 1]] },
];

const SUB = '₀₁₂₃₄₅₆₇₈₉';
/** "CH4" → "CH₄" for display. */
export const prettyFormula = (f: string) => f.replace(/\d/g, (d) => SUB[Number(d)]);

const key = (atoms: readonly Element[]) => [...atoms].sort().join('');
const BY_COMPOSITION = new Map(MOLECULES.map((m) => [key(m.atoms), m]));

export const findMolecule = (elements: readonly Element[]): Molecule | undefined => BY_COMPOSITION.get(key(elements));
