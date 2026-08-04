import { LitElement, css, html, type PropertyValues } from "lit";

/** Shared in-flow shell for compact searchable pickers. */
export class IcInlinePickerPanel extends LitElement {
  static properties = {
    open:{ type:Boolean, reflect:true },
    maxHeight:{ type:Number, attribute:"max-height" },
  };

  open = false;
  maxHeight = 260;

  static styles = css`
    :host {
      display:none;
      width:100%;
      min-width:0;
      box-sizing:border-box;
      margin-top:8px;
    }
    :host([open]) { display:block; }
    .panel {
      display:grid;
      width:100%;
      min-width:0;
      max-height:var(--inline-picker-max-height,260px);
      box-sizing:border-box;
      grid-template-rows:auto minmax(0,1fr);
      gap:8px;
      padding:12px 12px 16px;
      overflow:hidden;
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-panel-radius,18px);
      background:var(--en-surface-secondary,var(--ic-control-background));
    }
    ::slotted([slot="search"]) { min-width:0; }
    ::slotted([slot="content"]) { min-width:0; min-height:0; }
    @media (prefers-reduced-motion:no-preference) {
      :host([open]) .panel { animation:reveal 160ms ease both; }
      @keyframes reveal {
        from { opacity:0; max-height:0; }
        to { opacity:1; max-height:var(--inline-picker-max-height,260px); }
      }
    }
  `;

  protected updated(changed:PropertyValues<this>) {
    if (!changed.has("open") || !this.open) return;
    requestAnimationFrame(() => {
      const search = this.querySelector<HTMLElement>("[slot='search']") as
        | (HTMLElement & { focusInput?:() => void })
        | null;
      search?.focusInput?.();
    });
  }

  render() {
    return html`<div class="panel"
      style=${`--inline-picker-max-height:${this.maxHeight}px`}>
      <slot name="search"></slot>
      <slot name="content"></slot>
    </div>`;
  }
}

customElements.define("ic-inline-picker-panel", IcInlinePickerPanel);
