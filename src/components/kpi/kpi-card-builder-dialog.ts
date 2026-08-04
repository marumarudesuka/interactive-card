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
  };

  open = false;
  mode: "create" | "edit" = "create";
  hass?: HomeAssistant;
  draft: KpiCardDraft = {};
  existingIds: string[] = [];

  private formDraft: KpiCardDraft = {};
  private validation: KpiCardDraftValidation = {
    valid: true,
    errors: {},
  };
  private showEntitySelector = false;

  static styles = [css`
    :host {
      display: contents;
    }

    ic-app-dialog {
      --app-dialog-width: 560px;
      --app-dialog-radius: var(--ic-radius-dialog);
      --app-dialog-body-padding: 0;
    }

    .form {
      display: grid;
      gap: 24px;
      padding: 8px 32px 32px;
      color: var(--en-text-primary, var(--primary-text-color));
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
      font-size: 0.82rem;
      color: var(--en-text-secondary, var(--secondary-text-color));
    }

    .row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
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

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
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
    }

    .delete {
      margin-right: auto;
      color: var(--error-color);
    }

    .footer {
      width: 100%;
      box-sizing: border-box;
      padding: 16px 32px 24px;
    }

    @media (max-width: 520px) {
      .row {
        grid-template-columns: 1fr;
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

  private requestDelete() {
    const id = normalizeKpiCardDraft(this.formDraft).id;
    if (!id || this.mode !== "edit") return;
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
            <div class="row">
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
                <ic-segmented-control width="fit" label="Decimals"
                  .value=${String(normalized.decimals)}
                  .options=${[0,1,2,3,4,5,6].map((value) => ({ value:String(value), label:String(value) }))}
                  @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                    this.updateField("decimals", event.detail.value)}>
                </ic-segmented-control>
                ${errors.decimals
                  ? html`<span class="error">${errors.decimals}</span>`
                  : null}
              </label>

              <label class="checkbox">
                Automatic unit scaling
                <ic-segmented-control width="fit" label="Automatic unit scaling"
                  .value=${normalized.autoScale ? "on" : "off"}
                  .options=${[{value:"off",label:"Off"},{value:"on",label:"On"}]}
                  @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                    this.updateField("autoScale", event.detail.value === "on")}>
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

        <div class="footer" slot="footer">
          ${this.mode === "edit"
            ? html`
                <ic-button variant="destructive" @click=${this.requestDelete}>
                  Delete
                </ic-button>
              `
            : null}
          <ic-button @click=${this.close}>Cancel</ic-button>
          <ic-button variant="primary" @click=${this.submit}>
            ${this.mode === "edit" ? "Save" : "Create"}
          </ic-button>
        </div>
      </ic-app-dialog>
    `;
  }
}

customElements.define(
  "ic-kpi-card-builder-dialog",
  KpiCardBuilderDialog
);
