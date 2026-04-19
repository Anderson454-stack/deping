const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

function normalizeBaseUrl(value) {
  if (!value) return '';

  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    console.warn('[Deping] VITE_API_BASE_URL is invalid:', value);
    return '';
  }
}

export function resolveApiBaseUrl() {
  const normalized = normalizeBaseUrl(configuredBaseUrl);
  const isLocalTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
  const isExternalPage =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  // ngrok or deployed frontend should not try to call the user's local machine.
  if (isLocalTarget && isExternalPage) {
    return '';
  }

  return normalized;
}

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${resolveApiBaseUrl()}${normalizedPath}`;
}
