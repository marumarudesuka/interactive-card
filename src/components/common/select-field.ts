import { LitElement, css, html } from "lit";
import "./menu-item";
import "./scroll-area";

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldChangeDetail {
  value: string;
}

export class IcSelectField extends LitElement {
  static properties = {
    value: { type:String },
    options: { attribute:false },
    disabled: { type:Boolean, reflect:true },
  };

  value = "";
  options: readonly SelectFieldOption[] = [];
  disabled = false;
  private open = false;

  private outsidePointer = (event: PointerEvent) => {
    if (this.open && !event.composedPath().includes(this)) this.close();
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("pointerdown", this.outsidePointer, true);
  }

  disconnectedCallback() {
    document.removeEventListener("pointerdown", this.outsidePointer, true);
    super.disconnectedCallback();
  }

  static styles = css`
    :host { position:relative; display:block; width:100%; min-width:0; }
    .field { position:relative; width:100%; min-width:0; }
    .trigger {
      display:flex; width:100%; height:var(--en-control-height,52px); min-width:0; box-sizing:border-box;
      align-items:center; justify-content:space-between; gap:8px;
      padding:0 var(--en-control-padding-inline,20px);
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-control-radius,999px);
      outline:none;
      background:var(--ic-control-background,var(--en-surface-control));
      backdrop-filter:var(--en-blur-control,none);
      -webkit-backdrop-filter:var(--en-blur-control,none);
      color:var(--en-text-primary,var(--primary-text-color));
      font:inherit; font-size:var(--en-control-font-size,16px); font-weight:var(--en-control-font-weight,400); text-align:left; cursor:pointer;
    }
    .trigger:hover { background:var(--ic-action-hover-background,var(--en-surface-control)); }
    .trigger:focus-visible {
      border-color:var(--en-color-primary);
      box-shadow:0 0 0 2px var(--en-color-primary-glow);
    }
    .value { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .trigger ha-icon {
      flex:0 0 16px; width:16px; height:16px; --mdc-icon-size:16px;
      color:var(--en-text-secondary,var(--secondary-text-color));
      opacity:.75;
      transition:transform var(--en-motion-fast,180ms) var(--en-easing-standard,ease);
    }
    .trigger[aria-expanded="true"] ha-icon { transform:rotate(180deg); }
    .options {
      position:absolute; z-index:30; top:calc(100% + 6px); left:0; right:0;
      max-height:192px; box-sizing:border-box; padding:5px;
      border:var(--ic-border-popover,var(--ic-popover-border,var(--en-border)));
      border-radius:var(--ic-radius-popover);
      background:var(
        --ic-select-dropdown-background,
        var(--ic-popover-background,var(--en-surface-floating))
      );
      box-shadow:var(--ic-shadow-popover,var(--en-shadow-floating));
      backdrop-filter:var(--ic-popover-blur,var(--en-blur-floating));
      -webkit-backdrop-filter:var(--ic-popover-blur,var(--en-blur-floating));
      color:var(--en-text-primary,var(--primary-text-color));
    }
    .options ic-menu-item { margin:1px 0; }
    :host([disabled]) { opacity:.55; }
    :host([disabled]) .trigger { cursor:default; }
  `;

  private close() {
    if (!this.open) return;
    this.open = false;
    this.requestUpdate();
  }

  private toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    this.requestUpdate();
  }

  private selectValue(value: string) {
    this.value = value;
    this.open = false;
    this.dispatchEvent(new CustomEvent<SelectFieldChangeDetail>("select-change", {
      detail:{ value },
      bubbles:true,
      composed:true,
    }));
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="field">
        <button class="trigger" type="button" ?disabled=${this.disabled}
          aria-haspopup="listbox" aria-expanded=${this.open}
          @click=${this.toggle}
          @keydown=${(event:KeyboardEvent) => {
            if (event.key === "Escape") this.close();
          }}>
          <span class="value">${
            this.options.find((option) => option.value === this.value)?.label ?? this.value
          }</span>
          <ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon>
        </button>
        ${this.open ? html`
          <ic-scroll-area class="options" role="listbox">
            ${this.options
              .filter((option) => option.value !== this.value)
              .map((option) => html`
              <ic-menu-item
                .selected=${false}
                indicator="none"
                .hideIndicator=${true}
                role="option"
                aria-selected="false"
                @click=${() => this.selectValue(option.value)}>
                ${option.label}
              </ic-menu-item>
            `)}
          </ic-scroll-area>
        ` : null}
      </div>
    `;
  }
}

customElements.define("ic-select-field", IcSelectField);
