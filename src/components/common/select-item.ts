import { LitElement, css, html } from "lit";

export class IcSelectItem extends LitElement {
  static properties = {
    selected: { type:Boolean, reflect:true },
    indicator: { type:String },
    hideIndicator: { type:Boolean, attribute:"hide-indicator" },
    disabled: { type:Boolean, reflect:true },
    variant: { type:String, reflect:true },
    displayLabel:{ type:String, attribute:"display-label" },
    rawLabel:{ type:String, attribute:"raw-label" },
    secondaryLabel:{ type:String, attribute:"secondary-label" },
    rawSecondaryLabel:{ type:String, attribute:"raw-secondary-label" },
    tone:{ type:String, reflect:true },
  };

  selected = false;
  indicator: "check" | "plus" | "dot" | "none" = "none";
  hideIndicator = false;
  disabled = false;
  variant: "default" | "compact" = "default";
  displayLabel = "";
  rawLabel = "";
  secondaryLabel = "";
  rawSecondaryLabel = "";
  tone:"neutral"|"primary" = "neutral";

  static styles = css`
    :host { display:block; min-width:0; }
    .item {
      display:flex;
      width:100%;
      min-height:var(--ic-select-item-height,48px);
      box-sizing:border-box;
      align-items:center;
      gap:8px;
      padding:var(--ic-select-item-padding,8px 12px);
      border:1px solid transparent;
      border-radius:var(--en-panel-radius,18px);
      background:transparent;
      color:var(--en-text-primary,var(--primary-text-color));
      cursor:pointer;
      font:inherit;
      font-size:16px;
      font-weight:500;
      text-align:left;
      transition:
        background var(--en-motion-fast,180ms)
          var(--en-easing-standard,ease),
        transform var(--en-motion-fast,180ms)
          var(--en-easing-standard,ease);
    }
    .item:hover {
      background:var(--ic-action-hover-background,rgba(127,127,127,.14));
    }
    .item:active { transform:scale(.98); }
    .item.selected {
      border:var(--en-selection-border,1px solid transparent);
      background:var(--en-selection-surface,transparent);
    }
    .item.no-indicator .indicator { display:none; }
    .item.disabled { cursor:default; opacity:.5; }
    .item:focus-visible {
      outline:var(--ic-focus-ring,2px solid var(--en-color-focus));
      outline-offset:2px;
    }
    :host([variant="compact"]) .item {
      width:100%;
      height:var(--en-menu-item-height,38px);
      min-height:var(--en-menu-item-height,38px);
      padding:0 var(--en-control-padding-inline-compact,14px);
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-menu-item-radius,var(--en-control-radius,999px));
      background:var(--ic-control-background,var(--en-surface-control));
      font-size:14px;
      font-weight:500;
      line-height:1;
    }
    :host([variant="compact"]) .item.selected {
      border:var(--en-selection-border,var(--ic-border-control,var(--en-border)));
      background:var(--en-selection-surface,var(--ic-control-background,var(--en-surface-control)));
    }
    :host([tone="primary"]) .item {
      border-color:transparent;
      background:var(--en-control-active-background,var(--en-color-primary));
      color:var(--en-control-active-foreground,#fff);
    }
    :host([tone="primary"]) .indicator,
    :host([tone="primary"]) .secondary { color:inherit; }
    :host([variant="compact"]) .indicator {
      flex:0 0 18px;
      width:18px;
      height:18px;
      line-height:0;
      transform:none;
    }
    :host([variant="compact"]) ha-icon {
      width:14px;
      height:14px;
      --mdc-icon-size:14px;
    }
    :host([variant="compact"]) .copy { gap:1px; }
    :host([variant="compact"]) .label { line-height:14px; }
    :host([variant="compact"]) .secondary {
      font-size:12px;
      font-weight:400;
      line-height:12px;
    }
    .indicator {
      display:flex;
      flex:0 0 16px;
      width:16px;
      height:16px;
      align-items:center;
      justify-content:center;
      color:var(--en-text-secondary,var(--secondary-text-color));
      transform:var(--ic-select-indicator-transform,none);
    }
    ha-icon {
      width:14px;
      height:14px;
      --mdc-icon-size:14px;
      opacity:.7;
    }
    .dot {
      width:7px;
      height:7px;
      border-radius:50%;
      background:currentColor;
      opacity:.65;
    }
    .copy { display:grid; min-width:0; flex:1 1 auto; gap:0; }
    .label { min-width:0; overflow:hidden; line-height:1.3; text-overflow:ellipsis; white-space:nowrap; }
    .secondary { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:13px; font-weight:400; line-height:1.4; }
    ::slotted(:not([slot])) {
      display:block;
      min-width:0;
      max-width:100%;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    ::slotted([slot="secondary"]) {
      display:block;
      min-width:0;
      max-width:100%;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    ::slotted([slot="trailing"]) { align-self:center; justify-self:end; }
  `;

  private renderIndicator() {
    if (this.indicator === "check") return html`<ha-icon icon="mdi:check"></ha-icon>`;
    if (this.indicator === "plus") return html`<ha-icon icon="mdi:plus"></ha-icon>`;
    if (this.indicator === "dot") return html`<span class="dot"></span>`;
    return null;
  }

  render() {
    return html`
      <div
        class=${`item ${this.selected ? "selected" : ""} ${
          this.hideIndicator ? "no-indicator" : ""
        } ${this.disabled ? "disabled" : ""}`}
        role="button"
        tabindex=${this.disabled ? -1 : 0}
        aria-disabled=${this.disabled}
        aria-label=${this.rawLabel || this.displayLabel || undefined}
        @keydown=${(event: KeyboardEvent) => {
          if (this.disabled || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          this.click();
        }}
      >
        <span class="indicator">${this.renderIndicator()}</span>
        <span class="copy">
          <span class="label" title=${this.rawLabel || this.displayLabel}><slot>${this.displayLabel}</slot></span>
          <span class="secondary" title=${this.rawSecondaryLabel || this.secondaryLabel}><slot name="secondary">${this.secondaryLabel}</slot></span>
        </span>
        <slot name="trailing"></slot>
      </div>
    `;
  }
}

customElements.define("ic-select-item", IcSelectItem);
