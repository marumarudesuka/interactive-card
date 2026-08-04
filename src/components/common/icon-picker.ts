import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import "./inline-picker-panel";
import "./scroll-area";
import "./search-field";

export interface IconPickerChangeDetail { icon:string; }

const commonIcons = [
  "mdi:stove",
  "mdi:air-conditioner",
  "mdi:water-boiler",
  "mdi:fridge",
  "mdi:washing-machine",
  "mdi:power-plug",
  "mdi:flash",
] as const;

/** Inline icon search page. It never creates a dialog or overlay. */
export class IconPicker extends LitElement {
  static properties = {
    value:{ type:String },
    hass:{ attribute:false },
  };

  value = "";
  hass?:HomeAssistant;
  private search = "";

  static styles = css`
    :host {
      display:block;
      width:100%;
      min-width:0;
    }
    .list { min-height:0; padding-right:6px; }
    .grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(88px,1fr));
      gap:6px;
      padding-bottom:12px;
    }
    .icon-option {
      display:grid;
      min-width:0;
      height:56px;
      box-sizing:border-box;
      place-items:center;
      gap:3px;
      padding:6px;
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--ic-radius-control);
      background:var(--ic-control-background,var(--en-surface-control));
      color:var(--en-text-primary,var(--primary-text-color));
      cursor:pointer;
      font:inherit;
    }
    .icon-option:hover {
      background:var(--ic-action-hover-background,rgba(127,127,127,.14));
    }
    .icon-option.selected {
      border:var(--en-selection-border,var(--ic-border-control,var(--en-border)));
      background:var(--en-selection-surface,var(--ic-control-background));
    }
    .icon-option:focus-visible {
      outline:var(--ic-focus-ring,2px solid var(--en-color-focus));
      outline-offset:2px;
    }
    .icon-option ha-icon {
      width:22px;
      height:22px;
      --mdc-icon-size:22px;
    }
    .icon-name {
      width:100%;
      min-width:0;
      overflow:hidden;
      color:var(--en-text-secondary,var(--secondary-text-color));
      font-size:11px;
      line-height:1;
      text-align:center;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .empty {
      padding:12px;
      color:var(--en-text-secondary,var(--secondary-text-color));
      font-size:13px;
    }
  `;

  private get icons(): string[] {
    const query = this.search.trim().toLowerCase();
    if (!query) return [...commonIcons];

    const normalized = query.startsWith("mdi:")
      ? query
      : `mdi:${query.replace(/\s+/g, "-")}`;
    return Array.from(new Set([
      normalized,
      ...commonIcons.filter((icon) => icon.includes(query)),
    ]));
  }

  private select(icon:string) {
    this.value = icon;
    this.dispatchEvent(new CustomEvent<IconPickerChangeDetail>("icon-change", {
      detail:{ icon },
      bubbles:true,
      composed:true,
    }));
  }

  render() {
    const icons = this.icons;
    return html`
      <ic-inline-picker-panel open .maxHeight=${260}>
        <ic-search-field slot="search"
          .value=${this.search}
          placeholder="Search icons..."
          variant="compact"
          @search-input=${(event:CustomEvent<{value:string}>) => {
            this.search = event.detail.value;
            this.requestUpdate();
          }}
        ></ic-search-field>
        <ic-scroll-area slot="content" class="list">
          <div class="grid">
            ${icons.length ? icons.map((icon) => html`
              <button class="icon-option ${icon === this.value ? "selected" : ""}"
                type="button" title=${icon} aria-pressed=${icon === this.value}
                @click=${() => this.select(icon)}>
                <ha-icon .icon=${icon}></ha-icon>
                <span class="icon-name">${icon}</span>
              </button>
            `) : html`<div class="empty">No matching icons</div>`}
          </div>
        </ic-scroll-area>
      </ic-inline-picker-panel>
    `;
  }
}

customElements.define("ic-icon-picker",IconPicker);
