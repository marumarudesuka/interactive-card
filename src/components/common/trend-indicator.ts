import { LitElement, css, html } from "lit";

export type TrendDirection = "increase" | "decrease" | "neutral";
export type TrendStatus = "positive" | "negative" | "neutral";

export class TrendIndicator extends LitElement {
  static properties = {
    text: { type: String },
    direction: { type: String },
    status: { type: String, reflect: true },
    showIcon: { type: Boolean, attribute: "show-icon" },
  };

  text = "";
  direction: TrendDirection = "neutral";
  status: TrendStatus = "neutral";
  showIcon = false;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--trend-indicator-gap, 4px);
      color: var(--trend-neutral-color, var(--secondary-text-color));
      font-size: var(--trend-indicator-size, 14px);
      font-weight: var(--trend-indicator-weight, 600);
      line-height: var(--trend-indicator-line-height, 1.3);
    }

    :host([status="positive"]) {
      color: var(--trend-positive-color, var(--en-color-success));
    }

    :host([status="negative"]) {
      color: var(--trend-negative-color, #ff3b30);
    }

    .icon {
      line-height: 1;
    }

    .detail {
      color: var(--trend-neutral-color, var(--en-text-secondary, var(--secondary-text-color)));
      opacity: var(--trend-indicator-secondary-opacity, .7);
    }
  `;

  private get directionIcon() {
    if (this.direction === "increase") return "↑";
    if (this.direction === "decrease") return "↓";
    return "–";
  }

  render() {
    const comparison = this.status === "neutral"
      ? undefined
      : this.text.match(/^(.+?)(\s+vs\s+.+)$/i);
    return html`
      ${this.showIcon
        ? html`<span class="icon" aria-hidden="true">${this.directionIcon}</span>`
        : null}
      ${comparison
        ? html`<span>${comparison[1]}</span><span class="detail">${comparison[2]}</span>`
        : html`<span class="detail">${this.text}</span>`}
    `;
  }
}

customElements.define("ic-trend-indicator", TrendIndicator);
