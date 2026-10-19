import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navLinks } from '../config/site';
import { Logo } from './Logo';
import { ButtonLink } from './Button';
import { CloseIcon, MenuIcon } from './Icons';
import { LanguageToggle } from './LanguageToggle';
import { useT } from '../i18n';
import { demoPaths } from '../data/demos';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const onDemo = demoPaths.includes(location.pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
      // Keep keyboard focus inside the open menu.
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = [toggleRef.current, ...panelRef.current.querySelectorAll<HTMLElement>('a')].filter(
          Boolean,
        ) as HTMLElement[];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const solid = scrolled && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid ? 'border-b border-line bg-white/90 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav aria-label={t.nav.main} className="container-page flex h-16 items-center justify-between lg:h-[72px]">
        <Logo tone={solid ? 'dark' : 'light'} />

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.slice(1).map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive: exact }) => {
                  const isActive = exact || (link.key === 'demos' && onDemo);
                  return `relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    solid
                      ? isActive
                        ? 'text-electric-700'
                        : 'text-slate-600 hover:text-ink'
                      : isActive
                        ? 'text-white'
                        : 'text-slate-300 hover:text-white'
                  }`;
                }}
              >
                {({ isActive: exact }) => (
                  <>
                    {t.nav[link.key]}
                    {(exact || (link.key === 'demos' && onDemo)) && (
                      <span
                        aria-hidden
                        className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-electric-600"
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <LanguageToggle tone={solid ? 'dark' : 'light'} />
          <div className="hidden lg:block">
            <ButtonLink to="/contact" variant={solid ? 'primary' : 'outline-light'} size="md">
              {t.nav.cta}
            </ButtonLink>
          </div>

        <button
          ref={toggleRef}
          type="button"
          className={`grid h-11 w-11 place-items-center rounded-full lg:hidden ${
            solid ? 'text-ink hover:bg-surface' : 'text-white hover:bg-white/10'
          }`}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
        </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto bg-navy-900 lg:hidden"
      >
        <ul className="container-page flex flex-col gap-1 py-6">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3.5 font-display text-2xl font-semibold ${
                    isActive ? 'bg-white/5 text-white' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {t.nav[link.key]}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
