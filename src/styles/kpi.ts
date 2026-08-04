import { css } from "lit";

export const kpiStyle = css`
  .content {
    display: grid;
    width: 100%;
    min-width: 0;
    height: 100%;
    grid-template-columns: minmax(0, 1fr) 55px;
    column-gap: var(--kpi-content-gap, 6px);
    align-items: center;
  }

  .kpi-copy {
    display: flex;
    min-width: 0;
    height: 100%;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    grid-column: 1;
    grid-row: 1;
  }

  .name {
    justify-self: start;
    align-self: flex-start;
    margin-bottom: 4px;
    transform: translateY(-5px);
    color: var(--en-surface-text-primary, var(--en-heading-primary, var(--primary-text-color)));
    min-width: 0;
    overflow: hidden;
    font-size: var(--kpi-name-size, var(--en-title-md-size, 18px));
    font-weight: var(--en-title-md-weight, 600);
    line-height: var(--en-title-md-line-height, 1.25);
    letter-spacing: -0.3px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ic-metric-value {
    display: flex;
    height: auto;
    align-items: baseline;
    --metric-value-size: var(--kpi-value-size, 36px);
    --metric-value-weight: var(--en-data-weight, 700);
    --metric-value-letter-spacing: -2px;
    --metric-value-color: var(--en-surface-text-primary, var(--en-heading-primary, var(--primary-text-color)));
    --metric-value-opacity: .8;
    --metric-unit-size: var(--kpi-unit-size, 18px);
    --metric-unit-weight: 500;
    --metric-unit-gap: 6px;
    --metric-unit-color: var(--en-surface-text-secondary, var(--en-text-secondary, var(--secondary-text-color)));
    --metric-unit-opacity: .65;
  }

  ic-trend-indicator {
    align-self: start;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    margin-top: 6px;
    color: var(--en-surface-text-secondary, var(--en-subtitle-secondary, var(--secondary-text-color)));
    --trend-indicator-size: var(--en-helper-size, 13px);
    --trend-indicator-weight: var(--en-helper-weight, 400);
    --trend-indicator-line-height: var(--en-helper-line-height, 1.3);
    --trend-indicator-secondary-opacity: var(--en-helper-opacity, .7);
    --trend-neutral-color: var(--en-subtitle-secondary, var(--secondary-text-color));
    --trend-positive-color: var(--en-color-success);
    --trend-negative-color: #ff3b30;
    white-space: nowrap;
  }

  ic-icon-badge {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    align-self: center;
    flex-shrink: 0;
    --icon-badge-size: var(--kpi-icon-size, 42px);
    --icon-badge-icon-size: var(--kpi-icon-symbol-size, 21px);
  }
`;
