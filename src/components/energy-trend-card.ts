import { LitElement, css, html } from "lit";

import type { HomeAssistant } from "custom-card-helpers";
import { normalizeEnergyTrendCardConfig } from "../config/trend-config-normalizer";
import { TrendConfigCoordinator } from "../config/trend-config-coordinator";
import { loadTrendHistory } from "../helpers/trend-data-provider";
import { transformTrendHistory } from "../helpers/trend-transformer";
import {
  ENTITY_ID_DISPLAY_LENGTH,
  formatEntityId,
  truncateMiddle,
} from "../helpers/text-formatter";
import type {
  EnergyTrendCardConfig,
  TrendAxis,
  TrendDataStatus,
  TrendSeries,
  TrendTimeframe,
} from "../types/trend";
import "./common/glass-container";
import "./common/section-header";
import "./common/action-button";
import "./common/overlay/popover/ic-popover";
import "./common/select-item";
import "./common/scroll-area";
import "./common/search-field";
import "./common/menu-item";
import "./common/action-menu";
import "./common/segmented-control";
import type { SegmentedChangeDetail } from "./common/segmented-control";
import "./trend/trend-chart";
import "./trend/trend-legend";
import "./trend/trend-settings-dialog";
import type { TrendSettingsSaveDetail } from "./trend/trend-settings-dialog";
import type { TrendSettingsChangeDetail } from "./trend/trend-settings-dialog";
import { LocalStorageTrendConfigRepository } from "../repositories/local-storage-trend-config-repository";

const timeframes: readonly TrendTimeframe[] = [
  "1H",
  "24H",
  "7D",
  "30D",
];

function getHistoryErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const value = error as {
      message?: unknown;
      body?: { message?: unknown };
      status_code?: unknown;
    };
    const message = value.body?.message ?? value.message;
    const status = value.status_code;
    if (message) {
      return `${status ? `${status}: ` : ""}${String(message)}`;
    }
  }
  return "Unable to load history";
}

function isEnergyRelatedEntity(
  entityId: string,
  hass?: HomeAssistant
): boolean {
  if (!entityId.startsWith("sensor.")) return false;

  const attributes = hass?.states[entityId]?.attributes ?? {};
  const deviceClass = String(attributes.device_class ?? "").toLowerCase();
  const unit = String(attributes.unit_of_measurement ?? "").toLowerCase();
  return ["power", "energy", "monetary"].includes(deviceClass) ||
    ["w", "kw", "mw", "wh", "kwh", "mwh", "€", "$", "£"].includes(unit);
}

function getTrendMenuName(
  hass: HomeAssistant | undefined,
  entityId: string,
  fallback?: string
): string {
  return String(
    fallback?.trim() ||
    hass?.states[entityId]?.attributes.friendly_name ||
    entityId
  );
}

export class EnergyTrendCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    config: { attribute: false },
  };

  config?: EnergyTrendCardConfig;

  private _hass?: HomeAssistant;
  private timeframe: TrendTimeframe = "24H";
  private status: TrendDataStatus = "idle";
  private errorMessage = "";
  private series: TrendSeries[] = [];
  private axes: TrendAxis[] = [];
  private loadVersion = 0;
  private settingsMenuOpen = false;
  private seriesSearch = "";
  private settingsDialogOpen = false;
  private settingsDialogEntity = "";
  private hiddenSeriesIds = new Set<string>();
  private readonly configCoordinator = new TrendConfigCoordinator(
    new LocalStorageTrendConfigRepository()
  );
  private configResolutionVersion = 0;
  private configStorageId = "energy-trend";

  set hass(hass: HomeAssistant) {
    const isFirstAssignment = !this._hass;
    this._hass = hass;
    if (isFirstAssignment && this.config) {
      void this.loadHistory();
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
    }

    ic-glass-container {
      display: block;
      width: 100%;
      min-width: 0;
      --glass-container-height: var(--trend-card-height, 350px);
    }

    .body {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }

    .ranges {
      display: block;
      flex:0 0 auto;
      margin:0;
      --segment-font-size:.75rem;
    }

    .chart-header {
      display:flex;
      min-width:0;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin-bottom:12px;
    }

    .chart-header ic-trend-legend {
      min-width:0;
      flex:1 1 auto;
    }

    .trend-menu {
      display:grid;
      width:280px;
      min-width:220px;
      max-width:100%;
      max-height:min(520px,var(--popover-max-height,520px));
      box-sizing:border-box;
    }

    .series-manager-row.hidden-series {
      opacity:.55;
    }

    .menu-title {
      margin:8px 10px 4px;
      color:var(--en-text-secondary,var(--secondary-text-color));
      font-size:11px;
      font-weight:600;
      letter-spacing:.08em;
      text-transform:uppercase;
    }

    .entity-item {
      display:block;
      width:100%;
      min-height:36px;
      overflow:hidden;
      padding:7px 10px;
      border:0;
      border-radius:var(--ic-radius-control);
      background:transparent;
      color:var(--en-text-primary,var(--primary-text-color));
      cursor:pointer;
      font:inherit;
      font-size:13px;
      text-align:left;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .entity-item:hover {
      background:var(--ic-action-hover-background,rgba(127,127,127,.14));
    }

    .settings-chevron {
      width:14px;
      height:14px;
      --mdc-icon-size:14px;
      color:var(--en-text-secondary,var(--secondary-text-color));
      transition:transform var(--en-motion-fast,180ms)
        var(--en-easing-standard,ease);
    }

    .settings-chevron.open {
      transform:rotate(180deg);
    }

    .series-row { min-width:0; }
    ic-trend-chart {
      flex: 1;
      min-height: 0;
    }
  `;

  setConfig(config: EnergyTrendCardConfig) {
    if (!config || !Array.isArray(config.entities)) {
      throw new Error("entities is required");
    }

    const yamlConfig = normalizeEnergyTrendCardConfig(config);
    const resolutionVersion = ++this.configResolutionVersion;
    this.configStorageId = this.getConfigStorageId(yamlConfig);
    this.config = yamlConfig;
    this.timeframe = this.config.timeframe ?? "24H";
    if (this._hass) {
      void this.loadHistory();
    }
    void this.configCoordinator
      .resolve(this.configStorageId, yamlConfig)
      .then((resolved) => {
        if (resolutionVersion !== this.configResolutionVersion) return;
        this.config = resolved;
        this.timeframe = resolved.timeframe ?? "24H";
        this.requestUpdate();
        if (this._hass) void this.loadHistory();
      })
      .catch((error) => {
        console.error("[energy-trend-card] Unable to restore configuration", error);
      });
  }

  private getConfigStorageId(config: EnergyTrendCardConfig): string {
    const identity = config.id?.trim() || config.title?.trim() || "energy-trend";
    return identity.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  }

  private getEntityMetadata() {
    if (!this.config || !this._hass) return {};

    return Object.fromEntries(
      this.config.entities.map((item) => {
        const state = this._hass?.states[item.entity];
        return [
          item.entity,
          {
            name: String(
              state?.attributes.friendly_name ?? item.entity
            ),
            unit: String(
              state?.attributes.unit_of_measurement ?? ""
            ),
          },
        ];
      })
    );
  }

  private async loadHistory() {
    if (!this.config || !this._hass) return;

    const version = ++this.loadVersion;
    this.status = "loading";
    this.errorMessage = "";
    this.requestUpdate();

    try {
      const history = await loadTrendHistory(
        this._hass,
        this.config.entities.map((item) => item.entity),
        this.timeframe
      );
      if (version !== this.loadVersion) return;

      const transformed = transformTrendHistory(
        history.entities,
        this.config.entities,
        this.config.category ?? "energy",
        this.getEntityMetadata()
      );
      this.series = transformed.series;
      this.axes = transformed.axes;
      this.status = transformed.series.some(
        (item) => item.points.length > 0
      )
        ? "ready"
        : "empty";
    } catch (error) {
      if (version !== this.loadVersion) return;
      console.error("[energy-trend-card] History load failed", error);
      this.series = [];
      this.axes = [];
      this.status = "error";
      this.errorMessage = getHistoryErrorMessage(error);
    }

    this.requestUpdate();
  }

  private changeTimeframe(timeframe: TrendTimeframe) {
    if (this.timeframe === timeframe) return;
    if (!this.config) return;
    this.commitTrendConfig({ ...this.config, timeframe });
    this.dispatchEvent(
      new CustomEvent("trend-timeframe-changed", {
        detail: { timeframe },
        bubbles: true,
        composed: true,
      })
    );
  }

  private toggleLegendSeries(
    event: CustomEvent<{ seriesId:string }>
  ) {
    event.stopPropagation();
    const next = new Set(this.hiddenSeriesIds);
    if (next.has(event.detail.seriesId)) {
      next.delete(event.detail.seriesId);
    } else {
      next.add(event.detail.seriesId);
    }
    this.hiddenSeriesIds = next;
    this.requestUpdate();
  }

  private commitTrendConfig(config: EnergyTrendCardConfig) {
    ++this.configResolutionVersion;
    this.config = normalizeEnergyTrendCardConfig(config);
    this.timeframe = this.config.timeframe ?? "24H";
    const entityConfigs = new Map(
      this.config.entities.map((entity) => [entity.entity, entity])
    );
    this.series = this.series.map((series) => {
      const entity = entityConfigs.get(series.entity);
      if (!entity) return series;
      return {
        ...series,
        name:entity.name ?? series.name,
        precision:entity.decimals ?? 2,
        visible:entity.enabled !== false,
        axisGroup:entity.axis === "left" || entity.axis === "right"
          ? entity.axis
          : undefined,
        lineStyle:entity.lineStyle ?? "solid",
        chartMode:entity.chartMode ?? "line",
        renderMode:entity.renderMode,
      };
    });
    this.requestUpdate();
    void this.loadHistory();
    void this.configCoordinator
      .save(this.configStorageId, this.config)
      .catch((error) => {
        console.error("[energy-trend-card] Unable to save configuration", error);
      });
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail:{ config:this.config },
      bubbles:true,
      composed:true,
    }));
  }

  private addSeries(entityId: string) {
    if (!this.config || !this._hass?.states[entityId]) return;
    const state = this._hass.states[entityId];
    const unit = String(state.attributes.unit_of_measurement ?? "");
    this.commitTrendConfig({
      ...this.config,
      entities:[
        ...this.config.entities,
        {
          entity:entityId,
          order:this.config.entities.length,
          name:String(state.attributes.friendly_name ?? entityId),
          unit,
          category:unit.includes("Wh") ? "energy" : "power",
          enabled:true,
          decimals:2,
          autoScale:true,
        },
      ],
    });
  }

  private toggleSeriesVisibility(entityId: string) {
    if (!this.config) return;
    this.commitTrendConfig({
      ...this.config,
      entities:this.config.entities.map((entity) =>
        entity.entity === entityId
          ? { ...entity, enabled:entity.enabled === false }
          : entity
      ),
    });
  }

  private toggleSettingsMenu() {
    this.settingsMenuOpen = !this.settingsMenuOpen;
    this.requestUpdate();
  }

  render() {
    if (!this.config) return html``;
    const height = this.config.height ?? 350;
    const configured = new Set(
      this.config.entities.map((entity) => entity.entity)
    );
    const availableEntities = Object.keys(this._hass?.states ?? {})
      .filter((entityId) =>
        isEnergyRelatedEntity(entityId, this._hass) && !configured.has(entityId)
      )
      .filter((entityId) => {
        const query = this.seriesSearch.trim().toLowerCase();
        if (!query) return true;
        const friendlyName = String(
          this._hass?.states[entityId]?.attributes.friendly_name ?? ""
        ).toLowerCase();
        return entityId.toLowerCase().includes(query) ||
          friendlyName.includes(query);
      });

    return html`
      <ic-section-header .title=${this.config.title ?? "Energy Trend"}>
        <ic-popover slot="actions" style="--popover-min-width:280px"
          .open=${this.settingsMenuOpen} placement="bottom-end" .offset=${8}
          .closeOnOutsideClick=${true}
          @popover-close=${() => { this.settingsMenuOpen = false; this.requestUpdate(); }}>
          <ic-action-button slot="anchor" icon="+" label="Manage trend series"
            @action-click=${this.toggleSettingsMenu}></ic-action-button>
          <ic-action-menu class="trend-menu">
              <div class="menu-title">Displayed Series</div>
              ${this.config.entities.length ? this.config.entities.map((entity) => {
                const displayName = getTrendMenuName(
                  this._hass,
                  entity.entity,
                  entity.name
                );
                const compactDisplayName = truncateMiddle(displayName, {
                  maxLength:ENTITY_ID_DISPLAY_LENGTH.compactMenu,
                });
                return html`
                <div class="series-manager-row ${entity.enabled === false ? "hidden-series" : ""}">
                  <ic-menu-item
                    .selected=${entity.enabled !== false}
                    .indicator=${entity.enabled === false ? "none" : "check"}
                    .rawLabel=${displayName}
                    @click=${() => this.toggleSeriesVisibility(entity.entity)}>
                    ${compactDisplayName}
                  </ic-menu-item>
                </div>
              `;
              }) : html`<div class="entity-item">No displayed series</div>`}

              <div class="menu-title">Available Series</div>
              <ic-search-field variant="compact" placeholder="Search entities"
                .value=${this.seriesSearch}
                @search-input=${(event: CustomEvent<{value:string}>) => {
                  this.seriesSearch = event.detail.value;
                  this.requestUpdate();
                }}></ic-search-field>
              ${availableEntities.length ? availableEntities.map((entityId) => {
                const displayName = getTrendMenuName(this._hass, entityId);
                const compactDisplayName = truncateMiddle(displayName, {
                  maxLength:ENTITY_ID_DISPLAY_LENGTH.compactMenu,
                });
                return html`
                <ic-menu-item indicator="plus"
                  .rawLabel=${displayName}
                  .secondaryLabel=${formatEntityId(entityId,"compactMenu")}
                  .rawSecondaryLabel=${entityId}
                  @click=${() => this.addSeries(entityId)}>
                  ${compactDisplayName}
                </ic-menu-item>
              `;
              }) : html`<div class="entity-item">No available sensors</div>`}
          </ic-action-menu>
        </ic-popover>
      </ic-section-header>

      <ic-glass-container
        style=${`--trend-card-height:${height}px`}
        @click=${() => {
          this.settingsDialogEntity = "";
          this.settingsDialogOpen = true;
          this.requestUpdate();
        }}>
        <div class="body">
          <div class="chart-header">
            <ic-trend-legend style="margin:0" .series=${this.series}
              .axes=${[]} .hiddenSeries=${this.hiddenSeriesIds}
              @trend-series-toggle=${this.toggleLegendSeries}></ic-trend-legend>
            <ic-segmented-control class="ranges" width="fit" size="compact-28" label="Trend timeframe"
              .value=${this.timeframe}
              .options=${timeframes.map((timeframe) => ({ value:timeframe, label:timeframe }))}
              @click=${(event:Event) => event.stopPropagation()}
              @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                this.changeTimeframe(event.detail.value as TrendTimeframe)}>
            </ic-segmented-control>
          </div>
          <ic-trend-chart .series=${this.series} .axes=${this.axes}
            .timeframe=${this.timeframe} .status=${this.status}
            .errorMessage=${this.errorMessage} .curve=${this.config.curve ?? "smooth"}
            .hiddenSeries=${this.hiddenSeriesIds}
            .renderMode=${this.config.renderMode ?? "smooth"}></ic-trend-chart>
        </div>
      </ic-glass-container>

      <ic-trend-settings-dialog .open=${this.settingsDialogOpen}
        .hass=${this.hass}
        .config=${this.config}
        .selectedEntity=${this.settingsDialogEntity}
        @trend-settings-close=${() => {
          this.settingsDialogEntity = "";
          this.settingsDialogOpen = false;
          this.requestUpdate();
        }}
        @trend-settings-save=${(event: CustomEvent<TrendSettingsSaveDetail>) => {
          event.stopPropagation(); this.settingsDialogEntity = ""; this.settingsDialogOpen = false;
          this.commitTrendConfig(event.detail.config);
        }}
        @trend-settings-change=${(event: CustomEvent<TrendSettingsChangeDetail>) => {
          event.stopPropagation();
          this.commitTrendConfig(event.detail.config);
        }}></ic-trend-settings-dialog>
    `;
  }

  getCardSize() {
    return Math.max(3, Math.ceil((this.config?.height ?? 350) / 50));
  }

  getGridOptions() {
    return {
      columns: this.config?.fullWidth === false ? 6 : "full",
    };
  }
}

customElements.define("energy-trend-card", EnergyTrendCard);

(window as Window & { customCards?: unknown[] }).customCards = [
  ...((window as Window & { customCards?: unknown[] }).customCards ?? []),
  {
    type: "energy-trend-card",
    name: "Energy Trend Card",
    description: "Historical energy analysis with multiple series",
  },
];
