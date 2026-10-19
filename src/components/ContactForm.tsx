import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { siteConfig } from '../config/site';
import { PROJECT_CATEGORIES } from '../types/project';
import { AlertIcon, CheckIcon, InfoIcon } from './Icons';
import { Button } from './Button';
import { useCategoryLabel, useT } from '../i18n';
import type { Dictionary } from '../i18n/en';

interface FormValues {
  name: string;
  email: string;
  company: string;
  projectType: string;
  message: string;
  /** Honeypot: real visitors never see or fill this. */
  website: string;
}

type FieldName = 'name' | 'email' | 'projectType' | 'message';
type ErrorCode = 'name' | 'nameShort' | 'nameLong' | 'email' | 'emailFormat' | 'type' | 'message' | 'messageShort' | 'messageLong';
type Errors = Partial<Record<FieldName, ErrorCode>>;

const EMPTY: FormValues = { name: '', email: '', company: '', projectType: '', message: '', website: '' };
const OTHER_TYPES = ['VR experience', 'Not sure yet'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2000;

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'name';
  else if (name.length < 2) errors.name = 'nameShort';
  else if (name.length > 100) errors.name = 'nameLong';

  const email = values.email.trim();
  if (!email) errors.email = 'email';
  else if (!EMAIL_RE.test(email)) errors.email = 'emailFormat';

  if (!values.projectType) errors.projectType = 'type';

  const message = values.message.trim();
  if (!message) errors.message = 'message';
  else if (message.length < MESSAGE_MIN) errors.message = 'messageShort';
  else if (message.length > MESSAGE_MAX) errors.message = 'messageLong';
  return errors;
}

function errorText(code: ErrorCode, f: Dictionary['form']): string {
  switch (code) {
    case 'name': return f.errName;
    case 'nameShort': return f.errNameShort;
    case 'nameLong': return f.errNameLong;
    case 'email': return f.errEmail;
    case 'emailFormat': return f.errEmailFormat;
    case 'type': return f.errType;
    case 'message': return f.errMessage;
    case 'messageShort': return f.errMessageShort(MESSAGE_MIN);
    case 'messageLong': return f.errMessageLong(MESSAGE_MAX);
  }
}

type Delivery = 'endpoint' | 'mailto' | 'none';
type SubmitState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'mail-opened' }
  | { kind: 'failed'; message: string };

const FIELD_ORDER: FieldName[] = ['name', 'email', 'projectType', 'message'];
const fieldLabel = (field: FieldName, f: Dictionary['form']): string =>
  ({ name: f.name, email: f.email, projectType: f.projectType, message: f.details })[field];

export function ContactForm() {
  const { email: contactEmail, formEndpoint } = siteConfig.contact;
  const delivery: Delivery = formEndpoint ? 'endpoint' : contactEmail ? 'mailto' : 'none';

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Incremented on each invalid submit so the error summary receives focus after it renders.
  const [summaryFocusKey, setSummaryFocusKey] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const f = useT().form;
  const categoryLabel = useCategoryLabel();
  const typeLabel = (type: string) =>
    type === 'VR experience' ? f.vrType : type === 'Not sure yet' ? f.notSure : categoryLabel(type as (typeof PROJECT_CATEGORIES)[number]);

  const set = (field: keyof FormValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // Re-validate live once a field has been visited, so errors clear as soon as they're fixed.
    if (FIELD_ORDER.includes(field as FieldName) && touched[field as FieldName]) setErrors(validate(next));
  };

  const blur = (field: FieldName) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(values));
  };

  useEffect(() => {
    if (summaryFocusKey > 0) summaryRef.current?.focus();
  }, [summaryFocusKey]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    setSubmitAttempted(true);
    setErrors(found);
    setTouched({ name: true, email: true, projectType: true, message: true });
    if (Object.keys(found).length > 0) {
      setState({ kind: 'idle' });
      setSummaryFocusKey((k) => k + 1);
      return;
    }
    // Silently drop bot submissions.
    if (values.website) {
      setState({ kind: 'sent' });
      return;
    }

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.company.trim(),
      projectType: values.projectType,
      message: values.message.trim(),
    };

    if (delivery === 'endpoint') {
      setState({ kind: 'sending' });
      try {
        const res = await fetch(formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        setState({ kind: 'sent' });
        setValues(EMPTY);
        setTouched({});
        setSubmitAttempted(false);
      } catch (err) {
        console.error('Contact form submission failed', err);
        setState({
          kind: 'failed',
          message: contactEmail ? f.failedWithEmail(contactEmail) : f.failed,
        });
      }
      return;
    }

    if (delivery === 'mailto') {
      const subject = f.subject(typeLabel(payload.projectType), payload.name);
      const body = [
        payload.message,
        '',
        '—',
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        payload.company ? `Company: ${payload.company}` : '',
        `Project type: ${typeLabel(payload.projectType)}`,
      ]
        .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
        .join('\n');
      window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setState({ kind: 'mail-opened' });
    }
  };

  const errorList = FIELD_ORDER.filter((f) => errors[f] && touched[f]);
  const showSummary = submitAttempted && errorList.length > 0 && state.kind === 'idle';
  const submitLabel =
    delivery === 'mailto' ? f.openEmail : state.kind === 'sending' ? f.sending : f.send;

  return (
    <div>
      {delivery === 'none' && (
        <Notice tone="warn" title={f.noneTitle}>
          {f.noneText}
          {import.meta.env.DEV && (
            <>
              {' '}
              <strong>Developer:</strong> set <code>VITE_FORM_ENDPOINT</code> or <code>VITE_CONTACT_EMAIL</code> in{' '}
              <code>.env.local</code> (see README).
            </>
          )}
        </Notice>
      )}
      {delivery === 'mailto' && state.kind === 'idle' && (
        <Notice tone="info" title={f.mailtoTitle}>
          {f.mailtoText(contactEmail)}
        </Notice>
      )}

      {state.kind === 'sent' && (
        <Notice tone="success" title={f.sentTitle}>
          {f.sentText}
        </Notice>
      )}
      {state.kind === 'mail-opened' && (
        <Notice tone="info" title={f.openedTitle}>
          {f.openedText(contactEmail)}{' '}
          <a className="font-semibold underline" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
          .
        </Notice>
      )}
      {state.kind === 'failed' && (
        <Notice tone="error" title={f.failedTitle}>
          {state.message}
        </Notice>
      )}

      {showSummary && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-semibold">{errorList.length === 1 ? f.fixOne : f.fixMany(errorList.length)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorList.map((field) => (
              <li key={field}>
                <a href={`#${formId}-${field}`} className="underline">
                  {fieldLabel(field, f)}: {errorText(errors[field]!, f)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form noValidate onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2" aria-describedby={`${formId}-req`}>
        <p id={`${formId}-req`} className="text-sm text-muted sm:col-span-2">
          {f.requiredStart} <span className="text-red-600">*</span> {f.requiredEnd}
        </p>
        <Field id={`${formId}-name`} label={f.name} required error={touched.name && errors.name ? errorText(errors.name, f) : undefined}>
          {(p) => (
            <input
              {...p}
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => blur('name')}
            />
          )}
        </Field>
        <Field id={`${formId}-email`} label={f.email} required error={touched.email && errors.email ? errorText(errors.email, f) : undefined}>
          {(p) => (
            <input
              {...p}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              onBlur={() => blur('email')}
            />
          )}
        </Field>
        <Field id={`${formId}-company`} label={f.company} hint={f.optional}>
          {(p) => (
            <input
              {...p}
              type="text"
              autoComplete="organization"
              value={values.company}
              onChange={(e) => set('company', e.target.value)}
            />
          )}
        </Field>
        <Field
          id={`${formId}-projectType`}
          label={f.projectType}
          required
          error={touched.projectType && errors.projectType ? errorText(errors.projectType, f) : undefined}
        >
          {(p) => (
            <select
              {...p}
              value={values.projectType}
              onChange={(e) => set('projectType', e.target.value)}
              onBlur={() => blur('projectType')}
            >
              <option value="">{f.selectOne}</option>
              {[...PROJECT_CATEGORIES, ...OTHER_TYPES].map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field
            id={`${formId}-message`}
            label={f.details}
            required
            hint={`${values.message.trim().length}/${MESSAGE_MAX}`}
            error={touched.message && errors.message ? errorText(errors.message, f) : undefined}
          >
            {(p) => (
              <textarea
                {...p}
                rows={6}
                value={values.message}
                onChange={(e) => set('message', e.target.value)}
                onBlur={() => blur('message')}
                placeholder={f.placeholder}
              />
            )}
          </Field>
        </div>

        {/* Honeypot field, hidden from people and assistive technology */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            {f.honeypot}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={values.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted">
            {f.privacy}
          </p>
          <Button type="submit" size="lg" disabled={delivery === 'none' || state.kind === 'sending'}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface FieldControlProps {
  id: string;
  name: string;
  required?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  className: string;
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (props: FieldControlProps) => ReactNode;
}) {
  const errorId = `${id}-error`;
  const className = `block w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-300 hover:border-slate-400 focus:border-electric-600 focus:ring-electric-600/20'
  }`;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && (
            <span className="text-red-600" aria-hidden>
              {' '}
              *
            </span>
          )}
        </label>
        {hint && <span className="text-xs text-muted tabular-nums">{hint}</span>}
      </div>
      {children({
        id,
        name: id.split('-').pop() ?? id,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
        className,
      })}
      {error && (
        <p id={errorId} className="mt-2 flex items-center gap-1.5 text-sm text-red-700">
          <AlertIcon width={16} height={16} /> {error}
        </p>
      )}
    </div>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: 'success' | 'info' | 'warn' | 'error';
  title: string;
  children: ReactNode;
}) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    info: 'border-electric-100 bg-electric-50 text-navy-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
    error: 'border-red-200 bg-red-50 text-red-900',
  }[tone];
  const Icon = tone === 'success' ? CheckIcon : tone === 'info' ? InfoIcon : AlertIcon;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-6 flex gap-3 rounded-xl border p-4 text-sm ${styles}`}>
      <Icon className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
