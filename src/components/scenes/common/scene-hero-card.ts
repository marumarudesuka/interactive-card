import { LitElement, css, html } from "lit";

import type { SceneMetric, SceneStatus } from "../../../types/scenes";
import "../../common/glass-container";
import "../../common/metric-value";

export class SceneHeroCard extends LitElement {
  static properties = {
    title: { type: String },
    icon: { type: String },
    status: { attribute: false },
    primary: { attribute: false },
    details: { attribute: false },
  };

  title = "";
  icon = "mdi:home-lightning-bolt";
  status?: SceneStatus;
  primary?: SceneMetric;
  details: SceneMetric[] = [];

  static styles = css`
    :host { display:block; width:100%; min-width:0; }
    ic-glass-container {
      --glass-container-height: var(--scene-hero-height, 240px);
    }
    .hero { display:grid; height:100%; grid-template-columns:1fr auto; gap:24px; }
    .copy { display:flex; min-width:0; flex-direction:column; justify-content:center; }
    .status { display:flex; align-items:center; gap:8px; color:var(--secondary-text-color); }
    .dot { width:9px; height:9px; border-radius:50%; background:var(--en-color-success); }
    .dot.idle { background:var(--secondary-text-color); }
    .dot.warning { background:var(--en-color-accent); }
    h2 {
      margin:12px 0 18px;
      color:var(--en-heading-primary,var(--primary-text-color));
      font-size:var(--en-title-xl-size,34px);
      font-weight:var(--en-title-xl-weight,600);
      line-height:var(--en-title-xl-line-height,1.15);
      letter-spacing:var(--en-title-xl-letter-spacing,-0.5px);
    }
    ic-metric-value { --metric-value-size:clamp(42px,6vw,64px); }
    .icon { align-self:center; opacity:.18; --mdc-icon-size:clamp(80px,12vw,150px); }
    .details { display:flex; flex-wrap:wrap; gap:20px; margin-top:18px; }
    .detail { color:var(--secondary-text-color); font-size:13px; }
    .detail strong { color:var(--primary-text-color); font-size:17px; }
  `;

  render() {
    return html`
      <ic-glass-container>
        <div class="hero">
          <div class="copy">
            ${this.status ? html`
              <div class="status">
                <span class="dot ${this.status.state}"></span>${this.status.label}
              </div>` : null}
            <h2>${this.title}</h2>
            ${this.primary ? html`
              <ic-metric-value
                .value=${String(this.primary.value)}
                .unit=${this.primary.unit ?? ""}
                status="valid"
              ></ic-metric-value>` : null}
            <div class="details">
              ${this.details.map((metric) => html`
                <div class="detail">${metric.title}<br />
                  <strong>${metric.value} ${metric.unit ?? ""}</strong>
                </div>`)}
            </div>
          </div>
          <ha-icon class="icon" .icon=${this.icon}></ha-icon>
        </div>
      </ic-glass-container>
    `;
  }
}

customElements.define("ic-scene-hero-card", SceneHeroCard);
