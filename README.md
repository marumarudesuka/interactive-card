# Interactive Card

[English](./README.md) | [简体中文](./README_CN.md)

Interactive Card is a collection of Lovelace custom cards designed for Home Assistant energy dashboards.

The project started as a way to organize several reusable cards from a personal energy dashboard. As more features were added, it gradually evolved into a lightweight component library covering KPI data visualization, historical trend analysis, and real-time circuit power monitoring.

All cards share a consistent visual design system and can be flexibly configured using different Home Assistant entities, helping users better understand and manage their home energy data.

<p align="center">
  <img
    src="./docs/dashboard_overview.png"
    alt="Interactive Card energy dashboard overview"
    width="100%"
  >
</p>

## Features

Interactive Card currently includes three main components:

- **KPI** — Display key energy metrics such as consumption, power, and cost
- **Trend** — Analyze historical data with configurable data series
- **Circuit** — Monitor real-time power status of individual circuits

Supported features:

- Flexible Home Assistant entity selection
- Custom card titles, icons, units, decimal places, and KPI descriptions
- Automatic power and energy unit conversion and scaling
- Multiple trend series with Line, Area, and Bar chart modes
- Automatic, left, and right Y-axis configuration
- Adjustable trend resolution, time range, and chart height
- Custom circuit names, real-time power entities, and device icons
- Browser-local configuration persistence for dashboard edits
- Three visual styles: Glass, Native, and Solid
- Responsive layouts for KPI and circuit cards across different screen sizes


## Screenshots

### KPI

KPI cards can be added, removed, and edited directly from the dashboard.

Users can select the displayed entity and customize the title, unit, decimal places, and subtitle information.

<p align="center">
  <img
    src="./docs/page1_kpi_card_edit.png"
    alt="KPI card editor interface"
    width="100%"
  >
</p>


### Trend

The Trend card is designed to visualize how energy data changes over time.

It supports multiple data series displayed together, with the ability to quickly hide or show individual curves by clicking the legend.

<p align="center">
  <img
    src="./docs/page2.1_configure_trend.png"
    alt="Energy trend chart with multiple data series"
    width="100%"
  >
</p>

<p align="center">
  <img
    src="./docs/page2.2_trend_card_click.png"
    alt="Trend card interaction interface"
    width="100%"
  >
</p>

Each Series can be configured independently, including display name, unit, chart type, axis position, and decimal places.

Since Home Assistant sensors may have different sampling frequencies, displaying raw data directly can introduce excessive short-term fluctuations.

The Trend card therefore uses smoothing by default to provide a clearer view of overall changes, while also supporting a high-precision mode for users who need detailed data inspection.


### Circuit

The Circuit card provides real-time power monitoring for different household circuits.

Users can customize circuit names, bind real-time power sensors, and select device icons.

Status indicators and color feedback are used to show the current circuit state, real-time power, and data update time, helping users quickly understand the operating status of each circuit.

<p align="center">
  <img
    src="./docs/page3_circuit.png"
    alt="Circuit configuration interface"
    width="100%"
  >
</p>


## Available Cards

The current build registers the following Lovelace card types:

| Card | Description |
|---|---|
| `custom:energy-kpi-card` | Display a configurable KPI value |
| `custom:energy-kpi-section` | Manage and display a group of KPI cards |
| `custom:energy-trend-card` | Display configurable historical data series |
| `custom:energy-circuit-section` | Display real-time circuit power information |
| `custom:energy-flow-diagram` | Display configured energy nodes and flow connections |
| `custom:energy-theme-selector` | Switch between Glass, Native, and Solid styles |
| `custom:energy-settings-card` | Provide card style configuration options |
| `custom:energy-ev-charging-scene` | Display the built-in EV charging scene |
| `custom:energy-solar-scene` | Display the built-in solar energy scene |
| `custom:energy-battery-scene` | Display the built-in battery storage scene |


## Installation

### Manual Installation

The current version can be installed manually.

1. Download the latest `interactive-card.js`.
2. Copy the file to your Home Assistant:

```text
/config/www/interactive-card/interactive-card.js
```

3. Open:

```text
Settings → Dashboards → Resources
```

<p align="center">
  <img
    src="./docs/Setting_Dashboard_Resource.png"
    alt="Home Assistant dashboard resource settings"
    width="100%"
  >
</p>

4. Add the resource:

```text
/local/interactive-card/interactive-card.js
```

Select **JavaScript Module** as the resource type.

5. Refresh your Home Assistant dashboard.


## Quick Start

Add a KPI card to your dashboard:

```yaml
type: custom:energy-kpi-card
entity: sensor.home_power
title: Current Power
icon: mdi:flash
unit: W
decimals: 2
autoScale: true
```

Replace the example entity with an entity that exists in your Home Assistant instance.


## Configuration Examples

Interactive Card currently provides three main card categories:

- KPI visualization
- Energy trend analysis
- Circuit power monitoring


### KPI Section

KPI cards are designed to display key home energy metrics, such as real-time power, daily consumption, and energy cost.

```yaml
type: custom:energy-kpi-section
title: Energy Overview
cards:
  - entity: sensor.home_power
    title: Current Power
    icon: mdi:flash
    unit: W

  - entity: sensor.home_energy_today
    title: Today's Usage
    icon: mdi:lightning-bolt
    unit: kWh
```


### Trend Card

```yaml
type: custom:energy-trend-card
title: Energy Trend
entities:
  - entity: sensor.home_power
    name: Main Power
    unit: W
```


### Active Circuits

```yaml
type: custom:energy-circuit-section
title: Active Circuits
circuits:
  - name: Kitchen
    entity: sensor.kitchen_power
    icon: mdi:stove

  - name: HVAC
    entity: sensor.hvac_power
    icon: mdi:air-conditioner
```


## Project Structure

```text
src/
├── components/       Lovelace cards and shared UI components
├── config/           Configuration normalization and card registry
├── data/             Default KPI, circuit, and scene data
├── design-system/    Shared visual tokens and dialog styles
├── helpers/          Formatting, entity, chart, and layout logic
├── repositories/     Browser-local configuration persistence
├── styles/           Shared card styles and responsive layouts
├── theme/            Card material and theme handling
├── types/            TypeScript configuration and view models
└── index.ts          Build entry point

docs/                 Screenshots and architecture documentation
scripts/              Project validation scripts
dist/                 Generated production build
```

A brief overview of the internal architecture is available in [docs/architecture.md](./docs/architecture.md).


## Future Plans

The project is currently under active development. Future work focuses on stability, compatibility, and preparation for the Home Assistant community ecosystem.

Near-term plans:

- Test across different Home Assistant configurations to improve compatibility
- Improve repository structure and metadata required for future HACS publication
- Continue refining card interactions and energy visualization based on community feedback

Long-term plans:

- Integrate more smart home device data for a more complete home energy management experience
- Combine Home Assistant automation capabilities with energy data for intelligent control, such as solar optimization, smart plugs, and energy usage strategies
- Develop more editable energy scenarios that allow users to create personalized automation experiences
- Continue improving interface design and interaction quality for easier energy monitoring, analysis, and management


## Feedback & Support

Welcome to submit issues, feature requests, and usage feedback through GitHub Issues.

When reporting a problem, please provide the following information when possible:

- Home Assistant version
- Browser environment
- Entity type being used
- Screenshots or reproduction steps

This information helps identify problems faster and continuously improve the project.

New feature ideas and discussions are also welcome as we continue improving the Interactive Card energy management experience.