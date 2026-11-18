"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type StaffTheme = "light" | "dark";

export const STAFF_THEME_STORAGE_KEY = "ma-staff-theme";
const THEME_CHANGE_EVENT = "ma-staff-theme-change";

export function resolveInitialStaffTheme(): StaffTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STAFF_THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return "light";
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key === STAFF_THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  media?.addEventListener?.("change", onStoreChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
    media?.removeEventListener?.("change", onStoreChange);
  };
}

export function setStaffThemePreference(next: StaffTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAFF_THEME_STORAGE_KEY, next);
  } catch {
    // Ignore storage errors
  }
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useStaffTheme(options?: { enabled?: boolean; manageLifecycle?: boolean }) {
  const enabled = options?.enabled ?? true;
  const manageLifecycle = options?.manageLifecycle ?? false;

  const theme = useSyncExternalStore<StaffTheme>(
    subscribeTheme,
    resolveInitialStaffTheme,
    () => "light",
  );

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
  }, [enabled, theme]);

  useEffect(() => {
    if (!manageLifecycle || typeof document === "undefined") return;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [manageLifecycle]);

  const setTheme = useCallback((next: StaffTheme) => {
    setStaffThemePreference(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const current = resolveInitialStaffTheme();
    setStaffThemePreference(current === "dark" ? "light" : "dark");
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
