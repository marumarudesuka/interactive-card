import { LitElement, css, html } from "lit";
import {
  type CardTheme,
} from "../theme/card-theme";
import {
  getCardTheme,
  setCardTheme,
} from "../theme/theme-provider";
import type { SegmentedChangeDetail } from "./common/segmented-control";
import "./common/segmented-control";

interface EnergyThemeSelectorConfig {
  type?: string;
  compact?: boolean;
}

export class EnergyThemeSelector extends LitElement {
  static properties = {
    config: { attribute:false },
  };

  config: EnergyThemeSelectorConfig = {};
  private themeChanged = () => this.requestUpdate();

  static styles = css`
    :host {
      display:inline-block;
      width:auto;
      max-width:100%;
      min-width:0;
      color:var(--ic-card-primary-text,var(--primary-text-color));
    }
    ic-segmented-control {
      --segment-font-size:16px;
      --segment-padding-inline:10.5px;
      --segment-padding-inline-end:8px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("card-theme-changed", this.themeChanged);
  }

  disconnectedCallback() {
    window.removeEventListener("card-theme-changed", this.themeChanged);
    super.disconnectedCallback();
  }

  setConfig(config: EnergyThemeSelectorConfig) {
    this.config = { ...config };
  }

  getCardSize() { return 1; }
  getGridOptions() { return { columns: 4, rows: 1 }; }

  private select(theme: CardTheme) {
    setCardTheme(theme);
    this.requestUpdate();
  }

  render() {
    const selected = getCardTheme();
    const options: ReadonlyArray<{ value:CardTheme; label:string }> = [
      { value:"glass", label:"G" },
      { value:"native", label:"D" },
      { value:"solid", label:"S" },
    ];
    return html`
      <ic-segmented-control
        width="fit"
        label="Card style"
        .value=${selected}
        .options=${options}
        @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
          this.select(event.detail.value as CardTheme)}
      ></ic-segmented-control>
    `;
  }
}

customElements.define("energy-theme-selector", EnergyThemeSelector);

(window as Window & { customCards?: unknown[] }).customCards = [
  ...((window as Window & { customCards?: unknown[] }).customCards ?? []),
  {
    type:"energy-theme-selector",
    name:"Energy Theme Selector",
    description:"Global appearance selector for eNecess Energy cards",
  },
];
