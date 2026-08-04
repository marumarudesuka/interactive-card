import { LitElement, css, html } from "lit";

import type { HomeAssistant } from "custom-card-helpers";
import type { EntitySelectorFilter } from "../../config/config.types";
import type { EntitySelectedDetail } from "../entity-selector";
import type { SegmentedChangeDetail } from "./segmented-control";
import { dialogContentStyle } from "../../design-system/dialog";
import { formatEntityId } from "../../helpers/text-formatter";
import "../entity-selector";
import "./app-dialog";
import "./button";
import "./confirm-dialog";
import "./dialog-footer";
import "./field";
import "./segmented-control";

export class CardSettingsDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    title: { type: String },
    hass: { attribute: false },
    entity: { type: String },
    entityFilter: { attribute: false },
    error: { type: String },
    subtitle: { type: String },
    trendMode: { type: String, attribute: "trend-mode" },
    cardId: { type: String, attribute: "card-id" },
    canDelete: { type: Boolean, attribute: "can-delete" },
    deleteConfirmOpen: { state: true },
    entitySelectorOpen: { state: true },
  };

  open = false;
  title = "Card Settings";
  hass?: HomeAssistant;
  entity = "";
  error = "";
  subtitle = "";
  trendMode = "none";
  cardId = "";
  canDelete = false;
  private deleteConfirmOpen = false;
  private entitySelectorOpen = false;
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
      gap: 14px;
      padding: 8px 0 0;
    }

    .section {
      display: grid;
      gap: 8px;
    }

    .section-label {
      color: var(--en-heading-primary, var(--primary-text-color));
      font-size: 13px;
      font-weight: 700;
    }

    .field {
      display: grid;
      gap: 6px;
    }

    .field input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid var(--en-border-default, rgba(255,255,255,.16));
      border-radius: var(--ic-radius-control);
      background: var(--en-surface-raised, rgba(255,255,255,.04));
      color: var(--primary-text-color);
      font: inherit;
    }

    .field input:focus {
      outline: 2px solid color-mix(in srgb, var(--primary-color, #5bb7ff) 55%, transparent);
      outline-offset: 1px;
    }

    ic-segmented-control {
      --segment-font-size: 12px;
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

    .selector-panel {
      min-width: 0;
    }
  `, dialogContentStyle];

  private close() {
    this.deleteConfirmOpen = false;
    this.entitySelectorOpen = false;
    this.dispatchEvent(
      new CustomEvent("settings-close", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleEntitySelected(event: CustomEvent<EntitySelectedDetail>) {
    event.stopPropagation();
    this.entitySelectorOpen = false;
    this.dispatchEvent(
      new CustomEvent<EntitySelectedDetail>("entity-selected", {
        detail: event.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleSettingsSave() {
    this.dispatchEvent(
      new CustomEvent("settings-save", {
        detail: {
          subtitle: this.subtitle,
          trendMode: this.trendMode,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleTrendModeChange(event: CustomEvent<SegmentedChangeDetail>) {
    this.trendMode = event.detail.value;
  }

  private requestDelete() {
    if (!this.canDelete || !this.cardId) return;
    this.deleteConfirmOpen = true;
  }

  private confirmDelete() {
    if (!this.canDelete || !this.cardId) return;
    this.deleteConfirmOpen = false;
    this.dispatchEvent(new CustomEvent("settings-delete", {
      detail: { id: this.cardId },
      bubbles: true,
      composed: true,
    }));
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
            <ic-field
              label="Current Entity"
              variant="selectable"
              .value=${this.entity
                ? formatEntityId(this.entity, "readonlyField")
                : "Select an entity"}
              .rawValue=${this.entity || "Select an entity"}
              aria-expanded=${this.entitySelectorOpen}
              @field-activate=${() => {
                this.entitySelectorOpen = !this.entitySelectorOpen;
              }}
            ></ic-field>
            ${this.entitySelectorOpen
              ? html`
                  <div class="selector-panel">
                    <ic-entity-selector
                      variant="inline"
                      .hass=${this.hass}
                      .value=${this.entity}
                      .filter=${this.entityFilter}
                      @entity-selected=${this.handleEntitySelected}
                    ></ic-entity-selector>
                  </div>
                `
              : null}
          </div>

          <div class="section">
            <div class="section-label">Subtitle</div>
            <div class="field">
              <input
                type="text"
                placeholder="Leave blank to hide the subtitle"
                .value=${this.subtitle}
                @input=${(event: Event) => {
                  this.subtitle = (event.target as HTMLInputElement).value;
                }}
              />
            </div>
          </div>

          <div class="section">
            <div class="section-label">Subtitle behavior</div>
            <div class="field">
              <ic-segmented-control
                width="full"
                label="Subtitle behavior"
                .options=${[
                  { value: "none", label: "Hide" },
                  { value: "vs_yesterday", label: "Yesterday" },
                  { value: "vs_last_period", label: "Last period" },
                ]}
                .value=${this.trendMode}
                @segmented-change=${this.handleTrendModeChange}
              ></ic-segmented-control>
            </div>
          </div>

        </div>
        <ic-dialog-footer slot="footer">
          ${this.canDelete
            ? html`<ic-button slot="leading" variant="destructive" @click=${this.requestDelete}>
                Delete
              </ic-button>`
            : null}
          <ic-button @click=${this.close}>Cancel</ic-button>
          <ic-button variant="primary" @click=${this.handleSettingsSave}>Save</ic-button>
        </ic-dialog-footer>
      </ic-app-dialog>
      <ic-confirm-dialog
        .open=${this.deleteConfirmOpen}
        title="Delete KPI Card?"
        message="This card will be removed from the dashboard."
        confirm-label="Delete"
        @confirm-cancel=${() => { this.deleteConfirmOpen = false; }}
        @confirm-accept=${this.confirmDelete}
      ></ic-confirm-dialog>
    `;
  }
}

customElements.define("ic-card-settings-dialog", CardSettingsDialog);
