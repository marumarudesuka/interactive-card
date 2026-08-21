import { LitElement, html, css } from "lit";

import type { HomeAssistant } from "custom-card-helpers";

import "./kpi-picker";
import "./energy-kpi-card";
import "./common/section-header";
import "./common/action-button";
import "./common/overlay/popover/ic-popover";
import "./kpi/kpi-card-builder-dialog";
import {
  availableKPIs,
  defaultKpiTemplates,
} from "../data/kpi-config";
import {
  getKpiCardKey,
} from "../data/kpi-card-model";
import { KpiCardManager } from "../data/kpi-card-manager";
import { createKpiDiscoveryResults, discoverEnergyMetrics } from "../discovery/discovery-consumers.ts";
import { normalizeEnergyKpiSectionConfig } from "../config/config-normalizer";
import type {
  CustomKpiConfig,
  EnergyKpiSectionConfig,
  KpiTemplate,
} from "../config/config.types";
import { validateKpiCardConfig } from "../config/config-validation";
import { kpiCardVisualContextStyle } from "../styles/kpi-card-visual-context";
import { mergeKpiConfigSources } from "../config/kpi-config-merger";
import { buildKpiRepositorySnapshot } from "../config/kpi-config-persistence";
import {
  getPendingKpiScope,
  LocalStoragePendingKpiRepository,
} from "../repositories/local-storage-pending-kpi-repository.ts";
import type {
  KpiConfigSources,
  ResolvedKpiConfig,
} from "../types/kpi-config-resolution";
import type { KpiCardDraft } from "../types/kpi-card-builder";
import type { KpiCardBuilderSubmitDetail } from "./kpi/kpi-card-builder-dialog";
import type { KpiInspectRequestDetail } from "./kpi/metric-inspector";
import { energyGridStyle } from "../styles/energy-grid";
import "../editors/energy-kpi-section-editor.ts";
import "./kpi/metric-inspector";
import { getKpiCardGeometryStyle } from "../helpers/kpi-card-geometry.ts";
import {
  getEligiblePendingKpiCards,
  resolveEffectiveKpiCards,
} from "../helpers/kpi-effective-card-resolver.ts";

const kpiTemplates = defaultKpiTemplates;
const kpiCardManager = new KpiCardManager(kpiTemplates);

function isCustomKpi(card: CustomKpiConfig): boolean {
  return (
    card.type === "custom" ||
    card.id?.startsWith("custom-") === true
  );
}




export class EnergyKpiSection extends LitElement {

  static getConfigElement() {
    return document.createElement("energy-kpi-section-editor");
  }



  private _hass!: HomeAssistant;
  private readonly _pendingRepository = new LocalStoragePendingKpiRepository();
  private _pendingCards:CustomKpiConfig[] = [];
  private _yamlCards: CustomKpiConfig[] = [];
  private _discovery: KpiConfigSources["discovery"] = {};
  private _resolutionVersion = 0;
  private _hasRepositoryResolution = false;



  config:EnergyKpiSectionConfig = {

    title:"Energy Overview",

    cards:[]

  };



  private headerMenuOpen = false;
  private _builderOpen = false;
  private _builderMode: "create" | "edit" = "create";
  private _builderDraft: KpiCardDraft = {};
  private _editingCardKey?: string;

  private _quickHiddenKpis = new Set<string>();
  private _inspectedKpi?: CustomKpiConfig;






  private _entityLocks: Record<string, boolean> = {};

  setConfig(config:Partial<EnergyKpiSectionConfig>){
    this.config=normalizeEnergyKpiSectionConfig(config);
    this._yamlCards = this.config.cards.map((card) => ({
      ...card,
      history: Array.isArray(card.history) ? [...card.history] : undefined,
    }));

    if(this._hass){
      this._startConfigResolution(true);
    }
  }

  private _captureEntityLocks(
    resolved: readonly ResolvedKpiConfig[]
  ){
    const locks: Record<string, boolean> = {};
    for(const item of resolved){
      const key = getKpiCardKey(item.config);
      if(key && item.metadata.entityLocked){
        locks[key] = true;
      }
    }
    this._entityLocks = locks;
  }

  set hass(hass:HomeAssistant){
    this._hass=hass;
    this._startConfigResolution(!this._hasRepositoryResolution);
    this.requestUpdate();
  }

  private _createDiscoveryResults(): KpiConfigSources["discovery"] {
    if(!this._hass) return {};
    return createKpiDiscoveryResults(
      discoverEnergyMetrics(this._hass),
      kpiTemplates
    );
  }

  private _startConfigResolution(applySynchronousBaseline: boolean){
    const discovery = this._createDiscoveryResults();
    this._discovery = discovery;

    if(applySynchronousBaseline){
      const baseline = resolveEffectiveKpiCards({
        templates: kpiTemplates,
        formalCards: this._yamlCards,
        discovery,
      });
      this._captureEntityLocks(baseline.flatMap((item) => item.resolved ? [item.resolved] : []));
      this.config = {
        ...this.config,
        cards: baseline.map((item) => item.config),
      };
      this.requestUpdate();
    }

    const version = ++this._resolutionVersion;
    void this._pendingRepository.load(getPendingKpiScope(this.config)).then((stored) => {
      if(version !== this._resolutionVersion) return;
      this._pendingCards = getEligiblePendingKpiCards(this._yamlCards,stored);
      if (this._pendingCards.length !== stored.length) {
        void this._pendingRepository.save(getPendingKpiScope(this.config), this._pendingCards);
      }
      const effective = resolveEffectiveKpiCards({
        templates:kpiTemplates,
        formalCards:this._yamlCards,
        pendingCards:this._pendingCards,
        discovery,
      });
      const cards = effective.map((item) => item.config);
      this._hasRepositoryResolution = true;
      this._captureEntityLocks(effective.flatMap((item) => item.resolved ? [item.resolved] : []));
      this.config = {
        ...this.config,
        cards,
      };
      this.requestUpdate();
    }).catch((error) => {
      console.error("[KPI] Unable to resolve KPI configuration", error);
    });
  }









  static styles = [energyGridStyle, kpiCardVisualContextStyle, css`



    :host{


      display:block;
      width:100%;
      min-width:0;
      position:relative;
      container-type:inline-size;


    }






    .draggable{

      cursor:grab;
      min-width:0;

    }


    .draggable:active{

      cursor:grabbing;

    }


    .draggable.dragging{

      opacity:.6;

      transform:scale(.98);

    }

  `];









  private toggleHeaderMenu() {
    this.headerMenuOpen = !this.headerMenuOpen;
    this.requestUpdate();
  }

  private _toggleQuickKpi(e:CustomEvent<CustomKpiConfig>){
    const key = getKpiCardKey(e.detail);
    if(!key) return;
    const next = new Set(this._quickHiddenKpis);
    next.has(key) ? next.delete(key) : next.add(key);
    this._quickHiddenKpis = next;
    this.requestUpdate();
  }

  private _openMetricInspector(event: CustomEvent<KpiInspectRequestDetail>) {
    event.preventDefault();
    event.stopPropagation();
    this._inspectedKpi = { ...event.detail.kpi };
    this.requestUpdate();
  }

  private _closeMetricInspector() {
    this._inspectedKpi = undefined;
    this.requestUpdate();
  }

  private _commitConfigChange(cards = this.config.cards){
    this._resolutionVersion++;

    const snapshot = buildKpiRepositorySnapshot({
      cards,
      templates: kpiTemplates,
      yamlCards: this._yamlCards,
      discovery: this._discovery,
    });
    const resolved = mergeKpiConfigSources({
      templates: kpiTemplates,
      repositoryCards: snapshot,
      yamlCards: this._yamlCards,
      discovery: this._discovery,
    });
    this._captureEntityLocks(resolved);
    const remaining = resolved.map((item) => item.config);
    const orderedCards: CustomKpiConfig[] = [];

    for(const preferred of cards){
      const key = getKpiCardKey(preferred);
      const index = remaining.findIndex(
        (candidate) => getKpiCardKey(candidate) === key
      );
      if(index >= 0){
        orderedCards.push(...remaining.splice(index, 1));
      }
    }

    orderedCards.push(...remaining);

    this._hasRepositoryResolution = true;
    this.config = {
      ...this.config,
      cards: orderedCards,
    };
    this.requestUpdate();

  }









  private async _toggleKpi(e:any){
    const item = e.detail as KpiTemplate;
    if(!item || !item.id){
      return;
    }
    const templateId = item.id;

    if (this._yamlCards.some((card) => getKpiCardKey(card) === templateId)) {
      console.warn(`[KPI] ${templateId} is stored in Lovelace; change its collection state in the Home Assistant editor.`);
      return;
    }
    const current = this.config.cards.find((card) => card.id === templateId);
    const enabled = current?.enabled !== false;
    const pending = this._pendingCards.find((card) => card.id === templateId);
    const scope = getPendingKpiScope(this.config);
    const discovered = this._discovery?.[templateId]?.[0]?.entityId;
    await this._pendingRepository.upsert(scope, {
      ...pending,
      id:templateId, title:item.title, icon:item.icon, category:item.category,
      unit:item.unit, entity:pending?.entity || discovered || item.entity || item.defaultEntity,
      enabled:!enabled, autoScale:item.autoScale, decimals:item.decimals,
    });
    this._startConfigResolution(true);
  }

  private _openCreateBuilder(){
    this._builderMode = "create";
    this._builderDraft = {};
    this._editingCardKey = undefined;
    this._builderOpen = true;
    this.headerMenuOpen = false;
    this.requestUpdate();
  }

  private _openEditBuilder(e:CustomEvent<CustomKpiConfig>){
    const card = e.detail;
    if(!card) return;
    const key = getKpiCardKey(card);
    if (!key || !this._pendingCards.some((item) => getKpiCardKey(item) === key)) {
      console.warn("[KPI] Formal Lovelace KPI details are edited through the Home Assistant card editor.");
      return;
    }
    this._builderMode = "edit";
    this._builderDraft = { ...card };
    this._editingCardKey = getKpiCardKey(card);
    this._builderOpen = true;
    this.headerMenuOpen = false;
    this.requestUpdate();
  }

  private _closeBuilder(){
    this._builderOpen = false;
    this._editingCardKey = undefined;
    this.requestUpdate();
  }

  private async _submitBuilder(
    e:CustomEvent<KpiCardBuilderSubmitDetail>
  ){
    e.stopPropagation();
    const { config, mode } = e.detail;

    const scope = getPendingKpiScope(this.config);
    if(mode === "edit" && this._editingCardKey &&
      this._pendingCards.some((item) => getKpiCardKey(item) === this._editingCardKey)){
      const next = this._pendingCards.map((item) =>
        getKpiCardKey(item) === this._editingCardKey ? { ...config } : item
      );
      await this._pendingRepository.save(scope, next);
    }else if(mode === "create"){
      const customOrder = this.config.cards.filter(isCustomKpi).length;
      await this._pendingRepository.add(scope, {
        ...config,
        type: "custom",
        name: config.title,
        order: config.order ?? customOrder,
      });
    }
    this._closeBuilder();
    this._startConfigResolution(true);
  }

  private async _toggleCustomKpi(e:CustomEvent<CustomKpiConfig>){
    const card = e.detail;
    const key = card ? getKpiCardKey(card) : undefined;
    if(!card || !key) return;
    const pending = this._pendingCards.find((item) => getKpiCardKey(item) === key);
    if (!pending) {
      console.warn("[KPI] Formal Lovelace KPIs are managed through the Home Assistant card editor.");
      return;
    }
    await this._pendingRepository.upsert(getPendingKpiScope(this.config), {
      ...pending,
      enabled:pending.enabled === false,
    });
    this._startConfigResolution(true);
  }

  private _removeKpi(e:any){
    const item = e.detail;
    if(!item || !item.id) return;
    const result = kpiCardManager.disable(this.config.cards, item.id);
    if(result.changed) this._commitConfigChange(result.cards);
  }

  private async _deleteCustomKpi(e:CustomEvent<{ id:string }>){
    e.stopPropagation();
    const id = e.detail?.id;
    if(!id) return;
    if(!this._pendingCards.some((item) => getKpiCardKey(item) === id)) return;
    await this._pendingRepository.remove(getPendingKpiScope(this.config), id);
    this._closeBuilder();
    this._startConfigResolution(true);
  }

  private _handleUpdateCardEntity(e:any){
    const detail = e.detail || {};
    const id = detail.id;
    const entityId = detail.entity;
    if(!id || !entityId) return;
    const result = kpiCardManager.updateEntity(
      this.config.cards,
      id,
      entityId,
      this._entityLocks
    );
    if(result.locked){
      console.warn(`[KPI] YAML entity present for ${id}; refusing to overwrite with ${entityId}`);
    }
    if(result.changed) this._commitConfigChange(result.cards);
  }









  render(){



    if(!this.config){


      return html``;


    }







    return html`




      <ic-section-header .title=${this.config.title} level="section">
        <ic-popover
          slot="actions"
          style="--popover-min-width:280px"
          .open=${this.headerMenuOpen}
          placement="bottom-end"
          .offset=${8}
          .closeOnOutsideClick=${true}
          @popover-close=${() => {
            this.headerMenuOpen = false;
            this.requestUpdate();
          }}
        >
          <ic-action-button
            slot="anchor"
            icon="+"
            label="KPI actions"
            @action-click=${this.toggleHeaderMenu}
          ></ic-action-button>
          <kpi-picker
            .items=${availableKPIs}
            .customItems=${this.config.cards.filter(isCustomKpi)}
            .quickView=${false}
            .selectedItems=${this.config.cards
              .filter((card:any) => Boolean(card.enabled) &&
                !this._quickHiddenKpis.has(getKpiCardKey(card) ?? ""))
              .map((card:any) => card.id ?? card.entity)}
            .hass=${this._hass}
            @toggle-kpi=${this._toggleKpi}
            @create-custom-kpi=${this._openCreateBuilder}
            @edit-custom-kpi=${this._openEditBuilder}
            @toggle-custom-kpi=${this._toggleCustomKpi}
            @remove-kpi=${this._removeKpi}
            @update-card-entity=${this._handleUpdateCardEntity}
            @quick-toggle-kpi=${this._toggleQuickKpi}
          ></kpi-picker>
        </ic-popover>
      </ic-section-header>








      <ic-kpi-card-builder-dialog
        .open=${this._builderOpen}
        .mode=${this._builderMode}
        .hass=${this._hass}
        .draft=${this._builderDraft}
        .existingIds=${this.config.cards
          .map((card) => card.id)
          .filter((id): id is string => Boolean(id))}
        @kpi-builder-close=${this._closeBuilder}
        @kpi-builder-submit=${this._submitBuilder}
        @kpi-builder-delete=${this._deleteCustomKpi}
      ></ic-kpi-card-builder-dialog>











      <div class="grid energy-card-grid kpi-card-visual-context kpi-card-visual-context-responsive"
        style=${this.config.cardHeight
          ? `--kpi-card-height:${this.config.cardHeight}px;${getKpiCardGeometryStyle(this.config.cardHeight)}`
          : ""}>

        ${
          this.config.cards
            .filter((card:any) => Boolean(card.enabled))
            .filter((card:any) =>
              !this._quickHiddenKpis.has(getKpiCardKey(card) ?? ""))
            .map((card:any)=>{
              const validation = validateKpiCardConfig(card);
              return html`
              <div class="draggable">
                <energy-kpi-card
                  .config=${card}
                  .hass=${this._hass}
                  .validation=${validation}
                  @kpi-inspect-request=${this._openMetricInspector}
                  @edit-custom-kpi=${this._openEditBuilder}
                ></energy-kpi-card>
              </div>

            `})

        }

      </div>

      <ic-metric-inspector
        .open=${Boolean(this._inspectedKpi)}
        .hass=${this._hass}
        .kpi=${this._inspectedKpi}
        @metric-inspector-close=${this._closeMetricInspector}
      ></ic-metric-inspector>





    `;


  }

  getGridOptions(){
    return { columns:"full" };
  }

}





customElements.define(

  "energy-kpi-section",

  EnergyKpiSection

);
