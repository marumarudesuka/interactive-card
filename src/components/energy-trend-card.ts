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
  TrendEntityConfig,
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
import "./trend/trend-analysis-panel";
import {
  getPendingTrendScope,
  LocalStoragePendingTrendSeriesRepository,
} from "../repositories/local-storage-pending-trend-series-repository.ts";
import { discoverEnergyMetrics, getTrendDiscoveryCandidates } from "../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../discovery/discovery.types";
import "../editors/energy-trend-card-editor";
import { getTrendSeriesColor } from "../helpers/trend-chart-formatters.ts";
import {
  applyTrendPresentationConfig,
  classifyTrendConfigChange,
} from "../helpers/trend-config-change-classifier.ts";
import {
  LocalStoragePendingTrendRemovalRepository,
  matchesPendingTrendRemoval,
  type PendingTrendRemoval,
} from "../repositories/local-storage-pending-trend-removal-repository.ts";

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

export function isEnergyRelatedEntity(
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
  static getConfigElement() {
    return document.createElement("energy-trend-card-editor");
  }

  static properties = {
    hass: { attribute: false },
    config: { attribute: false },
  };

  config?: EnergyTrendCardConfig;

  private _hass?: HomeAssistant;
  private discoveryMetrics: readonly DiscoveredMetric[] = [];
  private timeframe: TrendTimeframe = "24H";
  private status: TrendDataStatus = "idle";
  private errorMessage = "";
  private series: TrendSeries[] = [];
  private axes: TrendAxis[] = [];
  private loadVersion = 0;
  private settingsMenuOpen = false;
  private seriesSearch = "";
  private hiddenSeriesIds = new Set<string>();
  private analysisPanelOpen = false;
  private readonly configCoordinator = new TrendConfigCoordinator();
  private readonly pendingSeriesRepository =
    new LocalStoragePendingTrendSeriesRepository();
  private formalConfig?:EnergyTrendCardConfig;
  private pendingSeries:TrendEntityConfig[] = [];
  private pendingRemovals:PendingTrendRemoval[] = [];
  private readonly pendingRemovalRepository = new LocalStoragePendingTrendRemovalRepository();
  private configResolutionVersion = 0;
  private configStorageId = "energy-trend";
  private configSettled = false;

  set hass(hass: HomeAssistant) {
    const isFirstAssignment = !this._hass;
    this._hass = hass;
    this.discoveryMetrics = discoverEnergyMetrics(hass);
    if (isFirstAssignment && this.config && this.configSettled) {
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

    .series-manager-row {
      min-width:0;
    }

    .series-actions {
      display:grid;
      gap:var(--en-menu-item-gap,6px);
      margin:2px 4px 6px 20px;
      padding:6px;
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-panel-radius,18px);
      background:var(--en-surface-control,transparent);
    }

    .more {
      display:grid;
      width:28px;
      height:28px;
      padding:0;
      place-items:center;
      border:0;
      border-radius:var(--ic-radius-control);
      background:transparent;
      color:var(--en-text-secondary,var(--secondary-text-color));
      cursor:pointer;
    }

    .more:hover {
      background:var(--ic-action-hover-background,rgba(127,127,127,.14));
    }

    .more ha-icon {
      width:16px;
      height:16px;
      --mdc-icon-size:16px;
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
    const previousConfig = this.config;
    const resolutionVersion = ++this.configResolutionVersion;
    this.configSettled = false;
    this.configStorageId = this.getConfigStorageId(yamlConfig);
    this.formalConfig = yamlConfig;
    this.config = yamlConfig;
    this.timeframe = this.config.timeframe ?? "24H";
    void this.configCoordinator.resolve(this.configStorageId, yamlConfig)
      .then(async (resolved) => {
        if (resolutionVersion !== this.configResolutionVersion) return;
        const scope = getPendingTrendScope(resolved);
        const [storedPending, storedRemovals] = await Promise.all([
          this.pendingSeriesRepository.load(scope),
          this.pendingRemovalRepository.load(scope),
        ]);
        if (resolutionVersion !== this.configResolutionVersion) return;
        const formalIds = new Set(resolved.entities.map((item) => item.id).filter(Boolean));
        const formalEntities = new Set(resolved.entities.map((item) => item.entity));
        this.pendingSeries = storedPending.filter((item) =>
          !(item.id && formalIds.has(item.id)) &&
          !formalEntities.has(item.entity)
        ).map((item, index) => ({
          ...item,
          order:resolved.entities.length + index,
        }));
        if (this.pendingSeries.length !== storedPending.length) {
          await this.pendingSeriesRepository.save(scope, this.pendingSeries);
        }
        this.pendingRemovals = storedRemovals.filter((removal) =>
          resolved.entities.some((item) => matchesPendingTrendRemoval(item, removal))
        );
        if (this.pendingRemovals.length !== storedRemovals.length) {
          await this.pendingRemovalRepository.save(scope, this.pendingRemovals);
        }
        const resolvedConfig = normalizeEnergyTrendCardConfig({
          ...resolved,
          entities:[
            ...resolved.entities.filter((item) =>
              !this.pendingRemovals.some((removal) => matchesPendingTrendRemoval(item, removal))
            ),
            ...this.pendingSeries,
          ],
        });
        this.applyResolvedConfig(previousConfig,resolvedConfig);
      })
      .catch((error) => {
        console.error("[energy-trend-card] Unable to restore configuration", error);
        if (resolutionVersion !== this.configResolutionVersion) return;
        this.applyResolvedConfig(previousConfig,yamlConfig);
      });
  }

  private applyResolvedConfig(
    previous:EnergyTrendCardConfig | undefined,
    next:EnergyTrendCardConfig
  ) {
    const change = classifyTrendConfigChange(previous,next);
    this.config = next;
    this.formalConfig ??= next;
    this.timeframe = next.timeframe ?? "24H";
    this.series = applyTrendPresentationConfig(this.series,next);
    const configuredIds = new Set(next.entities.map((entity) => entity.id).filter(Boolean));
    this.hiddenSeriesIds = new Set(
      [...this.hiddenSeriesIds].filter((id) => configuredIds.has(id))
    );
    this.configSettled = true;
    this.requestUpdate();
    if (!this._hass) return;
    const needsInitialHistory = this.status === "idle" &&
      !this.series.some((item) => item.points.length > 0);
    if (change.reloadHistory || needsInitialHistory) {
      void this.loadHistory({ preserveExisting:!change.entitySetChanged });
    }
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

  private async loadHistory(options:{ preserveExisting?:boolean } = {}) {
    if (!this.config || !this._hass) return;

    const version = ++this.loadVersion;
    const preserveExisting = options.preserveExisting === true &&
      this.series.some((item) => item.points.length > 0) && this.axes.length > 0;
    if (!preserveExisting) this.status = "loading";
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
      this.errorMessage = getHistoryErrorMessage(error);
      if (preserveExisting) {
        this.status = "ready";
      } else {
        this.series = [];
        this.axes = [];
        this.status = "error";
      }
    }

    this.requestUpdate();
  }

  private changeTimeframe(timeframe: TrendTimeframe) {
    if (this.timeframe === timeframe) return;
    if (!this.config) return;
    this.timeframe = timeframe;
    this.requestUpdate();
    void this.loadHistory();
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

  private requestTrendInspector(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    target.dispatchEvent(new CustomEvent("trend-inspect-request", {
      detail: { title: this.config?.title ?? "Energy Trend" },
      bubbles: true,
      composed: true,
    }));
  }

  private openTrendAnalysis(event: CustomEvent) {
    event.stopPropagation();
    this.analysisPanelOpen = true;
    this.requestUpdate();
  }

  private closeTrendAnalysis() {
    this.analysisPanelOpen = false;
    this.requestUpdate();
  }

  private async addSeries(entityId: string) {
    if (!this.config || !this.formalConfig || !this._hass?.states[entityId]) return;
    const state = this._hass.states[entityId];
    const unit = String(state.attributes.unit_of_measurement ?? "");
    const discovered = this.discoveryMetrics.find(
      (metric) => metric.entityId === entityId
    );
    const baseId = entityId.split(".").pop() || "series";
    let id = baseId;
    let suffix = 2;
    while (this.config.entities.some((item) => item.id === id)) {
      id = `${baseId}_${suffix++}`;
    }
    const pending:TrendEntityConfig = {
          id,
          entity:entityId,
          order:this.config.entities.length,
          name:String(state.attributes.friendly_name ?? entityId),
          unit,
          category:discovered?.metricType === "energy"
            ? "energy"
            : discovered?.metricType === "cost" ? "cost" : "power",
          enabled:true,
          visible:true,
          chartMode:"area",
          decimals:2,
          autoScale:true,
    };
    const added = await this.pendingSeriesRepository.add(
      getPendingTrendScope(this.formalConfig),
      pending
    );
    if (!added) return;
    this.setConfig(this.formalConfig);
  }

  private async removeManagedSeries(entity:TrendEntityConfig, pending:boolean) {
    if (!this.formalConfig) return;
    const scope = getPendingTrendScope(this.formalConfig);
    if (pending) await this.pendingSeriesRepository.remove(scope, entity.id ?? entity.entity, entity.entity);
    else await this.pendingRemovalRepository.add(scope, entity);
    this.setConfig(this.formalConfig);
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
    const availableEntities = getTrendDiscoveryCandidates(this.discoveryMetrics)
      .filter((metric) => !configured.has(metric.entityId))
      .filter((metric) => {
        const query = this.seriesSearch.trim().toLowerCase();
        if (!query) return true;
        return metric.entityId.toLowerCase().includes(query) ||
          metric.name.toLowerCase().includes(query);
      })
      .map((metric) => metric.entityId);

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
              ${this.config.entities.length ? this.config.entities.map((entity, index) => {
                const displayName = getTrendMenuName(
                  this._hass,
                  entity.entity,
                  entity.name
                );
                const compactDisplayName = truncateMiddle(displayName, {
                  maxLength:ENTITY_ID_DISPLAY_LENGTH.compactMenu,
                });
                const seriesId = entity.id ?? entity.entity;
                const pending = this.pendingSeries.some((item) =>
                  (item.id && item.id === entity.id) || item.entity === entity.entity
                );
                const seriesColor = getTrendSeriesColor(entity.color, index, seriesId);
                return html`
                <div class="series-manager-row">
                  <ic-menu-item
                    indicator="dot"
                    style=${`--ic-select-indicator-color:${seriesColor}`}
                    .displayLabel=${compactDisplayName}
                    .rawLabel=${displayName}
                    .rawSecondaryLabel=${entity.entity}
                    >
                    <span slot="secondary">${formatEntityId(entity.entity,"compactMenu")}</span>
                    <button slot="trailing" class="more" type="button"
                      aria-label=${`Remove ${displayName}`}
                      @click=${(event:Event) => {
                        event.stopPropagation();
                        void this.removeManagedSeries(entity, pending);
                      }}>
                      <ha-icon icon="mdi:delete-outline"></ha-icon>
                    </button>
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
        @click=${this.requestTrendInspector}
        @trend-inspect-request=${this.openTrendAnalysis}>
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

      <ic-trend-analysis-panel
        .open=${this.analysisPanelOpen}
        .title=${this.config.title ?? "Energy Trend"}
        .timeframe=${this.timeframe}
        .series=${this.series}
        .status=${this.status}
        .hass=${this.hass}
        .metrics=${this.discoveryMetrics}
        @trend-analysis-close=${this.closeTrendAnalysis}
      ></ic-trend-analysis-panel>
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
