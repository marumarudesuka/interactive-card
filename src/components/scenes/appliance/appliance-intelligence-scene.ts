import { html } from "lit";
import { applianceInsight, applianceMetrics, applianceSeries } from "../../../data/scene-mock-data";
import { ScenePageElement } from "../common/scene-page-base";
import "../common/scene-page-container";
import "../common/scene-hero-card";
import "../common/scene-metric-grid";
import "../common/scene-chart-card";
import "../common/scene-insight-card";

export class ApplianceIntelligenceScene extends ScenePageElement {
  render() {
    return html`<ic-scene-page-container title="Appliance Intelligence" subtitle="Energy usage by household circuit">
      <ic-scene-hero-card title="Energy Usage by Appliance" icon="mdi:devices"
        .status=${{label:"4 active circuits",state:"active"}}
        .primary=${{title:"Active Load",value:"5.0",unit:"kW"}}
        .details=${[{title:"Top Consumer",value:"Air Conditioner"}]}
      ></ic-scene-hero-card>
      <ic-scene-metric-grid .metrics=${applianceMetrics}></ic-scene-metric-grid>
      <ic-scene-chart-card title="Running Timeline" subtitle="When major appliances were drawing power today"
        .series=${applianceSeries}></ic-scene-chart-card>
      <energy-insight-card .insight=${applianceInsight}></energy-insight-card>
    </ic-scene-page-container>`;
  }
}
customElements.define("energy-appliance-scene", ApplianceIntelligenceScene);
