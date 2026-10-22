// Checks the layout, picking-order rules and stock control behind the cold-room demo (no browser needed).
//   npm run test:coldroom
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const c = await server.ssrLoadModule('/src/lib/coldRoom.ts');
  const inv = c.SAMPLE_INVENTORY;
  const at = (list, id) => list.find((p) => p.id === id);

  // --- layout -------------------------------------------------------------------------------
  const spots = inv.map((p) => `${p.slot}/${p.row}`);
  ok(new Set(spots).size === inv.length, 'no two pallets share a place');
  ok(new Set(inv.map((p) => p.id)).size === inv.length, 'pallet ids are unique');
  ok(inv.every((p) => p.row >= 1 && p.row <= c.ROWS_PER_SLOT && c.ROOMS.some((r) => c.slotsOf(r).includes(p.slot))), 'every pallet is inside a real slot and row');
  const bySlot = Map.groupBy(inv, (p) => p.slot);
  ok([...bySlot.values()].every((ps) => ps.map((p) => p.row).sort().every((r, i) => r === i + 1)), 'each slot is filled from the door without gaps');
  ok(c.PRODUCT_IDS.every((id) => inv.some((p) => p.product === id) && c.PRODUCTS[id].th && c.PRODUCTS[id].en), 'every product is stocked and named in Thai and English');

  // --- picking rules ------------------------------------------------------------------------
  // A pallet at the door needs no moves, even if an older pallet of the product is buried.
  const pork1 = c.planPick(inv, 'pork', 1);
  ok(pork1.picked.length === 1 && pork1.picked[0].id === 'A1-1' && pork1.returns.length === 0, 'a pallet at the door is lifted with no moves');
  ok(at(inv, 'B1-3').day < at(inv, 'A1-1').day, '(the older pork pallet is buried, so the rule prefers the free one)');

  // Fewest moves first; among equals, the oldest.
  const shrimp1 = c.planPick(inv, 'shrimp', 1);
  ok(shrimp1.picked[0].id === 'A2-1' && shrimp1.returns.length === 0, 'the shrimp pallet with no blockers is chosen');
  const shrimp2 = c.planPick(inv, 'shrimp', 2);
  ok(shrimp2.picked.map((p) => p.id).join() === 'A2-1,B3-1', 'a second pick takes the next free pallet, not a buried one');

  // Blockers are moved out front first, then the target is lifted, then they go back.
  const icecream2 = c.planPick(inv, 'icecream', 2);
  ok(icecream2.picked.map((p) => p.id).join() === 'B2-1,B2-2' && icecream2.returns.length === 0, 'oldest free pallet first; lifting it frees the older pallet behind it, so no moves are needed');
  const fish2 = c.planPick(inv, 'fish', 2);
  ok(fish2.picked.map((p) => p.id).join() === 'B1-1,A2-2', 'fish: the free pallet first, then the one with one blocker');
  const lift = fish2.steps.findIndex((s) => s.type === 'lift' && s.pallet.id === 'A2-2');
  ok(fish2.steps[lift - 1].type === 'moveOut' && fish2.steps[lift - 1].pallet.id === 'A2-1', 'the blocker is moved out right before the lift');
  ok(fish2.returns.map((p) => p.id).join() === 'A2-1', 'the moved pallet is listed to be put back');

  // A buried-only product needs every blocker moved out in door-to-back order.
  const solo = [
    { id: 'S-1', product: 'pork', slot: 'A1', row: 1, boxes: 10, day: 1 },
    { id: 'S-2', product: 'fish', slot: 'A1', row: 2, boxes: 10, day: 2 },
    { id: 'S-3', product: 'shrimp', slot: 'A1', row: 3, boxes: 10, day: 3 },
  ];
  const buried = c.planPick(solo, 'shrimp', 1);
  ok(buried.steps.map((s) => `${s.type}:${s.pallet.id}`).join() === 'moveOut:S-1,moveOut:S-2,lift:S-3', 'a buried pallet needs both blockers moved out, door first');

  // Shortage and bad input
  const tooMany = c.planPick(inv, 'icecream', 5);
  ok(tooMany.picked.length === 3 && tooMany.shortBy === 2, 'asking for more than the room holds reports the shortage');
  ok(c.planPick(inv, 'fish', 0).steps.length === 0 && c.planPick(inv, 'fish', -3).steps.length === 0, 'zero or negative counts plan nothing');
  const before = JSON.stringify(inv);
  c.planPick(inv, 'pork', 3);
  ok(JSON.stringify(inv) === before, 'planning never changes the stock list');

  // --- stock control ------------------------------------------------------------------------
  const total0 = c.totalBoxes(inv, 'fish');
  ok(total0 === 180, `fish total is 180 boxes (${total0})`);
  ok(c.totalBoxes(inv, 'fish') === total0, 'a plan alone leaves the totals unchanged');
  const after = c.confirmDispatch(inv, fish2);
  ok(c.totalBoxes(after, 'fish') === total0 - 90, 'confirming the dispatch removes only the lifted pallets (-90 boxes)');
  ok(after.length === inv.length - 2 && at(after, 'A2-1') !== undefined, 'the pallet that was only moved is still in stock');
  ok(c.PRODUCT_IDS.filter((id) => id !== 'fish').every((id) => c.totalBoxes(after, id) === c.totalBoxes(inv, id)), 'other products are untouched');
} finally {
  await server.close();
}
if (failures) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All checks passed');
