import {
  getCardThemeStyles,
  type CardTheme,
} from "./card-theme";
import { loadCardTheme, saveCardTheme } from "./theme-storage";
import { getDesignTokenDeclarations } from "../design-system/tokens";

const THEMED_CARD_SELECTOR = [
  "energy-kpi-card",
  "energy-kpi-section",
  "energy-trend-card",
  "energy-circuit-section",
  "energy-ev-charging-scene",
  "energy-solar-scene",
  "energy-battery-scene",
  "energy-appliance-scene",
  "energy-pet-scene",
  "energy-insight-card",
  "energy-flow-diagram",
  "energy-theme-selector",
  "energy-settings-card",
  "energy-automation-card",
].join(",");

const STYLE_ID = "interactive-card-theme-provider";
let currentTheme: CardTheme = loadCardTheme();
let appliedDarkMode: boolean | undefined;

interface HomeAssistantRoot extends HTMLElement {
  hass?: {
    themes?: {
      darkMode?: boolean;
    };
  };
}

function isHaDarkMode(): boolean {
  const homeAssistant = document.querySelector<HomeAssistantRoot>(
    "home-assistant"
  );
  const hassDarkMode = homeAssistant?.hass?.themes?.darkMode;
  if (typeof hassDarkMode === "boolean") return hassDarkMode;

  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary-text-color").trim();
  const hex = color.match(/^#([\da-f]{6})$/i);
  const rgb = color.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  const channels = hex
    ? [hex[1].slice(0,2), hex[1].slice(2,4), hex[1].slice(4,6)]
        .map((value) => Number.parseInt(value, 16))
    : rgb
      ? rgb.slice(1,4).map(Number)
      : undefined;
  if (channels) {
    const luminance =
      channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    return luminance > 150;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function ensureThemeStyle(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  document.head.append(style);
  return style;
}

export function applyCardTheme(theme: CardTheme): void {
  currentTheme = theme;
  const darkMode = isHaDarkMode();
  appliedDarkMode = darkMode;
  const tokens = getCardThemeStyles(theme, darkMode);
  const style = ensureThemeStyle();
  const textOverrides =
    theme !== "native"
      ? `
        ${THEMED_CARD_SELECTOR} {
          --primary-text-color: var(--ic-card-primary-text);
          --secondary-text-color: var(--ic-card-secondary-text);
        }
      `
      : "";
  style.textContent = `
    :root {
      ${getDesignTokenDeclarations()}
      --en-surface-primary:${tokens.surfacePrimary};
      --en-surface-secondary:${tokens.surfaceSecondary};
      --en-surface-floating:${tokens.surfaceFloating};
      --en-surface-card-bg:${tokens.surfaceCardBackground};
      --en-surface-text-primary:${tokens.surfaceTextPrimary};
      --en-surface-text-secondary:${tokens.surfaceTextSecondary};
      --en-surface-icon-primary:${tokens.surfaceIconPrimary};
      --en-surface-card-border:${tokens.surfaceCardBorder};
      --en-solid-surface:${tokens.surfaceCardBackground};
      --en-solid-surface-border:${tokens.surfaceCardBorder};
      --en-solid-heading:${tokens.surfaceTextPrimary};
      --en-solid-text:${tokens.surfaceTextPrimary};
      --en-solid-text-secondary:${tokens.surfaceTextSecondary};
      --en-solid-icon:${tokens.surfaceIconPrimary};
      --en-solid-shadow:${tokens.shadow};
      --en-surface-control:${tokens.controlBackground};
      --en-text-primary:${tokens.textPrimary};
      --en-text-secondary:${tokens.textSecondary};
      --en-heading-primary:${tokens.textPrimary};
      --en-subtitle-secondary:${tokens.textSecondary};
      --en-body-primary:${tokens.textPrimary};
      --en-body-secondary:${tokens.textSecondary};
      --en-scrollbar-track:${tokens.scrollbarTrack};
      --en-scrollbar-thumb:${tokens.scrollbarThumb};
      --en-scrollbar-thumb-hover:${tokens.scrollbarThumbHover};
      --en-scrollbar-thumb-border:${tokens.scrollbarThumbBorder};
      --en-scrollbar-blur:${tokens.scrollbarBlur};
      --en-scrollbar-width:${tokens.scrollbarWidth};
      --en-scrollbar-size:${tokens.scrollbarSize};
      --en-scrollbar-radius:${tokens.scrollbarRadius};
      --en-selection-surface:${tokens.selectionSurface};
      --en-selection-border:${tokens.selectionBorder};
      --en-surface-selected:${tokens.selectionSurface};
      --en-border-selected:${tokens.selectionBorder};
      --en-status-success:${tokens.statusSuccess};
      --en-status-success-surface:${tokens.statusSuccessSurface};
      --en-status-success-border:${tokens.statusSuccessBorder};
      --en-status-neutral-surface:${tokens.statusNeutralSurface};
      --en-status-neutral-border:${tokens.statusNeutralBorder};
      --en-icon-badge-background:${tokens.iconBadgeBackground};
      --en-icon-badge-hover-background:${tokens.iconBadgeHoverBackground};
      --en-icon-badge-brand-strength:${tokens.iconBadgeBrandStrength};
      --en-icon-badge-hover-brand-strength:${tokens.iconBadgeHoverBrandStrength};
      --en-icon-badge-foreground:${tokens.iconBadgeForeground};
      --en-icon-badge-border:${tokens.iconBadgeBorder};
      --en-icon-badge-border-brand-strength:${tokens.iconBadgeBorderBrandStrength};
      --en-icon-badge-border-width:${tokens.iconBadgeBorderWidth};
      --en-icon-badge-shadow:${tokens.iconBadgeShadow};
      --en-icon-badge-blur:${tokens.iconBadgeBlur};
      --en-border:${tokens.border};
      --en-border-control:${tokens.controlBorder};
      --en-shadow-surface:${tokens.shadow};
      --en-shadow-floating:${tokens.shadowFloating};
      --en-blur:${tokens.blur};
      --en-blur-floating:${tokens.blurFloating};
      --en-blur-control:${tokens.blur};
      --ic-dialog-background:${tokens.dialogBackground};
      --ic-dialog-border:${tokens.dialogBorder};
      --ic-dialog-shadow:${tokens.dialogShadow};
      --ic-dialog-blur:${tokens.dialogBlur};
      --ic-popover-background:${tokens.popoverBackground};
      --ic-select-dropdown-background:${tokens.selectDropdownBackground};
      --ic-popover-border:${tokens.popoverBorder};
      --ic-popover-shadow:${tokens.popoverShadow};
      --ic-popover-blur:${tokens.popoverBlur};
      --ic-control-background:${tokens.controlBackground};
      --ic-control-border:${tokens.controlBorder};
      --ic-action-background:${tokens.actionBackground};
      --ic-action-hover-background:${tokens.actionHoverBackground};
      --ic-action-border:${tokens.actionBorder};
      --ic-radius-dialog:${tokens.radiusDialog};
      --ic-radius-popover:${tokens.radiusPopover};
      --ic-radius-control:${tokens.radiusControl};
      --ic-radius-button:${tokens.radiusButton};
      --ic-radius-card:${tokens.radiusCard};
      --ic-shadow-dialog:${tokens.dialogShadow};
      --ic-shadow-popover:${tokens.popoverShadow};
      --ic-border-dialog:${tokens.dialogBorder};
      --ic-border-popover:${tokens.popoverBorder};
      --ic-border-control:${tokens.controlBorder};
      --ic-border-card:${tokens.border};
      --ic-shadow-card:${tokens.shadow};
      --ic-card-background:var(--en-surface-primary);
      --ic-card-border:var(--en-border);
      --ic-card-shadow:var(--en-shadow-surface);
      --ic-card-backdrop-filter:var(--en-blur);
      --ic-card-primary-text:var(--en-text-primary);
      --ic-card-secondary-text:var(--en-text-secondary);
      --ic-card-highlight: ${tokens.highlight};
    }

    ${THEMED_CARD_SELECTOR} {
      --primary-color:var(--en-color-primary);
      --success-color:var(--en-color-success);
      --warning-color:var(--en-color-accent);
    }

    ${textOverrides}
  `;
  if (document.documentElement.dataset.icCardTheme !== theme) {
    document.documentElement.dataset.icCardTheme = theme;
  }
  window.dispatchEvent(new CustomEvent<CardTheme>("card-theme-changed", {
    detail: theme,
  }));
}

export function setCardTheme(theme: CardTheme): void {
  saveCardTheme(theme);
  applyCardTheme(theme);
}

export function getCardTheme(): CardTheme {
  return currentTheme;
}

export function getThemeSurface(): string {
  return getCardThemeStyles(currentTheme, isHaDarkMode()).surfacePrimary;
}

export function getThemeShadow(): string {
  return getCardThemeStyles(currentTheme, isHaDarkMode()).shadow;
}

export function getThemeBorder(): string {
  return getCardThemeStyles(currentTheme, isHaDarkMode()).border;
}

applyCardTheme(currentTheme);

function syncCardThemePolarity(): void {
  const darkMode = isHaDarkMode();
  if (darkMode !== appliedDarkMode) applyCardTheme(currentTheme);
}

function observeHaTheme(): void {
  const observer = new MutationObserver(() => {
    requestAnimationFrame(syncCardThemePolarity);
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  const homeAssistant = document.querySelector("home-assistant");
  if (homeAssistant) {
    observer.observe(homeAssistant, {
      attributes: true,
      attributeFilter: ["class", "style", "theme"],
    });
  }
  requestAnimationFrame(syncCardThemePolarity);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeHaTheme, { once: true });
} else {
  observeHaTheme();
}

window.matchMedia?.("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    applyCardTheme(currentTheme);
  });

window.addEventListener("settheme", () => {
  requestAnimationFrame(() => applyCardTheme(currentTheme));
});
