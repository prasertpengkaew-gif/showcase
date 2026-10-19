import { Link } from 'react-router-dom';
import { navLinks, siteConfig } from '../config/site';
import { Logo } from './Logo';
import { useT } from '../i18n';

export function Footer() {
  const { contact, social } = siteConfig;
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-slate-400">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-5 text-sm leading-relaxed">{t.siteDescription}</p>
        </div>

        <nav aria-label={t.footer.explore}>
          <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">{t.footer.explore}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-1">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white">
                  {t.nav[l.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">{t.footer.touch}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="hover:text-white">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && (
              <li>
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="hover:text-white">
                  {contact.phone}
                </a>
              </li>
            )}
            {contact.line && (
              <li>
                <a href={contact.line} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  LINE{contact.lineId ? ` ${contact.lineId}` : ''}
                  <span className="sr-only"> {t.footer.newTab}</span>
                </a>
              </li>
            )}
            <li>
              <Link to="/contact" className="hover:text-white">
                {t.footer.form}
              </Link>
            </li>
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {s.label}
                  <span className="sr-only"> {t.footer.newTab}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name}. {t.footer.rights}
          </p>
          <p>
            {t.footer.credits}{' '}
            <Link to="/about#credits" className="underline underline-offset-2 hover:text-white">
              {t.footer.seeCredits}
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
