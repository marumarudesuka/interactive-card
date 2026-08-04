import { LitElement, css, html } from "lit";
import type { FieldValueDetail } from "./field";
import "./field";

export class IcSearchField extends LitElement {
  static properties = { value:{type:String}, placeholder:{type:String}, variant:{type:String} };
  value="";
  placeholder="Search...";
  variant:"editable"|"compact"="editable";
  static styles=css`:host{display:block;min-width:0} ha-icon{width:16px;height:16px;--mdc-icon-size:16px;color:var(--en-text-secondary,var(--secondary-text-color));opacity:.7}`;
  focusInput() {
    const field = this.renderRoot.querySelector("ic-field");
    field?.shadowRoot?.querySelector<HTMLInputElement>("input")?.focus();
  }
  render(){return html`<ic-field type="search" .variant=${this.variant} .value=${this.value} .placeholder=${this.placeholder} @field-input=${(event:CustomEvent<FieldValueDetail>)=>{this.value=event.detail.value;this.dispatchEvent(new CustomEvent("search-input",{detail:event.detail,bubbles:true,composed:true}));}}><ha-icon slot="leading" icon="mdi:magnify"></ha-icon></ic-field>`;}
}
customElements.define("ic-search-field",IcSearchField);
