import { LitElement, css, html, type PropertyValues } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import type { EntitySelectedDetail } from "../entity-selector";
import type { IconPickerChangeDetail } from "../common/icon-picker";
import type { DialogCloseDetail } from "../common/app-dialog";
import type { CircuitConfig } from "../../types/circuit";
import { resolveCircuit } from "../../helpers/circuit-utils";
import { isRealTimePowerEntity } from "../../helpers/power-entity";
import { dialogContentStyle } from "../../design-system/dialog";
import {
  formatEntityId,
} from "../../helpers/text-formatter";
import "../common/app-dialog";
import "../common/button";
import "../common/info-panel";
import "../common/icon-picker";
import "../common/field";
import "../entity-selector";
import type { FieldValueDetail } from "../common/field";

export interface CircuitConfigChangedDetail {
  circuit: CircuitConfig;
  complete?: () => void;
  fail?: () => void;
}

export interface CircuitDeleteRequestDetail {
  circuitId: string;
  complete?: () => void;
  fail?: () => void;
}

export class CircuitSettingsModal extends LitElement {
  static properties = {
    open: { type: Boolean },
    hass: { attribute: false },
    circuit: { attribute: false },
    mode: { type: String },
  };

  open = false;
  hass?: HomeAssistant;
  circuit?: CircuitConfig;
  mode: "create" | "edit" = "edit";
  private draft?: CircuitConfig;
  private entityPickerExpanded = false;
  private iconPickerExpanded = false;
  private saving = false;
  private deleting = false;

  static styles = [css`
    :host {
      display: contents;
    }

    ic-app-dialog {
      --app-dialog-width: 500px;
    }

    .form {
      display: grid;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .entity-state { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-font-size,13px); white-space:nowrap; }

    button {
      padding: 9px 12px;
      border:var(--ic-border-control,var(--en-border));
      border-radius: var(--ic-radius-button);
      background:var(--ic-action-background,var(--en-surface-control));
      color:var(--en-text-primary,var(--primary-text-color));
      cursor: pointer;
    }

    .actions { justify-content:flex-end; padding-top:4px; }
    .delete-action { margin-inline-end:auto; }
    .inline-field-group { display:grid; min-width:0; }
    .entity-error {
      margin: 6px 0 0;
      color: var(--error-color, #ff3b30);
      font-size: var(--en-helper-font-size, 13px);
      font-weight: 400;
      line-height: 1.3;
    }
  `, dialogContentStyle];

  protected willUpdate(changed:PropertyValues<this>) {
    if (this.circuit && (
      (changed.has("open") && this.open) ||
      !this.draft || this.draft.id !== this.circuit.id
    )) {
      this.draft = { ...this.circuit };
      this.entityPickerExpanded = false;
      this.iconPickerExpanded = false;
      this.saving = false;
      this.deleting = false;
    }
  }

  private close() {
    this.draft = this.circuit ? { ...this.circuit } : undefined;
    this.entityPickerExpanded = false;
    this.iconPickerExpanded = false;
    this.saving = false;
    this.deleting = false;
    this.dispatchEvent(new CustomEvent("circuit-settings-close", {
      bubbles: true,
      composed: true,
    }));
  }

  private updateField(
    field: "name" | "entity" | "icon" | "category",
    value: string
  ) {
    if (!this.draft) return;
    this.draft = { ...this.draft, [field]: value };
    this.requestUpdate();
  }

  private selectEntity(event: CustomEvent<EntitySelectedDetail>) {
    event.stopPropagation();
    this.updateField("entity", event.detail.entityId);
    this.entityPickerExpanded = false;
  }

  private selectIcon(event: CustomEvent<IconPickerChangeDetail>) {
    event.stopPropagation();
    this.updateField("icon", event.detail.icon);
    this.iconPickerExpanded = false;
  }

  private handleDialogClose(event: CustomEvent<DialogCloseDetail>) {
    event.stopPropagation();
    if (event.detail.reason === "escape" && this.entityPickerExpanded) {
      this.entityPickerExpanded = false;
      this.requestUpdate();
      return;
    }
    if (event.detail.reason === "escape" && this.iconPickerExpanded) {
      this.iconPickerExpanded = false;
      this.requestUpdate();
      return;
    }
    this.close();
  }

  private renderEntityTrigger() {
    const entityId = this.draft?.entity.trim() ?? "";
    const state = entityId ? this.hass?.states[entityId] : undefined;
    const friendlyName = String(
      state?.attributes.friendly_name ?? (entityId || "Select a sensor")
    );
    const unit = String(state?.attributes.unit_of_measurement ?? "");
    const stateValue = state
      ? `${state.state}${unit ? ` ${unit}` : ""}`
      : "--";

    const validationMessage = this.entityValidationMessage;

    return html`<div class="inline-field-group entity-field-group"
      @click=${(event:Event) => event.stopPropagation()}>
      <ic-field label="Sensor" variant="selectable" .value=${friendlyName}
        .invalid=${Boolean(validationMessage)}
        aria-expanded=${this.entityPickerExpanded}
        @field-activate=${() => {
          this.entityPickerExpanded = !this.entityPickerExpanded;
          this.iconPickerExpanded = false;
          this.requestUpdate();
        }}
      >
        <span slot="secondary" title=${entityId || "No entity selected"}>
          ${entityId
            ? formatEntityId(entityId,"readonlyField")
            : "No entity selected"}
        </span>
        <span slot="trailing" class="entity-state">${stateValue}</span>
      </ic-field>
      ${this.entityPickerExpanded ? html`
        <ic-entity-selector
          variant="inline"
          .hass=${this.hass}
          .value=${this.draft?.entity ?? ""}
          .filter=${{
            domains:["sensor"],
            predicate:(entityId:string) => isRealTimePowerEntity(
              entityId,
              this.hass?.states[entityId]
            ),
          }}
          .preferredDeviceClasses=${["power"]}
          .preferredUnits=${["W", "kW", "MW"]}
          @entity-selected=${this.selectEntity}
        ></ic-entity-selector>
      ` : null}
      ${validationMessage
        ? html`<div class="entity-error" role="alert">${validationMessage}</div>`
        : null}
    </div>`;
  }

  private get entityValidationMessage(): string {
    const entityId = this.draft?.entity.trim() ?? "";
    if (!entityId) return "";
    return isRealTimePowerEntity(entityId, this.hass?.states[entityId])
      ? ""
      : "This entity is not a real-time power sensor. Select a sensor using W, kW, or MW.";
  }

  private get hasValidPowerEntity(): boolean {
    const entityId = this.draft?.entity.trim() ?? "";
    return Boolean(entityId) && isRealTimePowerEntity(
      entityId,
      this.hass?.states[entityId]
    );
  }

  private get canSave(): boolean {
    if (!this.draft || this.saving || this.deleting) return false;
    const name = this.draft.name.trim();
    const entity = this.draft.entity.trim();
    if (!name || !entity || !this.hasValidPowerEntity) return false;
    if (!this.circuit) return true;
    return name !== this.circuit.name.trim() ||
      entity !== this.circuit.entity.trim() ||
      (this.draft.icon?.trim() || "") !== (this.circuit.icon?.trim() || "");
  }

  private renderEntityStatus() {
    const entityId = this.draft?.entity.trim() ?? "";
    const state = entityId ? this.hass?.states[entityId] : undefined;
    const rawState = state?.state ?? "";
    const status = !entityId
      ? "Unknown"
      : !state
        ? "Disabled"
        : rawState === "unavailable"
          ? "Unavailable"
          : rawState === "unknown"
            ? "Unknown"
            : "Online";
    const unit = String(state?.attributes.unit_of_measurement ?? "");
    const currentState = status === "Online"
      ? (() => {
          if (!this.draft) return `${rawState}${unit ? ` ${unit}` : ""}`;
          const resolved = resolveCircuit(this.hass, this.draft);
          return `${resolved.value}${resolved.unit ? ` ${resolved.unit}` : ""}`;
        })()
      : "--";
    const updatedAt = Date.parse(state?.last_updated ?? state?.last_changed ?? "");
    const elapsedSeconds = Number.isFinite(updatedAt)
      ? Math.max(0, Math.floor((Date.now() - updatedAt) / 1000))
      : undefined;
    const lastUpdated = elapsedSeconds === undefined
      ? "--"
      : elapsedSeconds < 60
        ? `Updated ${elapsedSeconds}s ago`
        : elapsedSeconds < 3600
          ? `Updated ${Math.floor(elapsedSeconds / 60)}m ago`
          : `Updated ${Math.floor(elapsedSeconds / 3600)}h ago`;
    return html`<ic-info-panel aria-label="Entity status" .items=${[
      { label:"Entity Status", value:status },
      { label:"Current State", value:currentState },
      { label:"Last Updated", value:lastUpdated },
    ]}></ic-info-panel>`;
  }

  private save() {
    if (!this.draft || this.saving) return;
    const circuit = {
      ...this.draft,
      name: this.draft.name.trim(),
      entity: this.draft.entity.trim(),
      icon: this.draft.icon?.trim() || undefined,
      category: this.draft.category?.trim() || undefined,
    };
    if (!circuit.name || !circuit.entity || !this.hasValidPowerEntity) {
      this.requestUpdate();
      return;
    }

    this.saving = true;
    this.requestUpdate();
    const detail: CircuitConfigChangedDetail = {
      circuit,
      complete:() => { this.saving = false; this.close(); },
      fail:() => { this.saving = false; this.requestUpdate(); },
    };
    this.dispatchEvent(
      new CustomEvent<CircuitConfigChangedDetail>(
        "circuit-config-changed",
        {
          detail,
          bubbles: true,
          composed: true,
        }
      )
    );
  }

  private deleteCircuit() {
    if (this.mode !== "edit" || !this.circuit || this.saving || this.deleting) {
      return;
    }
    this.deleting = true;
    this.requestUpdate();
    const detail: CircuitDeleteRequestDetail = {
      circuitId: this.circuit.id,
      complete: () => {
        this.deleting = false;
        this.close();
      },
      fail: () => {
        this.deleting = false;
        this.requestUpdate();
      },
    };
    this.dispatchEvent(new CustomEvent<CircuitDeleteRequestDetail>(
      "circuit-delete-request",
      { detail, bubbles:true, composed:true }
    ));
  }

  render() {
    if (!this.draft) return null;

    return html`
      <ic-app-dialog
        .open=${this.open}
        .title=${this.mode === "create" ? "Add Circuit" : "Edit Circuit"}
        @dialog-close=${this.handleDialogClose}
        @click=${() => {
          if (!this.iconPickerExpanded && !this.entityPickerExpanded) return;
          this.iconPickerExpanded = false;
          this.entityPickerExpanded = false;
          this.requestUpdate();
        }}
      >
        <span slot="header">${this.mode === "create"
          ? "Add Circuit"
          : "Edit Circuit"}</span>

        <div class="form">
          <ic-field label="Circuit Name" .value=${this.draft.name}
            @field-input=${(event:CustomEvent<FieldValueDetail>) =>
              this.updateField("name", event.detail.value)}></ic-field>

          ${this.renderEntityTrigger()}

          <div class="inline-field-group icon-field-group"
            @click=${(event:Event) => event.stopPropagation()}>
            <ic-field label="Icon" variant="selectable"
              .value=${this.draft.icon || "Select an icon"}
              .rawValue=${this.draft.icon || "Select an icon"}
              aria-expanded=${this.iconPickerExpanded}
              @field-activate=${() => {
                this.iconPickerExpanded = !this.iconPickerExpanded;
                this.entityPickerExpanded = false;
                this.requestUpdate();
              }}>
              <ha-icon slot="leading"
                .icon=${this.draft.icon || "mdi:shape-outline"}></ha-icon>
            </ic-field>
            ${this.iconPickerExpanded ? html`
              <ic-icon-picker
                .hass=${this.hass}
                .value=${this.draft.icon ?? ""}
                @icon-change=${this.selectIcon}
              ></ic-icon-picker>
            ` : null}
          </div>

          ${this.renderEntityStatus()}

          <div class="actions">
            ${this.mode === "edit" ? html`
              <ic-button class="delete-action" variant="destructive"
                @click=${this.deleteCircuit}
                .disabled=${this.saving || this.deleting}>
                ${this.deleting ? "Deleting…" : "Delete"}
              </ic-button>
            ` : null}
            <ic-button @click=${this.close} .disabled=${this.deleting}>Cancel</ic-button>
            <ic-button variant="primary" @click=${this.save}
              .disabled=${!this.canSave} .loading=${this.saving}>
              ${this.mode === "create" ? "Add Circuit" : "Save"}
            </ic-button>
          </div>
        </div>
      </ic-app-dialog>
    `;
  }
}

customElements.define("ic-circuit-settings-modal", CircuitSettingsModal);
