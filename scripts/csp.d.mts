export interface CspExtra {
  connect?: string[];
  img?: string[];
}

export const CSP_DIRECTIVES: ReadonlyArray<readonly [string, readonly string[]]>;

export function cspHeader(extra?: CspExtra): string;

export function securityHeaders(extra?: CspExtra): { key: string; value: string }[];

export function cspExtraFromEnv(env?: NodeJS.ProcessEnv): CspExtra;
