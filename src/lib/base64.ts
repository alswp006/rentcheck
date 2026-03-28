/**
 * URL-safe base64 encode/decode utilities (no +/=/slash characters in output).
 * Supports Unicode strings via encodeURIComponent encoding.
 * Both functions throw on failure — callers must wrap in try/catch.
 */

export function encodeBase64(str: string): string {
  const binary = unescape(encodeURIComponent(str));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function decodeBase64(encoded: string): string {
  const padding = '=='.slice(0, (4 - (encoded.length % 4)) % 4);
  const base64 = (encoded + padding).replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(base64)));
}
