import assert from "node:assert/strict";
import { analyzeCircuitHistory } from "../src/components/circuit/circuit-detail/circuit-session-analyzer.ts";
import { formatCircuitDuration } from "../src/components/circuit/circuit-detail/circuit-detail-model.ts";

const minute = 60_000;
const points = (values) => values.map((power, index) => ({ timestamp: index * minute, power }));

const current = analyzeCircuitHistory(points([0, 0, 5, 6, 7]), true, 8 * minute);
assert.equal(current.session.state, "current");
assert.equal(current.session.startedAt, 2 * minute);
assert.equal(current.session.duration, 6 * minute);

const last = analyzeCircuitHistory(points([0, 4, 5, 0, 0]), false, 8 * minute);
assert.equal(last.session.state, "last");
assert.equal(last.session.startedAt, minute);
assert.equal(last.session.endedAt, 3 * minute);
assert.equal(last.session.duration, 2 * minute);

// Values inside the hysteresis band do not fragment a running session.
const hysteresis = analyzeCircuitHistory(points([0, 1.1, 0.8, 1.05, 0.9, 0.5]), false);
assert.equal(hysteresis.activity.filter((event) => event.type === "active").length, 0);
assert.equal(hysteresis.activity.filter((event) => event.type === "idle").length, 0);

const missing = analyzeCircuitHistory([], true);
assert.equal(missing.session.state, "current");
assert.equal(missing.session.startedAt, undefined);
assert.deepEqual(missing.activity, []);

assert.ok(analyzeCircuitHistory(points([0, 10, 10, 20, 20, 0]), false).activity.length <= 3);

// A: one threshold-crossing sample never creates a session.
const oneSample = analyzeCircuitHistory(points([0, 0, 2, 0, 0]), false);
assert.equal(oneSample.session.state, "unavailable");
assert.equal(oneSample.activity.some((event) => event.type === "active" || event.type === "idle"), false);

// B: repeated threshold oscillation remains idle without transition noise.
const oscillation = analyzeCircuitHistory(points([0, 1.1, 0.8, 1.2, 0.7, 1.05, 0.5, 0]), false);
assert.equal(oscillation.activity.some((event) => event.type === "active" || event.type === "idle"), false);

// C: a sustained transition confirms one active session at the first qualifying sample.
const sustainedActive = analyzeCircuitHistory(points([0, 0, 4, 5, 6]), true, 7 * minute);
assert.equal(sustainedActive.session.startedAt, 2 * minute);
assert.equal(sustainedActive.activity.filter((event) => event.type === "active").length, 1);

// D: sustained idle confirmation closes the session at the first qualifying idle sample.
const completed = analyzeCircuitHistory(points([0, 3, 4, 5, 0.5, 0.4, 0]), false);
assert.equal(completed.session.state, "last");
assert.equal(completed.session.startedAt, minute);
assert.equal(completed.session.endedAt, 4 * minute);
assert.equal(completed.session.duration, 3 * minute);
assert.equal(completed.activity.filter((event) => event.type === "active").length, 1);
assert.equal(completed.activity.filter((event) => event.type === "idle").length, 1);

// E: a confirmed sub-minute session is represented honestly, never as zero minutes.
const tenSeconds = 10_000;
const shortPoints = [0, 2, 3, 0.5, 0.4].map((power, index) => ({ timestamp: index * tenSeconds, power }));
const shortSession = analyzeCircuitHistory(shortPoints, false);
assert.equal(shortSession.session.duration, 20_000);
assert.equal(formatCircuitDuration(shortSession.session.duration), "< 1 min");
assert.notEqual(formatCircuitDuration(shortSession.session.duration), "0 min");

// F: confirmation follows median cadence even with irregular intervals.
const irregular = analyzeCircuitHistory([
  { timestamp: 0, power: 0 },
  { timestamp: 9_000, power: 0 },
  { timestamp: 20_000, power: 4 },
  { timestamp: 33_000, power: 5 },
  { timestamp: 41_000, power: 6 },
], true, 50_000);
assert.equal(irregular.session.startedAt, 20_000);
assert.equal(irregular.activity.filter((event) => event.type === "active").length, 1);

console.log("Circuit detail verification passed.");
