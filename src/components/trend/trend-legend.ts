import { LitElement, css, html } from "lit";

import { getTrendSeriesColor } from "../../helpers/trend-chart-formatters";
import type {
  ResolvedTrendAxis,
  TrendSeries,
} from "../../types/trend";

export class TrendLegend extends LitElement {
  static properties = {
    series: { attribute: false },
    axes: { attribute: false },
    hiddenSeries: { attribute: false },
  };

  series: TrendSeries[] = [];
  axes: ResolvedTrendAxis[] = [];
  hiddenSeries: ReadonlySet<string> = new Set();

  static styles = css`
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      margin-bottom: 8px;
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 3px 0;
      border: none;
      background: transparent;
      color: var(--secondary-text-color);
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      border-radius:var(--ic-radius-control,12px);
      transition:
        background var(--en-motion-fast,150ms) var(--en-easing-standard,ease),
        opacity var(--en-motion-fast,150ms) var(--en-easing-standard,ease);
    }

    button:hover {
      background:var(--ic-action-hover-background,rgba(127,127,127,.12));
    }

    button.hidden {
      opacity: 0.45;
      text-decoration: line-through;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
  `;

  private toggle(event: MouseEvent, seriesId: string) {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("trend-series-toggle", {
        detail: { seriesId },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      ${this.series.map((item, index) => {
        const hidden = !item.visible || this.hiddenSeries.has(item.id);
        const axis = this.axes.find((entry) => entry.id === item.axisId);
        const unit = axis?.displayUnit ?? item.unit;
        return html`
          <button
            class=${hidden ? "hidden" : ""}
            type="button"
            aria-pressed=${!hidden}
            @click=${(event:MouseEvent) => this.toggle(event, item.id)}
          >
            <span
              class="dot"
              style=${`background:${getTrendSeriesColor(item.color, index)}`}
            ></span>
            ${item.name}${unit ? ` · ${unit}` : ""}
          </button>
        `;
      })}
    `;
  }
}

customElements.define("ic-trend-legend", TrendLegend);
