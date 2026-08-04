# Interactive Card

A Lit-based Home Assistant energy dashboard component library.

## Available custom cards

- `custom:energy-kpi-card` — a single configurable energy metric
- `custom:energy-kpi-section` — a managed grid of KPI cards
- `custom:energy-trend-card` — the current trend-card prototype

## Development

Requirements:

- Node.js 22 or newer
- npm

Install and run:

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run verify
npm run check
```

Production build:

```bash
npm run build
```

The production module is written to:

```text
dist/interactive-card.js
```

## Home Assistant installation

1. Copy `dist/interactive-card.js` to a directory below Home Assistant's
   `config/www` directory.
2. Add the file as a Lovelace JavaScript module resource. Files below
   `config/www` are normally available through `/local/`.
3. Add the card to a dashboard.

Example:

```yaml
type: custom:energy-kpi-card
entity: sensor.home_power
title: Current Power
unit: W
autoScale: true
decimals: 2
```

After replacing the JavaScript bundle, update the resource query string or
clear the browser cache when Home Assistant continues to serve an older file.

## Source layout

```text
src/
├── components/
│   ├── common/       Reusable, HA-independent presentation and dialog UI
│   └── *.ts          Home Assistant card and interaction components
├── config/           Config types, normalization, and config events
├── data/             KPI definitions, discovery, and KPI card model
├── helpers/          Entity parsing, formatting, units, and chart geometry
├── styles/           Shared visual styles
├── types/            Shared domain value types
└── index.ts          Production entry and custom-element imports
```

See [Architecture](docs/architecture.md) for module boundaries and extension
rules.
