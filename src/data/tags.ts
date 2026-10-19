/**
 * Which marker sticker is on which machine. In a real plant, stick the printed marker on the
 * machine and list it here with the machine's id in your data feed (see src/lib/twin.ts).
 */
export const MACHINE_TAGS: { marker: number; machine: string }[] = [
  { marker: 30, machine: 'cnc-1' },
  { marker: 31, machine: 'cnc-2' },
  { marker: 32, machine: 'robot-1' },
  { marker: 33, machine: 'press-1' },
  { marker: 34, machine: 'qc-1' },
  { marker: 35, machine: 'pack-1' },
];
