/**
 * useDebounce.js
 * Delays updating a value until after a specified wait.
 * Used for search inputs to avoid firing API calls on every keystroke.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchText, 400);
 *   useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
