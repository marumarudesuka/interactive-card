import { LitElement, css, html } from "lit";

import {
  formatTrendAxisValue,
  formatTrendSeriesValue,
  formatTrendTime,
  getTrendSeriesColor,
} from "../../helpers/trend-chart-formatters";
import {
  findNearestTrendPoint,
  getTrendTimeDomain,
  getTrendX,
  getTrendY,
} from "../../helpers/trend-chart-geometry";
import {
  createTrendChartLayout,
  type TrendChartLayout,
} from "../../helpers/trend-chart-layout";
import { TrendChartModelCache } from "../../helpers/trend-chart-model";
import { createTrendTimeTicks } from "../../helpers/trend-time-ticks";
import type {
  ResolvedTrendAxis,
  TrendAxis,
  TrendCurveMode,
  TrendRenderMode,
  TrendDataStatus,
  TrendSeries,
  TrendTimeframe,
} from "../../types/trend";
import "./trend-axis-labels";
import "./trend-hover-markers";
import "./trend-line-renderer";
import type { TrendAxisLabel } from "./trend-axis-labels";
import type { TrendHoverMarker } from "./trend-hover-markers";
export class TrendChart extends LitElement {
  static properties = {
    series: { attribute: false },
    axes: { attribute: false },
    timeframe: { type: String },
    status: { type: String },
    errorMessage: { type: String },
    curve: { type: String },
    renderMode: { type: String },
    hiddenSeries: { attribute:false },
  };

  series: TrendSeries[] = [];
  axes: TrendAxis[] = [];
  timeframe: TrendTimeframe = "24H";
  status: TrendDataStatus = "idle";
  errorMessage = "";
  curve: TrendCurveMode = "smooth";
  renderMode: TrendRenderMode = "smooth";
  hiddenSeries: ReadonlySet<string> = new Set();

  private hoverTimestamp?: number;
  private layout?: TrendChartLayout;
  private resizeObserver?: ResizeObserver;
  private observedChart?: HTMLElement;
  private chartModel = new TrendChartModelCache();
  private hoverFrame?: number;
  private pendingHoverTimestamp?: number;
  private layoutAxisKey = "";

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      min-width: 0;
      min-height: 190px;
      flex-direction: column;
    }

    .state {
      display: grid;
      min-height: 190px;
      flex: 1;
      place-items: center;
      color: var(--secondary-text-color);
      font-size: 0.88rem;
      text-align: center;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .chart {
      position: relative;
      width: 100%;
      min-width: 0;
      min-height: 190px;
      flex: 1;
    }

    .plot-surface {
      position: absolute;
      inset: 0;
      touch-action: none;
    }

    .hover-line {
      position: absolute;
      width: 1px;
      background: repeating-linear-gradient(
        to bottom,
        var(--secondary-text-color, #6e6e73) 0 4px,
        transparent 4px 8px
      );
      pointer-events: none;
    }

    .time-label {
      position: absolute;
      color: var(--secondary-text-color, #6e6e73);
      font-size: 11px;
      white-space: nowrap;
      transform: translateX(-50%);
    }

    .tooltip {
      position: absolute;
      z-index: 3;
      top: 8px;
      min-width: 150px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ic-radius-popover);
      background: var(--card-background-color);
      box-shadow: var(--ic-shadow-popover);
      color: var(--primary-text-color);
      pointer-events: none;
      transform: translateX(-50%);
    }

    .tooltip-time {
      margin-bottom: 7px;
      color: var(--secondary-text-color);
      font-size: 0.72rem;
    }

    .tooltip-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 4px;
      font-size: 0.78rem;
    }

    .tooltip-name {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .tooltip-value {
      font-weight: 600;
      white-space: nowrap;
    }

    .axis-warning {
      margin: 0 0 8px;
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.35;
    }

  `;

  private get visibleSeries(): TrendSeries[] {
    return this.chartModel.resolve(
      this.series,
      this.axes,
      this.hiddenSeries,
      this.timeframe,
      this.renderMode
    ).series;
  }

  private get activeAxes(): ResolvedTrendAxis[] {
    return this.chartModel.resolve(
      this.series,
      this.axes,
      this.hiddenSeries,
      this.timeframe,
      this.renderMode
    ).axes;
  }

  private get excludedAxisCount(): number {
    return this.chartModel.resolve(
      this.series,
      this.axes,
      this.hiddenSeries,
      this.timeframe,
      this.renderMode
    ).excludedAxisCount;
  }

  private getAxisWidth(axis?: ResolvedTrendAxis): number {
    if (!axis) return 0;
    const longest = axis.ticks.reduce(
      (length, tick) =>
        Math.max(
          length,
          formatTrendAxisValue(tick.value, axis).length
        ),
      0
    );
    return Math.min(96, Math.max(42, longest * 7 + 14));
  }

  private updateLayout(width: number, height: number) {
    const axes = this.activeAxes;
    const leftAxis = axes.find((axis) => axis.axisGroup !== "right");
    const rightAxis = axes.find((axis) => axis.axisGroup === "right");
    this.layout = createTrendChartLayout(width, height, {
      axisCount: axes.length,
      leftAxisWidth: this.getAxisWidth(leftAxis),
      rightAxisWidth: this.getAxisWidth(rightAxis),
      hasLeftAxis:Boolean(leftAxis),
      hasRightAxis:Boolean(rightAxis),
    });
  }

  protected updated() {
    const chart = this.renderRoot.querySelector<HTMLElement>(".chart");
    if (!chart) return;
    const axes = this.activeAxes;
    const axisKey = axes.map((axis) =>
      `${axis.id}:${axis.displayUnit}:${axis.precision}:${
        axis.ticks.map((tick) => tick.displayValue).join(",")
      }`
    ).join("|");
    const chartChanged = chart !== this.observedChart;
    if (!chartChanged && axisKey === this.layoutAxisKey) return;
    this.layoutAxisKey = axisKey;

    if (chartChanged) {
      this.resizeObserver?.disconnect();
      this.observedChart = chart;
      this.resizeObserver = new ResizeObserver(([entry]) => {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (
          this.layout?.width === width &&
          this.layout?.height === height
        ) return;
        this.updateLayout(width, height);
        this.requestUpdate();
      });
      this.resizeObserver.observe(chart);
    }
    const rect = chart.getBoundingClientRect();
    this.updateLayout(rect.width, rect.height);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    if (this.hoverFrame !== undefined) {
      cancelAnimationFrame(this.hoverFrame);
    }
    this.resizeObserver = undefined;
    this.observedChart = undefined;
    super.disconnectedCallback();
  }

  private handlePointerMove(event: PointerEvent) {
    const surface = event.currentTarget as HTMLDivElement;
    const rect = surface.getBoundingClientRect();
    const axes = this.activeAxes;
    const series = this.visibleSeries;
    if (!rect.width || !series.length || !axes.length) return;

    const layout = this.layout;
    if (!layout?.plot.width) return;
    const plot = layout.plot;
    const x = event.clientX - rect.left;
    const clampedX = Math.min(
      plot.left + plot.width,
      Math.max(plot.left, x)
    );
    const domain = getTrendTimeDomain(series);
    const timestamp =
      domain.min +
      ((clampedX - plot.left) / plot.width) *
        (domain.max - domain.min);
    const nearest = findNearestTrendPoint(series[0].points, timestamp);
    if (!nearest || nearest.timestamp === this.hoverTimestamp) return;
    this.pendingHoverTimestamp = nearest.timestamp;
    if (this.hoverFrame !== undefined) return;
    this.hoverFrame = requestAnimationFrame(() => {
      this.hoverFrame = undefined;
      const nextTimestamp = this.pendingHoverTimestamp;
      this.pendingHoverTimestamp = undefined;
      if (
        nextTimestamp === undefined ||
        nextTimestamp === this.hoverTimestamp
      ) return;
      this.hoverTimestamp = nextTimestamp;
      this.requestUpdate();
    });
  }

  private clearHover() {
    if (this.hoverFrame !== undefined) {
      cancelAnimationFrame(this.hoverFrame);
      this.hoverFrame = undefined;
    }
    this.pendingHoverTimestamp = undefined;
    if (this.hoverTimestamp === undefined) return;
    this.hoverTimestamp = undefined;
    this.requestUpdate();
  }

  private renderReadyChart() {
    const series = this.visibleSeries;
    const axes = this.activeAxes;
    if (!series.length || !axes.length) {
      return html`
        <div class="state">No series visible</div>
      `;
    }
    const layout = this.layout;
    const plot = layout?.plot;
    if (!layout || !plot?.width || !plot.height) {
      return html`
        <div class="chart"></div>
      `;
    }
    const domain = getTrendTimeDomain(series);
    const xTicks = createTrendTimeTicks(
      domain,
      this.timeframe,
      plot.width
    );
    const axisLabels: TrendAxisLabel[] = axes.flatMap(
      (axis) => {
        const isLeft = axis.axisGroup !== "right";
        return axis.ticks.map((tick) => ({
          id: `${axis.id}:${tick.value}`,
          text: formatTrendAxisValue(tick.value, axis),
          x: isLeft
            ? plot.left - 18
            : plot.right + 18,
          y: getTrendY(tick.value, axis, plot),
          align: isLeft ? "right" : "left",
        }));
      }
    );
    const hoverX =
      this.hoverTimestamp === undefined
        ? undefined
        : getTrendX(this.hoverTimestamp, domain, plot);
    const tooltipRows =
      this.hoverTimestamp === undefined
        ? []
        : series
            .map((item, index) => ({
              item,
              index,
              point: findNearestTrendPoint(
                item.points,
                this.hoverTimestamp as number
              ),
            }))
            .filter((row) => Boolean(row.point));
    const hoverMarkers: TrendHoverMarker[] = tooltipRows.flatMap(
      ({ item, index, point }) => {
        const axis = axes.find((entry) => entry.id === item.axisId);
        return axis && point && hoverX !== undefined
          ? [{
              id: item.id,
              x: hoverX,
              y: getTrendY(point.value, axis, plot),
              color: getTrendSeriesColor(item.color, index),
            }]
          : [];
      }
    );

    return html`
      ${this.excludedAxisCount
        ? html`
            <div class="axis-warning" role="status">
              Multiple units detected. Please select series to compare.
            </div>
          `
        : null}
      <div class="chart">
        <ic-trend-line-renderer
          .series=${series}
          .axes=${axes}
          .layout=${layout}
          .curve=${this.curve}
        ></ic-trend-line-renderer>

        <div
          class="plot-surface"
          @pointermove=${this.handlePointerMove}
          @pointerleave=${this.clearHover}
        >
          ${xTicks.map((timestamp) => html`
            <span
              class="time-label"
              style=${`left:${getTrendX(
                timestamp,
                domain,
                plot
              )}px;top:${plot.bottom + 8}px`}
            >
              ${formatTrendTime(timestamp, this.timeframe)}
            </span>
          `)}
          ${hoverX === undefined
            ? null
            : html`
                <span
                  class="hover-line"
                  style=${`left:${hoverX}px;top:${plot.top}px;height:${plot.height}px`}
                ></span>
              `}
        </div>
        <ic-trend-hover-markers
          .markers=${hoverMarkers}
        ></ic-trend-hover-markers>
        <ic-trend-axis-labels
          .labels=${axisLabels}
        ></ic-trend-axis-labels>

        ${hoverX === undefined || this.hoverTimestamp === undefined
          ? null
          : html`
              <div
                class="tooltip"
                style=${`left:${hoverX}px`}
              >
                <div class="tooltip-time">
                  ${formatTrendTime(
                    this.hoverTimestamp,
                    this.timeframe
                  )}
                </div>
                ${tooltipRows.map(({ item, index, point }) => html`
                  <div class="tooltip-row">
                    <span class="tooltip-name">
                      <span
                        class="dot"
                        style=${`background:${getTrendSeriesColor(
                          item.color,
                          index
                        )}`}
                      ></span>
                      ${item.name}
                    </span>
                    <span class="tooltip-value">
                      ${formatTrendSeriesValue(
                        point?.value ?? 0,
                        axes.find((axis) => axis.id === item.axisId) ??
                          axes[0],
                        item.precision
                      )}
                    </span>
                  </div>
                `)}
              </div>
            `}
      </div>
    `;
  }

  render() {
    if (this.status === "ready") {
      return this.renderReadyChart();
    }

    const message =
      this.status === "loading"
        ? "Loading history…"
        : this.status === "error"
          ? this.errorMessage || "Unable to load history"
          : this.status === "empty"
            ? "No history data for this timeframe"
            : "History data is not loaded yet";

    return html`
      <div class="state" role="status" aria-live="polite">
        ${message}
      </div>
    `;
  }
}

customElements.define("ic-trend-chart", TrendChart);
