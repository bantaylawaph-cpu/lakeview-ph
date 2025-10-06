// Simple debounce hook for primitive values (number, string, etc.)
// delayMs: number (default 250)
// Returns the debounced value that updates only after delay of no changes.
import { useEffect, useState } from 'react';

export default function useDebounce(value, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
