/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_CONTACT_PHONE?: string;
  readonly VITE_CONTACT_ADDRESS?: string;
  readonly VITE_CONTACT_HOURS?: string;
  readonly VITE_FORM_ENDPOINT?: string;
  readonly VITE_LINE_URL?: string;
  readonly VITE_LINE_ID?: string;
  readonly VITE_FACEBOOK_URL?: string;
  readonly VITE_LINKEDIN_URL?: string;
  readonly VITE_TWIN_WS_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_BOOTH_RETRY_MS?: string;
  /** Base URL for guest photo links (QR codes). Defaults to the page's own origin. */
  readonly VITE_PUBLIC_URL?: string;
  /** Public address of the site, used for canonical links and the sitemap (https://example.com). */
  readonly VITE_SITE_URL?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_GITHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
