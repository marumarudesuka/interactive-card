import { LitElement, css, html, svg } from "lit";

import { createMonotoneCurve } from "../../../helpers/trend-curve";
import type { SceneChartSeries } from "../../../types/scenes";
import "../../common/glass-container";

function createPath(values: readonly number[]): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 0 : (index / (values.length - 1)) * 760,
    y: 180 - ((value - min) / range) * 140,
  }));
  const segments = createMonotoneCurve(points);
  if (!segments.length) return `M ${points[0].x} ${points[0].y}`;
  return `M ${points[0].x} ${points[0].y} ${segments.map((segment) =>
    `C ${segment.control1.x} ${segment.control1.y}, ${segment.control2.x} ${segment.control2.y}, ${segment.end.x} ${segment.end.y}`
  ).join(" ")}`;
}

export class SceneChartCard extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    series: { attribute: false },
  };
  title = "";
  subtitle = "";
  series: SceneChartSeries[] = [];

  static styles = css`
    :host { display:block; min-width:0; }
    ic-glass-container { --glass-container-height:320px; }
    h3 {
      margin:0;
      font-size:var(--en-title-md-size,18px);
      font-weight:var(--en-title-md-weight,600);
      line-height:var(--en-title-md-line-height,1.25);
      letter-spacing:var(--en-title-md-letter-spacing,-0.1px);
    }
    h3 { color:var(--en-heading-primary,var(--primary-text-color)); }
    p { margin:5px 0 12px; color:var(--en-subtitle-secondary,var(--secondary-text-color)); font-size:13px; }
    svg { display:block; width:100%; height:220px; overflow:visible; }
    .grid { stroke:var(--divider-color); stroke-width:1; }
    .legend { display:flex; gap:16px; }
    .legend span { color:var(--secondary-text-color); font-size:12px; }
    .dot { display:inline-block; width:7px; height:7px; margin-right:5px; border-radius:50%; }
  `;

  render() {
    return html`<ic-glass-container>
      <h3>${this.title}</h3><p>${this.subtitle}</p>
      <svg viewBox="0 0 800 220" preserveAspectRatio="none">
        ${[40, 80, 120, 160, 200].map((y) => svg`
          <line class="grid" x1="20" x2="780" y1=${y} y2=${y}></line>`)}
        ${this.series.map((item, index) => {
          const path = createPath(item.values);
          return svg`
            <defs><linearGradient id=${`scene-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color=${item.color} stop-opacity=".25"></stop>
              <stop offset="100%" stop-color=${item.color} stop-opacity="0"></stop>
            </linearGradient></defs>
            <path d=${`${path} L 760 205 L 0 205 Z`} fill=${`url(#scene-fill-${index})`}></path>
            <path d=${path} fill="none" stroke=${item.color} stroke-width="3" stroke-linecap="round"></path>`;
        })}
      </svg>
      <div class="legend">${this.series.map((item) => html`
        <span><i class="dot" style=${`background:${item.color}`}></i>${item.name}</span>
      `)}</div>
    </ic-glass-container>`;
  }
}
customElements.define("ic-scene-chart-card", SceneChartCard);
