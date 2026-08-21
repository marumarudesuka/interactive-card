import { LitElement, css, html } from "lit";

export type StatusPillTone = "active"|"inactive"|"unavailable";

export class IcStatusPill extends LitElement {
  static properties = { label:{type:String}, tone:{type:String,reflect:true} };

  label = "Inactive";
  tone:StatusPillTone = "inactive";

  static styles = css`
    :host { display:inline-flex; min-width:0; }
    .pill {
      display:inline-flex; min-width:0; height:28px; box-sizing:border-box;
      align-items:center; gap:6px; padding-inline:11px;
      border:var(--en-status-neutral-border,var(--ic-border-control,var(--en-border)));
      border-radius:999px;
      background:var(--en-status-neutral-surface,var(--ic-control-background,var(--en-surface-control)));
      color:var(--en-text-secondary,var(--secondary-text-color));
      font-size:var(--en-label-size,12px); line-height:1.2; white-space:nowrap;
      backdrop-filter:var(--en-blur-control,blur(12px));
      -webkit-backdrop-filter:var(--en-blur-control,blur(12px));
    }
    .dot {
      width:8px; height:8px; flex:0 0 8px; box-sizing:border-box;
      border:0; border-radius:50%; background:currentColor; opacity:.72;
    }
    :host([tone="active"]) .pill {
      border:var(--en-status-success-border,1px solid var(--en-color-success-border));
      background:var(--en-status-success-surface,var(--en-color-success-soft));
      color:var(--en-status-success,var(--en-color-success));
      box-shadow:0 0 0 1px color-mix(in srgb,var(--en-color-success) 9%,transparent);
    }
    :host([tone="active"]) .dot {
      border-color:var(--en-color-success); background:var(--en-color-success); opacity:1;
      box-shadow:0 0 8px var(--en-color-success-glow);
    }
    :host([tone="unavailable"]) .pill {
      border-color:color-mix(in srgb,var(--warning-color,var(--en-color-accent)) 45%,transparent);
      background:color-mix(in srgb,var(--warning-color,var(--en-color-accent)) 13%,var(--en-status-neutral-surface,var(--ic-control-background,var(--en-surface-control))));
      color:var(--warning-color,var(--en-color-accent));
    }
  `;

  render() {
    return html`<span class="pill"><span class="dot"></span><span>${this.label}</span></span>`;
  }
}

if (!customElements.get("ic-status-pill")) customElements.define("ic-status-pill",IcStatusPill);
