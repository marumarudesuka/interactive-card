import { LitElement, css, html } from "lit";

export interface FieldValueDetail { value:string; }

export class IcField extends LitElement {
  static properties = {
    label:{ type:String }, value:{ type:String }, rawValue:{ type:String, attribute:"raw-value" }, placeholder:{ type:String },
    type:{ type:String }, variant:{ type:String, reflect:true },
    disabled:{ type:Boolean, reflect:true }, invalid:{ type:Boolean, reflect:true },
  };

  label = "";
  value = "";
  rawValue = "";
  placeholder = "";
  type = "text";
  variant:"editable"|"readonly"|"selectable"|"compact" = "editable";
  disabled = false;
  invalid = false;

  static styles = css`
    :host { display:grid; min-width:0; gap:8px; }
    .label { color:var(--en-heading-primary,var(--primary-text-color)); font-size:var(--en-label-font-size,14px); font-weight:var(--en-label-font-weight,600); line-height:1.3; }
    .control {
      display:flex; width:100%; min-width:0;
      height:var(--en-control-height,52px); min-height:var(--en-control-height,52px); max-height:var(--en-control-height,52px);
      box-sizing:border-box; align-items:center; gap:var(--en-control-gap,8px);
      padding:0 var(--en-control-padding-inline,20px);
      border:var(--ic-border-control,var(--en-border)); border-radius:var(--en-control-radius,999px);
      outline:0; background:var(--ic-control-background,var(--en-surface-control));
      color:var(--en-text-primary,var(--primary-text-color)); backdrop-filter:var(--en-blur-control,none);
      font:inherit; font-size:var(--en-control-font-size,16px); font-weight:var(--en-control-font-weight,400); line-height:1.2;
      transition:border-color var(--en-motion-fast,150ms),background var(--en-motion-fast,150ms);
    }
    input { flex:1 1 auto; width:100%; min-width:0; height:100%; padding:0; border:0; outline:0; background:transparent; color:inherit; font:inherit; line-height:inherit; }
    input::placeholder { color:var(--en-text-secondary,var(--secondary-text-color)); opacity:.7; font-weight:var(--en-helper-font-weight,400); }
    input[type="number"] { appearance:textfield; -moz-appearance:textfield; }
    input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { margin:0; -webkit-appearance:none; }
    .value { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .copy { display:grid; flex:1 1 auto; min-width:0; gap:2px; }
    .copy .value { width:100%; }
    .control:hover { border-color:var(--ic-field-hover-border,var(--en-color-primary-border)); }
    .control:focus-within, .control:focus-visible { outline:var(--ic-focus-ring,2px solid var(--en-color-focus)); outline-offset:2px; }
    :host([variant="selectable"]) .control { cursor:pointer; text-align:left; }
    :host([variant="compact"]) .control { height:var(--en-control-height-compact,38px); min-height:var(--en-control-height-compact,38px); max-height:var(--en-control-height-compact,38px); padding-inline:var(--en-control-padding-inline-compact,14px); }
    :host([invalid]) .control { border-color:var(--error-color,#ff3b30); }
    :host([disabled]) { opacity:.5; }
    ::slotted(*) { min-width:0; }
    ::slotted([slot="secondary"]) { overflow:hidden; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-font-size,13px); font-weight:var(--en-helper-font-weight,400); text-overflow:ellipsis; white-space:nowrap; }
  `;

  private emit(name:string, value:string) {
    this.value = value;
    this.dispatchEvent(new CustomEvent<FieldValueDetail>(name, { detail:{value}, bubbles:true, composed:true }));
  }

  render() {
    const content = this.variant === "editable" || this.variant === "compact"
      ? html`<div class="control"><slot name="leading"></slot><input .type=${this.type} .value=${this.value} placeholder=${this.placeholder} ?disabled=${this.disabled} aria-invalid=${this.invalid} @input=${(e:InputEvent)=>this.emit("field-input",(e.target as HTMLInputElement).value)} @change=${(e:Event)=>this.emit("field-change",(e.target as HTMLInputElement).value)} /><slot name="trailing"></slot></div>`
      : this.variant === "selectable"
        ? html`<button class="control" type="button" ?disabled=${this.disabled} aria-label=${this.rawValue || this.value} @click=${()=>this.dispatchEvent(new CustomEvent("field-activate",{bubbles:true,composed:true}))}><slot name="leading"></slot><span class="copy"><span class="value" title=${this.rawValue || this.value}>${this.value || this.placeholder}</span><slot name="secondary"></slot></span><slot name="trailing"></slot></button>`
        : html`<div class="control" role="textbox" aria-readonly="true" aria-label=${this.rawValue || this.value}><slot name="leading"></slot><span class="copy"><span class="value" title=${this.rawValue || this.value}>${this.value || this.placeholder}</span><slot name="secondary"></slot></span><slot name="trailing"></slot></div>`;
    return html`${this.label ? html`<span class="label">${this.label}</span>` : null}${content}`;
  }
}
customElements.define("ic-field",IcField);
