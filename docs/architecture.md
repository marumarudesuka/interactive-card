# Architecture

## Runtime flow

```text
Lovelace config
    ↓
setConfig()
    ↓
config normalizer
    ↓
Home Assistant injects hass
    ↓
state reader / entity discovery
    ↓
domain model and formatters
    ↓
business card composition
    ↓
common UI components
```

The Vite library entry is `src/index.ts`. A production build bundles the
registered custom elements into `dist/interactive-card.js`, which Home
Assistant loads as a Lovelace JavaScript module resource.

## Layer responsibilities

### Components

Business cards receive configuration and `hass`, compose prepared state, and
coordinate events. They should not implement unit conversion, entity-list
filtering, modal infrastructure, or reusable metric typography.

`components/common` contains presentation and interaction primitives:

- `ic-glass-container`
- `ic-metric-value`
- `ic-icon-badge`
- `ic-trend-indicator`
- `ic-section-header`
- `ic-app-dialog`
- `ic-card-settings-dialog`

`ic-entity-selector` reads the supplied Home Assistant state collection, but
does not know which business card is using it.

### Config

`config.types.ts` defines public configuration shapes.

`config-normalizer.ts` applies structural defaults without reading Home
Assistant state. Section normalization deliberately preserves missing KPI
format options so definitions in `availableKPIs` can supply them.

`config-events.ts` is the only constructor for the standard `config-changed`
event.

### Data and domain model

`kpi-config.ts` declares available KPI definitions.

`entity-discovery.ts` scores Home Assistant sensor candidates.

`kpi-card-model.ts` owns deterministic KPI collection operations:

- definition/config merging
- discovery orchestration
- enable/disable
- entity update and YAML lock evaluation
- ordering

UI components must not duplicate these operations.

### Helpers

Helpers are focused and reusable:

- `entity-state-parser` distinguishes valid, missing, unknown, unavailable,
  and invalid states.
- `number-formatter`, `unit-converter`, and `metric-formatter` form the metric
  display pipeline.
- `line-chart` converts numeric series into SVG geometry.

Invalid entity states must not be converted into numeric zero.

## Configuration events

Internal entity selection follows this chain:

```text
ic-entity-selector
    ↓ entity-selected
ic-card-settings-dialog
    ↓ entity-selected
energy-kpi-card
    ↓ set-card-entity
energy-kpi-section
    ↓ config-changed (only when accepted)
Lovelace editor / parent
```

An entity explicitly supplied by the original YAML configuration is protected
from runtime replacement. Rejected and no-op updates must not emit
`config-changed`.

## Extension rules

When adding Circuit, Analytics, Trend, or Device cards:

1. Parse HA state through the shared state layer.
2. Format metrics through the shared formatter pipeline.
3. Reuse common visual components.
4. Reuse `ic-app-dialog` and `ic-entity-selector` for settings.
5. Keep collection algorithms outside Lit components.
6. Add a focused verification case for new pure logic.
7. Preserve existing Lovelace configuration compatibility during refactors.

Do not add placeholder or empty modules. Every new module must have a defined
responsibility and an active caller.
