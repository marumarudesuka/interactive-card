import assert from "node:assert/strict";
import { analyzePower } from "../src/components/trend/trend-analysis/analyzers/power-analyzer.ts";

function analyze(values) {
  return analyzeAt(values, values.map((_value, index) => Date.UTC(2026, 0, 1, 0, index)));
}

function analyzeAt(values, timestamps) {
  return analyzePower({
    metricType: "power",
    stateStatus: "valid",
    series: {
      id: "power",
      entity: "sensor.test_power",
      name: "Test Power",
      chartMode: "line",
      category: "power",
      unit: "W",
      axisId: "power:W",
      precision: 2,
      visible: true,
      lineStyle: "solid",
      points: values.map((value, index) => ({ timestamp: timestamps[index], value })),
    },
  });
}

// A: matching start/end with a large middle spike must not mean whole-period stable.
const middleSpike = analyze([100, 100, 100, 100, 1_000, 100, 100, 100, 100, 100]);
assert.doesNotMatch(middleSpike.summary?.[0]?.primary ?? "", /Stable/);

// B: a rapid rise immediately followed by its peak is one temporal event.
assert.equal(middleSpike.keyEvents?.filter((event) => /peak|spike|high-load/i.test(event.label)).length, 1);
assert.equal(middleSpike.keyEvents?.some((event) => event.label === "Sharp rise"), false);

// C: near-zero baselines use absolute power delta, not an inflated percentage.
const nearZeroRise = analyze([0, 0, 0, 5_000, 5_000, 5_000, 5_000, 5_000, 5_000]);
assert.equal(nearZeroRise.keyEvents?.some((event) => event.detail?.includes("%")), false);

// D: one significant peak cannot support a repeated-peaks insight.
assert.doesNotMatch(middleSpike.insight ?? "", /multiple significant peaks|repeated peaks/i);

// E: two independently separated significant peak clusters can support repeated peaks.
const twoPeaks = analyze([100, 100, 1_000, 100, 100, 100, 900, 100, 100, 100, 100]);
assert.match(twoPeaks.insight ?? "", /multiple significant peaks/i);
assert.equal(twoPeaks.keyEvents?.filter((event) => /peak|spike/i.test(event.label)).length, 2);

// F: genuinely narrow, flat history remains stable.
const stable = analyze([100, 101, 100, 99, 100, 101, 100, 99, 100, 100]);
assert.match(stable.summary?.[0]?.primary ?? "", /Stable/);

// G: start/end proximity cannot hide whole-period volatility.
const volatile = analyze([100, 500, 100, 500, 100, 500, 100, 500, 100, 100]);
assert.match(volatile.summary?.[0]?.primary ?? "", /Volatile|Mixed|Peak-heavy/);
assert.doesNotMatch(volatile.summary?.[0]?.primary ?? "", /Stable/);

// H: two local maxima separated only by a shallow valley are one human-level spike.
const shallowValley = analyze([
  100, 100, 100, 100, 100,
  13_920, 12_800, 12_700, 12_800, 14_240, 12_900,
  100, 100, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
]);
const shallowPeaks = shallowValley.keyEvents?.filter((event) => /peak|spike/i.test(event.label)) ?? [];
assert.equal(shallowPeaks.length, 1);
assert.match(shallowPeaks[0]?.detail ?? "", /14\.24 kW/);

// I: a recovery to the robust baseline separates two physical peak events.
const recoveredPeaks = analyze([100, 100, 1_000, 100, 100, 100, 900, 100, 100, 100, 100]);
assert.equal(recoveredPeaks.keyEvents?.filter((event) => /peak|spike/i.test(event.label)).length, 2);

// J: matching HH:mm display text never merges independent events by itself.
const sameMinuteTimes = [0, 5, 10, 15, 20, 25, 45, 50, 55, 58, 59]
  .map((second) => Date.UTC(2026, 0, 1, 0, 0, second));
const sameMinuteIndependent = analyzeAt(
  [100, 100, 1_000, 100, 100, 100, 900, 100, 100, 100, 100],
  sameMinuteTimes,
);
const sameMinutePeakEvents = sameMinuteIndependent.keyEvents?.filter((event) => /peak|spike/i.test(event.label)) ?? [];
assert.equal(sameMinutePeakEvents.length, 2);
assert.equal(sameMinutePeakEvents[0]?.time, sameMinutePeakEvents[1]?.time);

// K: noisy local maxima on one continuously high plateau retain only the highest point.
const noisyPlateau = analyze([
  100, 100, 100, 100, 100,
  1_000, 900, 920, 940, 1_100, 920, 1_050, 900,
  100, 100, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 100, 100,
]);
const plateauPeaks = noisyPlateau.keyEvents?.filter((event) => /peak|spike/i.test(event.label)) ?? [];
assert.equal(plateauPeaks.length, 1);
assert.match(plateauPeaks[0]?.detail ?? "", /1\.1 kW/);

// L: a genuinely short spike remains one compact event rather than a fabricated interval.
const shortSpike = analyze([100, 100, 100, 100, 1_000, 100, 100, 100, 100, 100]);
assert.equal(shortSpike.keyEvents?.filter((event) => /peak|spike|high-load/i.test(event.label)).length, 1);
assert.match(shortSpike.keyEvents?.find((event) => /peak/i.test(event.label))?.time ?? "", /^Around /);

// M: a long high-load run is summarized as one interval event.
const sustainedHigh = analyze([
  ...Array(50).fill(100),
  1_000, ...Array(30).fill(900), 1_100,
  ...Array(50).fill(100),
]);
const sustainedEvents = sustainedHigh.keyEvents?.filter((event) => /high load|high-load|peak period/i.test(event.label)) ?? [];
assert.equal(sustainedEvents.length, 1);
assert.doesNotMatch(sustainedEvents[0]?.time ?? "", /^Around /);

// N: rise, plateau and fall form one coherent window instead of three point events.
const plateauEpisode = analyze([
  ...Array(15).fill(100),
  300, 700, 1_000, 980, 1_020, 990, 1_000, 700, 300,
  ...Array(15).fill(100),
]);
assert.equal(plateauEpisode.keyEvents?.filter((event) => /peak|rise|drop|high-load/i.test(event.label)).length, 1);

// O: real recovery divides two high-load windows.
const twoHighPeriods = analyze([
  ...Array(12).fill(100),
  1_000, 900, 1_100, 900, 1_000,
  ...Array(8).fill(100),
  900, 1_000, 950, 1_050, 900,
  ...Array(12).fill(100),
]);
assert.equal(twoHighPeriods.keyEvents?.filter((event) => /peak|high-load|peak period/i.test(event.label)).length, 2);

console.log("Trend analysis verification passed.");
