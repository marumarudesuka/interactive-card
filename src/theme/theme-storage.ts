import type { CardTheme } from "./card-theme";

const STORAGE_KEY = "interactive-card:appearance-theme:v1";
const themes = new Set<CardTheme>(["glass", "solid", "native"]);

export function loadCardTheme(): CardTheme {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (value === "black" || value === "white") return "solid";
    if (value === "default") return "native";
    return value && themes.has(value as CardTheme) ? value as CardTheme : "glass";
  } catch {
    return "glass";
  }
}

export function saveCardTheme(theme: CardTheme): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme still applies for the current session if storage is unavailable.
  }
}
