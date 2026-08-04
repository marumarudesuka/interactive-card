import { LitElement, css, html } from "lit";
import type { FieldValueDetail } from "./field";
import "./field";

export interface IconChangeDetail {
  icon: string;
}

export class IconInput extends LitElement {
  static properties = {
    value: { type: String },
    label: { type: String },
  };

  value = "";
  label = "Icon";

  static styles = css`
    :host {
      display: block;
    }

    ha-icon {
      color: var(--primary-text-color);
      opacity: 0.72;
      --mdc-icon-size: 21px;
    }
  `;

  private updateValue(event: CustomEvent<FieldValueDetail>) {
    this.value = event.detail.value;
    this.dispatchEvent(new CustomEvent<IconChangeDetail>("icon-change", {
      detail: { icon: this.value.trim() },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <ic-field .label=${this.label} .value=${this.value} placeholder="mdi:flash"
        @field-input=${this.updateValue}>
        <ha-icon slot="trailing" .icon=${this.value.trim() || "mdi:shape-outline"}
          aria-hidden="true"></ha-icon>
      </ic-field>
    `;
  }
}

customElements.define("ic-icon-input", IconInput);
