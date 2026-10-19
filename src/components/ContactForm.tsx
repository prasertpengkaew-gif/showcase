import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { siteConfig } from '../config/site';
import { PROJECT_CATEGORIES } from '../types/project';
import { AlertIcon, CheckIcon, InfoIcon } from './Icons';
import { Button } from './Button';

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
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: FormValues = { name: '', email: '', company: '', projectType: '', message: '', website: '' };
const PROJECT_TYPES = [...PROJECT_CATEGORIES, 'Not sure yet'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2000;

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Please enter your name.';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters.';
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.';

  const email = values.email.trim();
  if (!email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter an email address like name@company.com.';

  if (!values.projectType) errors.projectType = 'Choose the option closest to your project.';

  const message = values.message.trim();
  if (!message) errors.message = 'Tell us a little about your project.';
  else if (message.length < MESSAGE_MIN) errors.message = `Please write at least ${MESSAGE_MIN} characters.`;
  else if (message.length > MESSAGE_MAX) errors.message = `Please keep it under ${MESSAGE_MAX} characters.`;
  return errors;
}

type Delivery = 'endpoint' | 'mailto' | 'none';
type SubmitState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'mail-opened' }
  | { kind: 'failed'; message: string };

const FIELD_ORDER: FieldName[] = ['name', 'email', 'projectType', 'message'];
const FIELD_LABELS: Record<FieldName, string> = {
  name: 'Name',
  email: 'Email',
  projectType: 'Project type',
  message: 'Message',
};

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

  const set = (field: keyof FormValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // Re-validate live once a field has been visited, so errors clear as soon as they're fixed.
    if (field in FIELD_LABELS && touched[field as FieldName]) setErrors(validate(next));
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
          message: contactEmail
            ? `Your message wasn't sent. Please try again, or email us directly at ${contactEmail}.`
            : "Your message wasn't sent. Please check your connection and try again.",
        });
      }
      return;
    }

    if (delivery === 'mailto') {
      const subject = `Project enquiry: ${payload.projectType} — ${payload.name}`;
      const body = [
        payload.message,
        '',
        '—',
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        payload.company ? `Company: ${payload.company}` : '',
        `Project type: ${payload.projectType}`,
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
    delivery === 'mailto' ? 'Open in my email app' : state.kind === 'sending' ? 'Sending…' : 'Send message';

  return (
    <div>
      {delivery === 'none' && (
        <Notice tone="warn" title="This form isn't connected yet">
          Messages can't be delivered until the site owner configures a form endpoint or contact email.
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
        <Notice tone="info" title="How this form works">
          Submitting opens your email app with your message ready to send to {contactEmail}. Nothing is sent until you
          press send there.
        </Notice>
      )}

      {state.kind === 'sent' && (
        <Notice tone="success" title="Message sent">
          Thanks for getting in touch. We've received your message and will reply by email.
        </Notice>
      )}
      {state.kind === 'mail-opened' && (
        <Notice tone="info" title="Check your email app">
          We've opened a draft addressed to {contactEmail}. Press send in your email app to deliver it. If nothing
          opened, email us directly at{' '}
          <a className="font-semibold underline" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
          .
        </Notice>
      )}
      {state.kind === 'failed' && (
        <Notice tone="error" title="Something went wrong">
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
          <p className="font-semibold">Please fix {errorList.length === 1 ? 'this field' : `these ${errorList.length} fields`}:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorList.map((f) => (
              <li key={f}>
                <a href={`#${formId}-${f}`} className="underline">
                  {FIELD_LABELS[f]}: {errors[f]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form noValidate onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2" aria-describedby={`${formId}-req`}>
        <p id={`${formId}-req`} className="text-sm text-muted sm:col-span-2">
          Fields marked <span className="text-red-600">*</span> are required.
        </p>
        <Field id={`${formId}-name`} label="Name" required error={touched.name ? errors.name : undefined}>
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
        <Field id={`${formId}-email`} label="Work email" required error={touched.email ? errors.email : undefined}>
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
        <Field id={`${formId}-company`} label="Company" hint="Optional">
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
          label="Project type"
          required
          error={touched.projectType ? errors.projectType : undefined}
        >
          {(p) => (
            <select
              {...p}
              value={values.projectType}
              onChange={(e) => set('projectType', e.target.value)}
              onBlur={() => blur('projectType')}
            >
              <option value="">Select one…</option>
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field
            id={`${formId}-message`}
            label="Project details"
            required
            hint={`${values.message.trim().length}/${MESSAGE_MAX}`}
            error={touched.message ? errors.message : undefined}
          >
            {(p) => (
              <textarea
                {...p}
                rows={6}
                value={values.message}
                onChange={(e) => set('message', e.target.value)}
                onBlur={() => blur('message')}
                placeholder="What would you like to build, who is it for, and when do you need it?"
              />
            )}
          </Field>
        </div>

        {/* Honeypot field, hidden from people and assistive technology */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
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
            We only use your details to reply to this enquiry.
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
