import { css } from "lit";

/**
 * Visual context supplied by the KPI section to each energy-kpi-card.
 *
 * The base values represent the minimum-width four-column dashboard layout:
 * (1200px - 3 * 16px gap) / 4 = 288px per card. The runtime section opts
 * into the responsive variants; editor source frames intentionally keep the
 * base composition and uniformly scale the completed card instead.
 */
export const kpiCardVisualContextStyle = css`
  .kpi-card-visual-context {
    --kpi-card-height: 170px;
    --kpi-padding: 20px;
    --kpi-padding-block: 20px;
    --kpi-title-gap: 4px;
    --kpi-subtitle-slot-height: 23px;
    --kpi-subtitle-padding-top: 6px;
    --kpi-value-size: 42px;
    --kpi-unit-size: 16px;
    --kpi-icon-size: 64px;
    --kpi-icon-symbol-size: 30px;
  }

  @container (max-width: 1200px) {
    .kpi-card-visual-context-responsive {
      --kpi-card-height: 160px;
      --kpi-padding: 18px;
      --kpi-padding-block: 18px;
      --kpi-title-gap: 3px;
      --kpi-subtitle-slot-height: 22px;
      --kpi-subtitle-padding-top: 5px;
      --kpi-value-size: 40px;
      --kpi-icon-size: 58px;
      --kpi-icon-symbol-size: 28px;
    }
  }

  @container (max-width: 599px) {
    .kpi-card-visual-context-responsive {
      --kpi-card-height: 150px;
      --kpi-padding: 14px;
      --kpi-padding-block: 14px;
      --kpi-title-gap: 2px;
      --kpi-subtitle-slot-height: 20px;
      --kpi-subtitle-padding-top: 3px;
      --kpi-value-size: clamp(16px, 7vw, 24px);
      --kpi-unit-size: 13px;
      --kpi-icon-size: 46px;
      --kpi-icon-symbol-size: 23px;
    }
  }
`;
