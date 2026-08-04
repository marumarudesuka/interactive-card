import { LitElement, css, html } from "lit";
import "./common/menu-item";

export class KpiItem extends LitElement {
  static properties = {
    item: { attribute: false },
    selected: { type: Boolean },
    leadingIcon: { type: String, attribute: "leading-icon" },
  };

  item: any;
  selected = false;
  leadingIcon?: string;

  static styles = css`
    :host { display:block; }
    ::slotted([slot="action"]) {
      align-self:center;
      justify-self:end;
    }
  `;

  private onClick() {
    this.dispatchEvent(
      new CustomEvent("kpi-click", {
        detail: this.item,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.item) return html``;

    const indicator = this.leadingIcon?.includes("plus")
      ? "plus"
      : this.leadingIcon?.includes("check") || this.selected
        ? "check"
        : "plus";
    return html`
      <ic-menu-item
        .selected=${this.selected}
        .indicator=${indicator}
        @click=${this.onClick}
      >
        ${this.item.title}
        <slot name="action" slot="trailing"></slot>
      </ic-menu-item>
    `;
  }
}

customElements.define("kpi-item", KpiItem);
