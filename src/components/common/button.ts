import { LitElement, css, html } from "lit";

export class IcButton extends LitElement {
  static properties = {
    variant:{ type:String, reflect:true },
    disabled:{ type:Boolean, reflect:true },
    loading:{ type:Boolean, reflect:true },
  };

  variant: "primary" | "secondary" | "destructive" | "compact" = "secondary";
  disabled = false;
  loading = false;

  static styles = css`
    :host { display:inline-flex; }
    button {
      display:inline-flex;
      width:var(--ic-button-width,auto);
      box-sizing:border-box;
      align-items:center;
      justify-content:center;
      gap:var(--en-control-gap,8px);
      min-height:var(--en-control-height-compact,38px);
      padding-inline:var(--en-control-padding-inline-compact,14px);
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-control-radius,999px);
      background:var(--ic-action-background,var(--en-surface-control));
      color:var(--en-text-primary,var(--primary-text-color));
      cursor:pointer;
      font:inherit;
      font-size:var(--en-body-size,14px);
      font-weight:600;
      transition:filter var(--en-motion-fast,150ms),transform var(--en-motion-fast,150ms);
    }
    button:hover:not(:disabled) { filter:brightness(1.08); }
    button:active:not(:disabled) { transform:scale(.98); }
    button:focus-visible { outline:var(--ic-focus-ring); outline-offset:2px; }
    button:disabled { opacity:.45; cursor:not-allowed; }
    :host([variant="primary"]) button { border-color:transparent; background:var(--en-color-primary); color:#fff; }
    :host([variant="destructive"]) button { color:var(--error-color,#ff3b30); }
  `;

  render() {
    return html`<button type="button" ?disabled=${this.disabled || this.loading}>
      ${this.loading ? "Saving…" : html`<slot></slot>`}
    </button>`;
  }
}

customElements.define("ic-button", IcButton);
