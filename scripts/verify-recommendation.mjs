import assert from "node:assert/strict";
import { discoverEnergyMetrics } from "../src/discovery/discovery-consumers.ts";
import { recommendDashboard } from "../src/recommendation/dashboard-recommender.ts";
import {
  ecoMainRecommendationFixture,
  genericRecommendationFixture,
  mixedRecommendationFixture,
  noCircuitRecommendationFixture,
  similarPowerRecommendationFixture,
} from "./fixtures/recommendation-fixtures.mjs";

const ecoMetrics = discoverEnergyMetrics(ecoMainRecommendationFixture);
const ecoMetricsSnapshot = JSON.stringify(ecoMetrics);
const eco = recommendDashboard(ecoMetrics);
assert.equal(JSON.stringify(ecoMetrics), ecoMetricsSnapshot, "recommendation is read-only");
assert.equal(eco.kpis.find((item) => item.kind === "current_power")?.entityId, "sensor.main_all_power_rt");
assert.equal(eco.kpis.find((item) => item.kind === "daily_energy")?.entityId, "sensor.today_energy");
assert.equal(eco.kpis.find((item) => item.kind === "total_energy")?.entityId, "sensor.main_all_energy_fwd_total");
assert.equal(eco.kpis.find((item) => item.kind === "cost")?.entityId, "sensor.energy_cost_today");
assert.equal(eco.kpis.find((item) => item.kind === "solar")?.entityId, "sensor.solar_power");
assert.equal(eco.circuits[0]?.entityId, "sensor.main_ch1_power_rt");
assert.equal(eco.circuits.some((item) => item.entityId === "sensor.main_all_power_rt"), false);
assert.equal(eco.circuits.some((item) => item.entityId === "sensor.main_ch3_power_rt"), false);
assert.equal(eco.circuits[0]?.sourceAdapter, "ecomain");
assert.ok(eco.circuits[0]?.evidence.length);
assert.match(eco.circuits[0]?.reason ?? "", /circuit power role/);

const generic = recommendDashboard(discoverEnergyMetrics(genericRecommendationFixture));
assert.equal(generic.kpis.find((item) => item.kind === "current_power")?.metricType, "power");
assert.equal(generic.circuits.some((item) => item.entityId === "sensor.shelly_kitchen_power"), true);
assert.equal(generic.kpis.some((item) => item.metricType === "cost"), false);
assert.equal(generic.circuits.length >= 2, true);
assert.equal(generic.circuits.every((item) => item.sourceAdapter === undefined), true);
assert.equal(generic.trend.some((item) => item.metricType === "power"), true);
assert.equal(generic.trend.some((item) => item.metricType === "energy"), true);

const mixed = recommendDashboard(discoverEnergyMetrics(mixedRecommendationFixture));
assert.equal(mixed.circuits.some((item) => item.entityId === "sensor.main_ch1_power_rt"), true);
assert.equal(mixed.circuits.some((item) => item.entityId === "sensor.shelly_office_power"), true);
assert.equal(mixed.trend.some((item) => item.entityId === "sensor.esphome_ev_power"), true);

const noCircuit = recommendDashboard(discoverEnergyMetrics(noCircuitRecommendationFixture));
assert.deepEqual(noCircuit.circuits.map((item) => item.entityId), ["sensor.home_main_power"]);

const similar = recommendDashboard(discoverEnergyMetrics(similarPowerRecommendationFixture));
assert.equal(similar.circuits.some((item) => item.entityId === "sensor.kitchen_power_3"), false);
assert.equal(similar.circuits.filter((item) => item.entityId.startsWith("sensor.kitchen_power_")).length, 1);
assert.equal(similar.trend.filter((item) => item.entityId.startsWith("sensor.kitchen_power_")).length, 1);
assert.deepEqual(
  recommendDashboard(discoverEnergyMetrics(similarPowerRecommendationFixture)),
  similar,
  "recommendations are deterministic"
);

console.log("Recommendation verification passed.");
