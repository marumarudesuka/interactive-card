import "./theme/theme-provider";
import "./components/energy-kpi-card";
import "./components/energy-kpi-section";
import "./components/energy-trend-card";
import "./components/energy-circuit-section";
import "./components/energy-flow-diagram";
import "./components/energy-theme-selector";
import "./components/energy-settings-card";
import "./components/kpi/kpi-card-builder-dialog";
import "./components/scenes/ev/ev-charging-scene";
import "./components/scenes/solar/solar-energy-scene";
import "./components/scenes/battery/battery-storage-scene";
import "./components/scenes/appliance/appliance-intelligence-scene";
import "./components/scenes/pet/pet-energy-scene";
import { publishCardRegistry } from "./config/card-registry";

publishCardRegistry();
console.log("Interactive Card Loaded");
