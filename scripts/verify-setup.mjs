import assert from "node:assert/strict";
import { discoverEnergyMetrics } from "../src/discovery/discovery-consumers.ts";
import { recommendDashboard } from "../src/recommendation/dashboard-recommender.ts";
import {
  createSetupCompleteDetail,
  createSetupDraft,
  moveSetupItem,
  toggleSetupItem,
  updateSetupItem,
} from "../src/setup/setup-controller.ts";
import {
  ecoMainRecommendationFixture,
  genericRecommendationFixture,
} from "./fixtures/recommendation-fixtures.mjs";

const storageAccesses = [];
Object.defineProperty(globalThis, "localStorage", {
  configurable:true,
  value:new Proxy({}, {
    get(_target, property) {
      storageAccesses.push(String(property));
      throw new Error("setup controller must not access localStorage");
    },
  }),
});

const genericPreview = recommendDashboard(
  discoverEnergyMetrics(genericRecommendationFixture)
);
const initial = createSetupDraft(genericPreview);
assert.equal(initial.kpis.length, genericPreview.kpis.length);
assert.equal(initial.kpis.every((item) => item.enabled), true);
assert.equal(initial.kpis[0]?.source.entityId, genericPreview.kpis[0]?.entityId);

const toggled = toggleSetupItem(initial, "kpis", initial.kpis[0].order);
assert.equal(toggled.kpis[0].enabled, false);
assert.equal(initial.kpis[0].enabled, true, "toggle is immutable");

const moved = moveSetupItem(initial, "circuits", initial.circuits[1].order, -1);
assert.equal(moved.circuits[0].entityId, initial.circuits[1].entityId);
assert.deepEqual(moved.circuits.map((item) => item.order), [0, 1]);

const replaced = updateSetupItem(initial, "trend", initial.trend[0].order, {
  entityId:"sensor.user_selected",
});
assert.equal(replaced.trend[0].entityId, "sensor.user_selected");
assert.equal(replaced.trend[0].source.entityId, initial.trend[0].source.entityId);

const renamed = updateSetupItem(replaced, "trend", replaced.trend[0].order, {
  displayName:"My Energy",
});
assert.equal(renamed.trend[0].displayName, "My Energy");

const emptyPreview = {
  kpis:[], trend:[], circuits:[], availableMetricCount:0, unavailableMetricCount:0,
};
const emptyDraft = createSetupDraft(emptyPreview);
assert.deepEqual(emptyDraft.kpis, []);
assert.deepEqual(emptyDraft.trend, []);
assert.deepEqual(emptyDraft.circuits, []);

const ecoDraft = createSetupDraft(recommendDashboard(
  discoverEnergyMetrics(ecoMainRecommendationFixture)
));
assert.equal(ecoDraft.circuits.some((item) => item.source.sourceAdapter === "ecomain"), true);
assert.equal(initial.circuits.every((item) => item.source.sourceAdapter === undefined), true);

const output = createSetupCompleteDetail(renamed);
assert.deepEqual(Object.keys(output), ["draft"]);
assert.equal(output.draft.trend[0].displayName, "My Energy");
output.draft.trend[0].displayName = "Changed after emit";
assert.equal(renamed.trend[0].displayName, "My Energy", "setup-complete output is detached");
assert.deepEqual(storageAccesses, [], "setup conversion has no persistence side effects");

console.log("Setup verification passed.");
