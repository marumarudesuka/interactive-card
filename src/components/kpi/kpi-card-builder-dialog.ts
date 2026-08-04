import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";

import type { HomeAssistant } from "custom-card-helpers";
import {
  buildCustomKpiConfig,
  normalizeKpiCardDraft,
} from "../../config/kpi-card-draft";
import type { CustomKpiConfig } from "../../types/kpi";
import type {
  KpiCardDraft,
  KpiCardDraftValidation,
} from "../../types/kpi-card-builder";
import type { EntitySelectedDetail } from "../entity-selector";
import type { IconChangeDetail } from "../common/icon-input";
import type { SegmentedChangeDetail } from "../common/segmented-control";
import type { FieldValueDetail } from "../common/field";
import { dialogContentStyle } from "../../design-system/dialog";
import {
  formatEntityId,
} from "../../helpers/text-formatter";
import "../entity-selector";
import "../common/app-dialog";
import "../common/button";
import "../common/confirm-dialog";
import "../common/dialog-footer";
import "../common/segmented-control";
import "../common/icon-input";
import "../common/field";
import "../energy-kpi-card";

export interface KpiCardBuilderSubmitDetail {
  config: CustomKpiConfig;
  mode: "create" | "edit";
}

export class KpiCardBuilderDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    mode: { type: String },
    hass: { attribute: false },
    draft: { attribute: false },
    existingIds: { attribute: false },
    deleteConfirmOpen: { state: true },
  };

  open = false;
  mode: "create" | "edit" = "create";
  hass?: HomeAssistant;
  draft: KpiCardDraft = {};
  existingIds: string[] = [];
  private deleteConfirmOpen = false;

  private formDraft: KpiCardDraft = {};
  private validation: KpiCardDraftValidation = {
    valid: true,
    errors: {},
  };
  private showEntitySelector = false;

  static styles = [css`
    :host {
      display: contents;
      --en-label-font-weight: 400;
      container-type: inline-size;
    }

    ic-app-dialog {
      --app-dialog-width: 560px;
      --app-dialog-radius: var(--ic-radius-dialog);
      --app-dialog-body-padding: 0;
      width: min(100%, 100%);
      max-width: 100%;
      container-type: inline-size;
    }

    .form {
      display: grid;
      gap: 24px;
      padding: 8px 32px 32px;
      color: var(--en-text-primary, var(--primary-text-color));
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .section {
      display: grid;
      gap: 14px;
    }

    .section-title {
      color: var(--en-heading-primary, var(--primary-text-color));
      font-size: .78rem;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    label {
      display: grid;
      gap: 6px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      font-size: 0.82rem;
      color: var(--en-text-secondary, var(--secondary-text-color));
      box-sizing: border-box;
    }

    .appearance-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
      column-gap: 16px;
      row-gap: 14px;
      min-width: 0;
      width: 100%;
      max-width: 100%;
    }

    .appearance-grid > * {
      min-width: 0;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .checkbox {
      display: grid;
      grid-column: 1 / -1;
      gap: 8px;
    }

    .error {
      color: var(--error-color);
      font-size: 0.76rem;
    }

    button {
      min-height: 40px;
      padding: 8px 16px;
      border: var(--en-border-control, var(--en-border));
      border-radius: var(--ic-radius-button);
      background: var(--en-surface-control, transparent);
      color: var(--en-text-primary, var(--primary-text-color));
      cursor: pointer;
    }

    .selector {
      padding-top: 8px;
      border-top: 1px solid var(--divider-color);
    }

    .preview {
      display: grid;
      gap: 8px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .preview-label {
      color: var(--secondary-text-color);
      font-size: .75rem;
      font-weight: 600;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .preview energy-kpi-card {
      display: block;
      height: 160px;
      pointer-events: none;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    @container (max-width: 719px) {
      .form {
        padding: 8px 16px 20px;
      }

      .appearance-grid {
        grid-template-columns: 1fr;
        row-gap: 16px;
      }

      .preview energy-kpi-card {
        height: 126px;
      }
    }

    @media (max-width: 719px) {
      .form {
        padding: 8px 16px 20px;
      }

      .appearance-grid {
        grid-template-columns: 1fr;
        row-gap: 16px;
      }

      .preview energy-kpi-card {
        height: 126px;
      }
    }
  `, dialogContentStyle];

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (
      (changedProperties.has("open") && this.open) ||
      changedProperties.has("draft")
    ) {
      this.formDraft = { ...this.draft };
      this.validation = { valid: true, errors: {} };
      this.showEntitySelector = false;
      this.deleteConfirmOpen = false;
    }
  }

  private updateField(
    field: keyof KpiCardDraft,
    value: KpiCardDraft[keyof KpiCardDraft]
  ) {
    this.formDraft = {
      ...this.formDraft,
      [field]: value,
    };
    this.validation = { valid: true, errors: {} };
    this.requestUpdate();
  }

  private close() {
    this.deleteConfirmOpen = false;
    this.dispatchEvent(
      new CustomEvent("kpi-builder-close", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleEntitySelected(
    event: CustomEvent<EntitySelectedDetail>
  ) {
    event.stopPropagation();
    this.updateField("entity", event.detail.entityId);
    this.showEntitySelector = false;
  }

  private submit() {
    const currentId = normalizeKpiCardDraft(this.formDraft).id;
    const reservedIds =
      this.mode === "edit" && currentId
        ? this.existingIds.filter(
            (id) => id.toLowerCase() !== currentId.toLowerCase()
          )
        : this.existingIds;
    const result = buildCustomKpiConfig(this.formDraft, reservedIds);

    this.validation = result.validation;
    if (!result.valid) {
      this.requestUpdate();
      return;
    }

    this.dispatchEvent(
      new CustomEvent<KpiCardBuilderSubmitDetail>("kpi-builder-submit", {
        detail: {
          config: result.config,
          mode: this.mode,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private requestDeleteConfirmation() {
    if (this.mode !== "edit") return;
    this.deleteConfirmOpen = true;
  }

  private requestDelete() {
    const id = normalizeKpiCardDraft(this.formDraft).id;
    if (!id || this.mode !== "edit") return;
    this.deleteConfirmOpen = false;
    this.dispatchEvent(
      new CustomEvent("kpi-builder-delete", {
        detail: { id },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const normalized = normalizeKpiCardDraft(this.formDraft);
    const errors = this.validation.errors;

    return html`
      <ic-app-dialog
        .open=${this.open}
        .title=${this.mode === "edit" ? "Edit KPI Card" : "Create KPI Card"}
        @dialog-close=${(event: Event) => {
          event.stopPropagation();
          this.close();
        }}
      >
        <div class="form">
          <div class="section">
            <div class="section-title">Basic Information</div>
            <div>
              <ic-field label="Name" .value=${normalized.title}
                @field-input=${(event:CustomEvent<FieldValueDetail>) =>
                  this.updateField("title",event.detail.value)}></ic-field>
              ${errors.title
                ? html`<span class="error">${errors.title}</span>`
                : null}
            </div>

            <div>
              <ic-field label="Entity" variant="selectable"
                .value=${normalized.entity
                  ? formatEntityId(normalized.entity,"readonlyField")
                  : "Select an entity"}
                .rawValue=${normalized.entity || "Select an entity"}
                aria-expanded=${this.showEntitySelector}
                @field-activate=${() => {
                  this.showEntitySelector = !this.showEntitySelector;
                  this.requestUpdate();
                }}></ic-field>
              ${errors.entity
                ? html`<span class="error">${errors.entity}</span>`
                : null}
            </div>

            ${this.showEntitySelector
              ? html`
                  <div class="selector">
                    <ic-entity-selector
                      .hass=${this.hass}
                      .value=${normalized.entity}
                      .filter=${{ domains: ["sensor"] }}
                      @entity-selected=${this.handleEntitySelected}
                    ></ic-entity-selector>
                  </div>
                `
              : null}
          </div>

          <div class="section">
            <div class="section-title">Appearance</div>
            <div class="appearance-grid">
              <ic-icon-input
                .value=${normalized.icon ?? ""}
                @icon-change=${(event: CustomEvent<IconChangeDetail>) =>
                  this.updateField("icon", event.detail.icon)}
              ></ic-icon-input>

              <ic-field label="Unit" .value=${normalized.unit ?? ""}
                placeholder="Auto (entity unit)"
                @field-input=${(event:CustomEvent<FieldValueDetail>) =>
                  this.updateField("unit",event.detail.value)}></ic-field>

              <label>
                Decimals
                <ic-segmented-control width="full" label="Decimals"
                  .value=${String(normalized.decimals)}
                  .options=${[0,1,2,3,4].map((value) => ({ value:String(value), label:String(value) }))}
                  @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                    this.updateField("decimals", event.detail.value)}>
                </ic-segmented-control>
                ${errors.decimals
                  ? html`<span class="error">${errors.decimals}</span>`
                  : null}
              </label>

              <label>
                Automatic unit scaling
                <ic-segmented-control width="full" label="Automatic unit scaling"
                  .value=${normalized.autoScale ? "on" : "off"}
                  .options=${[{value:"off",label:"Off"},{value:"on",label:"On"}]}
                  @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                    this.updateField("autoScale", event.detail.value === "on")}>
                </ic-segmented-control>
              </label>

              <ic-field label="Subtitle" .value=${normalized.subtitle ?? ""}
                placeholder="Leave blank to hide the subtitle"
                @field-input=${(event:CustomEvent<FieldValueDetail>) =>
                  this.updateField("subtitle", event.detail.value)}></ic-field>

              <label>
                Subtitle Behavior
                <ic-segmented-control width="full" label="Subtitle behavior"
                  .value=${normalized.trendMode ?? "none"}
                  .options=${[
                    { value: "none", label: "Hide" },
                    { value: "vs_yesterday", label: "Yesterday" },
                    { value: "vs_last_period", label: "Last period" },
                  ]}
                  @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                    this.updateField("trendMode", event.detail.value as "none" | "vs_yesterday" | "vs_last_period")}>
                </ic-segmented-control>
              </label>
            </div>
          </div>

          <div class="section preview">
            <div class="section-title">Preview</div>
            <energy-kpi-card
              .config=${{
                ...normalized,
                type: "custom",
                title: normalized.title || "Custom KPI",
                icon: normalized.icon || "mdi:flash",
              }}
              .hass=${this.hass}
              .previewMode=${true}
            ></energy-kpi-card>
          </div>
        </div>

        <ic-dialog-footer slot="footer">
          ${this.mode === "edit"
            ? html`
                <ic-button slot="leading" variant="destructive" @click=${this.requestDeleteConfirmation}>
                  Delete
                </ic-button>
              `
            : null}
          <ic-button @click=${this.close}>Cancel</ic-button>
          <ic-button variant="primary" @click=${this.submit}>
            ${this.mode === "edit" ? "Save" : "Add Card"}
          </ic-button>
        </ic-dialog-footer>
      </ic-app-dialog>
      <ic-confirm-dialog
        .open=${this.deleteConfirmOpen}
        title="Delete KPI Card?"
        message="This card will be removed from the dashboard."
        confirm-label="Delete"
        @confirm-cancel=${() => { this.deleteConfirmOpen = false; }}
        @confirm-accept=${this.requestDelete}
      ></ic-confirm-dialog>
    `;
  }
}

customElements.define(
  "ic-kpi-card-builder-dialog",
  KpiCardBuilderDialog
);
