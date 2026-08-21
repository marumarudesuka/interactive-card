import { css } from "lit";

export const detailPanelStyle = css`
  :host {
    --detail-panel-padding: var(--ic-dialog-padding, 24px 32px 32px);
    --detail-panel-section-gap: var(--en-section-gap, 24px);
    --detail-panel-content-gap: 12px;
    --detail-panel-divider-gap: 18px;
    --detail-panel-heading-size: var(--en-title-md-size, 18px);
    --detail-panel-body-size: var(--en-body-size, 14px);
    --detail-panel-label-size: var(--en-helper-size, 13px);
  }

  ic-app-dialog {
    --en-heading-primary: var(--en-text-primary, var(--primary-text-color));
  }

  .body {
    display: grid;
    gap: var(--detail-panel-section-gap);
    box-sizing: border-box;
    padding: var(--detail-panel-padding);
    color: var(--en-text-primary, var(--primary-text-color));
    font-size: var(--detail-panel-body-size);
    line-height: var(--en-body-line-height, 1.4);
  }

  .body > section {
    display: grid;
    gap: var(--detail-panel-content-gap);
  }

  .body > section:not(:first-child) {
    padding-top: var(--detail-panel-divider-gap);
    border-top: var(--ic-dialog-border, var(--en-border));
  }

  h3,
  .history-heading h3 {
    margin: 0;
    color: var(--en-heading-primary, var(--en-text-primary, var(--primary-text-color)));
    font-size: var(--detail-panel-heading-size);
    font-weight: var(--en-title-md-weight, 600);
    line-height: var(--en-title-md-line-height, 1.3);
  }

  .label,
  .time,
  .metadata span:first-child,
  .history-heading span {
    color: var(--en-text-secondary, var(--secondary-text-color));
    font-size: var(--detail-panel-label-size);
    font-weight: 400;
    line-height: 1.35;
  }

  .value,
  .summary-primary,
  .metadata-value,
  .event p {
    color: var(--en-text-primary, var(--primary-text-color));
    font-size: var(--detail-panel-body-size);
    font-weight: 500;
  }

  .description,
  .summary-secondary,
  .event-detail,
  .insight,
  .empty,
  .state,
  .history-state {
    color: var(--en-text-secondary, var(--secondary-text-color));
    font-size: var(--detail-panel-body-size);
    font-weight: 400;
    line-height: var(--en-body-line-height, 1.4);
  }

  @media (max-width: 599px) {
    :host {
      --detail-panel-padding: 16px;
      --detail-panel-section-gap: 20px;
      --detail-panel-divider-gap: 16px;
    }
  }
`;
