import { LitElement, css, html } from "lit";

/** Shared two-sided footer used by application dialogs. */
export class DialogFooter extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-width: 100%;
      max-width: 100%;
      align-self: stretch;
      box-sizing: border-box;
    }

    .footer {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      gap: var(--ic-dialog-footer-gap, 12px);
      padding: var(--ic-dialog-footer-padding, 24px 32px);
    }

    @media (max-width: 719px) {
      .footer {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 16px;
      }

      .leading,
      .actions {
        width: 100%;
      }

      .actions {
        justify-content: flex-end;
        flex-wrap: wrap;
      }
    }

    .leading,
    .actions {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: var(--ic-dialog-footer-gap, 12px);
    }

    .leading {
      justify-self: start;
    }

    .actions {
      justify-content: flex-end;
      justify-self: end;
    }

    .leading:empty {
      display: none;
    }

    ::slotted(ic-button) {
      min-width: 88px;
      --ic-button-width: 100%;
    }
  `;

  render() {
    return html`
      <div class="footer">
        <div class="leading"><slot name="leading"></slot></div>
        <div class="actions"><slot></slot></div>
      </div>
    `;
  }
}

customElements.define("ic-dialog-footer", DialogFooter);
