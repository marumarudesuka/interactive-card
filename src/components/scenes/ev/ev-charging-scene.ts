import { html } from "lit";
import { evHistory, evInsight, evMetrics, evSeries } from "../../../data/scene-mock-data";
import { ScenePageElement } from "../common/scene-page-base";
import "../common/scene-page-container";
import "../common/scene-hero-card";
import "../common/scene-metric-grid";
import "../common/scene-status-card";
import "../common/scene-history-list";
import "../common/scene-insight-card";
import "./ev-charging-timeline-card";

export class EvChargingScene extends ScenePageElement {
  render() {
    return html`<ic-scene-page-container title="EV Charging" subtitle="Smart charging and session intelligence">
      <ic-scene-hero-card title="Tesla Model Y" icon="mdi:car-electric"
        .status=${{label:"Charging",state:"active"}}
        .primary=${{title:"Current Power",value:"7.2",unit:"kW"}}
        .details=${[{title:"Battery",value:"68",unit:"%"},{title:"Session Energy",value:"24.6",unit:"kWh"}]}
      ></ic-scene-hero-card>
      <ic-scene-metric-grid .metrics=${evMetrics}></ic-scene-metric-grid>
      <ev-charging-timeline-card .series=${evSeries}></ev-charging-timeline-card>
      <ic-scene-status-card title="Cost Optimization" description="Smart charging follows your lowest tariff window."
        .metrics=${[{title:"Smart Charging Cost",value:"$4.80"},{title:"Normal Grid Cost",value:"$7.90"},{title:"Saved This Month",value:"$12.40"}]}>
      </ic-scene-status-card>
      <ic-scene-history-list title="Charging History" .headings=${["Energy","Cost","Duration"]} .entries=${evHistory}></ic-scene-history-list>
      <energy-insight-card .insight=${evInsight}></energy-insight-card>
    </ic-scene-page-container>`;
  }
}
customElements.define("energy-ev-charging-scene", EvChargingScene);
