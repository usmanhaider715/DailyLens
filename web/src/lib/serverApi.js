const API_BASE = `${process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api`;

export async function fetchServerApi(path, { revalidate = 1800 } = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
