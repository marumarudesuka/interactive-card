import { LitElement, css, html } from "lit";

import type { HomeAssistant } from "custom-card-helpers";
import type { EntitySelectorFilter } from "../config/config.types";
import {
  ENTITY_ID_DISPLAY_LENGTH,
  formatEntityId,
  truncateMiddle,
} from "../helpers/text-formatter";
import "./common/picker-item";
import "./common/scroll-area";
import "./common/field";
import "./common/inline-picker-panel";
import "./common/search-field";

export interface EntitySelectedDetail {
  entityId: string;
}

export class EntitySelector extends LitElement {
  static properties = {
    hass: { attribute: false },
    value: { type: String },
    filter: { attribute: false },
    limit: { type: Number },
    placeholder: { type: String },
    preferredDeviceClasses: { attribute: false },
    preferredUnits: { attribute: false },
    variant: { type:String, reflect:true },
  };

  hass?: HomeAssistant;
  value = "";
  filter: EntitySelectorFilter = {};
  limit = 1000;
  placeholder = "Search entity...";
  preferredDeviceClasses: string[] = [];
  preferredUnits: string[] = [];
  variant:"default"|"inline" = "default";

  private search = "";

  static styles = [css`
    :host {
      display: block;
      color: var(--primary-text-color);
    }

    ic-search-field { margin-bottom:12px; }
    :host([variant="inline"]) ic-search-field { margin-bottom:0; }

    .current {
      margin-bottom: 12px;
    }

    .section-label {
      margin-bottom: 8px;
      color: var(--en-heading-primary, var(--primary-text-color));
      font-size: 14px;
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: 0;
    }

    .current-value {
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      min-width: 0;
      align-items: center;
      column-gap: 8px;
      box-sizing: border-box;
      width: 100%;
      padding: 10px 12px;
      border: var(
        --en-border-selected,
        var(--en-selection-border)
      );
      border-radius: var(--ic-radius-control);
      background: var(
        --en-surface-selected,
        var(--en-selection-surface)
      );
    }

    .icon-slot {
      display: flex;
      width: 16px;
      height: 16px;
      align-items: center;
      justify-content: center;
      color: var(--en-text-secondary, var(--secondary-text-color));
    }

    .icon-slot ha-icon {
      display: block;
      width: 14px;
      height: 14px;
      --mdc-icon-size: 14px;
      opacity: .7;
      transform: translateY(-5px);
    }

    .current-entity {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .list {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      max-height: 300px;
      padding-right: var(--en-space-sm, 8px);
      padding-top: 4px;
    }
    :host([variant="inline"]) .list {
      max-height:none;
      padding-top:0;
    }

    ic-picker-item {
      margin-bottom:4px;
    }

    .current ic-picker-item {
      --ic-select-indicator-transform:translateY(-3px);
    }

    .item {
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      grid-template-rows: auto auto;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      align-items: center;
      column-gap: 8px;
      margin-bottom: 8px;
      padding: 12px;
      border: 1px solid transparent;
      border-radius: var(--ic-radius-control);
      background: var(--ic-control-background, transparent);
      cursor: pointer;
    }

    .item > .icon-slot {
      grid-column: 1;
      grid-row: 1;
      align-self: center;
    }

    .name,
    .entity-id {
      grid-column: 2;
      min-width: 0;
      max-width: 100%;
    }

    .item.selected {
      border: var(
        --en-border-selected,
        var(--en-selection-border)
      );
      background: var(
        --en-surface-selected,
        var(--en-selection-surface)
      );
    }

    .name {
      grid-row: 1;
      overflow: hidden;
      font-weight: 600;
      line-height: 18px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-id,
    .empty {
      color: var(--secondary-text-color);
      font-size: 12px;
    }

    .entity-id {
      grid-row: 2;
      overflow: hidden;
      max-width: 100%;
      line-height: 16px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `];

  private get entities(): string[] {
    if (!this.hass) return [];

    const domains = this.filter.domains ?? [];
    const deviceClasses = this.filter.deviceClasses ?? [];
    const stateClasses = this.filter.stateClasses ?? [];
    const query = this.search.trim().toLowerCase();

    return Object.keys(this.hass.states)
      .filter((entityId) => {
        const state = this.hass?.states[entityId];
        const domain = entityId.split(".", 1)[0];
        const deviceClass = state?.attributes.device_class;
        const stateClass = state?.attributes.state_class;

        if (domains.length && !domains.includes(domain)) return false;
        if (this.filter.predicate && !this.filter.predicate(entityId)) {
          return false;
        }
        if (
          deviceClasses.length &&
          (!deviceClass || !deviceClasses.includes(deviceClass))
        ) {
          return false;
        }
        if (
          stateClasses.length &&
          (!stateClass || !stateClasses.includes(stateClass))
        ) {
          return false;
        }

        if (!query) return true;
        const searchable = [
          entityId,
          state?.attributes.friendly_name,
          domain,
          deviceClass,
          state?.attributes.unit_of_measurement,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(query);
      })
      .sort((left, right) => {
        const preferenceScore = (entityId: string) => {
          const entityState = this.hass?.states[entityId];
          const attributes = entityState?.attributes;
          const deviceClass = String(attributes?.device_class ?? "");
          const unit = String(attributes?.unit_of_measurement ?? "");
          return Number(Number.isFinite(Number(entityState?.state))) * 4 +
            Number(Boolean(unit)) * 2 +
            Number(this.preferredDeviceClasses.includes(deviceClass)) * 2 +
            Number(this.preferredUnits.includes(unit));
        };
        const preferenceDifference = preferenceScore(right) - preferenceScore(left);
        if (preferenceDifference) return preferenceDifference;
        const leftName = String(
          this.hass?.states[left]?.attributes.friendly_name ?? left
        ).toLowerCase();
        const rightName = String(
          this.hass?.states[right]?.attributes.friendly_name ?? right
        ).toLowerCase();
        return leftName.localeCompare(rightName);
      })
      .slice(0, this.limit);
  }

  private selectEntity(entityId: string) {
    this.dispatchEvent(
      new CustomEvent<EntitySelectedDetail>("entity-selected", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderResults(entities:string[]) {
    if (!entities.length) return html`<div class="empty">No matching entities</div>`;
    return entities.map((entityId) => {
      const entityState = this.hass?.states[entityId];
      const friendlyName = entityState?.attributes.friendly_name ?? "";
      const unit = String(entityState?.attributes.unit_of_measurement ?? "");
      const domain = entityId.split(".", 1)[0];
      const deviceClass = String(entityState?.attributes.device_class ?? "");
      const stateSummary = entityState
        ? `${entityState.state}${unit ? ` ${unit}` : ""}`
        : "Unavailable";
      const metadata = [entityId, stateSummary, domain, deviceClass]
        .filter(Boolean)
        .join(" · ");
      const displayMetadata = [
        formatEntityId(entityId,"pickerItem"),
        stateSummary,
        domain,
        deviceClass,
      ].filter(Boolean).join(" · ");
      return html`
        <ic-picker-item
          .selected=${entityId === this.value}
          .indicator=${entityId === this.value ? "check" : "none"}
          .displayLabel=${truncateMiddle(String(friendlyName || entityId), {
            maxLength:ENTITY_ID_DISPLAY_LENGTH.pickerItem,
          })}
          .rawLabel=${String(friendlyName || entityId)}
          .secondaryLabel=${displayMetadata}
          .rawSecondaryLabel=${metadata}
          @click=${() => this.selectEntity(entityId)}
        ></ic-picker-item>
      `;
    });
  }

  render() {
    if (!this.hass) {
      return html`<div class="empty">No hass available</div>`;
    }

    const entities = this.entities;

    if (this.variant === "inline") {
      return html`
        <ic-inline-picker-panel open .maxHeight=${260}>
          <ic-search-field slot="search"
            .value=${this.search}
            .placeholder=${this.placeholder}
            variant="compact"
            @search-input=${(event: CustomEvent<{value:string}>) => {
              this.search = event.detail.value;
              this.requestUpdate();
            }}
          ></ic-search-field>
          <ic-scroll-area slot="content" class="list">
            ${this.renderResults(entities)}
          </ic-scroll-area>
        </ic-inline-picker-panel>
      `;
    }

    return html`
      <div class="current">
        <ic-field label="Current Entity" variant="readonly"
          .value=${this.value
            ? formatEntityId(this.value,"readonlyField")
            : "Not configured"}
          .rawValue=${this.value || "Not configured"}>
        </ic-field>
      </div>
      <ic-search-field
        .value=${this.search}
        .placeholder=${this.placeholder}
        @search-input=${(event: CustomEvent<{value:string}>) => {
          this.search = event.detail.value;
          this.requestUpdate();
        }}
      ></ic-search-field>
      <div class="section-label">Available Entities</div>
      <ic-scroll-area class="list">
        ${entities.length
          ? entities.map((entityId) => {
              const entityState = this.hass?.states[entityId];
              const friendlyName = entityState?.attributes.friendly_name ?? "";
              const unit = String(entityState?.attributes.unit_of_measurement ?? "");
              const domain = entityId.split(".", 1)[0];
              const deviceClass = String(entityState?.attributes.device_class ?? "");
              const stateSummary = entityState
                ? `${entityState.state}${unit ? ` ${unit}` : ""}`
                : "Unavailable";
              const metadata = [entityId, stateSummary, domain, deviceClass]
                .filter(Boolean)
                .join(" · ");
              return html`
                <ic-picker-item
                  .selected=${entityId === this.value}
                  .indicator=${entityId === this.value ? "check" : "none"}
                  .displayLabel=${truncateMiddle(String(friendlyName || entityId), {
                    maxLength:ENTITY_ID_DISPLAY_LENGTH.pickerItem,
                  })}
                  .rawLabel=${String(friendlyName || entityId)}
                  .secondaryLabel=${formatEntityId(entityId,"pickerItem")}
                  .rawSecondaryLabel=${metadata}
                  @click=${() => this.selectEntity(entityId)}
                ></ic-picker-item>
              `;
            })
          : html`<div class="empty">No matching entities</div>`}
      </ic-scroll-area>
    `;
  }
}

customElements.define("ic-entity-selector", EntitySelector);
