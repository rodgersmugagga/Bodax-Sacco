import { useCallback, useEffect, useRef, useState } from 'react';

function requestMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function useDelayedAsync(loadFn, deps = [], options = {}) {
  const {
    immediate = true,
    delay = 1000,
    errorMessage = 'Failed to load data',
  } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    let finished = false;

    const timer = setTimeout(() => {
      if (mountedRef.current && runIdRef.current === runId && !finished) {
        setLoading(true);
      }
    }, delay);

    if (mountedRef.current) {
      setError('');
    }

    try {
      return await loadFn(...args);
    } catch (err) {
      if (mountedRef.current && runIdRef.current === runId) {
        setError(requestMessage(err, errorMessage));
      }
      return null;
    } finally {
      finished = true;
      clearTimeout(timer);
      if (mountedRef.current && runIdRef.current === runId) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    if (immediate) {
      run();
    }
  }, [immediate, run]);

  return { loading, error, onRetry: run, setError };
}
