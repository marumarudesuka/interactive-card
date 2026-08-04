import { LitElement, css, html } from "lit";

import type { EntityStateStatus } from "../../types/entity-state";

export class MetricValue extends LitElement {
  static properties = {
    value: { type: String },
    unit: { type: String },
    status: { type: String },
  };

  value = "";
  unit = "";
  status: EntityStateStatus = "valid";

  static styles = css`
    :host {
      display: inline-flex;
      align-items: baseline;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      color: var(--primary-text-color);
    }

    .value {
      color: var(--metric-value-color, var(--primary-text-color));
      font-size: var(--metric-value-size, 46px);
      font-weight: var(--metric-value-weight, 700);
      letter-spacing: var(--metric-value-letter-spacing, -2px);
      line-height: var(--metric-value-line-height, 1);
      opacity: var(--metric-value-opacity, 1);
      white-space: nowrap;
    }

    .value.invalid {
      color: var(--secondary-text-color);
    }

    .unit {
      margin-left: var(--metric-unit-gap, 6px);
      color: var(--metric-unit-color, inherit);
      font-size: var(--metric-unit-size, 18px);
      font-weight: var(--metric-unit-weight, 500);
      opacity: var(--metric-unit-opacity, 0.6);
      white-space: nowrap;
    }
  `;

  render() {
    const isValid = this.status === "valid";
    const displayValue = isValid ? this.value : "--";

    return html`
      <span class="value ${isValid ? "" : "invalid"}">${displayValue}</span>
      <span class="unit">${this.unit}</span>
    `;
  }
}

customElements.define("ic-metric-value", MetricValue);
