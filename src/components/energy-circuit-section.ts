import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import { defaultCircuitConfigs } from "../data/circuit-config";
import { resolveActiveCircuits } from "../helpers/circuit-utils";
import { CircuitConfigCoordinator } from "../config/circuit-config-coordinator";
import { LocalStorageCircuitConfigRepository } from "../repositories/local-storage-circuit-config-repository";
import type {
  CircuitConfig,
  CircuitConfigInput,
  EnergyCircuitSectionConfig,
} from "../types/circuit";
import type { CircuitConfigChangedDetail } from "./circuit/circuit-settings-modal";
import type { CircuitDeleteRequestDetail } from "./circuit/circuit-settings-modal";
import type { CircuitSelectedDetail } from "./circuit/circuit-card";
import { energyGridStyle } from "../styles/energy-grid";
import "./common/section-header";
import "./circuit/circuit-add-card";
import "./circuit/circuit-card";
import "./circuit/circuit-settings-modal";

function createCircuitId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `circuit-${randomId}`;

  return [
    "circuit",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

export class EnergyCircuitSection extends LitElement {
  static properties = {
    config: { attribute: false },
  };

  config: EnergyCircuitSectionConfig = {
    title: "Active Circuits",
    circuits: [...defaultCircuitConfigs],
  };

  private _hass?: HomeAssistant;
  private readonly repository = new LocalStorageCircuitConfigRepository();
  private readonly coordinator = new CircuitConfigCoordinator(this.repository);
  private baseCircuits: CircuitConfig[] = [];
  private resolvedCircuits: CircuitConfig[] = [];
  private resolutionVersion = 0;
  private visibleCount = 4;
  private trackCardWidth = 0;
  private trackStep = 0;
  private settledIndex = 0;
  private canScrollPrevious = false;
  private canScrollNext = false;
  private dragPointerId?: number;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private dragged = false;
  private scrollSettleTimer?: number;
  private resizeObserver?: ResizeObserver;
  private builderOpen = false;
  private builderDraft?: CircuitConfig;
  private selectedCircuit?: CircuitConfig;
  private circuitDialogOpen = false;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
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
    this.baseCircuits = circuits;
    this.resolvedCircuits = circuits;
    this.config = {
      ...config,
      title: config.title?.trim() || "Active Circuits",
      circuits,
    };
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

    ic-circuit-card {
      --circuit-card-height: 150px;
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

    ic-circuit-add-card {
      --circuit-card-height: 150px;
    }

    @container (max-width: 1200px) {
      .carousel-shell.static-grid .track {
        --static-circuit-columns: 3;
      }
    }

    @container (max-width: 599px) {
      .carousel-shell.static-grid .track {
        --static-circuit-columns: 1;
      }
      .track {
        --circuit-grid-gap: 10px;
      }
    }

  `];

  protected firstUpdated() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const nextVisibleCount = width > 1200 ? 4 : width > 599 ? 3 : 1;
      const gap = width <= 599 ? 10 : 16;
      const cardWidth =
        (width - gap * (nextVisibleCount - 1)) /
        nextVisibleCount;
      const nextTrackStep = Math.max(0, cardWidth + gap);
      const countChanged = nextVisibleCount !== this.visibleCount;
      const stepChanged = Math.abs(nextTrackStep - this.trackStep) > 0.5;
      if (!countChanged && !stepChanged) return;
      this.visibleCount = nextVisibleCount;
      this.trackCardWidth = Math.max(0, cardWidth);
      this.trackStep = nextTrackStep;
      this.requestUpdate();
      void this.updateComplete.then(() => this.syncNavigationState());
    });
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    if (this.scrollSettleTimer !== undefined) {
      window.clearTimeout(this.scrollSettleTimer);
    }
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
      id: createCircuitId(),
      name: "",
      entity: "",
      icon: "mdi:electric-switch",
      enabled: true,
      order: this.resolvedCircuits.length,
    };
    this.builderOpen = true;
    this.requestUpdate();
  }

  private openCircuitSettings(event: CustomEvent<CircuitSelectedDetail>) {
    event.stopPropagation();
    const circuit = event.detail.circuit.config;
    this.selectedCircuit = { ...circuit };
    this.circuitDialogOpen = true;
    console.debug("[CircuitSettings] dialog opened", circuit.id);
    this.requestUpdate();
  }

  private closeCircuitSettings() {
    this.circuitDialogOpen = false;
    this.selectedCircuit = undefined;
    this.requestUpdate();
  }

  private async resolveUserConfig() {
    const version = ++this.resolutionVersion;
    const circuits = await this.coordinator.resolve(this.baseCircuits);
    if (version !== this.resolutionVersion) return;
    this.resolvedCircuits = circuits;
    this.requestUpdate();
    await this.updateComplete;
    this.syncNavigationState();
  }

  private async handleCircuitConfigChanged(
    event: CustomEvent<CircuitConfigChangedDetail>
  ) {
    try {
      const circuits = await this.coordinator.update(
        this.baseCircuits,
        event.detail.circuit
      );
      this.resolvedCircuits = circuits;
      this.config = { ...this.config, circuits };
      this.builderOpen = false;
      this.requestUpdate();
      await this.updateComplete;
      this.syncNavigationState();
      event.detail.complete?.();
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      }));
    } catch (error) {
      event.detail.fail?.();
      console.error("[energy-circuit-section] Unable to save circuit", error);
    }
  }

  private async handleCircuitDeleteRequest(
    event: CustomEvent<CircuitDeleteRequestDetail>
  ) {
    try {
      const circuitId = event.detail.circuitId;
      const circuits = await this.coordinator.remove(
        this.baseCircuits,
        circuitId
      );
      this.baseCircuits = circuits;
      this.resolvedCircuits = circuits;
      this.config = { ...this.config, circuits };
      this.requestUpdate();
      await this.updateComplete;
      this.syncNavigationState();
      event.detail.complete?.();
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      }));
    } catch (error) {
      event.detail.fail?.();
      console.error("[energy-circuit-section] Unable to delete circuit", error);
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
    const staticColumns = Math.min(itemCount, this.visibleCount);
    return html`
      <ic-section-header
        .title=${this.config.title ?? "Active Circuits"}
        .showActions=${false}
      ></ic-section-header>

      <div class="carousel-shell ${usesCarousel ? "" : "static-grid"}">
        <div class="carousel-viewport active-circuits-viewport"
            @scroll=${usesCarousel ? () => {
              this.syncNavigationState();
              this.scheduleScrollSettle();
            } : undefined}
            @pointerdown=${usesCarousel ? this.handlePointerDown : undefined}
            @pointermove=${usesCarousel ? this.handlePointerMove : undefined}
            @pointerup=${usesCarousel ? this.handlePointerEnd : undefined}
            @pointercancel=${usesCarousel ? this.handlePointerEnd : undefined}
            @click=${usesCarousel ? this.preventClickAfterDrag : undefined}>
          <div
            class="track active-circuits-track"
            style=${usesCarousel && this.trackCardWidth > 0
              ? `--track-card-width:${this.trackCardWidth}px`
              : `--static-circuit-columns:${staticColumns}`}
          >
              ${circuits.map((circuit, index) => html`
                <div class="carousel-item ${
                  usesCarousel &&
                  (index < pageStart || index >= pageStart + this.visibleCount)
                    ? "outside-page" : ""
                }">
                  <ic-circuit-card
                    .circuit=${circuit}
                    .hass=${this._hass}
                    .selected=${this.circuitDialogOpen &&
                      this.selectedCircuit?.id === circuit.config.id}
                    @circuit-selected=${this.openCircuitSettings}
                    @circuit-config-changed=${this.handleCircuitConfigChanged}
                    @circuit-delete-request=${this.handleCircuitDeleteRequest}
                  ></ic-circuit-card>
                </div>
              `)}
              <div class="carousel-item ${
                usesCarousel && (
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
        .open=${this.circuitDialogOpen}
        .hass=${this._hass}
        .circuit=${this.selectedCircuit}
        mode="edit"
        @circuit-settings-close=${this.closeCircuitSettings}
        @circuit-config-changed=${this.handleCircuitConfigChanged}
        @circuit-delete-request=${this.handleCircuitDeleteRequest}
      ></ic-circuit-settings-modal>

      <ic-circuit-settings-modal
        .open=${this.builderOpen}
        .hass=${this._hass}
        .circuit=${this.builderDraft}
        mode="create"
        @circuit-settings-close=${() => {
          this.builderOpen = false;
          this.requestUpdate();
        }}
        @circuit-config-changed=${this.handleCircuitConfigChanged}
      ></ic-circuit-settings-modal>
    `;
  }
}

customElements.define("energy-circuit-section", EnergyCircuitSection);
