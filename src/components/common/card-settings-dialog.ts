import { LitElement, css, html } from "lit";

import type { HomeAssistant } from "custom-card-helpers";
import type { EntitySelectorFilter } from "../../config/config.types";
import type { EntitySelectedDetail } from "../entity-selector";
import { dialogContentStyle } from "../../design-system/dialog";
import "../entity-selector";
import "./app-dialog";

export class CardSettingsDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    title: { type: String },
    hass: { attribute: false },
    entity: { type: String },
    entityFilter: { attribute: false },
    error: { type: String },
  };

  open = false;
  title = "Card Settings";
  hass?: HomeAssistant;
  entity = "";
  error = "";
  entityFilter: EntitySelectorFilter = {
    domains: ["sensor", "number", "input_number"],
  };

  static styles = [css`
    :host {
      display: contents;
    }

    ic-app-dialog {
      --app-dialog-width: 520px;
      --app-dialog-body-padding: 0;
      --dialog-overflow-x: hidden;
      --dialog-overflow-y: auto;
    }

    .content {
      display:grid;
    }

    .error {
      margin: 0 0 10px;
      padding: 9px 11px;
      border: 1px solid color-mix(
        in srgb,
        var(--error-color, #ff3b30) 35%,
        transparent
      );
      border-radius: var(--ic-radius-control);
      background: color-mix(
        in srgb,
        var(--error-color, #ff3b30) 12%,
        transparent
      );
      color: var(--error-color, #ff3b30);
      font-size: 13px;
    }
  `, dialogContentStyle];

  private close() {
    this.dispatchEvent(
      new CustomEvent("settings-close", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleEntitySelected(event: CustomEvent<EntitySelectedDetail>) {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<EntitySelectedDetail>("entity-selected", {
        detail: event.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <ic-app-dialog
        .open=${this.open}
        .title=${this.title}
        @dialog-close=${(event: Event) => {
          event.stopPropagation();
          this.close();
        }}
      >
        <div class="content">
          ${this.error
            ? html`<div class="error" role="alert">${this.error}</div>`
            : null}
          <div class="selector">
            <ic-entity-selector
              .hass=${this.hass}
              .value=${this.entity}
              .filter=${this.entityFilter}
              @entity-selected=${this.handleEntitySelected}
            ></ic-entity-selector>
          </div>
        </div>
        <slot name="footer" slot="footer"></slot>
      </ic-app-dialog>
    `;
  }
}

customElements.define("ic-card-settings-dialog", CardSettingsDialog);
