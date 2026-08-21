import { LitElement, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { defaultKpiTemplates } from "../../data/kpi-config";
import { getKpiCardKey } from "../../data/kpi-card-model";
import { getKpiDiscoveryCandidates } from "../../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type { CustomKpiConfig, KpiTemplate } from "../../types/kpi";
import type { DiscoveryEntitySelectedDetail } from "../shared/discovery-entity-picker.ts";
import { moveItem, removeItem } from "../shared/item-list-operations.ts";
import "../shared/discovery-entity-picker.ts";
import "./kpi-item-editor.ts";

export class KpiItemManager extends LitElement {
  static properties = {
    hass:{ attribute:false }, items:{ attribute:false },
    metrics:{ attribute:false }, selectedKey:{ state:true },
    appearanceOnly:{ type:Boolean },
  };
  hass?:HomeAssistant;
  items:readonly CustomKpiConfig[] = [];
  metrics:readonly DiscoveredMetric[] = [];
  appearanceOnly = false;
  private selectedKey = "";

  private key(item:CustomKpiConfig) {
    return getKpiCardKey(item) ?? "";
  }

  private emit(items:readonly CustomKpiConfig[]) {
    this.dispatchEvent(new CustomEvent("kpi-item-list-changed", {
      detail:{ items:items.map((item, order) => ({ ...item, order })) },
      bubbles:true,
      composed:true,
    }));
  }

  private addTemplate(template:KpiTemplate) {
    if (this.items.some((item) => item.id === template.id)) return;
    const discovered = getKpiDiscoveryCandidates(this.metrics, template.id)[0]?.entityId;
    const item:CustomKpiConfig = {
      id:template.id,
      title:template.title,
      entity:discovered || template.entity || template.defaultEntity,
      category:template.category,
      unit:template.unit,
      icon:template.icon,
      enabled:true,
      autoScale:template.autoScale ?? false,
      decimals:template.decimals ?? 2,
    };
    this.emit([...this.items, item]);
    this.selectedKey = template.id;
  }

  private addCustomEntity(entity:string) {
    if (!entity || this.items.some((item) => item.entity === entity)) return;
    const metric = this.metrics.find((candidate) => candidate.entityId === entity);
    const base = entity.split(".").pop()?.replace(/[^a-z0-9_-]+/gi, "-") || "kpi";
    let id = `custom-${base}`;
    let suffix = 2;
    while (this.items.some((item) => item.id === id)) id = `custom-${base}-${suffix++}`;
    this.emit([...this.items, {
      type:"custom", id, entity,
      title:metric?.name ?? entity,
      enabled:true, autoScale:true, decimals:2,
      unit:metric?.unit || undefined,
    }]);
    this.selectedKey = id;
  }

  private removeItem(item:CustomKpiConfig) {
    const isTemplate = defaultKpiTemplates.some(
      (template) => template.id === item.id
    );
    if (isTemplate) {
      this.emit(this.items.map((candidate) =>
        this.key(candidate) === this.key(item)
          ? { ...candidate, enabled:false }
          : candidate
      ));
      return;
    }
    this.emit(removeItem(
      this.items,
      (candidate) => this.key(candidate) === this.key(item)
    ));
    if (this.selectedKey === this.key(item)) this.selectedKey = "";
  }

  render() {
    const selected = this.items.find((item) => this.key(item) === this.selectedKey);
    const templateOptions = defaultKpiTemplates
      .filter((template) => !this.items.some((item) => item.id === template.id))
      .map((template) => ({ value:template.id, label:template.title }));
    const recommendedCandidates = selected
      ? getKpiDiscoveryCandidates(this.metrics, selected.id ?? "", selected.entity)
      : [];
    const candidates = recommendedCandidates.length
      ? recommendedCandidates
      : selected
        ? [...this.metrics].sort((left, right) =>
            Number(right.entityId === selected.entity) -
            Number(left.entityId === selected.entity)
          )
        : [];
    return html`
      ${this.appearanceOnly ? null : html`<ha-form .hass=${this.hass} .data=${{ template:"" }}
        .schema=${[{ name:"template", selector:{ select:{
          options:templateOptions, custom_value:false,
        } } }]}
        .computeLabel=${() => "Add recommended KPI"}
        @value-changed=${(event:CustomEvent<{value:{template?:string}}>) => {
          event.stopPropagation();
          const template = defaultKpiTemplates.find(
            (item) => item.id === event.detail.value.template
          );
          if (template) this.addTemplate(template);
        }}></ha-form>
      <discovery-entity-picker label="Add KPI from entity" .hass=${this.hass}
        .value=${""} .candidates=${this.metrics}
        @discovery-entity-selected=${(event:CustomEvent<DiscoveryEntitySelectedDetail>) =>
          this.addCustomEntity(event.detail.entityId)}>
      </discovery-entity-picker>`}
      ${this.items.map((item, index) => html`
        <div>
          <button type="button" @click=${() => { this.selectedKey = this.key(item); }}>
            ${item.title || item.name || item.entity || item.id}${item.enabled === false ? " (hidden)" : ""}
          </button>
          ${this.appearanceOnly ? null : html`<ha-button appearance="plain" ?disabled=${index === 0}
            @click=${() => {
              if (!index) return;
              this.emit(moveItem(this.items, index, -1));
            }}>Up</ha-button>
          <ha-button appearance="plain" ?disabled=${index === this.items.length - 1}
            @click=${() => {
              if (index >= this.items.length - 1) return;
              this.emit(moveItem(this.items, index, 1));
            }}>Down</ha-button>
          <ha-button appearance="plain" @click=${() => {
            this.removeItem(item);
          }}>Remove</ha-button>`}
        </div>
      `)}
      ${selected ? html`
        <kpi-item-editor .hass=${this.hass} .item=${selected}
          .candidates=${candidates}
          @kpi-item-changed=${(event:CustomEvent<{item:CustomKpiConfig}>) => {
            event.stopPropagation();
            this.emit(this.items.map((item) =>
              this.key(item) === this.key(selected) ? event.detail.item : item
            ));
          }}></kpi-item-editor>
      ` : null}
    `;
  }
}

if (!customElements.get("kpi-item-manager")) {
  customElements.define("kpi-item-manager", KpiItemManager);
}
