/**
 * useApi.js
 * Generic hook for data fetching with loading, error, and refetch states.
 * Eliminates repetitive useState + useEffect patterns across all pages.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(analyticsService.getStudentOverview);
 *   const { data, loading } = useApi(() => subjectService.getSubjects(), []);
 */
import { useState, useEffect, useCallback, useRef } from 'react';

function useApi(apiFn, deps = [], options = {}) {
  const { immediate = true, initialData = null, onSuccess, onError } = options;

  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      if (mountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        const msg = err?.response?.data?.message || err.message || 'An error occurred';
        setError(msg);
        onError?.(msg, err);
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiFn]);

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: execute, setData };
}

export default useApi;
