/**
 * Company details. Edit the values here, or set the matching VITE_* variables in
 * .env.local (see .env.example). Empty values are simply not rendered.
 */
const env = import.meta.env;

const clean = (value: string | undefined): string => (value ?? '').trim();

const httpsUrl = (value: string | undefined): string => {
  const v = clean(value);
  return /^https:\/\//i.test(v) ? v : '';
};

export const siteConfig = {
  name: 'TheNerdStudio',
  tagline: 'WebAR & 3D experience studio',
  description:
    'We design and build augmented reality, real-time 3D and interactive experiences that run in the browser — no app download required.',
  contact: {
    // VITE_CONTACT_EMAIL overrides the default address.
    email: clean(env.VITE_CONTACT_EMAIL) || 'thenerdstudio@gmail.com',
    phone: clean(env.VITE_CONTACT_PHONE),
    address: clean(env.VITE_CONTACT_ADDRESS),
    hours: clean(env.VITE_CONTACT_HOURS),
    /** JSON POST endpoint for the contact form. Must be HTTPS. */
    formEndpoint: httpsUrl(env.VITE_FORM_ENDPOINT),
  },
  social: [
    { label: 'LinkedIn', href: httpsUrl(env.VITE_LINKEDIN_URL) },
    { label: 'Instagram', href: httpsUrl(env.VITE_INSTAGRAM_URL) },
    { label: 'GitHub', href: httpsUrl(env.VITE_GITHUB_URL) },
  ].filter((s) => s.href !== ''),
} as const;

export const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/ar-playground', label: 'AR Playground' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
] as const;
