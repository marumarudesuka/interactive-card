import { html } from "lit";
import { solarInsight, solarMetrics, solarSeries } from "../../../data/scene-mock-data";
import { ScenePageElement } from "../common/scene-page-base";
import "../common/scene-page-container";
import "../common/scene-hero-card";
import "../common/scene-metric-grid";
import "../common/scene-flow-card";
import "../common/scene-chart-card";
import "../common/scene-insight-card";

export class SolarEnergyScene extends ScenePageElement {
  render() {
    return html`<ic-scene-page-container title="Solar Energy" subtitle="Production, consumption and grid contribution">
      <ic-scene-hero-card title="Solar Production" icon="mdi:solar-panel-large"
        .status=${{label:"Producing",state:"active"}}
        .primary=${{title:"Current",value:"5.8",unit:"kW"}}
        .details=${[{title:"Today",value:"18.4",unit:"kWh"}]}
      ></ic-scene-hero-card>
      <ic-scene-metric-grid .metrics=${solarMetrics}></ic-scene-metric-grid>
      <ic-scene-flow-card title="Live Energy Flow" .nodes=${[
        {label:"Solar",value:"5.8 kW",icon:"mdi:solar-power"},
        {label:"Home",value:"3.1 kW",icon:"mdi:home-lightning-bolt"},
        {label:"Battery",value:"1.2 kW",icon:"mdi:battery-charging"},
        {label:"Grid",value:"1.5 kW",icon:"mdi:transmission-tower-export"},
      ]}></ic-scene-flow-card>
      <ic-scene-chart-card title="Solar Trend" subtitle="24-hour production and home consumption"
        .series=${solarSeries}></ic-scene-chart-card>
      <energy-insight-card .insight=${solarInsight}></energy-insight-card>
    </ic-scene-page-container>`;
  }
}
customElements.define("energy-solar-scene", SolarEnergyScene);
