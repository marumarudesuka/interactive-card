import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

function includes(sourceText, expected, label) {
  assert.ok(
    sourceText.includes(expected),
    `${label} changed. Phase 0 freezes layout and persistence behavior.`,
  );
}

const [
  grid,
  kpiSection,
  kpiCard,
  trendCard,
  circuitSection,
  circuitCard,
  trendEditor,
  kpiStorage,
  trendStorage,
  circuitStorage,
  themeStorage,
] = await Promise.all([
  source("src/styles/energy-grid.ts"),
  source("src/components/energy-kpi-section.ts"),
  source("src/components/energy-kpi-card.ts"),
  source("src/components/energy-trend-card.ts"),
  source("src/components/energy-circuit-section.ts"),
  source("src/components/circuit/circuit-card.ts"),
  source("src/editors/energy-trend-card-editor.ts"),
  source("src/repositories/local-storage-kpi-config-repository.ts"),
  source("src/repositories/local-storage-trend-config-repository.ts"),
  source("src/repositories/local-storage-circuit-config-repository.ts"),
  source("src/theme/theme-storage.ts"),
]);

// Shared grid and KPI visual contract.
includes(grid, "grid-template-columns: repeat(4, minmax(0, 1fr));", "Desktop energy grid");
includes(grid, "@container (max-width: 1200px)", "Energy grid tablet breakpoint");
includes(grid, "grid-template-columns: repeat(2, minmax(0, 1fr));", "Energy grid tablet columns");
includes(grid, "@container (max-width: 599px)", "Energy grid mobile breakpoint");
includes(grid, "gap: var(--energy-grid-gap, 16px);", "Energy grid gap");
includes(kpiSection, "--kpi-card-height:170px", "KPI desktop height");
includes(kpiSection, "--kpi-card-height:160px", "KPI tablet height");
includes(kpiSection, "--kpi-card-height:150px", "KPI mobile height");
includes(kpiSection, "--kpi-padding:20px", "KPI desktop padding");
includes(kpiSection, "--kpi-padding:18px", "KPI tablet padding");
includes(kpiSection, "--kpi-padding:14px", "KPI mobile padding");
includes(kpiCard, "--energy-card-height: var(--kpi-card-height, 170px);", "KPI card fallback height");

// Trend visual contract.
includes(trendCard, "--glass-container-height: var(--trend-card-height, 350px);", "Trend height");
includes(trendCard, "style=${`--trend-card-height:${height}px`}", "Trend configured height binding");

// Circuit visual and carousel contract. The three-column rule is intentionally
// recorded as a known regression; this script does not fix or endorse it.
includes(circuitSection, "grid-template-columns: repeat(var(--static-circuit-columns, 4), minmax(0, 1fr));", "Circuit grid");
includes(circuitSection, "gap: var(--circuit-grid-gap, 16px);", "Circuit gap");
includes(circuitSection, "--circuit-card-height: 150px;", "Circuit height");
includes(circuitSection, "@container (max-width: 1200px)", "Circuit desktop/tablet breakpoint");
includes(circuitSection, "--static-circuit-columns: 3;", "Known Circuit three-column regression");
includes(circuitSection, "const nextVisibleCount = width > 1200 ? 4 : width > 599 ? 3 : 1;", "Circuit visible count");
includes(circuitSection, "const usesCarousel = itemCount > this.visibleCount;", "Circuit carousel threshold");
includes(circuitSection, "const staticColumns = Math.min(itemCount, this.visibleCount);", "Circuit static columns");
includes(circuitSection, "<ic-circuit-add-card", "Circuit Add Card tile");
includes(circuitCard, "--energy-card-height: var(--circuit-card-height, 150px);", "Circuit card fallback height");

// Current editor/persistence boundary.
includes(trendEditor, 'new CustomEvent("config-changed"', "Native Trend editor event");
includes(kpiSection, "dispatchConfigChanged(this, this.config);", "Runtime KPI event");
includes(trendCard, 'new CustomEvent("config-changed"', "Runtime Trend event");
includes(circuitSection, 'new CustomEvent("config-changed"', "Runtime Circuit event");

for (const [text, key] of [
  [kpiStorage, "interactive-card:kpi-config:v1"],
  [trendStorage, "interactive-card:trend-config:v1"],
  [circuitStorage, "interactive-card:circuit-config:v1"],
  [themeStorage, "interactive-card:appearance-theme:v1"],
]) {
  includes(text, key, `localStorage key ${key}`);
}

console.log("Phase 0 source contracts verified.");
console.log("KNOWN REGRESSION: Circuit containers from 600px through 1200px use 3 columns.");
console.log("ENVIRONMENT GATE: runtime config-changed persistence requires a real HA Edit Mode test.");
