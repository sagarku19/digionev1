// Retry policy. Exponential backoff with ±20% jitter, capped at 1h. Error classification
// decides retryable vs terminal and whether the account token is invalid (→ revoke).
const TRANSIENT_META_CODES = new Set([1, 2, 4, 17, 32, 341, 613]); // rate/temporary
const OAUTH_META_CODES = new Set([190, 102, 10, 200]);             // token/permission

export function computeBackoffSeconds(attempt: number): number {
  const base = Math.min(60 * 2 ** (attempt - 1), 3600);
  const jitter = base * (Math.random() * 0.4 - 0.2); // ±20%
  return Math.max(1, Math.round(base + jitter));
}

export interface ErrorClass { retryable: boolean; isOAuthInvalid: boolean }

export function classifyHttpError(httpStatus: number, metaCode: number | undefined): ErrorClass {
  if (metaCode != null && OAUTH_META_CODES.has(metaCode)) {
    return { retryable: false, isOAuthInvalid: metaCode === 190 || metaCode === 102 };
  }
  if (metaCode != null && TRANSIENT_META_CODES.has(metaCode)) return { retryable: true, isOAuthInvalid: false };
  if (httpStatus === 429 || httpStatus >= 500) return { retryable: true, isOAuthInvalid: false };
  return { retryable: false, isOAuthInvalid: false };
}
