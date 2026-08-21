import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import { parseNumericEntityState } from "../../helpers/entity-state-parser.ts";
import { resolveCircuit } from "../../helpers/circuit-utils.ts";
import { loadTrendHistory } from "../../helpers/trend-data-provider.ts";
import { convertToBaseUnit } from "../../helpers/unit-converter.ts";
import type { ResolvedCircuit } from "../../types/circuit.ts";
import { detailPanelStyle } from "../../styles/detail-panel.ts";
import { formatCircuitDuration } from "./circuit-detail/circuit-detail-model.ts";
import type { CircuitActivitySemantic, CircuitDetailModel, CircuitHistoryPoint, CircuitRuntimeStatus } from "./circuit-detail/circuit-detail-model.ts";
import { analyzeCircuitHistory } from "./circuit-detail/circuit-session-analyzer.ts";
import "../common/app-dialog.ts";
import "../common/button.ts";

type DetailStatus = "idle" | "loading" | "ready" | "error";

export class CircuitDetailPanel extends LitElement {
  static properties = {
    open: { type: Boolean },
    hass: { attribute: false },
    circuit: { attribute: false },
    pending: { type: Boolean },
    deleteGuidanceOpen: { state: true },
  };

  open = false;
  hass?: HomeAssistant;
  circuit?: ResolvedCircuit;
  pending = false;
  private status: DetailStatus = "idle";
  private model?: CircuitDetailModel;
  private requestVersion = 0;
  private loadedCircuitKey?: string;
  private confirmedLiveStatus?: CircuitRuntimeStatus;
  private liveTransitionCandidate?: { status: CircuitRuntimeStatus; samples: number };
  private deleteGuidanceOpen = false;

  static styles = [detailPanelStyle, css`
    :host { display: contents; }
    .status { font-size: 22px; font-weight: 650; color: var(--en-text-primary, var(--primary-text-color)); }
    .session { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    .field { display: grid; gap: 4px; }
    .timeline { display: grid; gap: 0; }
    .event { display: grid; grid-template-columns: 64px 12px minmax(0, 1fr); gap: 10px; min-height: 42px; }
    .marker { position: relative; }
    .marker::before { content: ""; position: absolute; top: 5px; left: 3px; width: 7px; height: 7px; border-radius: 50%; background: var(--en-color-primary, var(--primary-color)); }
    .marker.active::before { background: var(--en-color-success, var(--success-color)); }
    .marker.idle::before {
      background: var(--secondary-text-color);
      opacity: 0.55;
    }
    .marker.warning::before { background: var(--en-color-warning, var(--warning-color, var(--en-color-accent))); }
    .marker.info::before { background: var(--en-color-primary, var(--primary-color)); }
    .marker::after { content: ""; position: absolute; top: 15px; bottom: 0; left: 6px; width: 1px; background: var(--divider-color); }
    .event:last-child .marker::after { display: none; }
    .entity { display: flex; min-width: 0; align-items: baseline; gap: 6px; color: var(--en-text-primary, var(--primary-text-color)); white-space: nowrap; }
    .entity-name { max-width: 36%; flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entity-separator { flex: 0 0 auto; color: var(--en-text-secondary, var(--secondary-text-color)); }
    .entity-id { display: flex; min-width: 0; flex: 1 1 auto; overflow: hidden; white-space: nowrap; }
    .entity-id-start { min-width: 4ch; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entity-id-end { min-width: 12ch; max-width: 58%; flex: 0 1 auto; overflow: hidden; direction: rtl; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
    .state { min-height: 120px; display: grid; place-items: center; text-align: center; }
    .delete-section { display: grid; gap: 12px; }
    .delete-action { display: flex; justify-content: flex-start; }
    .delete-guidance {
      display: grid;
      gap: 8px;
      padding: 14px 16px;
      border: var(--en-border, 1px solid var(--divider-color));
      border-radius: var(--en-radius-md, 12px);
      background: var(--en-surface-control, var(--card-background-color));
      color: var(--en-text-secondary, var(--secondary-text-color));
    }
    .delete-guidance strong { color: var(--en-text-primary, var(--primary-text-color)); }
    .pending-status {
      color:var(--en-text-secondary,var(--secondary-text-color));
      font-size:var(--en-helper-size,13px);
    }
  `];

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (!this.open) {
      if (changed.has("open")) this.reset();
      return;
    }
    const circuitKey = this.circuit
      ? `${this.circuit.config.id}|${this.circuit.config.entity}`
      : undefined;
    if (changed.has("open") || circuitKey !== this.loadedCircuitKey) {
      void this.load(false);
    } else if (changed.has("hass")) {
      this.updateLiveState();
    }
  }

  private reset() {
    this.requestVersion++;
    this.status = "idle";
    this.model = undefined;
    this.loadedCircuitKey = undefined;
    this.confirmedLiveStatus = undefined;
    this.liveTransitionCandidate = undefined;
    this.deleteGuidanceOpen = false;
  }

  private close() {
    this.dispatchEvent(new CustomEvent("circuit-detail-close", { bubbles: true, composed: true }));
  }

  private runtimeStatus(circuit: ResolvedCircuit): CircuitRuntimeStatus {
    if (circuit.stateStatus === "unavailable" || circuit.stateStatus === "missing") return "unavailable";
    if (circuit.stateStatus !== "valid") return "unknown";
    return circuit.active ? "active" : "idle";
  }

  private updateLiveState() {
    const hass = this.hass;
    const circuit = this.circuit;
    if (!hass || !circuit || !this.model) return;
    const currentCircuit = resolveCircuit(hass, circuit.config);
    const nextStatus = this.runtimeStatus(currentCircuit);
    const session = this.model.session.state === "current" && this.model.session.startedAt !== undefined
      ? { ...this.model.session, duration: Math.max(0, Date.now() - this.model.session.startedAt) }
      : this.model.session;
    if (this.model.status !== nextStatus || session !== this.model.session) {
      this.model = { ...this.model, status: nextStatus, session };
      this.requestUpdate();
    }

    if (nextStatus === this.confirmedLiveStatus) {
      this.liveTransitionCandidate = undefined;
      return;
    }
    this.liveTransitionCandidate = this.liveTransitionCandidate?.status === nextStatus
      ? { status: nextStatus, samples: this.liveTransitionCandidate.samples + 1 }
      : { status: nextStatus, samples: 1 };
    if (this.liveTransitionCandidate.samples < 2) return;

    this.confirmedLiveStatus = nextStatus;
    this.liveTransitionCandidate = undefined;
    if (nextStatus === "active" || nextStatus === "idle") void this.load(true);
  }

  private async load(preserveRenderedModel: boolean) {
    const hass = this.hass;
    const circuit = this.circuit;
    if (!hass || !circuit) return;
    this.loadedCircuitKey = `${circuit.config.id}|${circuit.config.entity}`;
    const currentCircuit = resolveCircuit(hass, circuit.config);
    const version = ++this.requestVersion;
    const parsed = parseNumericEntityState(hass, currentCircuit.config.entity);
    const base: CircuitDetailModel = {
      circuitId: currentCircuit.config.id,
      title: currentCircuit.config.name,
      entityId: currentCircuit.config.entity,
      status: this.runtimeStatus(currentCircuit),
      session: { state: "unavailable" },
      recentActivity: [],
      entityName: parsed.name,
    };
    this.confirmedLiveStatus = base.status;
    this.liveTransitionCandidate = undefined;
    if (!preserveRenderedModel) this.model = base;
    if (base.status === "unavailable" || base.status === "unknown") {
      this.status = "ready";
      if (!preserveRenderedModel) this.model = base;
      else if (this.model) this.model = { ...this.model, status: base.status };
      this.requestUpdate();
      return;
    }
    if (!preserveRenderedModel) {
      this.status = "loading";
      this.requestUpdate();
    }
    try {
      const history = await loadTrendHistory(hass, [currentCircuit.config.entity], "24H");
      if (version !== this.requestVersion) return;
      const states = history.entities[currentCircuit.config.entity] ?? [];
      const points: CircuitHistoryPoint[] = states.flatMap((state) => {
        const value = Number(state.state);
        const timestamp = Date.parse(state.last_changed ?? state.last_updated ?? "");
        const converted = convertToBaseUnit(value, parsed.unit);
        return Number.isFinite(timestamp) && Number.isFinite(value) && converted.family === "power"
          ? [{ timestamp, power: converted.value }]
          : [];
      });
      const analysis = analyzeCircuitHistory(points, currentCircuit.active);
      this.model = { ...base, session: analysis.session, recentActivity: analysis.activity };
      this.status = "ready";
      this.requestUpdate();
    } catch (error) {
      if (version !== this.requestVersion) return;
      console.warn("[ic-circuit-detail-panel] Unable to load circuit history", error);
      if (!preserveRenderedModel) {
        this.status = "error";
        this.model = base;
      }
      this.requestUpdate();
    }
  }

  private formatTime(timestamp?: number) {
    return timestamp === undefined ? "Unavailable" : new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(timestamp);
  }

  private formatDuration(duration?: number) {
    return formatCircuitDuration(duration);
  }

  private splitEntityId(entityId: string): [string, string] {
    const splitAt = Math.max(1, Math.ceil(entityId.length * 0.55));
    return [entityId.slice(0, splitAt), entityId.slice(splitAt)];
  }

  private activityLabel(type: CircuitDetailModel["recentActivity"][number]["type"]): string {
    switch (type) {
      case "active": return "Active";
      case "idle": return "Idle";
      case "increase": return "Power increased";
      case "decrease": return "Power decreased";
      case "warning": return "Warning";
      case "unavailable": return "Unavailable";
      case "abnormal": return "Abnormal load";
    }
  }

  private activitySemantic(type: CircuitDetailModel["recentActivity"][number]["type"]): CircuitActivitySemantic {
    switch (type) {
      case "active": return "active";
      case "idle": return "idle";
      case "warning":
      case "unavailable":
      case "abnormal": return "warning";
      default: return "info";
    }
  }

  render() {
    if (!this.open) return null;
    const model = this.model;
    const [entityIdStart, entityIdEnd] = this.splitEntityId(model?.entityId ?? "");
    const sessionTitle = model?.status === "idle" ? "Last Session" : "Current Session";
    return html`<ic-app-dialog .open=${this.open} title="Circuit Detail" @dialog-close=${this.close}>
      <div class="body">
        ${!model ? html`<div class="state">Loading circuit activity…</div>` : html`
          <section><h3>Status</h3><div class="status">${model.status[0].toUpperCase()}${model.status.slice(1)}</div></section>
          <section>
            <h3>${sessionTitle}</h3>
            ${this.status === "loading" ? html`<div class="value">Loading activity…</div>` : model.session.state === "unavailable" || this.status === "error"
              ? html`<div class="value">Activity data unavailable</div>`
              : html`<div class="session">
                  <div class="field"><span class="label">${model.session.state === "current" ? "Started" : "Ended"}</span><span class="value">${model.session.state === "current" && model.session.startedAt === undefined ? "Active now · start time unavailable" : this.formatTime(model.session.state === "current" ? model.session.startedAt : model.session.endedAt)}</span></div>
                  <div class="field"><span class="label">${model.session.state === "current" ? "Running for" : "Duration"}</span><span class="value">${this.formatDuration(model.session.duration)}</span></div>
                </div>`}
          </section>
          <section><h3>Recent Activity</h3>${model.recentActivity.length
            ? html`<div class="timeline">${model.recentActivity.map((event) => html`<div class="event"><span class="time">${this.formatTime(event.timestamp)}</span><span class="marker ${this.activitySemantic(event.type)}"></span><span class="value">${this.activityLabel(event.type)}</span></div>`)}</div>`
            : html`<div class="value">${this.status === "loading" ? "Loading activity…" : "No meaningful recent activity available"}</div>`}</section>
          <section><h3>Entity</h3><div class="entity" title=${`${model.entityName} · ${model.entityId}`}>
            <span class="entity-name">${model.entityName}</span><span class="entity-separator">·</span>
            <span class="entity-id"><span class="entity-id-start">${entityIdStart}</span><span class="entity-id-end">${entityIdEnd}</span></span>
          </div>${this.pending ? html`<div class="pending-status">Saved locally on this browser</div>` : null}</section>
          <section class="delete-section">
            <div class="delete-action">
              <ic-button
                variant="destructive"
                @click=${() => { this.deleteGuidanceOpen = true; }}
              >Delete Circuit</ic-button>
            </div>
            ${this.deleteGuidanceOpen ? html`
              <div class="delete-guidance" role="status">
                <strong>${model.title}</strong>
                ${this.pending ? html`
                  <span>This Circuit is saved only on this browser and can be removed directly.</span>
                  <ic-button variant="destructive" @click=${() => {
                    this.dispatchEvent(new CustomEvent("pending-circuit-delete-request", {
                      detail:{ circuitId:model.circuitId },
                      bubbles:true,
                      composed:true,
                    }));
                  }}>Remove local Circuit</ic-button>
                ` : html`
                  <span>To permanently remove this circuit, enter Dashboard Edit mode, click the pencil on the Active Circuits card, then remove it under Circuits.</span>
                  <span>This removes the circuit item from this custom card. It does not delete the Home Assistant entity or device.</span>
                `}
              </div>
            ` : null}
          </section>
        `}
      </div>
    </ic-app-dialog>`;
  }
}

customElements.define("ic-circuit-detail-panel", CircuitDetailPanel);
