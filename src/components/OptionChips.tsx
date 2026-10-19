import { useId } from 'react';

interface OptionChipsProps<T extends string> {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Optional display label per option. */
  format?: (value: T) => string;
  disabled?: boolean;
}

/** Accessible single-choice chip group built on native radio inputs. */
export function OptionChips<T extends string>({ legend, options, value, onChange, format, disabled }: OptionChipsProps<T>) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="cursor-pointer has-[:disabled]:cursor-not-allowed">
            <input
              type="radio"
              name={name}
              value={option}
              checked={option === value}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors peer-checked:border-navy-900 peer-checked:bg-navy-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-electric-600 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 hover:border-slate-300">
              {format ? format(option) : option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
