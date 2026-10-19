/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_CONTACT_PHONE?: string;
  readonly VITE_CONTACT_ADDRESS?: string;
  readonly VITE_CONTACT_HOURS?: string;
  readonly VITE_FORM_ENDPOINT?: string;
  readonly VITE_LINKEDIN_URL?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_GITHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
