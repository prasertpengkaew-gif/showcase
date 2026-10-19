import type { ComponentType, ReactNode, SVGProps } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ContactForm } from '../components/ContactForm';
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from '../components/Icons';
import { siteConfig } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const tips = [
  'What you want people to see or do',
  'Who will use it, and on which devices',
  'Any existing 3D, CAD files or product photos',
  'Your target launch date',
];

export default function Contact() {
  useDocumentTitle('Contact');
  const { email, phone, address, hours } = siteConfig.contact;
  const hasDetails = Boolean(email || phone || address || hours);

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Tell us about your project"
        description="Share a few details and we'll reply with questions, ideas, and an honest view on whether AR is the right fit."
      />
      <section aria-label="Contact form and details" className="py-16 sm:py-20">
        <div className="container-page grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <div>
            <h2 className="font-display text-2xl font-bold">Send an enquiry</h2>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>

          <aside className="space-y-10" aria-label="Other ways to reach us">
            {hasDetails && (
              <div>
                <h2 className="font-display text-xl font-bold">Contact details</h2>
                <ul className="mt-5 space-y-4">
                  {email && (
                    <Detail icon={MailIcon} label="Email">
                      <a href={`mailto:${email}`} className="text-electric-700 hover:underline">
                        {email}
                      </a>
                    </Detail>
                  )}
                  {phone && (
                    <Detail icon={PhoneIcon} label="Phone">
                      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="text-electric-700 hover:underline">
                        {phone}
                      </a>
                    </Detail>
                  )}
                  {address && (
                    <Detail icon={MapPinIcon} label="Address">
                      <address className="not-italic">{address}</address>
                    </Detail>
                  )}
                  {hours && (
                    <Detail icon={ClockIcon} label="Hours">
                      {hours}
                    </Detail>
                  )}
                </ul>
              </div>
            )}
            <div className="rounded-2xl bg-surface p-7">
              <h2 className="font-display text-xl font-bold">Helpful to include</h2>
              <ul className="mt-4 space-y-3 text-[15px] text-slate-700">
                {tips.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                    {t}
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
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">{label}</p>
        <div className="mt-1 text-[15px] text-ink">{children}</div>
      </div>
    </li>
  );
}
