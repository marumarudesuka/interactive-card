import { LitElement, css, html } from "lit";

export interface ToggleChangeDetail { checked:boolean; }

/**
 * Shared Enecess toggle extracted from the former Trend settings switch.
 * Its track, thumb, motion, and colors intentionally preserve that control.
 */
export class IcToggle extends LitElement {
  static properties = {
    checked:{ type:Boolean, reflect:true },
    disabled:{ type:Boolean, reflect:true },
    unavailable:{ type:Boolean, reflect:true },
    pending:{ type:Boolean, reflect:true },
    label:{ type:String },
  };

  checked = false;
  disabled = false;
  unavailable = false;
  pending = false;
  label = "Toggle";

  static styles = css`
    :host { display:inline-grid; width:40px; height:40px; flex:0 0 40px; place-items:center; }
    button {
      display:grid; width:32px; height:20px; margin:0; padding:0; place-items:center;
      border:var(--ic-border-control,var(--en-border)); border-radius:999px;
      background:var(--en-surface-secondary,rgba(127,127,127,.18));
      background:color-mix(in srgb,var(--secondary-text-color) 18%,var(--ic-control-background,var(--en-surface-control))); cursor:pointer;
    }
    button::after {
      content:""; width:12px; height:12px; border-radius:50%;
      background:var(--en-text-secondary,var(--secondary-text-color));
      transform:translateX(-6px); transition:transform var(--en-motion-fast,180ms);
    }
    button.on {
      border-color:color-mix(in srgb,var(--en-color-primary) 48%,transparent);
      background:var(--en-color-primary-soft);
      background:color-mix(in srgb,var(--en-color-primary) 24%,var(--ic-control-background,var(--en-surface-control)));
    }
    button.on::after { background:var(--en-color-primary); transform:translateX(6px); }
    button:focus-visible { outline:var(--ic-focus-ring,2px solid var(--en-color-primary)); outline-offset:2px; }
    button:disabled { cursor:not-allowed; opacity:.55; }
    :host([unavailable]) button { opacity:.42; }
    :host([pending]) button { cursor:wait; }
  `;

  private toggle() {
    if (this.disabled || this.unavailable || this.pending) return;
    this.dispatchEvent(new CustomEvent<ToggleChangeDetail>("toggle-change", {
      detail:{ checked:!this.checked }, bubbles:true, composed:true,
    }));
  }

  render() {
    const inactive = this.disabled || this.unavailable || this.pending;
    return html`<button type="button" role="switch" class=${this.checked ? "on" : ""}
      aria-label=${this.label} aria-checked=${this.checked ? "true" : "false"}
      aria-disabled=${inactive ? "true" : "false"} aria-busy=${this.pending ? "true" : "false"}
      ?disabled=${inactive} @click=${this.toggle}></button>`;
  }
}

if (!customElements.get("ic-toggle")) customElements.define("ic-toggle",IcToggle);
