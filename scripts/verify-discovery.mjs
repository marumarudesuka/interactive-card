import assert from "node:assert/strict";
import { discoverGenericMetrics } from "../src/discovery/generic-entity-discovery.ts";
import { discoverMetrics } from "../src/discovery/discovery-pipeline.ts";
import { ecoMainDiscoveryAdapter } from "../src/discovery/adapters/ecomain-adapter.ts";
import { createDiscoveredMetric } from "../src/discovery/metric-classifier.ts";
import {
  createKpiDiscoveryResults,
  getCircuitDiscoveryCandidates,
  getTrendDiscoveryCandidates,
} from "../src/discovery/discovery-consumers.ts";
import { mergeKpiConfigSources } from "../src/config/kpi-config-merger.ts";
import { discoveryFixture } from "./fixtures/discovery-fixtures.mjs";

const generic = discoverGenericMetrics(discoveryFixture);
const byId = new Map(generic.map((metric) => [metric.entityId, metric]));
assert.equal(byId.get("sensor.main_all_power_rt")?.metricType, "power");
assert.equal(byId.get("sensor.shelly_kitchen_power")?.metricType, "power");
assert.equal(byId.get("sensor.esphome_garage_energy")?.metricType, "energy");
assert.equal(byId.get("sensor.esphome_garage_energy")?.suggestedRole, "total_energy");
assert.equal(byId.get("sensor.generic_voltage")?.metricType, "voltage");
assert.equal(byId.get("sensor.generic_voltage")?.normalizedUnit, "V");
assert.equal(byId.get("sensor.metadata_poor")?.metricType, "other");
assert.equal(byId.get("sensor.metadata_poor")?.numeric, true);
assert.equal(byId.get("sensor.main_all_power_rt")?.evidence.some((item) => item.source === "adapter"), false);

const deviceClassWins = createDiscoveredMetric("sensor.conflicting_metadata", {
  state: "1",
  attributes: { device_class: "power", unit_of_measurement: "kWh", friendly_name: "Voltage" },
});
assert.equal(deviceClassWins.metricType, "power");
assert.equal(deviceClassWins.evidence[0]?.source, "device_class");

const entityIdWinsFriendlyName = createDiscoveredMetric("sensor.workshop_current", {
  state: "1",
  attributes: { friendly_name: "Workshop Voltage" },
});
assert.equal(entityIdWinsFriendlyName.metricType, "current");
assert.equal(entityIdWinsFriendlyName.evidence[0]?.source, "entity_id");

const enhanced = discoverMetrics(discoveryFixture, { adapters: [ecoMainDiscoveryAdapter] });
const enhancedById = new Map(enhanced.map((metric) => [metric.entityId, metric]));
assert.equal(enhancedById.get("sensor.main_all_power_rt")?.suggestedRole, "main_power");
assert.equal(enhancedById.get("sensor.main_all_power_rt")?.evidence.some((item) => item.source === "adapter" && item.adapter === "ecomain"), true);
assert.equal(enhancedById.get("sensor.shelly_kitchen_power")?.evidence.some((item) => item.source === "adapter"), false);

const circuitCandidates = getCircuitDiscoveryCandidates(enhanced);
assert.equal(circuitCandidates[0]?.entityId, "sensor.main_ch1_power_rt");
assert.equal(circuitCandidates.some((metric) => metric.entityId === "sensor.shelly_kitchen_power"), true);
assert.equal(circuitCandidates.some((metric) => metric.entityId === "sensor.generic_kw_load"), true);
assert.equal(circuitCandidates.find((metric) => metric.entityId === "sensor.main_ch2_power_rt")?.available, false);
assert.equal(circuitCandidates.find((metric) => metric.entityId === "sensor.non_numeric_power")?.numeric, false);

const configuredCircuitCandidates = getCircuitDiscoveryCandidates(
  enhanced,
  "sensor.shelly_kitchen_power"
);
assert.equal(configuredCircuitCandidates[0]?.entityId, "sensor.shelly_kitchen_power");

const trendCandidates = getTrendDiscoveryCandidates(enhanced);
assert.equal(trendCandidates.some((metric) => metric.entityId === "sensor.esphome_garage_energy"), true);
assert.equal(trendCandidates.some((metric) => metric.entityId === "sensor.generic_wh_energy"), true);
assert.equal(trendCandidates.some((metric) => metric.entityId === "sensor.generic_kwh_energy"), true);
assert.equal(trendCandidates.some((metric) => metric.entityId === "sensor.metadata_poor"), false);

const templates = [
  { id:"power", title:"Current Power", defaultEntity:"sensor.template_power", defaultEnabled:true },
  { id:"usage", title:"Today's Usage", defaultEntity:"sensor.template_energy", defaultEnabled:true },
];
const kpiDiscovery = createKpiDiscoveryResults(enhanced, templates);
const discoveredKpis = mergeKpiConfigSources({ templates, discovery:kpiDiscovery });
assert.equal(discoveredKpis.find((item) => item.config.id === "power")?.config.entity, "sensor.main_all_power_rt");
assert.equal(discoveredKpis.find((item) => item.config.id === "usage")?.config.entity, "sensor.main_all_energy_fwd_total");

const explicitKpis = mergeKpiConfigSources({
  templates,
  repositoryCards:[{ id:"power", entity:"sensor.saved_custom" }],
  yamlCards:[{
    id:"power",
    entity:"sensor.yaml_unknown_custom",
    metadata:{ entityLocked:true },
  }],
  discovery:kpiDiscovery,
});
assert.equal(explicitKpis.find((item) => item.config.id === "power")?.config.entity, "sensor.yaml_unknown_custom");

const genericOnly = enhanced.filter((metric) =>
  !metric.evidence.some((item) => item.adapter === "ecomain")
);
assert.equal(getCircuitDiscoveryCandidates(genericOnly).some(
  (metric) => metric.entityId === "sensor.shelly_kitchen_power"
), true);

console.log("Discovery foundation verification passed.");
