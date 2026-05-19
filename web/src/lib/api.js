const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export function apiUrl(path) {
  const p = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
  if (typeof window !== 'undefined') return p;
  return `${API_BASE}${p}`;
}

export async function fetchApi(path, { revalidate = 60, tags, cache = 'force-cache' } = {}) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    cache,
    next: tags ? { revalidate, tags } : { revalidate },
  });
  if (!res.ok) {
    const err = new Error(`API ${res.status}: ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
