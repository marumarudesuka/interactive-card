import { LitElement, css, html } from "lit";

import "./app-dialog";
import "./button";
import "./dialog-footer";

export class ConfirmDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    title: { type: String },
    message: { type: String },
    confirmLabel: { type: String, attribute: "confirm-label" },
  };

  open = false;
  title = "Confirm";
  message = "";
  confirmLabel = "Confirm";

  static styles = css`
    :host { display: contents; }
    ic-app-dialog { --app-dialog-width: 440px; }
    .message {
      box-sizing: border-box;
      padding: var(--ic-dialog-padding, 24px 32px);
      color: var(--en-text-secondary, var(--secondary-text-color));
      font-size: var(--en-body-size, 14px);
      line-height: 1.4;
    }
  `;

  private emit(name: "confirm-cancel" | "confirm-accept") {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <ic-app-dialog
        .open=${this.open}
        .title=${this.title}
        @dialog-close=${(event: Event) => {
          event.stopPropagation();
          this.emit("confirm-cancel");
        }}
      >
        <div class="message">${this.message}</div>
        <ic-dialog-footer slot="footer">
          <ic-button @click=${() => this.emit("confirm-cancel")}>Cancel</ic-button>
          <ic-button variant="destructive" @click=${() => this.emit("confirm-accept")}>
            ${this.confirmLabel}
          </ic-button>
        </ic-dialog-footer>
      </ic-app-dialog>
    `;
  }
}

customElements.define("ic-confirm-dialog", ConfirmDialog);
