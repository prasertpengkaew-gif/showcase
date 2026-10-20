const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/** Random 12-character photo code (base32, 60 bits). It is the only thing that protects a guest's photo link. */
export function newPhotoCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join('');
}

export const isPhotoCode = (s: string) => /^[a-z2-7]{12}$/.test(s);
