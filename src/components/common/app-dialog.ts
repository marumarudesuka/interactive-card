import { LitElement, css, html } from "lit";

import type {
  DialogCloseDetail,
  DialogCloseReason,
} from "./overlay/dialog/ic-dialog";
import "./overlay/dialog/ic-dialog";

export type { DialogCloseReason, DialogCloseDetail };

/**
 * Backward-compatible application dialog facade.
 * All existing settings dialogs now use the shared native top-layer modal.
 */
export class AppDialog extends LitElement {
  static properties = {
    open: { type:Boolean, reflect:true },
    title: { type:String },
    closeOnBackdrop: { type:Boolean, attribute:"close-on-backdrop" },
    closeOnEscape: { type:Boolean, attribute:"close-on-escape" },
  };

  open = false;
  title = "";
  closeOnBackdrop = true;
  closeOnEscape = true;

  static styles = css`
    :host { display:contents; }

    .footer-proxy {
      display:block;
      width:100%;
      min-width:0;
      box-sizing:border-box;
    }
  `;

  private forwardClose(event: CustomEvent<DialogCloseDetail>) {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent<DialogCloseDetail>("dialog-close", {
      detail:event.detail,
      bubbles:true,
      composed:true,
    }));
  }

  render() {
    return html`<ic-dialog
      .open=${this.open}
      .title=${this.title}
      .closeOnBackdrop=${this.closeOnBackdrop}
      .closeOnEscape=${this.closeOnEscape}
      @dialog-close=${this.forwardClose}
    >
      <slot name="header" slot="header">${this.title}</slot>
      <slot></slot>
      <div class="footer-proxy" slot="footer">
        <slot name="footer"></slot>
      </div>
    </ic-dialog>`;
  }
}

customElements.define("ic-app-dialog", AppDialog);
