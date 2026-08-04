import { html } from "lit";
import { petInsight, petMetrics } from "../../../data/scene-mock-data";
import { ScenePageElement } from "../common/scene-page-base";
import "../common/scene-page-container";
import "../common/scene-hero-card";
import "../common/scene-metric-grid";
import "../common/scene-insight-card";

export class PetEnergyScene extends ScenePageElement {
  render() {
    return html`<ic-scene-page-container title="Pet Energy" subtitle="A playful view of energy used by pet devices">
      <ic-scene-hero-card title="Pet Energy" icon="mdi:paw"
        .status=${{label:"All devices normal",state:"active"}}
        .primary=${{title:"Current Load",value:"58",unit:"W"}}
        .details=${[{title:"This Month",value:"18.4",unit:"kWh"}]}
      ></ic-scene-hero-card>
      <ic-scene-metric-grid .metrics=${petMetrics}></ic-scene-metric-grid>
      <energy-insight-card .insight=${petInsight}></energy-insight-card>
    </ic-scene-page-container>`;
  }
}
customElements.define("energy-pet-scene", PetEnergyScene);
