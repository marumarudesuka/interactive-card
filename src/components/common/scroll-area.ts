import { LitElement, css, html } from "lit";
import { scrollbarStyle } from "../../design-system/scrollbar";

export class IcScrollArea extends LitElement {
  static properties = {
    variant: { type: String, reflect: true },
  };

  variant: "default" | "menu" = "default";

  static styles = [scrollbarStyle, css`
    :host {
      display:block;
      min-width:0;
      overflow-x:hidden;
      overflow-y:auto;
      overscroll-behavior:contain;
      scrollbar-width:thin;
      scrollbar-color:
        var(--en-scrollbar-thumb,auto)
        var(--en-scrollbar-track,auto);
      scrollbar-gutter:stable;
      --en-scrollbar-radius:999px;
    }
    :host([variant="menu"]) {
      box-sizing:border-box;
      padding-bottom:var(--en-menu-bottom-padding,var(--en-menu-padding-bottom,16px));
    }
    :host::-webkit-scrollbar { width:var(--en-scrollbar-size,3px); height:var(--en-scrollbar-size,3px); }
    :host::-webkit-scrollbar-track {
      border-radius:999px;
      background:var(--en-scrollbar-track,transparent);
    }
    :host::-webkit-scrollbar-thumb {
      border:var(--en-scrollbar-thumb-border,0);
      border-radius:999px;
      background:var(--en-scrollbar-thumb,rgba(127,127,127,.3));
    }
    :host::-webkit-scrollbar-thumb:hover {
      background:var(--en-scrollbar-thumb-hover,rgba(127,127,127,.45));
    }
  `];
  render() { return html`<slot></slot>`; }
}

customElements.define("ic-scroll-area", IcScrollArea);
