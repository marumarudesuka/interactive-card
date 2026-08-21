import { LitElement, css, html, nothing } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { normalizeAutomationSectionConfig } from "../automation/automation-config-normalizer.ts";
import { resolveAutomationScenarioRuntime } from "../automation/automation-runtime-resolver.ts";
import type { EnergyAutomationSectionConfig, NormalizedAutomationScenario, NormalizedEnergyAutomationSectionConfig } from "../automation/automation-scenario.types.ts";
import type { AutomationScenarioOpenDetail } from "./automation/automation-scenario-card.ts";
import { planCircuitCarouselAlignment } from "../helpers/circuit-carousel-layout.ts";
import "./common/section-header.ts";
import "./common/action-button.ts";
import "./automation/automation-scenario-card.ts";
import "./automation/automation-scenario-control-modal.ts";
import "./automation/automation-scenario-manager.ts";
import "../editors/automation/automation-scenario-creation-flow.ts";
import type {ScenarioCreatedDetail} from "../editors/automation/automation-scenario-creation-flow.ts";
import type {ScenarioManagerChangeDetail} from "./automation/automation-scenario-manager.ts";
import "../editors/energy-automation-section-editor.ts";

export class EnergyAutomationSection extends LitElement {
  static getConfigElement() { return document.createElement("energy-automation-section-editor"); }
  static getStubConfig():EnergyAutomationSectionConfig {
    return { type:"custom:energy-automation-section",title:"Automation",scenarios:[] };
  }
  static properties = { config:{ attribute:false }, hass:{ attribute:false }, selectedScenarioId:{ state:true }, visibleCount:{ state:true }, settledIndex:{ state:true },managerOpen:{state:true},creationOpen:{state:true} };
  config?:NormalizedEnergyAutomationSectionConfig;
  private sourceConfig:EnergyAutomationSectionConfig={type:"custom:energy-automation-section",title:"Automation",scenarios:[]};
  private _hass?:HomeAssistant;
  private selectedScenarioId = "";
  private visibleCount:1|2|3 = 3;
  private settledIndex = 0;
  private trackCardWidth = 0;
  private trackStep = 0;
  private trackGap = 16;
  private resizeObserver?:ResizeObserver;
  private scrollSettleTimer?:number;
  private managerOpen=false;
  private creationOpen=false;

  set hass(value:HomeAssistant|undefined) { this._hass = value; this.requestUpdate(); }
  get hass():HomeAssistant|undefined { return this._hass; }

  setConfig(config:EnergyAutomationSectionConfig) {
    this.sourceConfig={...config,type:"custom:energy-automation-section",title:config.title??"Automation",scenarios:(config.scenarios??[]).map(scenario=>({...scenario}))};
    this.config = normalizeAutomationSectionConfig(config);
  }

  getGridOptions() { return { columns:"full", min_rows:3 }; }
  getCardSize() { return Math.max(3,Math.ceil((this.config?.scenarios.filter(item=>item.visible).length ?? 1) / 2) * 3); }

  static styles = css`
    :host { display:block; width:100%; min-width:0; color:var(--primary-text-color); container-type:inline-size; }
    .carousel-shell { position:relative; width:100%; min-width:0; box-sizing:border-box; }
    .carousel-viewport { width:100%; min-width:0; overflow-x:auto; overflow-y:hidden; scroll-behavior:smooth; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none; }
    .carousel-viewport::-webkit-scrollbar { display:none; }
    .track { display:flex; width:max-content; min-width:0; gap:var(--automation-grid-gap,16px); align-items:stretch; }
    .carousel-item { display:grid; width:var(--automation-track-card-width); min-width:0; flex:0 0 var(--automation-track-card-width); scroll-snap-align:start; scroll-snap-stop:always; }
    .static-grid .carousel-viewport { overflow:visible; scroll-snap-type:none; }
    .static-grid .track { display:grid; width:100%; grid-template-columns:repeat(var(--automation-static-columns),minmax(0,1fr)); }
    .static-grid .carousel-item { width:auto; min-width:0; }
    automation-scenario-card {
      display:grid;
      width:100%;
      min-width:0;
      box-sizing:border-box;
      align-self:stretch;
    }
    .navigation {
      position:absolute; z-index:20; top:50%; display:grid; width:38px; height:38px; place-items:center;
      padding:0; border:1px solid rgba(255,255,255,.18); border-radius:50%;
      background:rgba(30,30,30,.2); color:var(--primary-text-color); cursor:pointer;
      opacity:0; pointer-events:none; transform:translateY(-50%);
      backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow:0 8px 24px rgba(0,0,0,.24);
      transition:opacity 300ms ease,background 180ms ease;
    }
    .carousel-shell:hover .navigation { opacity:1; pointer-events:auto; }
    .navigation.left { left:16px; }
    .navigation.right { right:16px; }
    .navigation:hover { background:rgba(255,255,255,.3); }
    .navigation ha-icon { width:20px; height:20px; --mdc-icon-size:20px; transform:translateY(-2px); }
    .empty-state { display:flex; min-height:72px; align-items:center; justify-content:center; border:var(--en-border,1px solid var(--divider-color)); border-radius:var(--ic-radius-card,16px); color:var(--secondary-text-color); font-size:14px; }
    @media (hover:none) { .navigation { opacity:1; pointer-events:auto; } }
  `;

  protected firstUpdated() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const previousVisibleCount = this.visibleCount;
      const scenarioCount=this.config?.scenarios.filter(item=>item.visible).length??0;
      const previousUsesCarousel = scenarioCount > previousVisibleCount;
      const nextVisibleCount = this.resolveVisibleCount(width);
      const gap = nextVisibleCount === 1 ? 10 : 16;
      const cardWidth = Math.max(0,(width - gap * (nextVisibleCount - 1)) / nextVisibleCount);
      const nextTrackStep = cardWidth + gap;
      if (nextVisibleCount === previousVisibleCount && Math.abs(nextTrackStep - this.trackStep) <= .5) return;
      const nextUsesCarousel = scenarioCount > nextVisibleCount;
      const alignment = planCircuitCarouselAlignment({
        previousVisibleCount,nextVisibleCount,previousUsesCarousel,nextUsesCarousel,
        settledIndex:this.settledIndex,itemCount:scenarioCount,nextTrackStep,
      });
      this.visibleCount = nextVisibleCount;
      this.trackGap = gap;
      this.trackCardWidth = cardWidth;
      this.trackStep = nextTrackStep;
      this.settledIndex = alignment.settledIndex;
      this.requestUpdate();
      void this.updateComplete.then(() => { if (this.viewport) this.viewport.scrollLeft = alignment.scrollLeft; });
    });
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    if (this.scrollSettleTimer !== undefined) window.clearTimeout(this.scrollSettleTimer);
    super.disconnectedCallback();
  }

  private resolveVisibleCount(width:number):1|2|3 {
    if (width >= 960) return 3;
    if (width >= 600) return 2;
    return 1;
  }

  private get viewport():HTMLElement|null { return this.renderRoot.querySelector<HTMLElement>(".carousel-viewport"); }

  private scrollByCard(direction:-1|1) {
    if (!this.viewport || !this.trackStep) return;
    const maxIndex = Math.max(0,(this.config?.scenarios.length ?? 0) - this.visibleCount);
    const target = Math.max(0,Math.min(maxIndex,this.settledIndex + direction));
    this.settledIndex = target;
    this.viewport.scrollTo({ left:target * this.trackStep,behavior:"smooth" });
  }

  private settleScroll() {
    if (!this.viewport || !this.trackStep) return;
    if (this.scrollSettleTimer !== undefined) window.clearTimeout(this.scrollSettleTimer);
    this.scrollSettleTimer = window.setTimeout(() => {
      const maxIndex = Math.max(0,(this.config?.scenarios.length ?? 0) - this.visibleCount);
      this.settledIndex = Math.max(0,Math.min(maxIndex,Math.round((this.viewport?.scrollLeft ?? 0) / this.trackStep)));
      this.requestUpdate();
    },140);
  }

  private resolvedScenarios():NormalizedAutomationScenario[] {
    return this.config?.scenarios.filter(scenario=>scenario.visible).map((scenario) => resolveAutomationScenarioRuntime(this._hass,scenario)) ?? [];
  }

  private commitScenarios(scenarios:EnergyAutomationSectionConfig["scenarios"]){
    this.sourceConfig={...this.sourceConfig,scenarios};
    this.config=normalizeAutomationSectionConfig(this.sourceConfig);
    this.settledIndex=0;
    this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.sourceConfig},bubbles:true,composed:true}));
  }

  render() {
    if (!this.config) return nothing;
    const scenarios = this.resolvedScenarios();
    const selected = scenarios.find((scenario) => scenario.id === this.selectedScenarioId);
    const selectedConfig = this.config.scenarios.find((scenario) => scenario.id === this.selectedScenarioId);
    const usesCarousel = scenarios.length > this.visibleCount;
    const staticColumns = Math.max(1,Math.min(scenarios.length,this.visibleCount));
    const maxIndex = Math.max(0,scenarios.length - this.visibleCount);
    return html`
      <ic-section-header .title=${this.config.title}><ic-action-button slot="actions" icon="+" label="Manage scenarios" @action-click=${()=>{this.managerOpen=true;}}></ic-action-button></ic-section-header>
      ${scenarios.length?html`<div class="carousel-shell ${usesCarousel ? "" : "static-grid"}">
        <div class="carousel-viewport" @scroll=${usesCarousel ? this.settleScroll : undefined}>
          <div class="track" style=${usesCarousel
            ? `--automation-track-card-width:${this.trackCardWidth}px;--automation-grid-gap:${this.trackGap}px`
            : `--automation-static-columns:${staticColumns};--automation-grid-gap:${this.trackGap}px`}>
            ${scenarios.map((scenario) => html`<div class="carousel-item"><automation-scenario-card .scenario=${scenario} @automation-scenario-open=${(event:CustomEvent<AutomationScenarioOpenDetail>) => { this.selectedScenarioId = event.detail.scenarioId; }}></automation-scenario-card></div>`)}
          </div>
        </div>
        ${usesCarousel && this.settledIndex > 0 ? html`<button class="navigation left" type="button" aria-label="Previous scenarios" @click=${() => this.scrollByCard(-1)}><ha-icon icon="mdi:chevron-left"></ha-icon></button>` : nothing}
        ${usesCarousel && this.settledIndex < maxIndex ? html`<button class="navigation right" type="button" aria-label="Next scenarios" @click=${() => this.scrollByCard(1)}><ha-icon icon="mdi:chevron-right"></ha-icon></button>` : nothing}
      </div>`:html`<div class="empty-state">No scenarios shown. Use + to manage scenarios.</div>`}
      <automation-scenario-control-modal .open=${Boolean(selected)} .hass=${this._hass} .scenario=${selected}
        .hasStatusBinding=${Boolean(selectedConfig?.statusEntity.trim())}
        .strategyLabel=${selectedConfig?.strategy?.label?.trim() || "Strategy"}
        .strategyEntityId=${selectedConfig?.strategy?.entity?.trim() || ""}
        .manualOverrideEntityId=${selectedConfig?.manualOverrideEntity?.trim() || ""}
        @automation-control-close=${() => { this.selectedScenarioId = ""; }}></automation-scenario-control-modal>
      <automation-scenario-manager .open=${this.managerOpen} .scenarios=${this.sourceConfig.scenarios}
        @scenario-manager-close=${()=>{this.managerOpen=false;}}
        @scenario-manager-change=${(event:CustomEvent<ScenarioManagerChangeDetail>)=>this.commitScenarios(event.detail.scenarios)}
        @scenario-manager-add=${()=>{this.managerOpen=false;this.creationOpen=true;}}></automation-scenario-manager>
      <automation-scenario-creation-flow .open=${this.creationOpen} .hass=${this._hass} .existingIds=${this.sourceConfig.scenarios.map(item=>item.id??"")}
        @scenario-creation-close=${()=>{this.creationOpen=false;}}
        @scenario-created=${(event:CustomEvent<ScenarioCreatedDetail>)=>{this.commitScenarios([...this.sourceConfig.scenarios,event.detail.scenario]);this.creationOpen=false;}}></automation-scenario-creation-flow>
    `;
  }
}

customElements.define("energy-automation-section",EnergyAutomationSection);
