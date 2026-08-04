import { LitElement, css, html } from "lit";
import "./scroll-area";

/** Shared shell/scroll/list/footer structure for anchored add menus. */
export class IcActionMenu extends LitElement {
  static styles=css`
    :host { display:block; width:100%; min-width:0; max-height:inherit; overflow:hidden; }
    .shell {
      display:grid;
      width:100%;
      max-height:inherit;
      min-height:0;
      box-sizing:border-box;
      grid-template-rows:minmax(0,1fr) auto;
      overflow:hidden;
      padding:8px var(--en-menu-scrollbar-inset,8px);
    }
    .scroll {
      display:grid;
      width:100%;
      min-height:0;
      box-sizing:border-box;
      gap:var(--en-menu-item-gap,6px);
      padding:
        0
        var(--en-menu-scrollbar-content-gap,8px)
        var(--en-menu-bottom-padding,16px)
        0;
    }
    .footer {
      display:grid;
      min-width:0;
      padding-top:6px;
      background:inherit;
    }
    ::slotted([slot="footer"]) { display:block; width:100%; box-sizing:border-box; padding-bottom:12px; }
  `;
  render(){return html`<div class="shell"><ic-scroll-area class="scroll" variant="menu"><slot></slot></ic-scroll-area><div class="footer"><slot name="footer"></slot></div></div>`;}
}
customElements.define("ic-action-menu",IcActionMenu);
