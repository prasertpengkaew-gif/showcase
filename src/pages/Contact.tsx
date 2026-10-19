import type { ComponentType, ReactNode, SVGProps } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ContactForm } from '../components/ContactForm';
import { ButtonAnchor } from '../components/Button';
import { ClockIcon, ExternalIcon, LineIcon, MailIcon, MapPinIcon, PhoneIcon } from '../components/Icons';
import { siteConfig } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useT } from '../i18n';

export default function Contact() {
  const t = useT();
  const c = t.contact;
  useDocumentTitle(c.metaTitle);
  const { email, phone, address, hours, line, lineId } = siteConfig.contact;
  const facebook = siteConfig.social.find((s) => s.label === 'Facebook')?.href;
  const hasDetails = Boolean(email || phone || address || hours || line || facebook);

  return (
    <>
      <PageHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />
      <section aria-label={c.region} className="py-16 sm:py-20">
        <div className="container-page grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <div>
            <h2 className="font-display text-2xl font-bold">{c.formTitle}</h2>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>

          <aside className="space-y-10" aria-label={c.otherWays}>
            {hasDetails && (
              <div>
                <h2 className="font-display text-xl font-bold">{c.detailsTitle}</h2>
                <ul className="mt-5 space-y-4">
                  {email && (
                    <Detail icon={MailIcon} label={c.email}>
                      <a href={`mailto:${email}`} className="text-electric-700 hover:underline">
                        {email}
                      </a>
                    </Detail>
                  )}
                  {phone && (
                    <Detail icon={PhoneIcon} label={c.phone}>
                      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="text-electric-700 hover:underline">
                        {phone}
                      </a>
                    </Detail>
                  )}
                  {line && (
                    <Detail icon={LineIcon} label={c.line}>
                      <a href={line} target="_blank" rel="noopener noreferrer" className="text-electric-700 hover:underline">
                        {lineId || line}
                        <span className="sr-only"> {t.footer.newTab}</span>
                      </a>
                    </Detail>
                  )}
                  {facebook && (
                    <Detail icon={ExternalIcon} label={c.facebook}>
                      <a href={facebook} target="_blank" rel="noopener noreferrer" className="text-electric-700 hover:underline">
                        {facebook.replace(/^https:\/\/(www\.)?/, '')}
                        <span className="sr-only"> {t.footer.newTab}</span>
                      </a>
                    </Detail>
                  )}
                  {address && (
                    <Detail icon={MapPinIcon} label={c.address}>
                      <address className="not-italic">{address}</address>
                    </Detail>
                  )}
                  {hours && (
                    <Detail icon={ClockIcon} label={c.hours}>
                      {hours}
                    </Detail>
                  )}
                </ul>
                {line && (
                  <ButtonAnchor
                    href={line}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                    className="mt-6"
                    icon={<LineIcon />}
                  >
                    {c.chatLine}
                  </ButtonAnchor>
                )}
              </div>
            )}
            <div className="rounded-2xl bg-surface p-7">
              <h2 className="font-display text-xl font-bold">{c.tipsTitle}</h2>
              <ul className="mt-4 space-y-3 text-[15px] text-slate-700">
                {c.tips.map((tip) => (
                  <li key={tip} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-electric-50 text-electric-700">
        <Icon />
      </span>
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{label}</p>
        <div className="mt-1 text-[15px] text-ink">{children}</div>
      </div>
    </li>
  );
}
