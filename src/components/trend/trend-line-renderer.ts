import { LitElement, css, html, type PropertyValues } from "lit";

import {
  getTrendBarGeometry,
  getTrendTimeDomain,
  getTrendZeroBaselineY,
  getTrendX,
  getTrendY,
} from "../../helpers/trend-chart-geometry";
import {
  getTrendSeriesColor,
  getTrendSeriesFallbackColor,
} from "../../helpers/trend-chart-formatters";
import {
  createTrendAreaFill,
  normalizeTrendCanvasColor,
} from "../../helpers/trend-canvas-color";
import type { TrendChartLayout } from "../../helpers/trend-chart-layout";
import {
  getFiniteTrendGeometry,
  isValidTrendPlotSize,
  runIsolatedTrendSeriesRender,
} from "../../helpers/trend-render-guard";
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
  id: string;
  entity: string;
  axisId: string;
  colorInput: string;
  color: string;
  chartMode: TrendSeries["chartMode"];
  points: TrendCurvePoint[];
  lineStyle: "solid" | "dashed";
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

function sampleCanvasColor(color:string):string | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d",{ willReadFrequently:true });
  if (!context) return undefined;
  context.clearRect(0,0,1,1);
  context.fillStyle = "rgba(1, 2, 3, 0.5)";
  const sentinel = context.fillStyle;
  context.fillStyle = color;
  if (context.fillStyle === sentinel && color.replaceAll(" ","") !== sentinel.replaceAll(" ","")) {
    return undefined;
  }
  context.fillRect(0,0,1,1);
  const [red,green,blue,alpha] = context.getImageData(0,0,1,1).data;
  if (!alpha) return "rgba(0, 0, 0, 0)";
  return `rgba(${red}, ${green}, ${blue}, ${Number((alpha / 255).toFixed(3))})`;
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

    if (!isValidTrendPlotSize(layout.plot.width,layout.plot.height)) {
      return;
    }

    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(layout.width * pixelRatio);
    canvas.height = Math.round(layout.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, layout.width, layout.height);

    const styles = getComputedStyle(this);
    const colorProbe = document.createElement("span");
    colorProbe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    this.renderRoot.append(colorProbe);
    const resolveComputedColor = (color:string) => {
      colorProbe.style.color = "";
      colorProbe.style.color = color;
      // Unsupported expressions leave the declaration empty. Reading
      // computedStyle in that state would return inherited text color and
      // incorrectly turn the Series black.
      if (!colorProbe.style.color) return "";
      return getComputedStyle(colorProbe).color;
    };
    try {
      context.strokeStyle =
        styles.getPropertyValue("--divider-color").trim() ||
        "rgba(127,127,127,.25)";
      context.lineWidth = 1;
      for (const tick of this.axes[0].ticks) {
        const y = getTrendY(tick.value, this.axes[0], layout.plot);
        if (!Number.isFinite(y)) continue;
        context.beginPath();
        context.moveTo(layout.plot.left, y);
        context.lineTo(layout.plot.right, y);
        context.stroke();
      }

      // Bars are semantically anchored to zero. Reinforce that baseline over
      // the ordinary grid for each visible Bar axis (left/right may differ).
      const barAxisIds = new Set(
        this.series
          .filter((series) => series.chartMode === "bar")
          .map((series) => series.axisId)
      );
      const zeroBaselines: number[] = [];
      for (const axis of this.axes) {
        if (!barAxisIds.has(axis.id)) continue;
        const zeroY = getTrendZeroBaselineY(axis,layout.plot);
        if (zeroY === undefined || zeroBaselines.some((value) => Math.abs(value - zeroY) < .5)) {
          continue;
        }
        zeroBaselines.push(zeroY);
      }
      context.save();
      context.lineWidth = 1.5;
      for (const zeroY of zeroBaselines) {
        context.beginPath();
        context.moveTo(layout.plot.left,zeroY);
        context.lineTo(layout.plot.right,zeroY);
        context.stroke();
      }
      context.restore();

      const domain = getTrendTimeDomain(this.series);
      this.series.forEach((series, index) => {
        const axis = this.axes.find((item) => item.id === series.axisId);
        let colorInput = series.color?.trim() ?? "";
        let drawable: DrawableTrendSeries | undefined;
        runIsolatedTrendSeriesRender(context, () => {
          if (!axis || !series.points.length) return false;

          const fallback = getTrendSeriesFallbackColor(index,series.id);
          colorInput = getTrendSeriesColor(series.color,index,series.id);
          const color = normalizeTrendCanvasColor(
            resolveCssColor(styles,colorInput),
            resolveComputedColor,
            sampleCanvasColor,
            fallback
          );
          const points = getFiniteTrendGeometry(series.points.map((point) => ({
            x: getTrendX(point.timestamp, domain, layout.plot),
            y: getTrendY(point.value, axis, layout.plot),
          })));
          if (!points.length) return false;

          drawable = {
            id: series.id,
            entity: series.entity,
            axisId: series.axisId,
            colorInput,
            color,
            chartMode:series.chartMode,
            lineStyle: series.lineStyle,
            points,
          };

          if (drawable.chartMode === "bar") {
            const barWidth = Math.max(
              2,
              Math.min(18, layout.plot.width / Math.max(1, points.length) * .65)
            );
            context.fillStyle = color;
            for (const point of series.points) {
              const x = getTrendX(point.timestamp,domain,layout.plot);
              const bar = getTrendBarGeometry(point.value,axis,layout.plot);
              if (!Number.isFinite(x) || !Number.isFinite(bar.top) ||
                !Number.isFinite(bar.height)) continue;
              context.fillRect(
                x - barWidth / 2,
                bar.top,
                barWidth,
                bar.height
              );
            }
            return true;
          }

          if (drawable.chartMode === "area" && points.length > 1) {
            const areaFill = createTrendAreaFill(
              context,layout.plot.top,layout.plot.bottom,color
            );
            if (areaFill) {
              context.beginPath();
              traceCurve(context,points,this.curve);
              context.lineTo(points[points.length - 1].x,layout.plot.bottom);
              context.lineTo(points[0].x,layout.plot.bottom);
              context.closePath();
              context.fillStyle = areaFill;
              context.fill();
            }
          }

          if (points.length > 1) {
            context.beginPath();
            traceCurve(context,points,this.curve);
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.lineCap = "round";
            context.lineJoin = "round";
            context.setLineDash(series.lineStyle === "dashed" ? [7,5] : []);
            context.stroke();
            return true;
          }

          context.fillStyle = color;
          context.beginPath();
          context.arc(points[0].x,points[0].y,4,0,Math.PI * 2);
          context.fill();
          return true;
        });

      });
    } finally {
      colorProbe.remove();
    }
  }

  render() {
    return html`<canvas aria-hidden="true"></canvas>`;
  }
}

customElements.define("ic-trend-line-renderer", TrendLineRenderer);
