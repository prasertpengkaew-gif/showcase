import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { Button, ButtonLink } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { CheckIcon, InfoIcon, MinusIcon, PlusIcon, RotateIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  PRODUCTS,
  PRODUCT_COLOR,
  PRODUCT_IDS,
  PRODUCT_SHORT,
  ROOMS,
  ROWS_PER_SLOT,
  SAMPLE_INVENTORY,
  confirmDispatch,
  planPick,
  slotsOf,
  totalBoxes,
  type Pallet,
  type ProductId,
} from '../lib/coldRoom';
import { useLanguage, useT } from '../i18n';

const CELL_W = 74;
const CELL_H = 46;
const PAD = 8;
const DOOR_H = 22;

export default function ColdRoom() {
  const d = useT().coldRoom;
  const { lang } = useLanguage();
  useDocumentTitle(d.metaTitle);

  const [inventory, setInventory] = useState<Pallet[]>(SAMPLE_INVENTORY);
  const [product, setProduct] = useState<ProductId>('fish');
  const [count, setCount] = useState(2);
  const [done, setDone] = useState<string | null>(null);

  const plan = useMemo(() => planPick(inventory, product, count), [inventory, product, count]);
  const liftOrder = new Map(plan.picked.map((p, i) => [p.id, i + 1]));
  const moved = new Set(plan.returns.map((p) => p.id));
  const name = (id: ProductId) => PRODUCTS[id][lang];

  const dispatch = () => {
    setInventory(confirmDispatch(inventory, plan));
    setDone(d.dispatched(plan.picked.length, name(product)));
  };
  const reset = () => {
    setInventory(SAMPLE_INVENTORY);
    setDone(null);
  };
  const setAmount = (n: number) => {
    setCount(Math.min(6, Math.max(1, n)));
    setDone(null);
  };

  const roomW = 4 * CELL_W + 2 * PAD;
  const roomH = ROWS_PER_SLOT * CELL_H + 2 * PAD + DOOR_H;

  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description} />

      <section aria-labelledby="cold-demo" className="py-16 sm:py-20">
        <div className="container-page">
          <h2 id="cold-demo" className="sr-only">
            {d.demoTitle}
          </h2>
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-slate-700">
            <InfoIcon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-electric-700" />
            <p>
              <span className="font-semibold">{d.sampleTitle}.</span> {d.sampleText}
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="space-y-8">
              <OptionChips legend={d.productLegend} options={PRODUCT_IDS} value={product} onChange={(p) => { setProduct(p); setDone(null); }} format={name} />

              <div>
                <p id="cold-count" className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
                  {d.countLegend}
                </p>
                <div role="group" aria-labelledby="cold-count" className="mt-3 inline-flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setAmount(count - 1)} disabled={count <= 1} aria-label={d.fewer} icon={<MinusIcon aria-hidden width={16} height={16} />}>
                    {''}
                  </Button>
                  <output className="min-w-8 text-center font-display text-2xl font-bold" aria-live="polite">
                    {count}
                  </output>
                  <Button variant="ghost" onClick={() => setAmount(count + 1)} disabled={count >= 6} aria-label={d.more} icon={<PlusIcon aria-hidden width={16} height={16} />}>
                    {''}
                  </Button>
                </div>
              </div>

              <div aria-live="polite">
                <h3 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.planTitle}</h3>
                {plan.picked.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-line p-5 text-muted">{d.noStock(name(product))}</p>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-muted">{d.summary(plan.picked.length, plan.returns.length)}</p>
                    <ol className="mt-3 space-y-2">
                      {plan.steps.map((s, i) => (
                        <li key={`${s.type}-${s.pallet.id}`} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
                          <span>
                            <span className={`font-semibold ${s.type === 'lift' ? 'text-electric-700' : 'text-amber-700'}`}>{s.type === 'lift' ? d.lift : d.moveOut}</span>{' '}
                            {d.palletLine(s.pallet.id, name(s.pallet.product), s.pallet.boxes)}
                          </span>
                        </li>
                      ))}
                      {plan.returns.length > 0 && (
                        <li className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-400 text-xs font-bold text-white">{plan.steps.length + 1}</span>
                          <span>
                            <span className="font-semibold text-slate-700">{d.putBack}</span> {plan.returns.map((p) => p.id).join(', ')}
                          </span>
                        </li>
                      )}
                    </ol>
                    {plan.shortBy > 0 && (
                      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{d.short(plan.shortBy)}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button onClick={dispatch} icon={<CheckIcon aria-hidden width={16} height={16} />}>
                        {d.confirm}
                      </Button>
                      <Button variant="ghost" onClick={reset} icon={<RotateIcon aria-hidden width={16} height={16} />}>
                        {d.reset}
                      </Button>
                    </div>
                    <p className="mt-3 text-sm text-muted">{d.stockRule}</p>
                  </>
                )}
                {plan.picked.length === 0 && (
                  <Button className="mt-4" variant="ghost" onClick={reset} icon={<RotateIcon aria-hidden width={16} height={16} />}>
                    {d.reset}
                  </Button>
                )}
                {done && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{done}</p>}
              </div>
            </div>

            <div>
              <h3 className="sr-only">{d.mapTitle}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {ROOMS.map((room) => (
                  <figure key={room} className="rounded-2xl border border-line bg-white p-3">
                    <figcaption className="px-1 pb-2 font-display text-sm font-bold text-ink">{d.room(room)}</figcaption>
                    <svg viewBox={`0 0 ${roomW} ${roomH}`} role="img" aria-label={d.roomLabel(room)} className="h-auto w-full">
                      <rect x={0} y={0} width={roomW} height={roomH} rx={10} fill="#f1f5f9" />
                      {slotsOf(room).map((slot, si) => (
                        <g key={slot}>
                          <text x={PAD + si * CELL_W + CELL_W / 2} y={PAD + 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="#475569">
                            {slot}
                          </text>
                          {Array.from({ length: ROWS_PER_SLOT }, (_, ri) => {
                            const row = ri + 1;
                            // Row 1 is nearest the door, drawn at the bottom.
                            const x = PAD + si * CELL_W;
                            const y = PAD + 14 + (ROWS_PER_SLOT - row) * CELL_H;
                            const pallet = inventory.find((p) => p.slot === slot && p.row === row);
                            if (!pallet) return <rect key={row} x={x + 3} y={y + 3} width={CELL_W - 6} height={CELL_H - 6} rx={6} fill="none" stroke="#cbd5e1" strokeDasharray="3 3" />;
                            const order = liftOrder.get(pallet.id);
                            const isMoved = moved.has(pallet.id);
                            const related = pallet.product === product;
                            return (
                              <g key={row} opacity={related || order || isMoved ? 1 : 0.4}>
                                <title>{d.palletLine(pallet.id, name(pallet.product), pallet.boxes)}</title>
                                <rect
                                  x={x + 3}
                                  y={y + 3}
                                  width={CELL_W - 6}
                                  height={CELL_H - 6}
                                  rx={6}
                                  fill={PRODUCT_COLOR[pallet.product]}
                                  stroke={order ? '#0f172a' : isMoved ? '#b45309' : 'none'}
                                  strokeWidth={order || isMoved ? 3 : 0}
                                  strokeDasharray={isMoved ? '5 3' : undefined}
                                />
                                <text x={x + CELL_W / 2} y={y + CELL_H / 2 - 1} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0f172a">
                                  {PRODUCT_SHORT[pallet.product][lang]}
                                </text>
                                <text x={x + CELL_W / 2} y={y + CELL_H / 2 + 12} textAnchor="middle" fontSize={10} fill="#0f172a">
                                  {pallet.boxes}
                                </text>
                                {order && (
                                  <g>
                                    <circle cx={x + CELL_W - 10} cy={y + 10} r={9} fill="#0f172a" />
                                    <text x={x + CELL_W - 10} y={y + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
                                      {order}
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      ))}
                      <text x={roomW / 2} y={roomH - 7} textAnchor="middle" fontSize={11} fontWeight={700} fill="#64748b">
                        {d.door}
                      </text>
                    </svg>
                  </figure>
                ))}
              </div>

              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-4 w-4 rounded border-[3px] border-slate-900 bg-slate-200" /> {d.legendLift}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-4 w-4 rounded border-[3px] border-dashed border-amber-700 bg-slate-200" /> {d.legendMove}
                </li>
                <li className="flex items-center gap-2 text-muted">{d.legendDim}</li>
              </ul>

              <h3 className="mt-8 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.stockTitle}</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {PRODUCT_IDS.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: PRODUCT_COLOR[id] }} />
                      {name(id)}
                    </span>
                    <span className="font-semibold text-ink">{d.boxes(totalBoxes(inventory, id))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="cold-rules" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="cold-rules" eyebrow={d.rulesEyebrow} title={d.rulesTitle} description={d.rulesText} />
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {d.rules.map((r, i) => (
              <li key={r.title} className="border-t-2 border-electric-600 pt-5">
                <p className="font-display text-sm font-bold text-electric-700">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{r.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{r.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="cold-features" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="cold-features" eyebrow={d.featuresEyebrow} title={d.featuresTitle} description={d.featuresText} />
          <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {d.features.map((f) => (
              <div key={f.title} className="border-t-2 border-electric-600 pt-5">
                <dt className="font-display text-lg font-bold">{f.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{f.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 max-w-3xl text-muted">{d.limits}</p>
        </div>
      </section>

      <section aria-labelledby="cold-cta" className="bg-navy-900 py-20 text-white sm:py-24">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="cold-cta" className="font-display text-3xl font-bold">
              {d.ctaTitle}
            </h2>
            <p className="mt-3 text-lg text-slate-300">{d.ctaText}</p>
          </div>
          <ButtonLink to="/contact" size="lg">
            {d.ctaContact}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
