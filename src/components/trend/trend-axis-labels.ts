import { LitElement, css, html } from "lit";

export interface TrendAxisLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  align: "left" | "right";
}

export class TrendAxisLabels extends LitElement {
  static properties = {
    labels: { attribute: false },
  };

  labels: TrendAxisLabel[] = [];

  static styles = css`
    :host {
      position: absolute;
      z-index: 2;
      inset: 0;
      display: block;
      overflow: visible;
      pointer-events: none;
    }

    .label {
      position: absolute;
      color: var(--secondary-text-color, #6e6e73);
      font-size: 12px;
      line-height: 1;
      white-space: nowrap;
      transform: translateY(-50%);
    }

    .right {
      text-align: right;
      transform: translate(-100%, -50%);
    }

    .left {
      text-align: left;
      transform: translateY(-50%);
    }
  `;

  render() {
    return html`
      ${this.labels.map(
        (label) => html`
          <span
            class=${`label ${label.align}`}
            style=${`left:${label.x}px;top:${label.y}px`}
          >
            ${label.text}
          </span>
        `
      )}
    `;
  }
}

customElements.define("ic-trend-axis-labels", TrendAxisLabels);
