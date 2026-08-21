import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import { defaultCircuitConfigs } from "../data/circuit-config";
import { resolveActiveCircuits } from "../helpers/circuit-utils";
import {
  getCircuitStaticColumnCount,
  planCircuitCarouselAlignment,
} from "../helpers/circuit-carousel-layout.ts";
import {
  getPendingCircuitScope,
  loadPendingCircuitsForConfig,
  LocalStoragePendingCircuitRepository,
} from "../repositories/local-storage-pending-circuit-repository.ts";
import type {
  CircuitConfig,
  CircuitConfigInput,
  EnergyCircuitSectionConfig,
} from "../types/circuit";
import type { CircuitConfigChangedDetail } from "./circuit/circuit-settings-modal";
import type { CircuitDetailRequest } from "./circuit/circuit-card";
import type { ResolvedCircuit } from "../types/circuit";
import { energyGridStyle } from "../styles/energy-grid";
import { discoverEnergyMetrics, getCircuitDiscoveryCandidates } from "../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../discovery/discovery.types";
import "./common/section-header";
import "./circuit/circuit-add-card";
import "./circuit/circuit-card";
import "./circuit/circuit-detail-panel";
import "./circuit/circuit-settings-modal";
import "../editors/energy-circuit-section-editor.ts";

function createCircuitId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `circuit-${randomId}`;
  return `circuit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class EnergyCircuitSection extends LitElement {
  static getConfigElement() {
    return document.createElement("energy-circuit-section-editor");
  }

  static properties = {
    config: { attribute: false },
  };

  config: EnergyCircuitSectionConfig = {
    title: "Active Circuits",
    circuits: [...defaultCircuitConfigs],
  };

  private _hass?: HomeAssistant;
  private discoveryMetrics: readonly DiscoveredMetric[] = [];
  private readonly pendingRepository = new LocalStoragePendingCircuitRepository();
  private baseCircuits: CircuitConfig[] = [];
  private resolvedCircuits: CircuitConfig[] = [];
  private visibleCount:1 | 2 | 4 = 4;
  private trackCardWidth = 0;
  private trackStep = 0;
  private trackGap = 16;
  private settledIndex = 0;
  private canScrollPrevious = false;
  private canScrollNext = false;
  private dragPointerId?: number;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private dragged = false;
  private scrollSettleTimer?: number;
  private resizeObserver?: ResizeObserver;
  private carouselAligned = true;
  private synchronizingCarousel = false;
  private alignmentVersion = 0;
  private builderOpen = false;
  private builderDraft?: CircuitConfig;
  private pendingCircuits: CircuitConfig[] = [];
  private pendingScope = "active-circuits";
  private pendingResolutionVersion = 0;
  private detailCircuit?: ResolvedCircuit;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.discoveryMetrics = discoverEnergyMetrics(hass);
    this.requestUpdate();
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  setConfig(config: EnergyCircuitSectionConfig) {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid Energy Circuit Section configuration");
    }

    const circuits = this.normalizeCircuits(config.circuits);
    const configuredHeight = Number(config.cardHeight);
    this.baseCircuits = circuits;
    this.resolvedCircuits = circuits;
    this.config = {
      ...config,
      title: config.title?.trim() || "Active Circuits",
      cardHeight: Number.isFinite(configuredHeight)
        ? Math.max(120, Math.min(240, Math.round(configuredHeight)))
        : undefined,
      circuits,
    };
    this.pendingScope = getPendingCircuitScope(this.config);
    void this.resolveUserConfig();
  }

  getGridOptions() {
    return { columns: "full" };
  }

  static styles = [energyGridStyle, css`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      color: var(--primary-text-color);
      container-type: inline-size;
    }

    .carousel-shell {
      position: relative;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .carousel-viewport {
      --circuit-shadow-gutter: 20px;
      position: relative;
      width: calc(
        100% + var(--circuit-shadow-gutter) + var(--circuit-shadow-gutter)
      );
      max-width: none;
      min-width: 0;
      box-sizing: border-box;
      overflow-x: hidden;
      overflow-y: hidden;
      margin:
        calc(0px - var(--circuit-shadow-gutter));
      padding:
        var(--circuit-shadow-gutter);
      cursor: grab;
      touch-action: pan-x;
      overscroll-behavior-inline: contain;
      scroll-behavior: smooth;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: var(--circuit-shadow-gutter);
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .carousel-viewport::-webkit-scrollbar {
      display: none;
    }

    .carousel-viewport.dragging {
      cursor: grabbing;
      scroll-behavior: auto;
      user-select: none;
    }

    .carousel-shell.static-grid .carousel-viewport {
      cursor: default;
      touch-action: auto;
      scroll-snap-type: none;
    }

    .carousel-shell.static-grid .track {
      display: grid;
      width: 100%;
      grid-template-columns: repeat(var(--static-circuit-columns, 4), minmax(0, 1fr));
    }

    .carousel-shell.static-grid .carousel-item {
      width: auto;
      min-width: 0;
      flex: none;
      scroll-snap-align: none;
    }

    .track {
      display: flex;
      width: max-content;
      min-width: 0;
      gap: var(--circuit-grid-gap, 16px);
    }

    .carousel-item {
      flex: 0 0 var(--track-card-width, calc((100% - 48px) / 4));
      width: var(--track-card-width, calc((100% - 48px) / 4));
      min-width: 0;
      scroll-snap-align: start;
      scroll-snap-stop: always;
    }

    .carousel-item.outside-page {
      visibility: hidden;
      pointer-events: none;
    }

    .carousel-viewport.interacting .carousel-item.outside-page {
      visibility: visible;
      pointer-events: auto;
    }

    .carousel-item > * {
      width:100%;
      min-width:0;
    }

    .navigation {
      position: absolute;
      z-index: 20;
      top: 50%;
      display: grid;
      width: 38px;
      height: 38px;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 50%;
      background: rgba(30, 30, 30, 0.2);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
      transform: translateY(-50%);
      padding: 0;
      color: var(--primary-text-color);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity 300ms ease;
    }

    :host(:hover) .navigation {
      opacity: 1;
      pointer-events: auto;
    }

    .navigation.left {
      left: 16px;
    }

    .navigation.right {
      right: 16px;
    }

    .navigation:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .navigation ha-icon {
      width: 20px;
      height: 20px;
      --mdc-icon-size: 20px;
      background: transparent;
      transform: translateY(-2px);
    }

    @media (hover: none) {
      .navigation {
        opacity: 1;
        pointer-events: auto;
      }
    }

  `];

  protected firstUpdated() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const previousVisibleCount = this.visibleCount;
      const previousUsesCarousel = this.getItemCount() > previousVisibleCount;
      const nextVisibleCount = this.resolveVisibleCount(width);
      const gap = nextVisibleCount === 1 ? 10 : 16;
      const cardWidth =
        (width - gap * (nextVisibleCount - 1)) /
        nextVisibleCount;
      const nextTrackStep = Math.max(0, cardWidth + gap);
      const countChanged = nextVisibleCount !== this.visibleCount;
      const stepChanged = Math.abs(nextTrackStep - this.trackStep) > 0.5;
      if (!countChanged && !stepChanged) return;
      const itemCount = this.getItemCount();
      const nextUsesCarousel = itemCount > nextVisibleCount;
      const alignment = planCircuitCarouselAlignment({
        previousVisibleCount,
        nextVisibleCount,
        previousUsesCarousel,
        nextUsesCarousel,
        settledIndex:this.settledIndex,
        itemCount,
        nextTrackStep,
      });
      this.visibleCount = nextVisibleCount;
      this.trackCardWidth = Math.max(0, cardWidth);
      this.trackStep = nextTrackStep;
      this.trackGap = gap;
      this.scheduleCarouselAlignment(alignment.settledIndex,alignment.scrollLeft,alignment.reset);
    });
    this.resizeObserver.observe(this);
  }

  private getItemCount(circuits = this.resolvedCircuits):number {
    return circuits.filter((item) => item.enabled !== false).length + 1;
  }

  private clearScrollSettle() {
    if (this.scrollSettleTimer === undefined) return;
    window.clearTimeout(this.scrollSettleTimer);
    this.scrollSettleTimer = undefined;
  }

  private scheduleCarouselAlignment(
    settledIndex:number,
    scrollLeft:number,
    reset:boolean
  ) {
    const version = ++this.alignmentVersion;
    this.clearScrollSettle();
    this.synchronizingCarousel = true;
    this.carouselAligned = false;
    this.settledIndex = settledIndex;
    if (reset) {
      this.canScrollPrevious = false;
    }
    this.requestUpdate();
    void this.updateComplete.then(() => {
      if (version !== this.alignmentVersion) return;
      const viewport = this.viewport;
      if (viewport) {
        viewport.classList.remove("dragging","interacting");
        viewport.scrollLeft = scrollLeft;
      }
      this.carouselAligned = true;
      this.synchronizingCarousel = false;
      this.requestUpdate();
      void this.updateComplete.then(() => this.syncNavigationState());
    });
  }

  private resolveVisibleCount(width:number):1 | 2 | 4 {
    const mobile = 600;
    const desktop = 1024;
    const hysteresis = 12;
    if (this.visibleCount === 1 && width < mobile + hysteresis) return 1;
    if (this.visibleCount === 2 && width >= mobile - hysteresis && width < desktop + hysteresis) return 2;
    if (this.visibleCount === 4 && width >= desktop - hysteresis) return 4;
    return width >= desktop ? 4 : width >= mobile ? 2 : 1;
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.clearScrollSettle();
    super.disconnectedCallback();
  }

  private normalizeCircuits(
    circuits: CircuitConfigInput[] | undefined
  ): CircuitConfig[] {
    return (circuits ?? [...defaultCircuitConfigs])
      .filter((circuit) =>
        Boolean(circuit?.id && circuit.name && circuit.entity)
      )
      .map((circuit, index) => ({
        ...circuit,
        enabled: circuit.enabled ?? true,
        order: circuit.order ?? index,
      }));
  }

  private get viewport(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(".carousel-viewport");
  }

  private scrollByCard(direction: -1 | 1) {
    const viewport = this.viewport;
    if (!viewport || !this.trackStep) return;
    const itemCount = this.resolvedCircuits.filter((item) => item.enabled !== false).length + 1;
    const maxIndex = Math.max(0, itemCount - this.visibleCount);
    const currentIndex = Math.round(viewport.scrollLeft / this.trackStep);
    const targetIndex = Math.max(0, Math.min(maxIndex, currentIndex + direction));
    viewport.classList.add("interacting");
    viewport.scrollTo({
      left: targetIndex * this.trackStep,
      behavior: "smooth",
    });
  }

  private scheduleScrollSettle() {
    if (this.synchronizingCarousel || !this.carouselAligned) return;
    const viewport = this.viewport;
    if (!viewport || !this.trackStep) return;
    viewport.classList.add("interacting");
    if (this.scrollSettleTimer !== undefined) {
      window.clearTimeout(this.scrollSettleTimer);
    }
    this.scrollSettleTimer = window.setTimeout(() => {
      this.scrollSettleTimer = undefined;
      const itemCount = this.resolvedCircuits.filter((item) => item.enabled !== false).length + 1;
      const maxIndex = Math.max(0, itemCount - this.visibleCount);
      const nextIndex = Math.max(
        0,
        Math.min(maxIndex, Math.round(viewport.scrollLeft / this.trackStep))
      );
      this.settledIndex = nextIndex;
      viewport.classList.remove("interacting");
      this.syncNavigationState();
      this.requestUpdate();
    }, 140);
  }

  private syncNavigationState() {
    const viewport = this.viewport;
    if (!viewport) return;
    const tolerance = 1;
    const previous = viewport.scrollLeft > tolerance;
    const next = viewport.scrollLeft + viewport.clientWidth <
      viewport.scrollWidth - tolerance;
    if (previous === this.canScrollPrevious && next === this.canScrollNext) return;
    this.canScrollPrevious = previous;
    this.canScrollNext = next;
    this.requestUpdate();
  }

  private handleViewportScroll() {
    if (this.synchronizingCarousel || !this.carouselAligned) return;
    this.syncNavigationState();
    this.scheduleScrollSettle();
  }

  private handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || !event.isPrimary) return;
    const viewport = event.currentTarget as HTMLElement;
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScrollLeft = viewport.scrollLeft;
    this.dragged = false;
  }

  private handlePointerMove(event: PointerEvent) {
    if (this.dragPointerId !== event.pointerId) return;
    const viewport = event.currentTarget as HTMLElement;
    const delta = event.clientX - this.dragStartX;
    if (!this.dragged && Math.abs(delta) <= 4) return;
    if (!this.dragged) {
      this.dragged = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("dragging", "interacting");
    }
    viewport.scrollLeft = this.dragStartScrollLeft - delta;
  }

  private handlePointerEnd(event: PointerEvent) {
    if (this.dragPointerId !== event.pointerId) return;
    const viewport = event.currentTarget as HTMLElement;
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    viewport.classList.remove("dragging");
    this.dragPointerId = undefined;
    this.syncNavigationState();
    this.scheduleScrollSettle();
  }

  private preventClickAfterDrag(event: MouseEvent) {
    if (!this.dragged) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragged = false;
  }

  private openBuilder() {
    this.builderDraft = {
      id:createCircuitId(),
      name:"",
      entity:"",
      icon:"mdi:electric-switch",
      category:"",
      enabled:true,
      order:this.baseCircuits.length + this.pendingCircuits.length,
    };
    this.builderOpen = true;
    this.requestUpdate();
  }

  private async handlePendingCircuitCreated(
    event: CustomEvent<CircuitConfigChangedDetail>
  ) {
    event.stopPropagation();
    try {
      const circuit = { ...event.detail.circuit };
      const duplicate = [...this.baseCircuits, ...this.pendingCircuits].some(
        (item) => item.id === circuit.id || item.entity === circuit.entity
      );
      if (duplicate) {
        event.detail.fail?.();
        return;
      }
      const added = await this.pendingRepository.add(this.pendingScope, circuit);
      if (!added) {
        event.detail.fail?.();
        return;
      }
      this.builderOpen = false;
      this.builderDraft = undefined;
      await this.resolveUserConfig();
      event.detail.complete?.();
    } catch (error) {
      event.detail.fail?.();
      console.error("[energy-circuit-section] Unable to save pending Circuit", error);
    }
  }

  private async handlePendingCircuitDelete(
    event:CustomEvent<{ circuitId:string }>
  ) {
    event.stopPropagation();
    await this.pendingRepository.remove(this.pendingScope, event.detail.circuitId);
    this.detailCircuit = undefined;
    await this.resolveUserConfig();
  }

  private openCircuitDetail(event: CustomEvent<CircuitDetailRequest>) {
    event.stopPropagation();
    this.detailCircuit = event.detail.circuit;
    this.requestUpdate();
  }

  private async resolveUserConfig() {
    const pendingVersion = ++this.pendingResolutionVersion;
    const scope = this.pendingScope;
    const circuits = this.baseCircuits.map((circuit) => ({ ...circuit }));
    const pendingResult = await loadPendingCircuitsForConfig(
      this.pendingRepository,
      this.config
    );
    const storedPending = pendingResult.circuits;
    if (
      pendingVersion !== this.pendingResolutionVersion ||
      scope !== this.pendingScope || pendingResult.scope !== scope
    ) return;
    const configuredIds = new Set(circuits.map((circuit) => circuit.id));
    const configuredEntities = new Set(circuits.map((circuit) => circuit.entity));
    this.pendingCircuits = storedPending.filter(
      (circuit) => !configuredIds.has(circuit.id) &&
        !configuredEntities.has(circuit.entity)
    ).map((circuit, index) => ({
      ...circuit,
      order:circuits.length + index,
    }));
    if (this.pendingCircuits.length !== storedPending.length) {
      await this.pendingRepository.save(scope, this.pendingCircuits);
    }
    const previousItemCount = this.getItemCount();
    const previousUsesCarousel = previousItemCount > this.visibleCount;
    this.resolvedCircuits = [...circuits, ...this.pendingCircuits];
    const itemCount = this.getItemCount();
    const nextUsesCarousel = itemCount > this.visibleCount;
    if (previousUsesCarousel !== nextUsesCarousel) {
      this.scheduleCarouselAlignment(0,0,true);
    } else {
      const alignment = planCircuitCarouselAlignment({
        previousVisibleCount:this.visibleCount,
        nextVisibleCount:this.visibleCount,
        previousUsesCarousel,
        nextUsesCarousel,
        settledIndex:this.settledIndex,
        itemCount,
        nextTrackStep:this.trackStep,
      });
      this.scheduleCarouselAlignment(
        alignment.settledIndex,alignment.scrollLeft,alignment.reset
      );
    }
  }

  render() {
    const circuits = resolveActiveCircuits(
      this._hass,
      this.resolvedCircuits
    );
    const pageStart = Math.min(
      this.settledIndex,
      Math.max(0, circuits.length + 1 - this.visibleCount)
    );
    const itemCount = circuits.length + 1;
    const usesCarousel = itemCount > this.visibleCount;
    const staticColumns = getCircuitStaticColumnCount(this.visibleCount);
    return html`
      <ic-section-header
        .title=${this.config.title ?? "Active Circuits"}
        .showActions=${false}
      ></ic-section-header>

      <div class="carousel-shell ${usesCarousel ? "" : "static-grid"}">
        <div class="carousel-viewport active-circuits-viewport"
            @scroll=${usesCarousel ? this.handleViewportScroll : undefined}
            @pointerdown=${usesCarousel ? this.handlePointerDown : undefined}
            @pointermove=${usesCarousel ? this.handlePointerMove : undefined}
            @pointerup=${usesCarousel ? this.handlePointerEnd : undefined}
            @pointercancel=${usesCarousel ? this.handlePointerEnd : undefined}
            @click=${usesCarousel ? this.preventClickAfterDrag : undefined}>
          <div
            class="track active-circuits-track"
            style=${usesCarousel && this.trackCardWidth > 0
              ? `--track-card-width:${this.trackCardWidth}px;--circuit-grid-gap:${this.trackGap}px;--circuit-card-height:${this.config.cardHeight ?? 150}px`
              : `--static-circuit-columns:${staticColumns};--circuit-grid-gap:${this.trackGap}px;--circuit-card-height:${this.config.cardHeight ?? 150}px`}
          >
              ${circuits.map((circuit, index) => html`
                <div class="carousel-item ${
                  usesCarousel && this.carouselAligned &&
                  (index < pageStart || index >= pageStart + this.visibleCount)
                    ? "outside-page" : ""
                }">
                  <ic-circuit-card
                    .circuit=${circuit}
                    .hass=${this._hass}
                    @circuit-detail-request=${this.openCircuitDetail}
                  ></ic-circuit-card>
                </div>
              `)}
              <div class="carousel-item ${
                usesCarousel && this.carouselAligned && (
                  circuits.length < pageStart ||
                  circuits.length >= pageStart + this.visibleCount)
                    ? "outside-page" : ""
              }">
                <ic-circuit-add-card
                  @add-circuit-request=${this.openBuilder}
                ></ic-circuit-add-card>
              </div>
          </div>
        </div>
          ${usesCarousel && this.canScrollPrevious
            ? html`
                <button class="navigation left" type="button"
                  aria-label="Previous circuits"
                  @click=${(event: Event) => {
                    event.stopPropagation();
                    this.scrollByCard(-1);
                  }}>
                  <ha-icon icon="mdi:chevron-left"></ha-icon>
                </button>
              `
            : null}
          ${usesCarousel && this.canScrollNext
            ? html`
                <button class="navigation right" type="button"
                  aria-label="Next circuits"
                  @click=${(event: Event) => {
                    event.stopPropagation();
                    this.scrollByCard(1);
                  }}>
                  <ha-icon icon="mdi:chevron-right"></ha-icon>
                </button>
              `
            : null}
      </div>

      <ic-circuit-settings-modal
        .open=${this.builderOpen}
        .hass=${this._hass}
        .circuit=${this.builderDraft}
        .discoveredMetrics=${getCircuitDiscoveryCandidates(
          this.discoveryMetrics,
          this.builderDraft?.entity
        )}
        mode="create"
        @circuit-settings-close=${() => {
          this.builderOpen = false;
          this.builderDraft = undefined;
          this.requestUpdate();
        }}
        @circuit-config-changed=${this.handlePendingCircuitCreated}
      ></ic-circuit-settings-modal>

      <ic-circuit-detail-panel
        .open=${Boolean(this.detailCircuit)}
        .hass=${this._hass}
        .circuit=${this.detailCircuit}
        .pending=${Boolean(this.detailCircuit && this.pendingCircuits.some(
          (circuit) => circuit.id === this.detailCircuit?.config.id
        ))}
        @circuit-detail-close=${() => {
          this.detailCircuit = undefined;
          this.requestUpdate();
        }}
        @pending-circuit-delete-request=${this.handlePendingCircuitDelete}
      ></ic-circuit-detail-panel>

    `;
  }
}

customElements.define("energy-circuit-section", EnergyCircuitSection);
