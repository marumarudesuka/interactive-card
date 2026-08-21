# Phase 0 architecture and persistence audit

Audit date: 2026-08-10

Scope: documentation and read-only source contracts only. No runtime component,
CSS, grid, spacing, size, token, responsive, carousel, or persistence behavior is
changed by Phase 0.

## 1. Persistence result and environment gate

Only `energy-trend-card-editor` is currently registered through
`EnergyTrendCard.getConfigElement()`. Its `config-changed` event is emitted by a
Home Assistant Card Editor instance, which is the supported persistence path.

The runtime components also emit `config-changed`:

- `energy-kpi-section`
- `energy-trend-card`
- `energy-circuit-section`

They first update their own in-memory config and write formal configuration to
localStorage. The repository contains no adapter that writes a runtime card's
new config into the Lovelace dashboard model. It also contains no code that
detects Dashboard Edit Mode.

Consequently, source inspection proves only that the events bubble. It does not
prove that Home Assistant consumes them or saves the dashboard. Runtime event
dispatch must not be treated as successful Lovelace persistence.

A real Home Assistant UI test was attempted during this audit, but no browser or
authenticated Home Assistant session was available. The direct-manipulation
design therefore remains gated on this manual integration test:

1. Open a dashboard in Edit Mode.
2. Record the raw card configuration from the dashboard editor.
3. Trigger a Header Manage change from the rendered runtime card.
4. Close and reopen the editor, reload the page, and inspect raw configuration.
5. Repeat for an Edit Mode card-click change.
6. Repeat for a standalone custom card and for a card nested in a section or
   future `energy-dashboard` host.
7. Verify cancel, save, dashboard reload, a second browser, and a failed save.

Pass requires the value to appear in Lovelace storage and survive reload without
localStorage. A visual update or a received DOM event is not a pass.

## 2. Edit Mode detection

Current result: not implemented.

None of the KPI, Trend, or Circuit runtime components reads an `editMode`
property, Lovelace edit state, or an injected persistence host. Card clicks
therefore cannot currently distinguish View Mode from Edit Mode.

Before direct manipulation is implemented, supported signals in the project's
target Home Assistant versions must be tested. If no stable signal and writeback
host are available, the safe fallback is to open or focus the Native Card Editor;
runtime cards must not silently save to localStorage.

## 3. Standalone and section behavior

### Trend standalone

`energy-trend-card` is a standalone Lovelace card and is the only audited card
with `static getConfigElement()`. Native editor changes use the expected editor
event. Runtime Series, timeframe, and settings changes call
`TrendConfigCoordinator`, write localStorage, then emit a runtime
`config-changed` event whose HA persistence is unverified.

### KPI standalone

`energy-kpi-card` accepts a single KPI config, but has no Native Card Editor. Its
settings events require an owning section to apply and persist them. Used alone,
there is no section persistence owner, so settings persistence is not reliable.

### KPI section

`energy-kpi-section` owns `cards`, discovery/template merging, the picker,
builder, reorder behavior, localStorage save, and runtime `config-changed`.

### Circuit section

The public registered component is `energy-circuit-section`; there is no public
`energy-circuit-card`. The section owns `circuits`, the Add Card tile, settings
modals, carousel state, localStorage save, and runtime `config-changed`. It has no
Native Card Editor and its header actions are disabled.

## 4. Current localStorage keys

| Key | Envelope | Current formal use |
| --- | --- | --- |
| `interactive-card:kpi-config:v1` | `{ version: 1, cards: CustomKpiConfig[] }` | KPI cards and ordering/configuration |
| `interactive-card:trend-config:v1` | `{ version: 1, cards: Record<string, EnergyTrendCardConfig> }` | Trend card config keyed by derived card id |
| `interactive-card:circuit-config:v1` | `{ version: 1, circuits: CircuitConfig[] }` | Circuit items and ordering/configuration |
| `interactive-card:appearance-theme:v1` | string theme value | Global appearance theme |

The Trend storage identity is derived from `config.id`, then `title`, then
`energy-trend`. This can collide across dashboards or cards. KPI and Circuit
keys are global to the browser profile and are not scoped to a dashboard/card.

## 5. Current YAML/config schemas

### KPI section

```yaml
type: custom:energy-kpi-section
title: Energy Overview
cards:
  - type: custom
    id: stable-id
    name: Optional name
    title: Display title
    entity: sensor.example
    category: energy
    unit: kWh
    icon: mdi:flash
    enabled: true
    autoScale: true
    decimals: 2
    order: 0
    precision: 2
    subtitle: Optional subtitle
    trendMode: none
    history: []
    entityType: sensor
    icon_bg: optional
    icon_glow: optional
    icon_color: optional
```

`trend` remains a deprecated subtitle compatibility field. Unknown KPI keys are
accepted by `CustomKpiConfig` and must be preserved during migration.

### Trend card

```yaml
type: custom:energy-trend-card
id: optional-card-id
title: Energy Trend
height: 350
curve: smooth
renderMode: smooth
fullWidth: true
timeframe: 24H
category: energy
entities:
  - id: stable-series-id
    entity: sensor.example
    order: 0
    chartMode: line
    name: Optional name
    color: optional
    category: energy
    unit: kWh
    enabled: true
    visible: true
    decimals: 2
    autoScale: true
    lineStyle: solid
    axis: auto
    renderMode: smooth
```

Legacy top-level `chartMode` is read for migration. Series visibility reads
`visible`, then legacy-compatible `enabled`, then defaults to true.

### Circuit section

```yaml
type: custom:energy-circuit-section
title: Active Circuits
circuits:
  - id: stable-circuit-id
    name: Circuit name
    entity: sensor.circuit_power
    icon: mdi:electric-switch
    category: optional
    enabled: true
    order: 0
```

## 6. Frozen layout source baseline

The automated contract is `scripts/verify-phase0-contracts.mjs`.

| Area | Current source contract |
| --- | --- |
| Shared energy grid | 4 columns above 1200px, 2 at or below 1200px, 1 at or below 599px |
| Shared grid gap | 16px; mobile fallback 10px |
| KPI height | 170px desktop, 160px at/below 1200px, 150px at/below 599px |
| KPI padding | 20px desktop, 18px at/below 1200px, 14px at/below 599px |
| Trend default/configured height | 350px fallback; bound to normalized `config.height` |
| Circuit card height | 150px |
| Circuit gap | 16px; 10px at/below 599px |
| Circuit visible count | 4 above 1200px, 3 from 600px through 1200px, 1 at/below 599px |
| Circuit carousel | `itemCount > visibleCount`; itemCount includes Add Card tile |

The requested product baseline is Active Circuit desktop = exactly four cards
per row. Current source does not satisfy that requirement for dashboard
containers from 600px through 1200px. Phase 0 records this mismatch and does not
fix it.

## 7. Circuit four-column to three-column regression

The cause is identifiable in commit `2dd73ea` (`docs: update README and
screenshots`) relative to `f5f6359`.

Before:

```ts
const nextVisibleCount = width > 1200 ? 4 : 2;
const usesCarousel = itemCount > 4;
const staticColumns = Math.min(itemCount, 4);
```

There was no `max-width: 1200px` Circuit rule forcing three columns.

After:

```css
@container (max-width: 1200px) {
  .carousel-shell.static-grid .track {
    --static-circuit-columns: 3;
  }
}
```

```ts
const nextVisibleCount = width > 1200 ? 4 : width > 599 ? 3 : 1;
const usesCarousel = itemCount > this.visibleCount;
const staticColumns = Math.min(itemCount, this.visibleCount);
```

At common HA section widths of 1200px or less, `visibleCount` becomes 3 and the
inline `--static-circuit-columns` value also becomes 3. This directly produces
three wider cards. Card height remains 150px and Circuit card internal dimensions
were not changed in that diff; the changed width/aspect is a consequence of
distributing the same container width across three columns instead of four.

The same commit changed KPI inset tokens and the shared grid mobile column count,
but neither causes the Circuit desktop three-column result. The Circuit change is
an unintended regression relative to the required four-column desktop contract
and must be fixed in a dedicated bugfix.

## 8. Direct-manipulation safety decision

Current decision: **not yet technically safe for persistence**.

- Native Trend Editor persistence path: structurally correct, still requires HA
  integration confirmation in the target version.
- Header Manage persistence: unverified and has no persistence adapter.
- Edit Mode card-click persistence: unavailable because Edit Mode detection is
  absent.
- KPI/Circuit section runtime changes: localStorage-backed, not Lovelace-backed.
- Standalone KPI settings: no reliable owning persistence host.

Phase 1 must not begin until the real HA integration test establishes a stable
Edit Mode signal and writeback route, or the architecture adopts the safe
fallback of routing direct manipulation into the Native Editor host.
