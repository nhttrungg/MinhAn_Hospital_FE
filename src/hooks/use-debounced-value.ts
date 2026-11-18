"use client";
import { useEffect, useState } from "react";
/** Wait for a pause in typing; cancel pending updates when the input changes. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return settled;
}
