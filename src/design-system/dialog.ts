import { css } from "lit";

/** Shared semantic layout and control rules for content hosted by ic-dialog. */
export const dialogContentStyle = css`
  .content,
  .form,
  .body {
    box-sizing: border-box;
    padding: var(--ic-dialog-padding, 24px);
    color: var(--en-text-primary, var(--primary-text-color));
  }

  .content {
    gap: var(--ic-dialog-content-gap, 24px);
  }

  .form {
    gap: var(--en-field-group-gap, var(--ic-dialog-field-group-gap, 20px));
  }

  .section {
    gap: var(--ic-dialog-field-gap, 8px);
  }

  .subtitle {
    color: var(--en-text-secondary, var(--secondary-text-color));
    font-size: var(--en-body-size, 14px);
    font-weight: 400;
    line-height: var(--en-body-line-height, 1.4);
  }

  label,
  .field-label {
    gap: var(--ic-dialog-field-gap, 8px);
    color: var(--en-text-primary, var(--primary-text-color));
    font-size: var(--en-label-font-size, 14px);
    font-weight: var(--en-label-font-weight, 600);
    line-height: 1.3;
  }

  input:not([type="checkbox"]):not([type="radio"]),
  textarea,
  .field-control {
    width: 100%;
    min-width: 0;
    height: var(--en-control-height, 52px);
    min-height: var(--en-control-height, 52px);
    max-height: var(--en-control-height, 52px);
    box-sizing: border-box;
    padding-inline: var(--en-control-padding-inline, 20px);
    padding-block: 0;
    border: var(--ic-border-control, var(--en-border));
    border-radius: var(--en-control-radius, 999px);
    outline: none;
    background: var(--ic-control-background, var(--en-surface-control));
    color: var(--en-text-primary, var(--primary-text-color));
    font: inherit;
    font-size: var(--en-control-font-size, 16px);
    font-weight: var(--en-control-font-weight, 400);
    line-height: 1.2;
    letter-spacing: 0;
    transition:
      border-color var(--en-motion-fast, 150ms) var(--en-easing-standard, ease),
      background var(--en-motion-fast, 150ms) var(--en-easing-standard, ease);
  }

  .field-control {
    display: flex;
    align-items: center;
  }

  input:not([type="checkbox"]):not([type="radio"]):hover,
  textarea:hover,
  .field-control:hover {
    border-color: var(--ic-field-hover-border, var(--en-color-primary-border));
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--en-text-secondary, var(--secondary-text-color));
    font-weight: 400;
    opacity: var(--ic-field-placeholder-opacity, .65);
  }

  input:focus-visible,
  textarea:focus-visible,
  .field-control:focus-visible {
    outline: var(--ic-focus-ring, 2px solid var(--en-color-focus));
    outline-offset: 2px;
  }

  .footer,
  .actions {
    box-sizing: border-box;
    justify-content: flex-end;
    gap: var(--ic-dialog-footer-gap, 12px);
  }

  .footer {
    padding: var(--ic-dialog-footer-padding, 24px);
  }

  .footer button,
  .actions button {
    min-height: var(--en-control-height-compact, 38px);
    padding-inline: var(--en-control-padding-inline-compact, 14px);
    border: var(--ic-border-control, var(--en-border));
    border-radius: var(--en-control-radius, 999px);
    background: var(--ic-action-background, var(--en-surface-control));
    color: var(--en-text-primary, var(--primary-text-color));
    font: inherit;
    font-size: var(--en-body-size, 14px);
    font-weight: 600;
  }

  .footer .primary,
  .footer .save,
  .actions .primary,
  .actions .save {
    border-color: transparent;
    background: var(--en-color-primary);
    color: #fff;
  }

  .section-title {
    color: var(--en-heading-primary, var(--primary-text-color));
    font-size: var(--en-body-size, 14px);
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0;
    text-transform: none;
  }
`;

/** Shared field styling for selectors which also render outside a dialog. */
export const pickerFieldStyle = css`
  input,
  .trigger {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: var(--en-control-height, 52px);
    min-height: var(--en-control-height, 52px);
    max-height: var(--en-control-height, 52px);
    padding-block: 0;
    border: var(--ic-border-control, var(--en-border));
    border-radius: var(--en-control-radius, 999px);
    background: var(--ic-control-background, var(--en-surface-control));
    color: var(--en-text-primary, var(--primary-text-color));
    font: inherit;
    font-size: var(--en-control-font-size, 16px);
    font-weight: var(--en-control-font-weight, 400);
    padding-inline: var(--en-control-padding-inline, 20px);
    transition:
      border-color var(--en-motion-fast, 150ms) var(--en-easing-standard, ease),
      background var(--en-motion-fast, 150ms) var(--en-easing-standard, ease);
  }

  input:hover,
  .trigger:hover {
    border-color: var(--ic-field-hover-border, var(--en-color-primary-border));
  }

  input::placeholder {
    color: var(--en-text-secondary, var(--secondary-text-color));
    font-weight: 400;
    opacity: var(--ic-field-placeholder-opacity, .65);
  }

  input:focus-visible,
  .trigger:focus-visible {
    outline: var(--ic-focus-ring, 2px solid var(--en-color-focus));
    outline-offset: 2px;
  }
`;
