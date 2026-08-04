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
  createDiscoveryTemplates,
  getKpiCardKey,
} from "../data/kpi-card-model";
import { KpiCardManager } from "../data/kpi-card-manager";
import { discoverForTemplates } from "../data/entity-discovery";
import { dispatchConfigChanged } from "../config/config-events";
import { normalizeEnergyKpiSectionConfig } from "../config/config-normalizer";
import type {
  CustomKpiConfig,
  EnergyKpiSectionConfig,
  KpiTemplate,
} from "../config/config.types";
import { validateKpiCardConfig } from "../config/config-validation";
import { mergeKpiConfigSources } from "../config/kpi-config-merger";
import { buildKpiRepositorySnapshot } from "../config/kpi-config-persistence";
import { KpiConfigCoordinator } from "../config/kpi-config-coordinator";
import { LocalStorageKpiConfigRepository } from "../repositories/local-storage-kpi-config-repository";
import type {
  KpiConfigSources,
  ResolvedKpiConfig,
} from "../types/kpi-config-resolution";
import type { KpiCardDraft } from "../types/kpi-card-builder";
import type { KpiCardBuilderSubmitDetail } from "./kpi/kpi-card-builder-dialog";
import { energyGridStyle } from "../styles/energy-grid";

const kpiTemplates = defaultKpiTemplates;
const kpiCardManager = new KpiCardManager(kpiTemplates);

function isCustomKpi(card: CustomKpiConfig): boolean {
  return (
    card.type === "custom" ||
    card.id?.startsWith("custom-") === true
  );
}




export class EnergyKpiSection extends LitElement {



  private _hass!: HomeAssistant;
  private readonly _repository = new LocalStorageKpiConfigRepository();
  private readonly _coordinator = new KpiConfigCoordinator(
    this._repository,
    kpiTemplates
  );
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

  private _dragIndex: number | null = null;






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
    return discoverForTemplates(
      this._hass,
      createDiscoveryTemplates(kpiTemplates)
    );
  }

  private _startConfigResolution(applySynchronousBaseline: boolean){
    const discovery = this._createDiscoveryResults();
    this._discovery = discovery;

    if(applySynchronousBaseline){
      const baseline = mergeKpiConfigSources({
        templates: kpiTemplates,
        yamlCards: this._yamlCards,
        discovery,
      });
      this._captureEntityLocks(baseline);
      this.config = {
        ...this.config,
        cards: baseline.map((item) => item.config),
      };
      this.requestUpdate();
    }

    const version = ++this._resolutionVersion;
    void this._coordinator.resolve({
      yamlCards: this._yamlCards,
      discovery,
    }).then((resolved) => {
      if(version !== this._resolutionVersion) return;
      this._hasRepositoryResolution = true;
      this._captureEntityLocks(resolved);
      this.config = {
        ...this.config,
        cards: resolved.map((item) => item.config),
      };
      this.requestUpdate();
    }).catch((error) => {
      console.error("[KPI] Unable to resolve KPI configuration", error);
    });
  }









  static styles = [energyGridStyle, css`



    :host{


      display:block;
      width:100%;
      min-width:0;
      position:relative;
      container-type:inline-size;


    }






    .grid{
      --kpi-card-height:170px;
      --kpi-padding:20px;
      --kpi-value-size:42px;
      --kpi-unit-size:16px;
      --kpi-icon-size:64px;
      --kpi-icon-symbol-size:30px;
      --kpi-sparkline-display:none;
      --kpi-chart-action-display:none;
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

    @container (max-width:1200px){
      .grid{
        --kpi-card-height:160px;
        --kpi-padding:18px;
        --kpi-value-size:40px;
        --kpi-icon-size:58px;
        --kpi-icon-symbol-size:28px;
      }
    }

    @container (max-width:599px){
      .grid{
        --kpi-card-height:150px;
        --kpi-padding:14px;
        --kpi-value-size:clamp(16px,7vw,24px);
        --kpi-unit-size:13px;
        --kpi-icon-size:46px;
        --kpi-icon-symbol-size:23px;
      }
    }

  `];









  private toggleHeaderMenu() {
    this.headerMenuOpen = !this.headerMenuOpen;
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

    void this._coordinator.saveUserCards(snapshot).catch((error) => {
      console.error("[KPI] Unable to save KPI configuration", error);
    });

    dispatchConfigChanged(this, this.config);
  }









  private _toggleKpi(e:any){
    const item = e.detail as KpiTemplate;
    if(!item || !item.id){
      return;
    }

    const cards = kpiCardManager.toggleTemplate(
      this.config.cards,
      item
    ).cards;

    this._commitConfigChange(cards);
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

  private _submitBuilder(
    e:CustomEvent<KpiCardBuilderSubmitDetail>
  ){
    e.stopPropagation();
    const { config, mode } = e.detail;

    if(mode === "edit" && this._editingCardKey){
      const result = kpiCardManager.update(
        this.config.cards,
        this._editingCardKey,
        config
      );
      if(result.changed) this._commitConfigChange(result.cards);
    }else{
      const customOrder = this.config.cards.filter(isCustomKpi).length;
      const result = kpiCardManager.create(this.config.cards, {
        ...config,
        type: "custom",
        name: config.title,
        order: config.order ?? customOrder,
      });
      if(result.changed) this._commitConfigChange(result.cards);
    }

    this._closeBuilder();
  }

  private _toggleCustomKpi(e:CustomEvent<CustomKpiConfig>){
    const card = e.detail;
    const key = card ? getKpiCardKey(card) : undefined;
    if(!card || !key) return;
    const result = card.enabled
      ? kpiCardManager.disable(this.config.cards, key)
      : kpiCardManager.enable(this.config.cards, key);
    if(result.changed) this._commitConfigChange(result.cards);
  }

  private _removeKpi(e:any){
    const item = e.detail;
    if(!item || !item.id) return;
    const result = kpiCardManager.disable(this.config.cards, item.id);
    if(result.changed) this._commitConfigChange(result.cards);
  }

  private _deleteCustomKpi(e:CustomEvent<{ id:string }>){
    e.stopPropagation();
    const id = e.detail?.id;
    if(!id) return;
    const card = this.config.cards.find(
      (item) => getKpiCardKey(item) === id
    );
    if(!card || !isCustomKpi(card)) return;
    const result = kpiCardManager.remove(this.config.cards, id);
    if(result.changed) this._commitConfigChange(result.cards);
    this._closeBuilder();
  }

  private _handleSetCardEntity(e:any){
    const detail = e.detail || {};
    const key = detail.key;
    const entityId = detail.entity;
    if(!key || !entityId){
      detail.result = {
        success: false,
        reason: "Unable to identify the KPI card or entity",
      };
      return;
    }
    const cardExists = this.config.cards.some(
      (card) => getKpiCardKey(card) === key
    );
    if(!cardExists){
      detail.result = {
        success: false,
        reason: "KPI card configuration not found",
      };
      return;
    }
    const result = kpiCardManager.updateEntity(
      this.config.cards,
      key,
      entityId,
      this._entityLocks
    );
    if(result.locked){
      detail.result = {
        success: false,
        reason: "Entity managed by YAML configuration",
      };
      return;
    }
    if(result.changed){
      this._commitConfigChange(result.cards);
    }
    detail.result = { success: true };
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

  private _handleUpdateCardSettings(e:any){
    const detail = e.detail || {};
    const key = detail.key;
    if(!key) return;

    const result = kpiCardManager.update(this.config.cards, key, {
      subtitle: detail.subtitle ?? "",
      trend: undefined,
      trendMode: detail.trendMode ?? "none",
    });

    if(result.changed) this._commitConfigChange(result.cards);
  }

  private _handleDeleteCard(e:CustomEvent<{ id:string }>){
    e.stopPropagation();
    const id = e.detail?.id;
    if(!id) return;
    const card = this.config.cards.find(
      (item) => getKpiCardKey(item) === id
    );
    if(!card) return;

    const result = isCustomKpi(card)
      ? kpiCardManager.remove(this.config.cards, id)
      : kpiCardManager.disable(this.config.cards, id);
    if(result.changed) this._commitConfigChange(result.cards);
  }









  private _onDragStart(e: DragEvent, idx:number){
    const dt = (e.dataTransfer as DataTransfer | null);
    if(dt){
      dt.setData("text/plain", String(idx));
      dt.effectAllowed = 'move';
    }
    this._dragIndex = idx;
  }

  private _onDragOver(e: DragEvent){
    e.preventDefault();
    const dt = e.dataTransfer;
    if(dt) dt.dropEffect = 'move';
  }

  private _onDrop(e: DragEvent, idx:number){
    e.preventDefault();
    const fromStr = e.dataTransfer?.getData("text/plain");
    let from = this._dragIndex;
    if(fromStr) from = parseInt(fromStr,10);
    const to = idx;
    if(from == null || isNaN(from)) return;
    if(from === to) return;
    const result = kpiCardManager.reorder(this.config.cards, from, to);
    if(result.changed) this._commitConfigChange(result.cards);
    this._dragIndex = null;
  }

  private _onDragEnd(_e: DragEvent){
    this._dragIndex = null;
    this.requestUpdate();
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
            .selectedItems=${this.config.cards
              .filter((card:any) => Boolean(card.enabled))
              .map((card:any) => card.id ?? card.entity)}
            .hass=${this._hass}
            @toggle-kpi=${this._toggleKpi}
            @create-custom-kpi=${this._openCreateBuilder}
            @edit-custom-kpi=${this._openEditBuilder}
            @toggle-custom-kpi=${this._toggleCustomKpi}
            @remove-kpi=${this._removeKpi}
            @update-card-entity=${this._handleUpdateCardEntity}
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











      <div class="grid energy-card-grid">

        ${
          this.config.cards
            .filter((card:any) => Boolean(card.enabled))
            .map((card:any, idx:number)=>{
              const validation = validateKpiCardConfig(card);
              return html`
              <div class="draggable" draggable="true"
                @dragstart=${(e:DragEvent)=>this._onDragStart(e, idx)}
                @dragover=${(e:DragEvent)=>this._onDragOver(e)}
                @drop=${(e:DragEvent)=>this._onDrop(e, idx)}
                @dragend=${(e:DragEvent)=>this._onDragEnd(e)}
              >
                <energy-kpi-card
                  .config=${card}
                  .hass=${this._hass}
                  .validation=${validation}
                  @edit-custom-kpi=${this._openEditBuilder}
                  @set-card-entity=${(ev:any)=>{ ev.stopPropagation(); this._handleSetCardEntity(ev); }}
                  @update-kpi-card-settings=${(ev:any)=>{ ev.stopPropagation(); this._handleUpdateCardSettings(ev); }}
                  @delete-kpi-card=${this._handleDeleteCard}
                ></energy-kpi-card>
              </div>

            `})

        }

      </div>





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
