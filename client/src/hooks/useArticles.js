import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useArticles(params) {
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async (override = {}) => {
    setLoading(true);
    setError(null);
    try {
      const merged = { ...params, ...override };
      const { data: res } = await api.get('/articles', { params: merged });
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return { ...data, loading, error, refetch: fetchPage };
}
