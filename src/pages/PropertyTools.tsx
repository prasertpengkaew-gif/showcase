import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLanguage, useT } from '../i18n';

type Property = {
  name: string;
  price: string;
  area: string;
  floor: string;
  direction: string;
  monthlyFee: string;
  commute: string;
};

const blankProperty = (): Property => ({ name: '', price: '', area: '', floor: '', direction: '', monthlyFee: '', commute: '' });
const numeric = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const PROPERTY_KEY = 'showcase-property-compare-v1';
const CHECKLIST_KEY = 'showcase-property-checklist-v1';

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-electric-600 focus:ring-2 focus:ring-electric-600/20';
const labelClass = 'block text-sm font-medium text-slate-700';

export default function PropertyTools() {
  const t = useT().propertyTools;
  const { lang } = useLanguage();
  useDocumentTitle(t.metaTitle);
  const [properties, setProperties] = useState<Property[]>(() => readStored(PROPERTY_KEY, [blankProperty(), blankProperty()]));
  const [checked, setChecked] = useState<number[]>(() => readStored(CHECKLIST_KEY, []));
  const [estimatePrice, setEstimatePrice] = useState('');
  const [downPercent, setDownPercent] = useState('20');
  const [annualRate, setAnnualRate] = useState('5');
  const [years, setYears] = useState('30');

  useEffect(() => {
    try {
      localStorage.setItem(PROPERTY_KEY, JSON.stringify(properties));
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checked));
    } catch {
      // The tools remain usable when browser storage is disabled or full.
    }
  }, [properties, checked]);

  const currency = useMemo(() => new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US', {
    style: 'currency', currency: 'THB', maximumFractionDigits: 0,
  }), [lang]);

  const updateProperty = (index: number, field: keyof Property, value: string) => {
    setProperties((current) => current.map((property, i) => i === index ? { ...property, [field]: value } : property));
  };

  const price = Math.max(0, numeric(estimatePrice));
  const down = Math.min(100, Math.max(0, numeric(downPercent)));
  const principal = price * (1 - down / 100);
  const months = Math.min(50, Math.max(1, numeric(years) || 1)) * 12;
  const monthlyRate = Math.min(100, Math.max(0, numeric(annualRate))) / 1200;
  const payment = monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);

  const numberInput = (label: string, value: string, setValue: (value: string) => void, min = '0', max?: string) => (
    <label className={labelClass}>{label}
      <input className={inputClass} type="number" inputMode="decimal" min={min} max={max} value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
  );

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="container-page space-y-10 py-12 sm:py-16">
        <section aria-labelledby="compare-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="compare-title" className="font-display text-2xl font-bold text-navy-900">{t.compareTitle}</h2>
            </div>
            {properties.length < 3 && <Button onClick={() => setProperties((current) => [...current, blankProperty()])}>{t.addProperty}</Button>}
          </div>
          {properties.some((property) => property.name || property.price || property.area) && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, index) => (
                <article key={`summary-${index}`} className="rounded-2xl border border-line bg-navy-900 p-5 text-white">
                  <h3 className="font-semibold">{property.name || `${t.compareTitle} ${index + 1}`}</h3>
                  <p className="mt-3 text-sm text-slate-300">{property.price ? currency.format(numeric(property.price)) : '—'}</p>
                  <p className="mt-1 text-sm text-slate-300">{numeric(property.area) > 0 ? `${property.area} m² · ${currency.format(numeric(property.price) / numeric(property.area))} / m²` : '—'}</p>
                  <p className="mt-1 text-sm text-slate-300">{property.floor || '—'} · {property.direction ? t.directionOptions[Number(property.direction)] : '—'} · {property.commute || '—'} min</p>
                  <p className="mt-1 text-sm text-slate-300">{t.monthlyFee}: {property.monthlyFee ? currency.format(numeric(property.monthlyFee)) : '—'}</p>
                </article>
              ))}
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property, index) => (
              <fieldset key={index} className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm">
                <legend className="px-2 font-semibold text-navy-900">{property.name || `${t.compareTitle} ${index + 1}`}</legend>
                {properties.length > 2 && <button type="button" onClick={() => setProperties((current) => current.filter((_, i) => i !== index))} className="mb-3 text-sm text-red-700 underline">{t.remove}</button>}
                <div className="space-y-3">
                  <label className={labelClass}>{t.propertyName}<input className={inputClass} value={property.name} onChange={(event) => updateProperty(index, 'name', event.target.value)} /></label>
                  <label className={labelClass}>{t.price}<input className={inputClass} type="number" inputMode="numeric" min="0" value={property.price} onChange={(event) => updateProperty(index, 'price', event.target.value)} /></label>
                  <label className={labelClass}>{t.area}<input className={inputClass} type="number" inputMode="decimal" min="0" step="0.1" value={property.area} onChange={(event) => updateProperty(index, 'area', event.target.value)} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={labelClass}>{t.floor}<input className={inputClass} value={property.floor} onChange={(event) => updateProperty(index, 'floor', event.target.value)} /></label>
                    <label className={labelClass}>{t.commute}<input className={inputClass} type="number" inputMode="numeric" min="0" value={property.commute} onChange={(event) => updateProperty(index, 'commute', event.target.value)} /></label>
                  </div>
                  <label className={labelClass}>{t.direction}
                    <select className={inputClass} value={property.direction} onChange={(event) => updateProperty(index, 'direction', event.target.value)}>
                      {t.directionOptions.map((direction, i) => <option key={direction} value={i === 0 ? '' : String(i)}>{direction}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>{t.monthlyFee}<input className={inputClass} type="number" inputMode="numeric" min="0" value={property.monthlyFee} onChange={(event) => updateProperty(index, 'monthlyFee', event.target.value)} /></label>
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="checklist-title" className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <h2 id="checklist-title" className="font-display text-2xl font-bold text-navy-900">{t.checklistTitle}</h2>
            <p className="mt-2 text-sm text-muted">{t.checklistLead} · {t.checkedCount(checked.length, t.checkItems.length)}</p>
            <ul className="mt-5 space-y-3">
              {t.checkItems.map((item, index) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50">
                    <input className="mt-0.5 h-4 w-4 accent-blue-700" type="checkbox" checked={checked.includes(index)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, index] : current.filter((value) => value !== index))} />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="calculator-title" className="rounded-3xl border border-line bg-slate-50 p-6 sm:p-8">
            <h2 id="calculator-title" className="font-display text-2xl font-bold text-navy-900">{t.calculatorTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.calculatorLead}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {numberInput(t.price, estimatePrice, setEstimatePrice)}
              {numberInput(t.downPercent, downPercent, setDownPercent, '0', '100')}
              {numberInput(t.annualRate, annualRate, setAnnualRate, '0', '100')}
              {numberInput(t.years, years, setYears, '1', '50')}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm text-muted">{t.downAmount}</p>
                <p className="mt-1 text-xl font-bold text-navy-900">{currency.format(price * down / 100)}</p>
              </div>
              <div className="rounded-2xl bg-electric-600 p-4 text-white">
                <p className="text-sm text-blue-100">{t.monthlyPayment}</p>
                <p className="mt-1 text-xl font-bold">{currency.format(payment)}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
