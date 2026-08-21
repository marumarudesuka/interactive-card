import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type { TrendDataStatus, TrendSeries, TrendTimeframe } from "../../types/trend";
import { detailPanelStyle } from "../../styles/detail-panel.ts";
import {
  analyzeTrendSeries,
  type TrendAnalysisResult,
} from "./trend-analysis/trend-analysis-model";
import "../common/app-dialog";
import "../common/select-field";

const timeframeLabels: Record<TrendTimeframe, string> = {
  "1H": "Last hour",
  "24H": "Last 24 hours",
  "7D": "Last 7 days",
  "30D": "Last 30 days",
};

export class TrendAnalysisPanel extends LitElement {
  static properties = {
    open: { type: Boolean },
    title: { type: String },
    timeframe: { type: String },
    series: { attribute: false },
    status: { type: String },
    hass: { attribute: false },
    metrics: { attribute: false },
  };

  open = false;
  title = "Energy Trend";
  timeframe: TrendTimeframe = "24H";
  series: TrendSeries[] = [];
  status: TrendDataStatus = "idle";
  hass?: HomeAssistant;
  metrics: readonly DiscoveredMetric[] = [];
  private selectedSeriesId = "";

  static styles = [detailPanelStyle, css`
    :host {
      display: contents;
      --trend-analysis-left-column: clamp(112px, 24%, 160px);
      --trend-analysis-column-gap: 16px;
    }
    ic-app-dialog {
      --app-dialog-width: min(760px, calc(100vw - 24px));
    }
    .analyzing { display: grid; grid-template-columns: auto minmax(180px, 300px) 1fr; align-items: center; gap: 10px; }
    .analyzing > span:first-child { color: var(--en-text-secondary, var(--secondary-text-color)); font-size: var(--en-body-size, 14px); }
    .analyzing .period { justify-self: end; color: var(--en-text-secondary, var(--secondary-text-color)); font-size: var(--en-helper-size, 13px); }
    ic-select-field { --en-control-height: 38px; --en-control-padding-inline: 14px; --en-control-font-size: 14px; }
    .label {
      display: block;
      color: var(--en-text-secondary, var(--secondary-text-color));
      font-size: var(--en-helper-size, 13px);
    }
    .summary-list { display: grid; grid-template-columns: var(--trend-analysis-left-column) minmax(0, 1fr); column-gap: var(--trend-analysis-column-gap); margin: 0; }
    .summary-row { display: contents; }
    .summary-row dt, .summary-row dd { margin: 0; padding: 10px 0; border-bottom: 1px solid color-mix(in srgb, var(--en-text-secondary) 18%, transparent); }
    .summary-row:last-child dt, .summary-row:last-child dd { border-bottom: 0; }
    .summary-row dd { font-weight: 500; }
    .summary-primary { display: block; }
    .summary-secondary { display: block; margin-top: 3px; color: var(--en-text-secondary, var(--secondary-text-color)); font-size: var(--en-helper-size, 13px); font-weight: 400; line-height: 1.35; }
    .events { display: grid; grid-template-columns: var(--trend-analysis-left-column) minmax(0, 1fr); column-gap: var(--trend-analysis-column-gap); row-gap: 12px; }
    .event { display: contents; }
    .summary-row dt, .event time {
      color: var(--en-text-secondary, var(--secondary-text-color));
      font-size: var(--detail-panel-label-size, var(--en-helper-size, 13px));
      font-weight: 400;
      line-height: 1.35;
    }
    .summary-row dd, .event p {
      color: var(--en-text-primary, var(--primary-text-color));
      font-size: var(--detail-panel-body-size, var(--en-body-size, 14px));
      font-weight: 500;
      line-height: var(--en-body-line-height, 1.4);
    }
    .event p, .insight { margin: 0; line-height: var(--en-body-line-height, 1.4); }
    @media (max-width: 599px) {
      .analyzing { grid-template-columns: 1fr; }
      .analyzing .period { justify-self: start; }
    }
  `];

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (this.open && (changed.has("open") || changed.has("series"))) {
      if (!this.series.some((item) => item.id === this.selectedSeriesId)) {
        this.selectedSeriesId = this.series[0]?.id ?? "";
      }
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent("trend-analysis-close", {
      bubbles: true,
      composed: true,
    }));
  }

  private getKeyEvent(analysis: TrendAnalysisResult): { time: string; description: string } | undefined {
    const find = (label: string) => analysis.facts.find((fact) => fact.label === label)?.value;
    switch (analysis.metricType) {
      case "power": {
        const time = find("Peak time");
        return time ? { time, description: "Peak consumption detected" } : undefined;
      }
      case "energy": {
        const time = find("Usage concentration");
        return time ? { time, description: "Largest energy increase detected" } : undefined;
      }
      case "cost": {
        const time = find("Highest-cost interval");
        return time ? { time, description: "Highest cost variation detected" } : undefined;
      }
      case "solar": {
        const peak = find("Generation peak");
        if (!peak) return undefined;
        const [value, time] = peak.split(" at ");
        return { time: time ?? timeframeLabels[this.timeframe], description: `Generation peak${value ? ` reached ${value}` : " detected"}` };
      }
      default:
        return undefined;
    }
  }

  render() {
    const selected = this.series.find((item) => item.id === this.selectedSeriesId) ?? this.series[0];
    const analysis = selected && this.hass
      ? analyzeTrendSeries(this.hass, selected, this.metrics)
      : undefined;
    const fallbackEvent = analysis ? this.getKeyEvent(analysis) : undefined;

    return html`
      <ic-app-dialog
        .open=${this.open}
        .title=${`${this.title} Analysis`}
        @dialog-close=${this.close}
      >
        <div class="body">
          <div class="analyzing">
            <span>Analyzing:</span>
            <ic-select-field
              .value=${selected?.id ?? ""}
              .options=${this.series.map((item) => ({ value: item.id, label: item.name }))}
              .disabled=${this.series.length < 2}
              @select-change=${(event: CustomEvent<{ value: string }>) => {
                this.selectedSeriesId = event.detail.value;
                this.requestUpdate();
              }}
            ></ic-select-field>
            <span class="period">${timeframeLabels[this.timeframe]}</span>
          </div>

          ${selected && analysis ? html`
            <section>
              <h3>Trend Summary</h3>
              ${(analysis.summary?.length || analysis.facts.length) ? html`
                <dl class="summary-list">
                  ${analysis.summary?.length
                    ? analysis.summary.map((item) => html`
                      <div class="summary-row">
                        <dt class="label">${item.label}</dt>
                        <dd>
                          <span class="summary-primary">${item.primary}</span>
                          ${item.secondary ? html`<span class="summary-secondary">${item.secondary}</span>` : null}
                        </dd>
                      </div>
                    `)
                    : analysis.facts.map((fact) => html`
                      <div class="summary-row"><dt class="label">${fact.label}</dt><dd>${fact.value}</dd></div>
                    `)}
                </dl>
              ` : html`<p class="empty">Not enough history is available for a summary.</p>`}
            </section>

            <section>
              <h3>Key Events</h3>
              ${analysis.keyEvents?.length ? html`
                <div class="events">
                  ${analysis.keyEvents.map((event) => html`
                    <div class="event">
                      <time>${event.time}</time>
                      <p>${event.label}${event.detail ? html` <span class="event-detail">· ${event.detail}</span>` : null}</p>
                    </div>
                  `)}
                </div>
              ` : fallbackEvent ? html`
                <div class="events"><div class="event"><time>${fallbackEvent.time}</time><p>${fallbackEvent.description}</p></div></div>
              ` : html`<p class="empty">No notable event was detected in this period.</p>`}
            </section>

            <section>
              <h3>Insight</h3>
              <p class="insight">${analysis.insight ?? analysis.pattern}</p>
            </section>
          ` : html`<p class="empty">No series data is available for analysis.</p>`}
        </div>
      </ic-app-dialog>
    `;
  }
}

if (!customElements.get("ic-trend-analysis-panel")) {
  customElements.define("ic-trend-analysis-panel", TrendAnalysisPanel);
}
