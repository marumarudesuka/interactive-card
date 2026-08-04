import { LitElement, css, html } from "lit";

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedChangeDetail {
  value: string;
}

export class IcSegmentedControl extends LitElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    label: { type: String },
    widthMode: { type:String, attribute:"width", reflect:true },
    size: { type:String, reflect:true },
  };

  options: SegmentedOption[] = [];
  value = "";
  label = "Options";
  widthMode:"fit"|"full" = "fit";
  size:"default"|"compact-28" = "default";

  static styles = css`
    :host { display:inline-flex; width:fit-content; max-width:100%; min-width:0; }
    :host([width="full"]) { display:block; width:100%; max-width:100%; }
    .control {
      position:relative;
      display:inline-flex;
      width:max-content;
      max-width:100%;
      min-width:0;
      min-height:var(--segment-height,var(--en-control-height-compact,38px));
      box-sizing:border-box;
      gap:3px;
      padding:4px var(--segment-padding-inline-end,4px) 4px 4px;
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-control-radius,var(--en-segmented-radius,999px));
      background:var(--ic-control-background,var(--en-surface-control));
      backdrop-filter:var(--en-blur-control,none);
      -webkit-backdrop-filter:var(--en-blur-control,none);
    }
    :host([width="full"]) .control { width:100%; }
    :host([size="compact-28"]) .control {
      height:28px;
      min-height:28px;
      max-height:28px;
    }
    .indicator {
      position:absolute;
      z-index:0;
      top:4px;
      bottom:4px;
      left:4px;
      width:var(--segment-active-width,40px);
      border:1px solid color-mix(in srgb, var(--en-color-primary) 68%, transparent);
      border-radius:var(--en-control-radius,var(--en-segmented-radius,999px));
      background:var(--en-control-active-background,var(--en-color-primary));
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--en-color-primary) 24%, transparent),
        0 0 14px var(--en-color-primary-glow);
      transform:translateX(var(--segment-active-offset,0px));
      transition:transform var(--en-motion-normal,300ms) var(--en-easing-standard,ease);
      pointer-events:none;
    }
    button {
      position:relative;
      z-index:2;
      box-sizing:border-box;
      flex:0 0 auto;
      min-width:0;
      padding:0 var(--segment-padding-inline,12px);
      border:0;
      border-radius:var(--en-control-radius,var(--en-segmented-radius,999px));
      background:transparent;
      color:var(--en-text-secondary,var(--secondary-text-color));
      cursor:pointer;
      font:inherit;
      font-size:var(--segment-font-size,13px);
      white-space:nowrap;
    }
    button:hover { background:var(--ic-action-hover-background,rgba(127,127,127,.14)); }
    button.active { background:transparent; color:var(--en-control-active-foreground,#fff); font-weight:600; }
    :host([width="full"]) .indicator {
      width:calc((100% - 8px - (var(--segment-count) - 1) * 3px) / var(--segment-count));
      transform:translateX(calc(var(--segment-index) * (100% + 3px)));
    }
    :host([width="full"]) button { flex:1 1 0; min-width:0; }
    button:focus-visible { outline:var(--ic-focus-ring); outline-offset:2px; }
  `;

  private select(value: string) {
    if (value === this.value) return;
    this.dispatchEvent(new CustomEvent<SegmentedChangeDetail>("segmented-change", {
      detail:{ value }, bubbles:true, composed:true,
    }));
  }

  protected updated() {
    if (this.widthMode === "full") return;
    const control = this.shadowRoot?.querySelector<HTMLElement>(".control");
    const active = this.shadowRoot?.querySelector<HTMLElement>("button.active");
    if (!control || !active) return;
    control.style.setProperty("--segment-active-width",`${active.offsetWidth}px`);
    control.style.setProperty("--segment-active-offset",`${active.offsetLeft - 4}px`);
  }

  render() {
    const index = Math.max(0, this.options.findIndex((option) => option.value === this.value));
    return html`<div class="control" role="radiogroup" aria-label=${this.label}
      style=${`--segment-count:${Math.max(1,this.options.length)};--segment-index:${index}`}>
      <span class="indicator" aria-hidden="true"></span>
      ${this.options.map((option) => html`<button type="button" role="radio"
        class=${option.value === this.value ? "active" : ""}
        aria-checked=${option.value === this.value}
        @click=${() => this.select(option.value)}>${option.label}</button>`)}
    </div>`;
  }
}

customElements.define("ic-segmented-control", IcSegmentedControl);
