import { html } from "lit";
import { batteryInsight, batteryMetrics, batterySeries } from "../../../data/scene-mock-data";
import { ScenePageElement } from "../common/scene-page-base";
import "../common/scene-page-container";
import "../common/scene-hero-card";
import "../common/scene-metric-grid";
import "../common/scene-flow-card";
import "../common/scene-chart-card";
import "../common/scene-insight-card";

export class BatteryStorageScene extends ScenePageElement {
  render() {
    return html`<ic-scene-page-container title="Battery Storage" subtitle="Storage health and household support">
      <ic-scene-hero-card title="Home Battery" icon="mdi:home-battery"
        .status=${{label:"Charging",state:"active"}}
        .primary=${{title:"Battery Level",value:"72",unit:"%"}}
        .details=${[{title:"Power",value:"2.5",unit:"kW"}]}
      ></ic-scene-hero-card>
      <ic-scene-metric-grid .metrics=${batteryMetrics}></ic-scene-metric-grid>
      <ic-scene-flow-card title="Battery Energy Flow" .nodes=${[
        {label:"Solar",value:"3.7 kW",icon:"mdi:solar-power"},
        {label:"Battery",value:"+2.5 kW",icon:"mdi:battery-charging"},
        {label:"Home",value:"1.2 kW",icon:"mdi:home-lightning-bolt"},
      ]}></ic-scene-flow-card>
      <ic-scene-chart-card title="Charge / Discharge Timeline" subtitle="Positive values charge; negative values support the home"
        .series=${batterySeries}></ic-scene-chart-card>
      <energy-insight-card .insight=${batteryInsight}></energy-insight-card>
    </ic-scene-page-container>`;
  }
}
customElements.define("energy-battery-scene", BatteryStorageScene);
