import { LitElement, css, html } from "lit";
import {
  cardThemeOptions,
  type CardTheme,
} from "../../theme/card-theme";
import {
  getCardTheme,
  setCardTheme,
} from "../../theme/theme-provider";
import "./overlay/popover/ic-popover";

export class CardAppearanceModal extends LitElement {
  static properties = { open: { type: Boolean } };
  open = false;

  static styles = css`
    :host { display:inline-flex; }
    ic-popover { --popover-min-width:250px; }
    .options { display:grid; gap:4px; }
    button {
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:11px 12px;
      border:1px solid transparent;
      border-radius:var(--ic-radius-control);
      background:transparent;
      color:var(--primary-text-color);
      cursor:pointer;
      font:inherit;
    }
    button.selected {
      border-color:var(--en-color-primary-border);
      background:var(--en-color-primary-soft);
    }
    .check { color:var(--en-color-primary); }
  `;

  private close() {
    this.dispatchEvent(new CustomEvent("appearance-close", {
      bubbles: true,
      composed: true,
    }));
  }

  private select(theme: CardTheme) {
    setCardTheme(theme);
    this.close();
  }

  render() {
    const selected = getCardTheme();
    return html`<ic-popover
      .open=${this.open}
      align="end"
      @popover-close=${this.close}
    >
      <slot name="anchor" slot="anchor"></slot>
      <div class="options">${cardThemeOptions.map((option) => html`
      <button
        class=${option.value === selected ? "selected" : ""}
        type="button"
        @click=${() => this.select(option.value)}
      >
        <span>${option.label}</span>
        ${option.value === selected
          ? html`<ha-icon class="check" icon="mdi:check"></ha-icon>`
          : null}
      </button>
    `)}</div>
    </ic-popover>`;
  }
}
customElements.define("ic-card-appearance-modal", CardAppearanceModal);
