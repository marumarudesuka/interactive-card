import { LitElement, css, html, type PropertyValues } from "lit";

import {
  getTrendTimeDomain,
  getTrendX,
  getTrendY,
} from "../../helpers/trend-chart-geometry";
import { getTrendSeriesColor } from "../../helpers/trend-chart-formatters";
import type { TrendChartLayout } from "../../helpers/trend-chart-layout";
import {
  createMonotoneCurve,
  type TrendCurvePoint,
} from "../../helpers/trend-curve";
import type {
  ResolvedTrendAxis,
  TrendCurveMode,
  TrendSeries,
} from "../../types/trend";

interface DrawableTrendSeries {
  color: string;
  chartMode: TrendSeries["chartMode"];
  points: TrendCurvePoint[];
  lineStyle: "solid" | "dashed";
}

function colorWithAlpha(color: string, alpha: number): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return color;
  return `rgba(${parseInt(match[1], 16)},${parseInt(
    match[2],
    16
  )},${parseInt(match[3], 16)},${alpha})`;
}

function resolveCssColor(styles: CSSStyleDeclaration, color: string): string {
  let resolved = color.trim();

  // CanvasRenderingContext2D does not resolve CSS custom properties. Trend
  // palette tokens intentionally reference the shared brand tokens, so walk
  // the complete var() chain before assigning strokeStyle/fillStyle.
  for (let depth = 0; depth < 8; depth += 1) {
    let changed = false;
    const next = resolved.replace(
      /var\((--[^,)\s]+)(?:,\s*([^)]+))?\)/g,
      (match, token: string, fallback?: string) => {
        const value = styles.getPropertyValue(token).trim();
        if (value) {
          changed = true;
          return value;
        }
        if (fallback?.trim()) {
          changed = true;
          return fallback.trim();
        }
        return match;
      }
    );
    resolved = next.trim();
    if (!changed) break;
  }

  return resolved;
}

function traceCurve(
  context: CanvasRenderingContext2D,
  points: readonly TrendCurvePoint[],
  curve: TrendCurveMode
) {
  if (!points.length) return;
  context.moveTo(points[0].x, points[0].y);
  if (curve === "raw") {
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    return;
  }
  if (curve === "step") {
    points.slice(1).forEach((point, index) => {
      context.lineTo(point.x, points[index].y);
      context.lineTo(point.x, point.y);
    });
    return;
  }
  for (const segment of createMonotoneCurve(points)) {
    context.bezierCurveTo(
      segment.control1.x,
      segment.control1.y,
      segment.control2.x,
      segment.control2.y,
      segment.end.x,
      segment.end.y
    );
  }
}

export class TrendLineRenderer extends LitElement {
  static properties = {
    series: { attribute: false },
    axes: { attribute: false },
    layout: { attribute: false },
    curve: { type: String },
  };

  series: TrendSeries[] = [];
  axes: ResolvedTrendAxis[] = [];
  layout?: TrendChartLayout;
  curve: TrendCurveMode = "smooth";

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      display: block;
      pointer-events: none;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  protected shouldUpdate(changed: PropertyValues<this>) {
    return (
      changed.has("series") ||
      changed.has("axes") ||
      changed.has("layout") ||
      changed.has("curve")
    );
  }

  protected updated(_changed: PropertyValues<this>) {
    this.draw();
  }

  private draw() {
    const canvas = this.renderRoot.querySelector("canvas");
    const context = canvas?.getContext("2d");
    const layout = this.layout;
    if (
      !canvas ||
      !context ||
      !layout ||
      !layout.width ||
      !layout.height ||
      !this.series.length ||
      !this.axes.length
    ) return;

    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(layout.width * pixelRatio);
    canvas.height = Math.round(layout.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, layout.width, layout.height);

    const styles = getComputedStyle(this);
    context.strokeStyle =
      styles.getPropertyValue("--divider-color").trim() ||
      "rgba(127,127,127,.25)";
    context.lineWidth = 1;
    for (const tick of this.axes[0].ticks) {
      const y = getTrendY(tick.value, this.axes[0], layout.plot);
      context.beginPath();
      context.moveTo(layout.plot.left, y);
      context.lineTo(layout.plot.right, y);
      context.stroke();
    }

    const domain = getTrendTimeDomain(this.series);
    const drawableSeries: DrawableTrendSeries[] = this.series.flatMap(
      (series, index) => {
      const axis = this.axes.find((item) => item.id === series.axisId);
        if (!axis || !series.points.length) return [];

        return [{
          color: resolveCssColor(
            styles,
            getTrendSeriesColor(series.color, index)
          ),
          chartMode:series.chartMode,
          lineStyle: series.lineStyle,
          points: series.points.map((point) => ({
            x: getTrendX(point.timestamp, domain, layout.plot),
            y: getTrendY(point.value, axis, layout.plot),
          })),
        }];
      }
    );

    for (const drawable of drawableSeries) {
      if (drawable.chartMode !== "area") continue;
      if (drawable.points.length < 2) continue;
      const gradient = context.createLinearGradient(
        0,
        layout.plot.top,
        0,
        layout.plot.bottom
      );
      gradient.addColorStop(0, colorWithAlpha(drawable.color, 0.35));
      gradient.addColorStop(1, colorWithAlpha(drawable.color, 0));
      context.beginPath();
      traceCurve(context, drawable.points, this.curve);
      const first = drawable.points[0];
      const last = drawable.points[drawable.points.length - 1];
      context.lineTo(last.x, layout.plot.bottom);
      context.lineTo(first.x, layout.plot.bottom);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();
    }

    for (const drawable of drawableSeries) {
      if (drawable.chartMode === "bar") {
        const barWidth = Math.max(
          2,
          Math.min(18, layout.plot.width / Math.max(1, drawable.points.length) * .65)
        );
        context.fillStyle = drawable.color;
        for (const point of drawable.points) {
          context.fillRect(
            point.x - barWidth / 2,
            point.y,
            barWidth,
            Math.max(1, layout.plot.bottom - point.y)
          );
        }
        continue;
      }
      if (drawable.points.length > 1) {
        context.beginPath();
        traceCurve(context, drawable.points, this.curve);
        context.strokeStyle = drawable.color;
        context.lineWidth = 2;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.setLineDash(
          drawable.lineStyle === "dashed" ? [7, 5] : []
        );
        context.stroke();
        context.setLineDash([]);
        continue;
      }

      const point = drawable.points[0];
      if (!point) continue;
      context.fillStyle = drawable.color;
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  render() {
    return html`<canvas aria-hidden="true"></canvas>`;
  }
}

customElements.define("ic-trend-line-renderer", TrendLineRenderer);
