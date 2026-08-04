import { LitElement, css, html } from "lit";
import "./energy-theme-selector";

interface EnergySettingsCardConfig {
  type?:string;
  title?:string;
}

export class EnergySettingsCard extends LitElement {
  static properties = { config:{ attribute:false } };
  config: EnergySettingsCardConfig = {};

  static styles = css`
    :host {
      display:block;
      width:100%;
      min-width:0;
      color:var(--en-text-primary,var(--primary-text-color));
    }
    .surface {
      padding:var(--en-space-lg,24px);
      box-sizing:border-box;
      border:var(--en-border,1px solid var(--divider-color));
      border-radius:var(--ic-radius-card);
      background:var(--en-surface-primary,var(--ha-card-background));
      box-shadow:var(--en-shadow-surface,var(--ha-card-box-shadow,none));
      backdrop-filter:var(--en-blur,none);
      -webkit-backdrop-filter:var(--en-blur,none);
    }
    h2 {
      margin:0 0 var(--en-space-xs,4px);
      color:var(--en-heading-primary,var(--primary-text-color));
      font-size:var(--en-title-md-size,18px);
      font-weight:var(--en-title-md-weight,600);
      line-height:var(--en-title-md-line-height,1.25);
      letter-spacing:var(--en-title-md-letter-spacing,-0.1px);
    }
    p {
      margin:0 0 var(--en-space-md,16px);
      color:var(--en-subtitle-secondary,var(--secondary-text-color));
      font-size:13px;
    }
  `;

  setConfig(config: EnergySettingsCardConfig) {
    this.config = { ...config };
  }

  getCardSize() { return 3; }
  getGridOptions() { return { columns:6, rows:3 }; }

  render() {
    return html`<section class="surface">
      <h2>${this.config.title ?? "Energy Settings"}</h2>
      <p>Dashboard appearance</p>
      <energy-theme-selector
        .config=${{ compact:true }}
      ></energy-theme-selector>
    </section>`;
  }
}

customElements.define("energy-settings-card", EnergySettingsCard);
