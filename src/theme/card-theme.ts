export type CardTheme = "glass" | "solid" | "native";

export interface CardThemeTokens {
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceFloating: string;
  surfaceCardBackground: string;
  surfaceTextPrimary: string;
  surfaceTextSecondary: string;
  surfaceIconPrimary: string;
  surfaceCardBorder: string;
  border: string;
  shadow: string;
  shadowFloating: string;
  blur: string;
  blurFloating: string;
  dialogBackground: string;
  dialogBorder: string;
  dialogShadow: string;
  dialogBlur: string;
  popoverBackground: string;
  selectDropdownBackground: string;
  popoverBorder: string;
  popoverShadow: string;
  popoverBlur: string;
  controlBackground: string;
  controlBorder: string;
  actionBackground: string;
  actionHoverBackground: string;
  actionBorder: string;
  radiusDialog: string;
  radiusPopover: string;
  radiusControl: string;
  radiusButton: string;
  radiusCard: string;
  textPrimary: string;
  textSecondary: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  scrollbarThumbBorder: string;
  scrollbarBlur: string;
  scrollbarWidth: string;
  scrollbarSize: string;
  scrollbarRadius: string;
  selectionSurface: string;
  selectionBorder: string;
  statusSuccess: string;
  statusSuccessSurface: string;
  statusSuccessBorder: string;
  iconBadgeBackground: string;
  iconBadgeHoverBackground: string;
  iconBadgeBrandStrength: string;
  iconBadgeHoverBrandStrength: string;
  iconBadgeForeground: string;
  iconBadgeBorder: string;
  iconBadgeBorderBrandStrength: string;
  iconBadgeBorderWidth: string;
  iconBadgeShadow: string;
  iconBadgeBlur: string;
  highlight: string;
}

export const cardThemeOptions: ReadonlyArray<{
  value: CardTheme;
  label: string;
}> = [
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
  { value: "native", label: "Native" },
];

export function getCardThemeStyles(
  theme: CardTheme,
  darkMode = false
): CardThemeTokens {
  switch (theme) {
    case "native":
      return {
        surfacePrimary: "var(--ha-card-background, var(--card-background-color))",
        surfaceSecondary: "var(--secondary-background-color, var(--ha-card-background))",
        surfaceFloating: "var(--ha-card-background, var(--card-background-color))",
        surfaceCardBackground: "var(--ha-card-background, var(--card-background-color))",
        surfaceTextPrimary: "var(--primary-text-color)",
        surfaceTextSecondary: "var(--secondary-text-color)",
        surfaceIconPrimary: "var(--primary-text-color)",
        surfaceCardBorder: "var(--divider-color)",
        border: "1px solid var(--divider-color)",
        shadow: "var(--ha-card-box-shadow, none)",
        shadowFloating: "var(--ha-card-box-shadow, none)",
        blur: "none",
        blurFloating: "none",
        dialogBackground: "var(--card-background-color, var(--ha-card-background, #fff))",
        dialogBorder: "1px solid var(--divider-color)",
        dialogShadow: "0 20px 50px rgba(0,0,0,.18)",
        dialogBlur: "none",
        popoverBackground: "var(--card-background-color, var(--ha-card-background, #fff))",
        selectDropdownBackground: "var(--card-background-color, var(--ha-card-background, #fff))",
        popoverBorder: "1px solid var(--divider-color)",
        popoverShadow: "0 12px 32px rgba(0,0,0,.18)",
        popoverBlur: "none",
        controlBackground: "var(--secondary-background-color, var(--ha-card-background))",
        controlBorder: "1px solid var(--divider-color)",
        actionBackground: "var(--secondary-background-color, var(--ha-card-background))",
        actionHoverBackground: darkMode
          ? "rgba(255,255,255,.14)"
          : "rgba(0,0,0,.08)",
        actionBorder: "1px solid var(--divider-color)",
        radiusDialog: "24px",
        radiusPopover: "24px",
        radiusControl: "var(--ha-card-border-radius, 10px)",
        radiusButton: "var(--ha-card-border-radius, 10px)",
        radiusCard: "var(--ha-card-border-radius, 12px)",
        textPrimary: "var(--primary-text-color)",
        textSecondary: "var(--secondary-text-color)",
        scrollbarTrack: darkMode
          ? "rgba(255,255,255,.08)"
          : "rgba(0,0,0,.06)",
        scrollbarThumb: darkMode
          ? "rgba(255,255,255,.30)"
          : "rgba(0,0,0,.25)",
        scrollbarThumbHover: darkMode
          ? "rgba(255,255,255,.42)"
          : "rgba(0,0,0,.38)",
        scrollbarThumbBorder: darkMode
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(0,0,0,.10)",
        scrollbarBlur: "none",
        scrollbarWidth: "thin",
        scrollbarSize: "3px",
        scrollbarRadius: "999px",
        selectionSurface: "var(--secondary-background-color, transparent)",
        selectionBorder: "1px solid var(--divider-color)",
        statusSuccess: "var(--en-color-success)",
        statusSuccessSurface: "var(--en-color-success-soft)",
        statusSuccessBorder: "1px solid var(--en-color-success-border)",
        iconBadgeBackground: "transparent",
        iconBadgeHoverBackground: "transparent",
        iconBadgeBrandStrength: "18%",
        iconBadgeHoverBrandStrength: "24%",
        iconBadgeForeground: "currentColor",
        iconBadgeBorder: "transparent",
        iconBadgeBorderBrandStrength: "28%",
        iconBadgeBorderWidth: "1px",
        iconBadgeShadow: "0 3px 10px rgba(0,0,0,.10)",
        iconBadgeBlur: "none",
        highlight: "none",
      };
    case "solid":
      return {
        surfacePrimary: darkMode ? "#111318" : "#F2F3F7",
        surfaceSecondary: darkMode ? "#1a1d24" : "#f7f7f7",
        surfaceFloating: darkMode ? "#171a20" : "#F2F3F7",
        surfaceCardBackground: darkMode ? "#111318" : "#F2F3F7",
        surfaceTextPrimary: darkMode ? "#f5f5f7" : "#202124",
        surfaceTextSecondary: darkMode
          ? "rgba(255,255,255,.62)"
          : "rgba(32,33,36,.62)",
        surfaceIconPrimary: darkMode ? "#d8d9df" : "#3f444d",
        surfaceCardBorder: darkMode
          ? "rgba(255,255,255,.12)"
          : "rgba(20,24,32,.10)",
        border: darkMode
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(20,24,32,.10)",
        shadow: darkMode
          ? "0 10px 40px rgba(0,0,0,.30)"
          : "0 10px 40px rgba(0,0,0,.14)",
        shadowFloating: darkMode
          ? "0 14px 42px rgba(0,0,0,.36)"
          : "0 14px 42px rgba(0,0,0,.18)",
        blur: "none",
        blurFloating: "none",
        dialogBackground: darkMode ? "#171a20" : "#F2F3F7",
        dialogBorder: darkMode
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(20,24,32,.10)",
        dialogShadow: darkMode
          ? "0 20px 50px rgba(0,0,0,.38)"
          : "0 20px 50px rgba(0,0,0,.18)",
        dialogBlur: "none",
        popoverBackground: darkMode ? "#171a20" : "#F2F3F7",
        selectDropdownBackground: darkMode ? "#171a20" : "#F2F3F7",
        popoverBorder: darkMode
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(20,24,32,.10)",
        popoverShadow: darkMode
          ? "0 14px 42px rgba(0,0,0,.36)"
          : "0 14px 42px rgba(0,0,0,.18)",
        popoverBlur: "none",
        controlBackground: darkMode ? "#1a1d24" : "#f7f7f7",
        controlBorder: darkMode
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(20,24,32,.10)",
        actionBackground: darkMode
          ? "rgba(255,255,255,.10)"
          : "rgba(0,0,0,.07)",
        actionHoverBackground: darkMode
          ? "rgba(255,255,255,.16)"
          : "rgba(0,0,0,.12)",
        actionBorder: darkMode
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(20,24,32,.10)",
        radiusDialog: "24px",
        radiusPopover: "24px",
        radiusControl: "12px",
        radiusButton: "14px",
        radiusCard: "24px",
        textPrimary: darkMode ? "#f5f5f7" : "#202124",
        textSecondary: darkMode
          ? "rgba(255,255,255,.62)"
          : "rgba(32,33,36,.62)",
        scrollbarTrack: darkMode
          ? "rgba(255,255,255,.08)"
          : "rgba(0,0,0,.08)",
        scrollbarThumb: darkMode
          ? "rgba(255,255,255,.22)"
          : "rgba(0,0,0,.20)",
        scrollbarThumbHover: darkMode
          ? "rgba(255,255,255,.34)"
          : "rgba(0,0,0,.32)",
        scrollbarThumbBorder: darkMode
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(0,0,0,.10)",
        scrollbarBlur: "none",
        scrollbarWidth: "thin",
        scrollbarSize: "3px",
        scrollbarRadius: "999px",
        selectionSurface: darkMode
          ? "rgba(255,255,255,.10)"
          : "rgba(0,0,0,.06)",
        selectionBorder: darkMode
          ? "1px solid rgba(255,255,255,.16)"
          : "1px solid rgba(0,0,0,.12)",
        statusSuccess: "var(--en-color-success)",
        statusSuccessSurface: "var(--en-color-success-soft)",
        statusSuccessBorder: "1px solid var(--en-color-success-border)",
        iconBadgeBackground: "transparent",
        iconBadgeHoverBackground: "transparent",
        iconBadgeBrandStrength: "100%",
        iconBadgeHoverBrandStrength: "100%",
        iconBadgeForeground: "#fff",
        iconBadgeBorder: "transparent",
        iconBadgeBorderBrandStrength: "0%",
        iconBadgeBorderWidth: "0px",
        iconBadgeShadow: "0 4px 12px rgba(0,0,0,.14)",
        iconBadgeBlur: "none",
        highlight: "none",
      };
    case "glass":
    default:
      return {
        surfacePrimary: "rgba(255,255,255,.08)",
        surfaceSecondary: "rgba(255,255,255,.06)",
        surfaceFloating: "rgba(255,255,255,.14)",
        surfaceCardBackground: "rgba(255,255,255,.08)",
        surfaceTextPrimary: darkMode ? "#fff" : "#000",
        surfaceTextSecondary: darkMode
          ? "rgba(255,255,255,.65)"
          : "rgba(0,0,0,.65)",
        surfaceIconPrimary: darkMode ? "rgba(255,255,255,.78)" : "rgba(0,0,0,.72)",
        surfaceCardBorder: "rgba(255,255,255,.18)",
        border: "1px solid rgba(255,255,255,.18)",
        shadow: "0 10px 40px rgba(0,0,0,.18)",
        shadowFloating: "0 14px 42px rgba(0,0,0,.28)",
        blur: "blur(25px)",
        blurFloating: "blur(30px)",
        dialogBackground: "rgba(255,255,255,.08)",
        dialogBorder: "1px solid rgba(255,255,255,.18)",
        dialogShadow: "0 28px 90px rgba(0,0,0,.4)",
        dialogBlur: "blur(30px)",
        popoverBackground: "rgba(255,255,255,.14)",
        selectDropdownBackground: darkMode
          ? "rgba(28,28,32,.88)"
          : "rgba(248,248,250,.9)",
        popoverBorder: "1px solid rgba(255,255,255,.18)",
        popoverShadow: "0 14px 42px rgba(0,0,0,.28)",
        popoverBlur: "blur(30px)",
        controlBackground: "rgba(255,255,255,.06)",
        controlBorder: "1px solid rgba(255,255,255,.18)",
        actionBackground: "rgba(255,255,255,.15)",
        actionHoverBackground: "rgba(255,255,255,.25)",
        actionBorder: "1px solid rgba(255,255,255,.12)",
        radiusDialog: "24px",
        radiusPopover: "24px",
        radiusControl: "16px",
        radiusButton: "18px",
        radiusCard: "28px",
        textPrimary: darkMode ? "#fff" : "#000",
        textSecondary: darkMode
          ? "rgba(255,255,255,.65)"
          : "rgba(0,0,0,.65)",
        scrollbarTrack: darkMode
          ? "rgba(255,255,255,.06)"
          : "rgba(0,0,0,.06)",
        scrollbarThumb: darkMode
          ? "rgba(255,255,255,.25)"
          : "rgba(0,0,0,.25)",
        scrollbarThumbHover: darkMode
          ? "rgba(255,255,255,.35)"
          : "rgba(0,0,0,.35)",
        scrollbarThumbBorder: darkMode
          ? "1px solid rgba(255,255,255,.15)"
          : "1px solid rgba(0,0,0,.12)",
        scrollbarBlur: "blur(10px)",
        scrollbarWidth: "thin",
        scrollbarSize: "3px",
        scrollbarRadius: "999px",
        selectionSurface: darkMode
          ? "rgba(255,255,255,.12)"
          : "rgba(0,0,0,.08)",
        selectionBorder: darkMode
          ? "1px solid rgba(255,255,255,.2)"
          : "1px solid rgba(0,0,0,.14)",
        statusSuccess: "var(--en-color-success)",
        statusSuccessSurface: "var(--en-color-success-soft)",
        statusSuccessBorder: "1px solid var(--en-color-success-border)",
        iconBadgeBackground: "rgba(255,255,255,.10)",
        iconBadgeHoverBackground: "rgba(255,255,255,.16)",
        iconBadgeBrandStrength: "0%",
        iconBadgeHoverBrandStrength: "0%",
        iconBadgeForeground: "currentColor",
        iconBadgeBorder: "rgba(255,255,255,.18)",
        iconBadgeBorderBrandStrength: "0%",
        iconBadgeBorderWidth: "1px",
        iconBadgeShadow: "0 5px 16px rgba(0,0,0,.12)",
        iconBadgeBlur: "blur(18px)",
        highlight:
          "linear-gradient(180deg, rgba(255,255,255,.16), transparent)",
      };
  }
}
