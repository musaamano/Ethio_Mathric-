/**
 * useLocalStorage.js
 * Synced state backed by localStorage.
 * Supports: tokens, theme preference, user preferences, any serialisable value.
 *
 * Usage:
 *   const [theme, setTheme] = useLocalStorage('theme', 'light');
 *   const [prefs, setPrefs] = useLocalStorage('userPrefs', { notifications: true });
 */
import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  // Read initial value from localStorage (or use default)
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`useLocalStorage: error reading key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage whenever storedValue changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`useLocalStorage: error writing key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove from localStorage
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`useLocalStorage: error removing key "${key}":`, error);
    }
  };

  return [storedValue, setStoredValue, removeValue];
}

export default useLocalStorage;
