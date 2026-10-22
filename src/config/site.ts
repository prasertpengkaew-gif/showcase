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
  contact: {
    // VITE_CONTACT_EMAIL overrides the default address.
    email: clean(env.VITE_CONTACT_EMAIL) || 'thenerdstudio@gmail.com',
    phone: clean(env.VITE_CONTACT_PHONE),
    address: clean(env.VITE_CONTACT_ADDRESS),
    hours: clean(env.VITE_CONTACT_HOURS),
    /** LINE add-friend link, e.g. https://line.me/R/ti/p/@yourid */
    line: httpsUrl(env.VITE_LINE_URL),
    /** Display text for the LINE account, e.g. @thenerdstudio */
    lineId: clean(env.VITE_LINE_ID),
    /** JSON POST endpoint for the contact form. Must be HTTPS. */
    formEndpoint: httpsUrl(env.VITE_FORM_ENDPOINT),
  },
  social: [
    { label: 'Facebook', href: httpsUrl(env.VITE_FACEBOOK_URL) },
    { label: 'LinkedIn', href: httpsUrl(env.VITE_LINKEDIN_URL) },
    { label: 'Instagram', href: httpsUrl(env.VITE_INSTAGRAM_URL) },
    { label: 'GitHub', href: httpsUrl(env.VITE_GITHUB_URL) },
  ].filter((s) => s.href !== ''),
} as const;

/** `key` selects the label from the `nav` section of the i18n dictionary. */
export const navLinks = [
  { to: '/', key: 'home' },
  { to: '/projects', key: 'projects' },
  { to: '/demos', key: 'demos' },
  { to: '/services', key: 'services' },
  { to: '/web-apps', key: 'webApps' },
  { to: '/about', key: 'about' },
  { to: '/contact', key: 'contact' },
] as const;
