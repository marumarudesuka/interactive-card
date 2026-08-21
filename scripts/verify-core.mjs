import {
  createLinePath,
  createPolylinePoints,
} from "../src/helpers/line-chart.ts";
import { readFileSync } from "node:fs";
import {
  resolveKpiMetricViewModel,
  resolveKpiTrendViewModel,
} from "../src/helpers/kpi-card-resolver.ts";
import { formatNumber } from "../src/helpers/number-formatter.ts";
import { formatValue } from "../src/helpers/value-formatter.ts";
import {
  convertToBaseUnit,
  convertUnit,
} from "../src/helpers/unit-converter.ts";
import {
  normalizeEnergyKpiSectionConfig,
  normalizeKpiCardConfig,
} from "../src/config/config-normalizer.ts";
import { validateKpiCardConfig } from "../src/config/config-validation.ts";
import {
  getKpiCardKey,
  mergeKpiCards,
  toggleKpiCard,
  updateKpiCardEntity,
} from "../src/data/kpi-card-model.ts";
import { KpiCardManager } from "../src/data/kpi-card-manager.ts";
import { defaultKpiTemplates } from "../src/data/kpi-config.ts";
import { InMemoryKpiConfigRepository } from "../src/repositories/in-memory-kpi-config-repository.ts";
import { mergeKpiConfigSources } from "../src/config/kpi-config-merger.ts";
import {
  KpiConfigCoordinator,
  KpiConfigCoordinatorError,
} from "../src/config/kpi-config-coordinator.ts";
import { buildKpiRepositorySnapshot } from "../src/config/kpi-config-persistence.ts";
import {
  buildCustomKpiConfig,
  createCustomKpiId,
  normalizeKpiCardDraft,
  validateKpiCardDraft,
} from "../src/config/kpi-card-draft.ts";
import { normalizeEnergyTrendCardConfig } from "../src/config/trend-config-normalizer.ts";
import { TrendConfigCoordinator } from "../src/config/trend-config-coordinator.ts";
import { CircuitConfigCoordinator } from "../src/config/circuit-config-coordinator.ts";
import {
  getImportableLegacyCircuits,
  mergeLegacyCircuits,
} from "../src/editors/circuit/legacy-circuit-import.ts";
import {
  CIRCUIT_PENDING_STORAGE_KEY,
  getLegacyPendingCircuitScope,
  getPendingCircuitScope,
  loadPendingCircuitsForConfig,
  LocalStoragePendingCircuitRepository,
} from "../src/repositories/local-storage-pending-circuit-repository.ts";
import {
  TREND_PENDING_STORAGE_KEY,
  LocalStoragePendingTrendSeriesRepository,
} from "../src/repositories/local-storage-pending-trend-series-repository.ts";
import {
  getFiniteTrendGeometry,
  isValidTrendPlotSize,
  runIsolatedTrendSeriesRender,
} from "../src/helpers/trend-render-guard.ts";
import { areTrendChartLayoutsEqual } from "../src/helpers/trend-layout-commit.ts";
import {
  TREND_PENDING_REMOVALS_STORAGE_KEY,
  LocalStoragePendingTrendRemovalRepository,
  matchesPendingTrendRemoval,
} from "../src/repositories/local-storage-pending-trend-removal-repository.ts";
import {
  KPI_PENDING_STORAGE_KEY,
  LocalStoragePendingKpiRepository,
} from "../src/repositories/local-storage-pending-kpi-repository.ts";
import {
  getVisibleEffectiveKpiCards,
  resolveEffectiveKpiCards,
} from "../src/helpers/kpi-effective-card-resolver.ts";
import { applyFormalKpiRemoval } from "../src/editors/kpi/kpi-editor-removal.ts";
import { resolveKpiCardGeometry } from "../src/helpers/kpi-card-geometry.ts";
import {
  getImportablePendingSeries,
  mergePendingSeries,
} from "../src/editors/trend/pending-trend-import.ts";
import {
  getTrendTimeRange,
  loadTrendHistory,
} from "../src/helpers/trend-data-provider.ts";
import { transformTrendHistory } from "../src/helpers/trend-transformer.ts";
import {
  createTrendHoverTimestampIndex,
  createLinearTicks,
  createTrendSeriesPath,
  findNearestTrendPoint,
  findNearestTrendTimestamp,
  getTrendBarGeometry,
  getTrendTimeDomain,
  getTrendZeroBaselineY,
} from "../src/helpers/trend-chart-geometry.ts";
import {
  getLocalTrendBucketStart,
  resolveTrendSamplingStrategy,
  sampleTrendPointsByTime,
  TrendSamplingCache,
} from "../src/helpers/trend-sampling-resolver.ts";
import { createTrendChartLayout } from "../src/helpers/trend-chart-layout.ts";
import { TrendChartModelCache } from "../src/helpers/trend-chart-model.ts";
import { resolveTrendAxis } from "../src/helpers/trend-axis-resolver.ts";
import { resolveTrendAxisUnit } from "../src/helpers/trend-axis-unit-resolver.ts";
import { createTrendTimeTicks } from "../src/helpers/trend-time-ticks.ts";
import {
  formatTrendAxisValue,
  formatTrendSeriesValue,
  getTrendSeriesColor,
  getTrendSeriesFallbackColor,
} from "../src/helpers/trend-chart-formatters.ts";
import { createMonotoneCurve } from "../src/helpers/trend-curve.ts";
import {
  applyTrendPresentationConfig,
  classifyTrendConfigChange,
} from "../src/helpers/trend-config-change-classifier.ts";
import {
  createTrendAreaFill,
  isUnresolvedCanvasColor,
  normalizeTrendCanvasColor,
} from "../src/helpers/trend-canvas-color.ts";
import { sortCircuitsByPower } from "../src/helpers/circuit-utils.ts";
import {
  getCircuitStaticColumnCount,
  planCircuitCarouselAlignment,
} from "../src/helpers/circuit-carousel-layout.ts";
import {
  isRealTimePowerEntity,
  normalizePowerUnit,
} from "../src/helpers/power-entity.ts";
import {
  normalizeAutomationStatus,
  resolveAutomationStrategy,
} from "../src/helpers/automation-scenario-resolver.ts";
import {
  AutomationConfigValidationError,
  normalizeAutomationSectionConfig,
  normalizeAutomationScenarioConfig,
} from "../src/automation/automation-config-normalizer.ts";
import {
  AutomationTemplateRegistry,
  automationTemplateRegistry,
} from "../src/automation/automation-template-registry.ts";
import { resolveAutomationScenarioRuntime } from "../src/automation/automation-runtime-resolver.ts";
import { buildAutomationScenarioCardModel } from "../src/automation/automation-scenario-card-model.ts";
import {collectScenarioEntityBindings,replaceScenarioEntityBinding} from "../src/automation/automation-binding-replacement.ts";
import { AutomationActionExecutor, executeAutomationAction, resolveAutomationActionCall } from "../src/automation/automation-action-executor.ts";
import { classifyScenarioSettings, flattenAutomationNavigation, getAssociatedDeviceSettings, getAutomationParticipation, getAutomationScenarioColumnCount, getPresentedAutomationQuickActions, getPresentedScenarioActions, getPrimaryScenarioSettings, getScenarioExecutionSetting, hasScenarioActivityContent, hasScenarioControlContent, isDeviceControlSetting, navigateAutomationId, navigateGroupAutomationId, resolveScenarioSettingPresentationControl, selectAutomationGroupId, selectAutomationId, selectAutomationInspectorFields, selectGroupAutomationId, shouldPresentReadOnlyStrategy } from "../src/automation/automation-runtime-ui.ts";
import { AutomationSettingChangeExecutor, AutomationSettingOverrideError, clearAutomationSettingOverride, setOneTimeAutomationSettingOverride, updateAutomationSetting, updateAutomationSettingPermanently } from "../src/automation/automation-setting-executor.ts";
import { automationRuntimeDemoFixture } from "./fixtures/automation-scenarios.ts";
import { applyPresetBinding, createLinkedAutomation, createScenarioFromPreset, createStableEditorId, formatEditorCount, getAutomationEditorParentKind, getProgressEditorReadiness, getThresholdComparisonEditorReadiness, moveEditorItem, scenarioPresetBindings, validateScenarioDraftForEditor } from "../src/editors/automation/automation-editor-helpers.ts";
import { canonicalAutomationEntityId } from "../src/automation/automation-entity-identity.ts";
import { energyCardRegistry } from "../src/config/card-registry.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyTrendSeriesColors() {
  assert(
    getTrendSeriesColor("  #42a5f5  ", 4, "main_power") === "#42a5f5",
    "explicit Trend Series colors remain authoritative"
  );
  const stableColor = getTrendSeriesColor(undefined, 0, "main_power");
  assert(
    stableColor === getTrendSeriesColor(undefined, 5, "main_power"),
    "series id provides a stable palette fallback independent of position"
  );
  assert(
    getTrendSeriesColor(undefined, 1) === "var(--en-color-series-2, #FBB03B)",
    "series index provides the final palette fallback"
  );
  for (const index of [3,4,5]) {
    const fallback = getTrendSeriesFallbackColor(index);
    assert(
      fallback !== "#000000" && fallback !== "black" &&
        /^#[\da-f]{6}$/i.test(fallback),
      `palette slot ${index + 1} has a distinct concrete fallback`
    );
  }
}

function verifyTrendConfigChangeClassification() {
  const base = normalizeEnergyTrendCardConfig({
    title:"Energy Trend", height:350, curve:"smooth", renderMode:"smooth",
    timeframe:"24H", category:"power",
    entities:[{
      id:"main",entity:"sensor.main_power",name:"Main",color:"#444D9E",
      chartMode:"area",lineStyle:"solid",decimals:2,visible:true,
    }],
  });
  const visualPatches = [
    { curve:"raw" }, { curve:"step" }, { renderMode:"high_precision" },
    { title:"Updated" }, { height:420 },
    { entities:[{ ...base.entities[0], color:"#FBB03B" }] },
    { entities:[{ ...base.entities[0], chartMode:"bar" }] },
    { entities:[{ ...base.entities[0], lineStyle:"dashed" }] },
    { entities:[{ ...base.entities[0], decimals:3 }] },
  ];
  for (const patch of visualPatches) {
    const next = normalizeEnergyTrendCardConfig({ ...base,...patch });
    assert(!classifyTrendConfigChange(base,next).reloadHistory,
      `visual Trend patch ${Object.keys(patch)[0]} does not reload history`);
  }
  assert(classifyTrendConfigChange(base,normalizeEnergyTrendCardConfig({
    ...base,timeframe:"7D",
  })).reloadHistory,"Trend timeframe change reloads history");
  assert(classifyTrendConfigChange(base,normalizeEnergyTrendCardConfig({
    ...base,entities:[...base.entities,{ entity:"sensor.solar_power" }],
  })).entitySetChanged,"Trend entity addition reloads history as an identity change");

  const points = [{ timestamp:1,value:10 },{ timestamp:2,value:20 }];
  const runtimeSeries = [{
    id:"main",entity:"sensor.main_power",name:"Main",color:"#444D9E",
    chartMode:"area",category:"power",unit:"W",axisId:"power:W",
    precision:2,points,visible:true,lineStyle:"solid",
  }];
  const redrawn = applyTrendPresentationConfig(runtimeSeries,
    normalizeEnergyTrendCardConfig({
      ...base,curve:"step",renderMode:"high_precision",
      entities:[{ ...base.entities[0],chartMode:"line",color:"#FBB03B",decimals:3 }],
    }));
  assert(redrawn[0]?.points === points && redrawn[0]?.chartMode === "line" &&
    redrawn[0]?.color === "#FBB03B" && redrawn[0]?.precision === 3,
  "Trend visual redraw preserves the existing transformed point array");

  const axis = { id:"power:W",category:"power",unit:"W",precision:2,min:10,max:20 };
  const model = new TrendChartModelCache();
  const auto = model.resolve(runtimeSeries,[axis],new Set(),"24H","smooth");
  const detailed = model.resolve(runtimeSeries,[axis],new Set(),"24H","high_precision");
  const autoAgain = model.resolve(runtimeSeries,[axis],new Set(),"24H","smooth");
  assert(auto.series[0]?.points.length && detailed.series[0]?.points.length &&
    autoAgain.series[0]?.points.length,
  "Auto and Detailed resample existing points without emptying drawable Series");
}

function verifyTrendHoverTimestampIndex() {
  const sparse = { points:[{ timestamp:0,value:1 },{ timestamp:100,value:2 }] };
  const dense = { points:Array.from({ length:50 },(_,index) => ({
    timestamp:index * 2, value:index,
  })) };
  const combined = createTrendHoverTimestampIndex([sparse,dense]);
  const reversed = createTrendHoverTimestampIndex([dense,sparse]);
  assert(
    findNearestTrendTimestamp(combined,51) === 50,
    "dense visible Series contributes intermediate hover timestamps"
  );
  assert(
    combined.join(",") === reversed.join(","),
    "hover timestamp resolution is independent of Series order"
  );
  assert(
    createTrendHoverTimestampIndex([sparse]).join(",") === "0,100",
    "hidden/non-drawable Series timestamps do not enter the supplied hover index"
  );
  assert(
    createTrendHoverTimestampIndex([
      sparse,{ points:[{ timestamp:0,value:3 },{ timestamp:100,value:4 }] },
    ]).join(",") === "0,100",
    "shared hover timestamps are deduplicated"
  );
  assert(
    findNearestTrendTimestamp(createTrendHoverTimestampIndex([dense]),37) === 36,
    "single-Series hover retains nearest-timestamp behavior"
  );
}

function verifyAutomationScenarioSemantics() {
  assert(
    normalizeAutomationStatus(" Running ") === "running" &&
      normalizeAutomationStatus("Charging") === "running" &&
      normalizeAutomationStatus("Blocked") === "blocked" &&
      normalizeAutomationStatus("unexpected") === "unknown",
    "automation scenario status values normalize to stable semantics"
  );
  assert(
    resolveAutomationStrategy("Solar").icon === "mdi:white-balance-sunny" &&
      resolveAutomationStrategy("Grid").tone === "grid" &&
      resolveAutomationStrategy("Off-Peak").tone === "neutral",
    "automation strategies support known and future scenario values"
  );
}

function verifyAutomationDomainFoundation() {
  assert(
    automationTemplateRegistry.list().length === 4 &&
      automationTemplateRegistry.has("pet-care") &&
      automationTemplateRegistry.has("solar_water_heating") &&
      automationTemplateRegistry.has("ev_smart_charging") &&
      automationTemplateRegistry.has("custom"),
    "automation templates register and list"
  );
  assert(
    automationTemplateRegistry.get("ev_smart_charging")?.identityDefaults.icon === "mdi:car-electric" &&
      automationTemplateRegistry.getOrCustom("missing-template").id === "custom",
    "automation template lookup supports custom fallback"
  );
  const registry = new AutomationTemplateRegistry(automationTemplateRegistry.list());
  const normalized = normalizeAutomationScenarioConfig({
    type:"custom:energy-automation-card",
    template:"ev_smart_charging",
    title:"Garage EV",
    status_entity:"input_select.ev_status",
    status_mappings:{ charging:"scheduled" },
    strategy:{ entity:"input_select.ev_strategy", mappings:{ solar:{ label:"My Solar", tone:"success" } } },
    goal:{ entity:"input_number.ev_soc", label:"My Target", format:"percentage" },
    metrics:[{ entity:"sensor.ev_power", label:"Charging Power", format:"power" }],
    execution:{ entity:"switch.ev_charger" },
    actions:[{ id:"charge_now", service:"script.turn_on", target_entity:"script.ev_charge_now" }],
    show:{ plan:false },
  }, registry).config;
  assert(
    normalized.identity.title === "Garage EV" &&
      normalized.identity.icon === "mdi:car-electric" &&
      normalized.statusMappings.charging === "scheduled" &&
      normalized.strategyMappings.solar.label === "My Solar" &&
      normalized.visibility.plan === false,
    "core, template, and user configuration merge in priority order"
  );
  assert(
    normalized.statusMappings.ready === "completed" &&
      normalized.strategyMappings.off_peak.label === "Off-Peak Charging",
    "template lifecycle and strategy mappings normalize scenario semantics"
  );

  const legacy = normalizeAutomationScenarioConfig({
    type:"custom:energy-automation-card",
    title:"Existing Heater",
    status_entity:"input_select.heating_status",
    strategy_entity:"input_select.heating_strategy",
    reason_entity:"input_text.heating_reason",
    target_time_entity:"input_datetime.heating_target",
    manual_override_entity:"input_boolean.heating_override",
    device_entity:"switch.water_heater",
    power_entity:"sensor.water_heater_power",
    temperature_entity:"sensor.water_temperature",
    actions:{ run_now:{ domain:"script", service:"turn_on", entity_id:"script.heating_run" } },
    show:{ temperature:false },
  });
  assert(
    legacy.migratedLegacy &&
      legacy.config.templateId === "solar_water_heating" &&
      legacy.config.goals[0]?.entity === "input_datetime.heating_target" &&
      legacy.config.execution?.entity === "switch.water_heater",
    "legacy water-heating YAML migrates to scenario semantics"
  );
  assert(
    legacy.config.metrics.length === 1 &&
      legacy.config.metrics[0]?.entity === "sensor.water_heater_power",
    "legacy metrics migrate and hidden metrics collapse"
  );
  assert(
    legacy.config.actions.length === 1 &&
      legacy.config.actions[0]?.service === "script.turn_on" &&
      legacy.config.actions[0]?.target_entity === "script.heating_run",
    "legacy actions migrate to generic actions"
  );
  const minimal = normalizeAutomationScenarioConfig({ status_entity:"sensor.status" }).config;
  assert(
    minimal.templateId === "custom" && !minimal.visibility.metrics &&
      !minimal.visibility.goals && !minimal.visibility.execution &&
      !minimal.visibility.controls,
    "missing optional data collapses visibility in custom scenarios"
  );

  const invalidCases = [
    [{ template:"custom" }, "missing status_entity"],
    [{ template:"missing", status_entity:"sensor.status" }, "unknown template"],
    [{ status_entity:"sensor.status", metrics:[{ label:"Broken" }] }, "metrics[0] requires entity"],
    [{ status_entity:"sensor.status", goal:{ entity:"" } }, "goal requires entity"],
    [{ status_entity:"sensor.status", execution:{ entity:"" } }, "execution requires entity"],
    [{ status_entity:"sensor.status", actions:{} }, "actions must be an array"],
    [{ status_entity:"sensor.status", actions:[{ id:"run", service:"script.run", script_entity:"script.run" }] }, "cannot configure both"],
    [{ status_entity:"sensor.status", actions:[{ id:"run" }] }, "requires service or script_entity"],
  ];
  for (const [config, expected] of invalidCases) {
    let message = "";
    try { normalizeAutomationScenarioConfig(config); }
    catch (error) { if (error instanceof AutomationConfigValidationError) message = error.message; }
    assert(message.includes(expected), `automation validation reports ${expected}`);
  }
}

function verifyCircuitPowerEntityFilter() {
  const state = (deviceClass, unit) => ({
    attributes: {
      device_class: deviceClass,
      unit_of_measurement: unit,
    },
  });
  assert(
    isRealTimePowerEntity("sensor.main_power", state("power", "W")) &&
      isRealTimePowerEntity("sensor.third_party", state(undefined, " kW ")) &&
      isRealTimePowerEntity("sensor.large_load", state(undefined, "mw")),
    "circuit selector accepts real-time power sensors"
  );
  assert(
      !isRealTimePowerEntity("sensor.energy", state("energy", "Wh")) &&
      !isRealTimePowerEntity("sensor.misclassified", state("power", "Wh")) &&
      !isRealTimePowerEntity("sensor.energy_kwh", state(undefined, "kWh")) &&
      !isRealTimePowerEntity("sensor.voltage", state("voltage", "V")) &&
      !isRealTimePowerEntity("number.power", state("power", "W")),
    "circuit selector rejects energy, non-power, and non-sensor entities"
  );
  assert(
    normalizePowerUnit("W") === "W" &&
      normalizePowerUnit(" KW ") === "kW" &&
      normalizePowerUnit("MWh") === undefined,
    "power unit normalization distinguishes W from Wh"
  );
  assert(
    convertToBaseUnit(1.2, " kW ").value === 1200,
    "circuit power comparison normalizes kW to W"
  );
}

async function verifyTrendConfigPersistence() {
  const records = new Map();
  const repository = {
    async load(cardId) {
      return records.get(cardId);
    },
    async save(cardId, config) {
      records.set(cardId, structuredClone(config));
    },
  };
  const coordinator = new TrendConfigCoordinator(repository);
  const yaml = {
    id: "overview-trend",
    entities: [{ entity: "sensor.main_power", unit: "W" }],
  };
  const initial = await coordinator.resolve("overview-trend", yaml);
  assert(initial.timeframe === "24H", "trend storage falls back to defaults");

  await coordinator.save("overview-trend", {
    ...initial,
    timeframe: "7D",
    chartMode: "bar",
    fullWidth: false,
    height: 420,
    entities: [
      {
        entity: "sensor.solar_power",
        name: "Solar",
        enabled: false,
        order: 0,
        unit: "kW",
        axis: "right",
        decimals: 3,
        renderMode: "high_precision",
      },
    ],
  });
  const restored = await coordinator.resolve("overview-trend", yaml);
  assert(
    restored.timeframe === "24H" &&
      restored.fullWidth !== false &&
      restored.height !== 420,
    "trend chart settings ignore legacy repository state"
  );
  assert(
    restored.entities.length === 1 &&
      restored.entities[0]?.entity === "sensor.main_power" &&
      restored.entities[0]?.unit === "W" &&
      restored.entities[0]?.name !== "Solar" &&
      restored.entities[0]?.enabled !== false &&
      restored.entities[0]?.axis !== "right" &&
      restored.entities[0]?.decimals !== 3 &&
      restored.entities[0]?.chartMode !== "bar" &&
      restored.entities[0]?.renderMode !== "high_precision",
    "trend series settings remain authoritative from Lovelace config"
  );
}

async function verifyAutomationRuntimeFoundation() {
  const demo = normalizeAutomationSectionConfig(automationRuntimeDemoFixture);
  assert(demo.scenarios.length === 2 && demo.scenarios[0].automationGroups.flatMap((group) => group.automations).length === 6 && demo.scenarios[1].automationGroups[0].automations.length === 2,
    "Pet and Solar Runtime fixtures use the same generic Section model");
  assert(!demo.scenarios[0].explanation.reason_entity && !demo.scenarios[0].explanation.last_action_entity && !demo.scenarios[0].explanation.next_action_entity &&
    demo.scenarios[0].metrics.map((metric) => metric.label).join(",") === "Feeding,Food Remaining,Room Temperature" &&
    demo.scenarios[0].automationGroups.flatMap((group) => group.automations).every((automation) => !automation.device),
    "Pet fixture explicitly contains no Summary bindings or device bindings and uses live status, resource, and environmental Metrics");
  assert(!demo.scenarios[1].explanation.reason_entity && !demo.scenarios[1].explanation.last_action_entity && !demo.scenarios[1].explanation.next_action_entity &&
    demo.scenarios[1].metrics.length === 0 && demo.scenarios[1].automationGroups[0].automations.every((automation) => !automation.device),
    "Solar fixture explicitly contains no Summary bindings, device bindings, or instantiated Metrics");
  assert(demo.scenarios[1].automationGroups.flatMap(group=>group.automations).every(automation=>(automation.quick_actions??[]).length===0),
    "Solar fixture does not silently synthesize Turn On or Turn Off Quick Actions");

  const integrityConfig = normalizeAutomationSectionConfig({
    title:"Integrity",
    scenarios:[{
      id:"integrity",template:"custom",status_entity:"input_select.integrity_status",
      reason_entity:"input_text.integrity_reason",
      next_action_entity:"input_text.integrity_next",
      last_action_entity:"input_text.integrity_last",
      metrics:[1,2,3,4,5].map((index) => ({ entity:`sensor.integrity_${index}`,label:`Metric ${index}`,format:"number",...(index===1?{icon:"mdi:gauge",icon_color:"#7E57C2"}:{}) })),
      automation_groups:[{ id:"main",label:"Main",automations:[
        { id:"one",entity:"automation.integrity_one",device:{entity:"switch.device_a"} },
        { id:"two",entity:"automation.integrity_two",device:{entity:"switch.device_b"} },
        { id:"three",entity:"automation.integrity_three",device:{entity:"switch.device_c"} },
        { id:"duplicate",entity:"automation.integrity_duplicate",device:{entity:"switch.device_a"} },
      ]}],
    }],
  }).scenarios[0];
  assert(integrityConfig.explanation.reason_entity === "input_text.integrity_reason" &&
    integrityConfig.explanation.next_action_entity === "input_text.integrity_next" &&
    integrityConfig.explanation.last_action_entity === "input_text.integrity_last",
    "Normalizer preserves top-level Visual Editor Summary bindings for Reason, Next, and Last");
  const integrityState = (state,attributes={}) => ({ state:String(state),attributes,last_changed:"2026-08-13T13:54:00Z" });
  const integrityStates = {
    "input_select.integrity_status":integrityState("running"),
    "input_text.integrity_reason":integrityState("Solar surplus available"),
    "input_text.integrity_last":integrityState("13:54 · Started device"),
    "input_text.integrity_next":integrityState("Continue heating until 18:00"),
  };
  for (let index=1;index<=5;index+=1) integrityStates[`sensor.integrity_${index}`]=integrityState(index,{unit_of_measurement:"W"});
  for (const entity of ["automation.integrity_one","automation.integrity_two","automation.integrity_three","automation.integrity_duplicate","switch.device_a","switch.device_b","switch.device_c"]) integrityStates[entity]=integrityState("on");
  const integrityResolved = resolveAutomationScenarioRuntime({states:integrityStates},integrityConfig);
  const integrityModel = buildAutomationScenarioCardModel(integrityResolved);
  assert(integrityResolved.explanation.reason === "Solar surplus available" &&
    integrityResolved.explanation.lastAction === "13:54 · Started device" &&
    integrityResolved.explanation.nextAction === "Continue heating until 18:00" &&
    Object.values(integrityResolved.explanation.bindings).every((binding) => binding.status === "valid") &&
    integrityModel.activity.reason === "Solar surplus available" && integrityModel.activity.lastAction === "13:54 · Started device" && integrityModel.activity.nextAction === "Continue heating until 18:00",
    "Summary bindings retain real values through normalizer, resolver, and Scenario Card model");
  assert(integrityModel.activity.status === "running" && integrityModel.activity.icon === "mdi:progress-clock",
    "Scenario Card lifecycle icon is derived from normalized semantic lifecycle state");
  const activityCases = [
    { reason:undefined,last:undefined,next:undefined },
    { reason:"Reason",last:undefined,next:undefined },
    { reason:undefined,last:"Last",next:undefined },
    { reason:undefined,last:undefined,next:"Next" },
    { reason:"Reason",last:"Last",next:"Next" },
  ];
  for (const activityCase of activityCases) {
    const states = {...integrityStates};
    states["input_text.integrity_reason"] = integrityState(activityCase.reason ?? "");
    states["input_text.integrity_last"] = integrityState(activityCase.last ?? "");
    states["input_text.integrity_next"] = integrityState(activityCase.next ?? "");
    const activity = buildAutomationScenarioCardModel(resolveAutomationScenarioRuntime({states},integrityConfig)).activity;
    assert(activity.lifecycle === "Running" && activity.reason === activityCase.reason && activity.lastAction === activityCase.last && activity.nextAction === activityCase.next,
      "Scenario Card Activity independently projects lifecycle, reason, Last Action, and Next Action without placeholders");
  }
  assert(integrityResolved.metrics.length === 5 && integrityModel.metrics.length === 3 && integrityModel.metrics.map((metric) => metric.label).join(",") === "Metric 1,Metric 2,Metric 3",
    "Resolver preserves five Metrics while the documented Card projection selects only the first three");
  assert(integrityResolved.metrics[0].iconColor === "#7E57C2" && integrityResolved.metrics[1].iconColor === undefined,
    "Metric custom icon color reaches Runtime while omitted color preserves theme-aware fallback");
  assert(integrityResolved.automationGroups[0].automations.filter((automation) => automation.device).length === 4 &&
    integrityModel.devices.map((device) => device.entityId).join(",") === "switch.device_a,switch.device_b,switch.device_c",
    "Resolver preserves four explicit device bindings and Card projection deduplicates them by entity ID");
  const unavailableResolved = resolveAutomationScenarioRuntime({states:{...integrityStates,"input_text.integrity_last":integrityState("unavailable")}},integrityConfig);
  assert(unavailableResolved.explanation.lastAction === undefined && unavailableResolved.explanation.bindings.lastAction.status === "unavailable" &&
    unavailableResolved.explanation.bindings.lastAction.entityId === "input_text.integrity_last",
    "Configured unavailable Last Action remains distinguishable from an unconfigured binding");
  const unknownResolved = resolveAutomationScenarioRuntime({states:{...integrityStates,"input_text.integrity_next":integrityState("unknown")}},integrityConfig);
  assert(unknownResolved.explanation.nextAction === undefined && unknownResolved.explanation.bindings.nextAction.status === "unknown" &&
    buildAutomationScenarioCardModel(unknownResolved).activity.nextAction === undefined,
    "Unknown Next Action remains diagnostic metadata and never becomes visible placeholder content");
  const missingResolved = resolveAutomationScenarioRuntime({states:{...integrityStates,"input_text.integrity_last":undefined}},integrityConfig);
  assert(missingResolved.explanation.lastAction === undefined && missingResolved.explanation.bindings.lastAction.status === "missing" &&
    buildAutomationScenarioCardModel(missingResolved).activity.lastAction === undefined,
    "Missing Last Action is omitted from Scenario Card Activity without inferred content");
  const noDeviceConfig = normalizeAutomationSectionConfig({scenarios:[{id:"no-device",template:"custom",status_entity:"input_select.no_device",automation_groups:[{id:"main",label:"Main",automations:[{id:"automation",entity:"automation.no_device"}]}]}]}).scenarios[0];
  const noDeviceResolved = resolveAutomationScenarioRuntime({states:{"input_select.no_device":integrityState("waiting"),"automation.no_device":integrityState("on")}},noDeviceConfig);
  assert(buildAutomationScenarioCardModel(noDeviceResolved).devices.length === 0,
    "Linked Automations without explicit device bindings never generate inferred device pills");
  const section = normalizeAutomationSectionConfig({
    title:"Home Automation",
    scenarios:[
      { id:"solar", template:"solar_water_heating", status_entity:"input_select.solar_status" },
      { id:"ev", template:"ev_smart_charging", status_entity:"input_select.ev_status" },
      {
        id:"pet", template:"custom", title:"Pet Care", status_entity:"input_select.pet_status",
        settings:[
          { id:"enabled", label:"Enabled", entity:"input_boolean.pet_enabled", control:"auto" },
          { id:"mode", label:"Mode", entity:"input_select.pet_mode", control:"auto" },
          { id:"amount", label:"Amount", entity:"input_number.feed_amount", control:"auto" },
          { id:"time", label:"Time", entity:"input_datetime.feed_time", control:"auto" },
        ],
        automation_groups:[
          { id:"feeding", label:"Feeding", automations:[
            { id:"scheduled", entity:"automation.scheduled_feeding", parameters:[{ id:"schedule", entity:"input_datetime.feed_time", format:"time" }], quick_actions:[{ id:"feed", service:"button.press", target_entity:"button.feed_now" }] },
            { id:"manual", entity:"automation.manual_feed" },
            { id:"missing", entity:"automation.missing_feed" },
          ] },
          { id:"environment", label:"Environment", automations:[
            { id:"ac", entity:"automation.pet_ac", device:{ entity:"climate.pet_room" } },
          ] },
        ],
      },
    ],
  });
  assert(section.scenarios.map((scenario) => scenario.id).join(",") === "solar,ev,pet",
    "Automation Section normalizes multiple generic Scenarios in stable order");
  assert(section.scenarios[2].automationGroups[0].automations.length === 3 &&
    section.scenarios[2].automationGroups[1].automations[0].id === "ac",
  "Automation Scenario normalizes grouped linked Automations");

  const state = (value, attributes = {}) => ({ state:String(value), attributes, last_changed:"2026-08-13T08:00:00Z" });
  const calls = [];
  const hass = {
    states:{
      "input_select.pet_status":state("running"),
      "input_boolean.pet_enabled":state("on"),
      "input_select.pet_mode":state("Away",{ options:["Home","Away"] }),
      "input_number.feed_amount":state("25",{ min:5,max:100,step:5,unit_of_measurement:"g" }),
      "input_datetime.feed_time":state("18:00:00"),
      "automation.scheduled_feeding":state("on",{ friendly_name:"Scheduled Feeding" }),
      "automation.manual_feed":state("unavailable"),
      "automation.pet_ac":state("unknown"),
      "climate.pet_room":state("cool",{ friendly_name:"Pet Room AC" }),
      "button.feed_now":state("unknown"),
    },
    callService:async (domain,service,data) => { calls.push({ domain,service,data }); },
  };
  const resolved = resolveAutomationScenarioRuntime(hass,section.scenarios[2]);
  assert(resolved.settings.map((setting) => setting.control).join(",") === "toggle,select,number,datetime",
    "Scenario settings infer helper controls from explicit entity domains");
  assert(resolveScenarioSettingPresentationControl(resolved.settings[3],{has_time:true,has_date:false}) === "time" &&
    resolveScenarioSettingPresentationControl(resolved.settings[3],{has_time:true,has_date:true}) === "datetime",
    "input_datetime presentation distinguishes time-only and date-plus-time helpers from HA attributes");
  assert(resolved.settings[1].options.join(",") === "Home,Away" && resolved.settings[2].value === "25",
    "Scenario settings resolve options and formatted current values");
  assert(resolved.automationGroups[0].automations[0].available &&
    !resolved.automationGroups[0].automations[1].available &&
    !resolved.automationGroups[0].automations[2].available &&
    !resolved.automationGroups[1].automations[0].available,
  "Runtime resolver isolates valid, unavailable, and unknown linked Automation states");
  assert(resolved.automationGroups[0].automations[0].quickActions[0].available,
    "explicit button action remains available when its target entity exists");
  const cardScenario = {
    ...resolved,
    metrics:[
      { entityId:"sensor.first",label:"First",icon:"mdi:gauge",iconColor:"#7E57C2",value:"1",available:true,role:"primary" },
      { entityId:"sensor.second",label:"Second",value:"2",available:true,role:"secondary" },
      { entityId:"sensor.third",label:"Third",value:"3",available:true,role:"secondary" },
      { entityId:"sensor.fourth",label:"Fourth",value:"4",available:true,role:"secondary" },
      { entityId:"sensor.fifth",label:"Fifth",value:"5",available:false,role:"secondary" },
    ],
    automationGroups:[{ ...resolved.automationGroups[0],automations:[
      { ...resolved.automationGroups[0].automations[0],enabled:true,enabledAvailable:true,device:{entityId:"switch.feeder",name:"Feeder",state:"on",available:true} },
      { ...resolved.automationGroups[0].automations[1],device:{entityId:"climate.pet_room",name:"Air Conditioner",state:"cool",available:true} },
      { ...resolved.automationGroups[0].automations[2],device:{entityId:"sensor.pet",name:"Pet Monitor",state:"on",available:true} },
      { ...resolved.automationGroups[0].automations[0],id:"fourth",device:{entityId:"switch.light",name:"Room Light",state:"on",available:true} },
      { ...resolved.automationGroups[0].automations[0],id:"duplicate-device",device:{entityId:"switch.feeder",name:"Feeder",state:"on",available:true} },
    ]}],
  };
  const cardModel = buildAutomationScenarioCardModel(cardScenario);
  assert(cardModel.active && cardModel.devices.map(device => device.name).join(",") === "Feeder,Air Conditioner,Pet Monitor" && cardModel.hiddenDeviceCount === 1,
    "Scenario Card derives conservative Active state and deduplicated 3 + N explicit device pills");
  const oneDeviceModel = buildAutomationScenarioCardModel({ ...cardScenario,automationGroups:[{...cardScenario.automationGroups[0],automations:cardScenario.automationGroups[0].automations.slice(0,1)}] });
  const threeDeviceModel = buildAutomationScenarioCardModel({ ...cardScenario,automationGroups:[{...cardScenario.automationGroups[0],automations:cardScenario.automationGroups[0].automations.slice(0,3)}] });
  assert(oneDeviceModel.devices.length === 1 && oneDeviceModel.hiddenDeviceCount === 0 && threeDeviceModel.devices.length === 3 && threeDeviceModel.hiddenDeviceCount === 0,
    "Scenario Card device projection remains stable for one and three explicit devices");
  assert(cardModel.metrics.length === 3 && cardModel.metrics.map(metric => metric.label).join(",") === "First,Second,Third" && cardModel.metrics[2].available,
    "Scenario Card uses the first three configured metrics and preserves unavailable values");
  assert(cardModel.metrics[0].icon === "mdi:gauge",
    "Scenario Card preserves configured metric icons without template or entity inference");
  assert(cardModel.metrics[0].iconColor === "#7E57C2",
    "Scenario Card preserves optional Metric icon color while unconfigured Metrics retain theme fallback");
  assert(buildAutomationScenarioCardModel({...cardScenario,metrics:cardScenario.metrics.slice(0,1)}).metrics.length === 1 &&
    buildAutomationScenarioCardModel({...cardScenario,metrics:cardScenario.metrics.slice(0,2)}).metrics.length === 2,
    "Scenario Card supports one and two metric layouts without slot configuration");
  const inactiveModel = buildAutomationScenarioCardModel({ ...resolved,automationGroups:resolved.automationGroups.map(group => ({...group,automations:group.automations.map(automation => ({...automation,enabled:false}))})) });
  assert(!inactiveModel.active && inactiveModel.automationSummary.length === 3 && inactiveModel.automationSummary[1].value === "--" && inactiveModel.automationSummary[2].value === "--",
    "Scenario Card reports Inactive without reliable enabled evidence and keeps stable Status/Last/Next slots");
  assert(selectAutomationId(resolved.automationGroups) === "scheduled" &&
    selectAutomationId(resolved.automationGroups,"ac") === "ac",
  "Automation selector chooses the first available item and preserves an explicit selection");
  const navigation = flattenAutomationNavigation(resolved.automationGroups);
  assert(navigation.length === 4 && navigation.map((item) => `${item.groupLabel}/${item.automation.id}`).join(",") ===
    "Feeding/scheduled,Feeding/manual,Feeding/missing,Environment/ac",
  "Automation carousel flattens navigation order without flattening grouped data ownership");
  assert(navigateAutomationId(resolved.automationGroups,"scheduled",-1) === "ac" &&
    navigateAutomationId(resolved.automationGroups,"ac",1) === "scheduled" &&
    navigateAutomationId(resolved.automationGroups,"manual",1) === "missing",
  "Automation carousel loops across first, last, and group boundaries");
  const feedingGroup = resolved.automationGroups[0];
  const environmentGroup = resolved.automationGroups[1];
  assert(selectAutomationGroupId(resolved.automationGroups) === "feeding" &&
    selectAutomationGroupId(resolved.automationGroups,"environment") === "environment",
  "Automation Group selector chooses the first Group with an available item and preserves an explicit Group");
  assert(selectGroupAutomationId(feedingGroup) === "scheduled" &&
    selectGroupAutomationId(feedingGroup,"manual") === "manual" &&
    selectGroupAutomationId(feedingGroup,"removed") === "scheduled" &&
    selectGroupAutomationId(environmentGroup) === "ac",
  "Group-local selection preserves unavailable configured items and recovers removed selections per Group");
  assert(navigateGroupAutomationId(feedingGroup,"scheduled",-1) === "missing" &&
    navigateGroupAutomationId(feedingGroup,"missing",1) === "scheduled" &&
    navigateGroupAutomationId(feedingGroup,"manual",1) === "missing" &&
    navigateGroupAutomationId(environmentGroup,"ac",1) === "ac",
  "Automation carousel loops only inside the selected Group, including one-item Groups");
  const participation = getAutomationParticipation(resolved.automationGroups);
  assert(participation.header === "Active" && participation.summary === "1 enabled",
    "Scenario Master Control summarizes reliable linked Automation enabled state without creating a master toggle");
  const inspectorAutomation = {
    ...resolved.automationGroups[0].automations[0],
    current:{label:"Current",value:"Waiting",available:true},
    next:{label:"Next",value:"18:00",available:true},
    last:{label:"Last",value:"08:00",available:true},
    device:{entityId:"switch.feeder",name:"Feeder",state:"on",available:true},
    parameters:[
      {id:"duplicate",entityId:"input_datetime.feed_time",label:"Feeding time",rawValue:"18:00",value:"18:00",available:true},
      {id:"remaining",entityId:"sensor.food",label:"Food",rawValue:"25",value:"25",unit:"g",available:true},
    ],
  };
  const inspectorFields = selectAutomationInspectorFields(inspectorAutomation,["input_datetime.feed_time"]);
  assert(inspectorFields.length === 3 && inspectorFields.map((field) => field.label).join(",") === "Current,Next,Last",
    "Compact Automation inspector applies field priority, three-field limit, and entity-based parameter deduplication");
  const fallbackFields = selectAutomationInspectorFields({...inspectorAutomation,current:undefined,next:undefined,last:undefined},["input_datetime.feed_time"]);
  assert(fallbackFields.map((field) => `${field.label}:${field.value}`).join(",") === "Device:Feeder,Food:25 g",
    "Compact Automation inspector fills missing runtime facts with device and non-duplicate parameters");
  const presentedActions = getPresentedAutomationQuickActions({
    ...inspectorAutomation,
    quickActions:[
      {id:"enable",label:"Turn On",service:"automation.turn_on",target_entity:inspectorAutomation.entityId,tone:"neutral",available:true},
      {id:"disable",label:"Turn Off",service:"automation.turn_off",target_entity:inspectorAutomation.entityId,tone:"neutral",available:true},
      {id:"run",label:"Run Now",service:"automation.trigger",target_entity:inspectorAutomation.entityId,tone:"primary",available:true},
      {id:"other",label:"Turn On",service:"homeassistant.turn_on",target_entity:"switch.heater",tone:"neutral",available:true},
    ],
  });
  assert(presentedActions.map(action=>action.id).join(",") === "run,other",
    "Linked Automation presentation removes only exact automation enabled-state duplicates and preserves explicit actions without label guessing");
  const preferredFeedAction = {id:"scenario-feed",label:"Feed Now",service:"input_button.press",target_entity:"input_button.feed_now",data:{mode:"normal",amount:1},tone:"primary",available:true};
  const legacyFeedAutomation = {
    ...inspectorAutomation,
    quickActions:[
      {...preferredFeedAction,id:"legacy-duplicate",data:{amount:1,mode:"normal"}},
      {...preferredFeedAction,id:"legacy-other",target_entity:"input_button.other_feed"},
    ],
  };
  assert(getPresentedAutomationQuickActions(legacyFeedAutomation,[preferredFeedAction]).map(action=>action.id).join(",") === "legacy-other" &&
    getPresentedAutomationQuickActions(legacyFeedAutomation).map(action=>action.id).join(",") === "legacy-duplicate,legacy-other",
  "Scenario actions suppress equivalent legacy quick actions by service, target, and stable data while legacy-only actions remain visible");
  const controlledEntities=["switch.water_heater"];
  const statefulActions=[
    {id:"heater-on",label:"Turn On",service:"homeassistant.turn_on",target_entity:"switch.water_heater",tone:"neutral",available:true},
    {id:"feed-now",label:"Feed Now",service:"input_button.press",target_entity:"input_button.feed_now",tone:"primary",available:true},
  ];
  assert(getPresentedScenarioActions(statefulActions,controlledEntities).map(action=>action.id).join(",") === "feed-now" &&
    getPresentedAutomationQuickActions({...legacyFeedAutomation,quickActions:statefulActions},[],controlledEntities).map(action=>action.id).join(",") === "feed-now",
  "Stateful entities keep one primary setting control while stateless input-button actions remain available");
  assert(getPrimaryScenarioSettings([resolved.settings[1],{...resolved.settings[1],id:"duplicate-mode"}]).length === 1,
  "Scenario controls render one primary control per entity without mutating configured settings");
  const classifiedControls=classifyScenarioSettings([
    {...resolved.settings[1],id:"care-mode",scope:"scenario"},
    {...resolved.settings[0],id:"air-conditioner",entityId:"switch.feeder",scope:"scenario"},
    {...resolved.settings[0],id:"manual-override",entityId:"input_boolean.manual_override",scope:"scenario"},
  ],cardScenario.automationGroups,"input_boolean.manual_override");
  assert(classifiedControls.scenario.map(setting=>setting.id).join(",") === "care-mode" &&
    classifiedControls.device.map(setting=>setting.id).join(",") === "air-conditioner" &&
    classifiedControls.manualOverride?.id === "manual-override",
  "Runtime semantic device relationships override stale Scenario placement and keep all three roles exclusive");
  const activityFreeScenario = {
    ...resolved,
    strategy:undefined,
    settings:[],
    explanation:{...resolved.explanation,reason:undefined,nextAction:undefined,lastAction:undefined,bindings:{
      reason:{status:"not_configured"},nextAction:{status:"not_configured"},lastAction:{status:"not_configured"},
    }},
  };
  assert(!hasScenarioControlContent(activityFreeScenario) && !hasScenarioActivityContent(activityFreeScenario,false) &&
    hasScenarioActivityContent(activityFreeScenario,true) && hasScenarioControlContent({...activityFreeScenario,strategy:{
      rawValue:"automatic",label:"Automatic",icon:"mdi:tune-variant",tone:"neutral",
    }}),
  "Automation modal hides empty Scenario Control and unbound Current Activity while retaining strategy and bound unavailable status states");
  assert(hasScenarioControlContent({...activityFreeScenario,settings:[{...resolved.settings[0],scope:"device"}]}) &&
    !hasScenarioControlContent({...activityFreeScenario,automationGroups:resolved.automationGroups}),
  "Device-only and linked-automation-only Scenarios retain content detection before exclusive region classification");
  const strategySetting={...resolved.settings[1],entityId:"input_select.heating_strategy"};
  const scenarioWithStrategy={...activityFreeScenario,strategy:{rawValue:"grid",label:"Grid",icon:"mdi:tune-variant",tone:"neutral"},settings:[strategySetting]};
  assert(!shouldPresentReadOnlyStrategy(scenarioWithStrategy,"input_select.heating_strategy") &&
    shouldPresentReadOnlyStrategy({...scenarioWithStrategy,settings:[]},"input_select.heating_strategy"),
  "A Strategy binding is read-only only when no interactive primary control represents the same entity");
  assert(!energyCardRegistry.some(card=>card.component === "energy-automation-card") &&
    energyCardRegistry.some(card=>card.component === "energy-automation-section"),
  "Add Card discovery hides the legacy Automation Card and retains the Automation Section");
  const automationIndexSource = readFileSync(new URL("../src/index.ts",import.meta.url),"utf8");
  const legacyAutomationCardSource = readFileSync(new URL("../src/components/energy-automation-card.ts",import.meta.url),"utf8");
  const automationEditorSource = readFileSync(new URL("../src/editors/energy-automation-section-editor.ts",import.meta.url),"utf8");
  const automationCreationSource = readFileSync(new URL("../src/editors/automation/automation-scenario-creation-flow.ts",import.meta.url),"utf8");
  const automationModalSource = readFileSync(new URL("../src/components/automation/automation-scenario-control-modal.ts",import.meta.url),"utf8");
  const automationScenarioCardSource = readFileSync(new URL("../src/components/automation/automation-scenario-card.ts",import.meta.url),"utf8");
  const progressStripSource = readFileSync(new URL("../src/components/automation/scenario-progress-strip.ts",import.meta.url),"utf8");
  assert(automationIndexSource.includes('import "./components/energy-automation-card"') &&
    legacyAutomationCardSource.includes('customElements.define("energy-automation-card"'),
  "Legacy Automation custom element remains registered for existing YAML compatibility");
  assert(automationEditorSource.includes('activityRow("Scenario Status"')&&automationEditorSource.includes('activityRow("Automation Activity"')&&automationEditorSource.includes('activityRow("Activity Footer"')&&automationEditorSource.includes('kind:"scenario-status"')&&automationEditorSource.includes('kind:"automation-activity"')&&automationEditorSource.includes('kind:"activity-footer"')&&!automationEditorSource.includes('kind:"activity-progress"')&&!automationEditorSource.includes('kind:"threshold-comparison"')&&!automationEditorSource.includes('kind:"last-action"')&&!automationEditorSource.includes('kind:"next-decision"')&&automationEditorSource.includes('friendlyBinding("Status"')&&automationEditorSource.includes('friendlyBinding("Explanation"')&&automationEditorSource.includes('friendlyBinding("Current"')&&automationEditorSource.includes('friendlyBinding("Compare"')&&automationEditorSource.includes('friendlyBinding("Last Action"')&&automationEditorSource.includes('friendlyBinding("Event"')&&automationEditorSource.includes('friendlyBinding("Time"')&&
    automationEditorSource.includes('kind:"scenario-action-target"')&&automationEditorSource.includes("serviceForReplacement(current?.service,entityId)"),
  "Card Display keeps one region navigation level and edits every friendly binding directly inside its region page");
  assert(!automationEditorSource.includes('binding-group-title">Activity Display')&&!automationEditorSource.includes('activityRow("Decision"')&&!automationEditorSource.includes('activityRow("Summary"')&&!automationEditorSource.includes('this.binding("Summary"')&&
    automationEditorSource.includes('itemDialog("Scenario Status"')&&automationEditorSource.includes('itemDialog("Automation Activity"')&&!automationEditorSource.includes('itemDialog("Threshold Comparison"')&&automationEditorSource.includes('itemDialog("Activity Footer"'),
  "Legacy Activity Display, Decision, and Summary user concepts are replaced by the Phase 1 Card Display IA");
  assert(!automationEditorSource.includes("activity-config-action")&&automationEditorSource.includes('private friendlyBinding(')&&automationEditorSource.includes('binding-friendly-name')&&automationEditorSource.includes('binding-entity-id')&&automationEditorSource.includes('`activity-advanced-${scenarioId}`')&&automationEditorSource.includes('`footer-advanced-${scenarioId}`')&&
    automationEditorSource.includes('friendlyBinding("Legacy Next Action"')&&automationEditorSource.includes('this.pickerCanClear(this.picker)')&&!automationEditorSource.includes('private sourceRow(')&&!automationEditorSource.includes('private semanticSourceRow('),
  "Region pages favor friendly names, fold low-frequency fields into Advanced, retain clearable bindings, and contain no dead binding subpages");
  assert(getProgressEditorReadiness({target_entity:"input_number.target"})==="attention"&&
    getProgressEditorReadiness({current_entity:"sensor.current"})==="attention"&&
    getProgressEditorReadiness({current_entity:"sensor.current",target_entity:"input_number.target"})==="edit"&&
    getProgressEditorReadiness(undefined)==="configure",
  "Progress readiness distinguishes missing Current, missing Target, ready, and empty configurations");
  assert(getThresholdComparisonEditorReadiness({threshold_entity:"input_number.threshold"})==="attention"&&
    getThresholdComparisonEditorReadiness({observed_entity:"sensor.observed"})==="attention"&&
    getThresholdComparisonEditorReadiness({observed_entity:"sensor.observed",threshold_entity:"input_number.threshold"})==="edit"&&
    getThresholdComparisonEditorReadiness({observed_entity:"sensor.observed",threshold:30})==="edit"&&
    getThresholdComparisonEditorReadiness(undefined)==="configure",
  "Threshold Comparison readiness requires Observed plus an entity or static Threshold");
  assert(automationEditorSource.includes('decision_context:{...(s.explanation?.decision_context??{}),[field]:entityId||undefined}')&&
    automationEditorSource.includes('progress:{...(s.progress??{}),[field]:entityId||undefined}')&&
    automationEditorSource.includes('next_decision:{...(s.next_decision??{}),[field]:entityId||undefined}')&&
    !automationEditorSource.includes('this.binding("Summary"'),
  "Activity edits preserve hidden Decision Context, Progress, and Next Decision properties while Summary remains hidden");
  assert(automationEditorSource.includes('private expandedSections = new Set(["card-display"])')&&
    ["card-display","controls","groups"].every(id=>automationEditorSource.includes(`accordionSection("${id}"`))&&
    ["entities","dashboard","metrics","activity","advanced"].every(id=>!automationEditorSource.includes(`accordionSection("${id}"`))&&
    automationEditorSource.includes("new Set(this.expandedSections)")&&
    automationEditorSource.includes('expanded?"mdi:chevron-down":"mdi:chevron-right"')&&
    automationEditorSource.includes("renderItemEditor()")&&
    !automationEditorSource.includes('kind:"metrics";')&&!automationEditorSource.includes('kind:"controls";')&&
    !automationEditorSource.includes('kind:"summary";')&&!automationEditorSource.includes('kind:"groups";'),
  "Scenario Editor exposes only Card Display, Controls, and Automations as its primary accordion entries");
  assert(automationEditorSource.includes(".accordion-body { display:grid; min-width:0; padding:8px 12px 12px; }")&&automationEditorSource.includes(".editor-subsection")&&automationEditorSource.includes("card-display-regions")&&automationEditorSource.includes('binding-group editor-subsection')&&automationEditorSource.includes('editor-section editor-subsection'),
  "Automation primary accordions reuse the Trend expanded-content inset, compact subsection heading, internal divider, and aligned tertiary-row hierarchy");
  assert(automationEditorSource.includes("Card Display")&&automationEditorSource.includes("[0,1,2].map")&&automationEditorSource.includes('positions=["Left","Center","Right"]')&&automationEditorSource.includes(">Reset</button>")&&automationEditorSource.includes(">Automatic</span>")&&automationEditorSource.includes(".selectedLabel=${item?.label")&&automationEditorSource.includes('metric?"mdi:pencil-outline"')&&automationEditorSource.includes("@select-action=")&&automationEditorSource.includes("private setHighlight(")&&automationEditorSource.includes("grid-template-columns:repeat(3,minmax(0,1fr))")&&!automationEditorSource.includes("highlightPicker")&&!automationEditorSource.includes("Choose Highlight")&&
    automationScenarioCardSource.includes("buildAutomationScenarioCardModel(scenario)"),
  "Card Display configures three fixed Highlight positions while the existing Scenario Card presentation consumes the resolved card model");
  assert(automationEditorSource.includes('label:"Add custom data..."')&&automationEditorSource.includes("pendingMetricHighlight")&&automationEditorSource.includes('`metric:${canonicalAutomationEntityId(metricEntity)}`')&&!automationEditorSource.includes('"Manage card data"')&&!automationEditorSource.includes("renderMetrics(")&&automationEditorSource.includes('metric?"mdi:pencil-outline"')&&automationEditorSource.includes(">Delete Card Data</ic-button>")&&automationEditorSource.includes("private deleteMetric(")&&automationEditorSource.includes("highlights?.filter(item=>item!==ref)")&&
    automationEditorSource.includes("item.entity===entity?{...item,...patch}:item"),
  "Top Highlights create, select, edit, and explicitly delete card data without exposing a separate metric manager or dropping hidden metric fields");
  assert(automationEditorSource.includes("scenarios:(config.scenarios ?? []).map((scenario) => ({ ...scenario }))")&&
    automationEditorSource.includes("(item)=>({...item,...value})")&&
    automationEditorSource.includes("item.entity===entity?{...item,...patch}:item")&&
    !automationEditorSource.includes('this.select("Role",item.role')&&
    !automationEditorSource.includes("Scenario Actions</div>")&&
    !automationEditorSource.includes('accordionSection("entities"')&&
    !automationEditorSource.includes('accordionSection("advanced"'),
  "Hidden Entity Bindings, Scenario Semantics, Metric Role, and Scenario Actions remain preserved by full-object Editor updates without ordinary UI entry points");
  assert(!automationEditorSource.includes('binding-group-title">Scenario Controls')&&!automationEditorSource.includes('binding-group-title">Device Controls')&&!automationEditorSource.includes('control-add-grid"><ic-button')&&
    automationEditorSource.includes('this.controlRoleLabel(this.controlRole(scenario,item))')&&automationEditorSource.includes('role==="scenario"?"Scenario setting"')&&automationEditorSource.includes('role==="device"?"Device"')&&automationEditorSource.includes('role==="manual_override"?"Override"')&&
    automationEditorSource.includes('reordering?"Done":"Reorder"')&&automationEditorSource.includes('reordering?nothing:html`<ha-icon slot="trailing"')&&automationEditorSource.includes('+ Add Control')&&automationEditorSource.includes('kind:"add-control"')&&
    automationEditorSource.includes('This entity is already used by')&&automationEditorSource.includes('canonicalAutomationEntityId(item.entity)===id')&&automationEditorSource.includes('Edit existing control')&&
    automationEditorSource.includes('manual_override_entity:role==="manual_override"?item.entity')&&
    automationEditorSource.includes("isStrategyControl")&&automationEditorSource.includes('.disabled=${true}')&&automationEditorSource.includes('this.select("Presentation"')&&automationEditorSource.includes('strategy_entity:undefined')&&
    automationEditorSource.includes('"Advanced Behavior","Change behavior"')&&automationEditorSource.includes("Override Value Entity")&&automationEditorSource.includes("Override Active Entity")&&
    automationEditorSource.includes("item.id===id?{...item,...patch}:item")&&
    !automationEditorSource.includes("Semantic Role")&&!automationEditorSource.includes("Strategy Control")&&!automationEditorSource.includes("Manual Override Entity")&&!automationEditorSource.includes("Control Binding"),
  "Controls uses one flat role-labelled list, explicit reorder mode, duplicate-safe add flow, and compatible Strategy/Override editing without exposing binding internals");
  assert(automationEditorSource.includes('binding-group-title">Groups')&&automationEditorSource.includes("Linked Automations")&&automationEditorSource.includes("Link Existing")&&
    automationEditorSource.includes('section-title">Activity')&&automationEditorSource.includes("Associated Device")&&automationEditorSource.includes("Additional Card Data")&&automationEditorSource.includes("Quick Actions")&&
    automationEditorSource.includes('accordionSection(`automation-advanced-${automation.id}`,"Advanced","Special configuration"')&&automationEditorSource.includes("Enabled State")&&
    automationEditorSource.includes('this.renderRow(item.label??item.id,"Quick Action"')&&automationEditorSource.includes('accordionSection(`action-advanced-${item.id}`,"Advanced","Service & behavior"')&&
    automationEditorSource.includes("item=>({...item,...patch})")&&automationEditorSource.includes('item=>({...item,label})')&&automationEditorSource.includes('title="Use Blueprint"')&&
    !automationEditorSource.includes('this.field("Description"')&&!automationEditorSource.includes("group.icon")&&!automationEditorSource.includes("this.blueprintOpen=true"),
  "Automations exposes only existing-automation linking and card presentation fields while preserving hidden Group icon, Description, Enabled State, Blueprint compatibility, and technical Quick Action configuration paths");
  assert(automationCreationSource.includes('type Step="choose"|"create"|"blueprint"|"picker"|"duplicate"')&&
    !automationCreationSource.includes(">1 Scenario</span>")&&!automationCreationSource.includes(">2 Automations</span>")&&!automationCreationSource.includes(">Continue</ic-button>")&&
    !automationCreationSource.includes("Basic Setup")&&!automationCreationSource.includes("3 Review")&&!automationCreationSource.includes("renderReview")&&
    automationCreationSource.includes('label="Scenario Name *"')&&automationCreationSource.includes('Status Entity *</span>')&&
    automationCreationSource.includes('<h4>Scenario</h4>')&&automationCreationSource.includes('<h4>Automations</h4>')&&automationCreationSource.includes('class="optional">Optional')&&
    !automationCreationSource.includes("scenarioPresetBindings[this.preset]")&&!automationCreationSource.includes("Battery Level")&&!automationCreationSource.includes("Target SoC")&&
    !automationCreationSource.includes("Charging Decision Summary")&&!automationCreationSource.includes("Next Decision Condition")&&
    automationCreationSource.includes(">Create Scenario</ic-button>")&&automationCreationSource.includes("No automations linked yet.")&&
    automationCreationSource.includes("validateScenarioDraftForEditor(this.draft)")&&automationCreationSource.includes('.filter=${automation?{domains:["automation"]}:{}}')&&
    automationCreationSource.includes('if(!entityId.startsWith("automation."))')&&automationCreationSource.includes('if(!entity.startsWith("automation."))')&&
    automationCreationSource.includes('Select an automation entity.'),
  "Add Scenario uses one generic single-page form, optional Automation linking, domain-filtered search, and save-boundary Automation validation");
  assert(automationEditorSource.includes("--dialog-width:min(640px")&&automationEditorSource.includes("Edit Highlight")&&automationEditorSource.includes("Edit Control")&&automationEditorSource.includes("Edit Automation Group")&&automationEditorSource.includes("Edit Automation")&&automationEditorSource.includes("dialog-destructive")&&automationEditorSource.includes("Delete Control")&&automationEditorSource.includes("Delete Group")&&automationEditorSource.includes("Remove from Scenario")&&automationEditorSource.includes(".item-editor-dialog .field-grid > .binding { grid-column:1/-1; }"),
  "Scenario secondary editors share a compact responsive dialog, task-oriented titles, full-width entity bindings, grouped sections, and bottom destructive actions");
  assert(!automationModalSource.includes("Current Activity")&&!automationModalSource.includes("<scenario-progress-strip")&&
    !progressStripSource.includes("marker current")&&progressStripSource.includes("marker reference")&&progressStripSource.includes("decisionContext")&&progressStripSource.includes(".track::before")&&progressStripSource.includes("--en-color-accent"),
  "Modal omits Dashboard-owned Activity and Progress while the shared Strip retains an accent Bar Gauge and Decision Context reference marker");
  assert(!automationScenarioCardSource.includes("Current Status")&&
    !automationScenarioCardSource.includes("Automation Activity")&&
    automationScenarioCardSource.includes("device-pill")&&
    automationScenarioCardSource.includes('model.active?"active":"inactive"')&&
    automationScenarioCardSource.includes("<scenario-progress-strip .progress")&&
    automationScenarioCardSource.includes(".decisionContext=${context}")&&
    automationScenarioCardSource.includes("Next Decision")&&
    automationScenarioCardSource.includes("Last Action")&&
    automationScenarioCardSource.includes("activity-blocks")&&
    automationScenarioCardSource.includes("activity-block")&&
    automationScenarioCardSource.includes("entry.automation.name")&&
    automationScenarioCardSource.includes("entries.map(renderBlock)")&&
    automationScenarioCardSource.includes("matches.length===1?matches[0]!.key:undefined")&&
    automationScenarioCardSource.indexOf("Last Action")<automationScenarioCardSource.indexOf("Next Decision")&&
    progressStripSource.includes("height:40px")&&progressStripSource.includes("border-radius:12px")&&
    progressStripSource.includes("background:var(--en-color-accent,#FBB03B)")&&
    !automationScenarioCardSource.includes('<div class="lifecycle"')&&
    !automationScenarioCardSource.includes("scenario-progress-strip compact"),
  "Dashboard preserves its established shell while rendering one lightweight block per Automation, wide accent Bar Gauges, and global Last/Next rows without section headings");
  assert(selectAutomationId(resolved.automationGroups,"manual") === "manual" &&
    selectAutomationId(resolved.automationGroups,"removed") === "scheduled",
  "Automation carousel preserves an existing unavailable selection and recovers removed selection to the first available item");
  assert(getAutomationScenarioColumnCount(1000) === 3 && getAutomationScenarioColumnCount(700) === 2 && getAutomationScenarioColumnCount(400) === 1,
    "Automation Section responsive layout resolves desktop, tablet, and mobile columns");

  const turnOn = resolveAutomationActionCall({ id:"on", service:"homeassistant.turn_on", target_entity:"switch.heater" });
  const turnOff = resolveAutomationActionCall({ id:"off", service:"homeassistant.turn_off", target_entity:"switch.heater" });
  assert(turnOn.service === "turn_on" && turnOff.service === "turn_off",
    "Action executor resolves explicit turn_on and turn_off services");
  const pressed = await executeAutomationAction(hass,{ id:"press", service:"button.press", target_entity:"button.feed_now" });
  assert(pressed.status === "success" && calls[0].domain === "button" && calls[0].data.entity_id === "button.feed_now",
    "Action executor calls explicit button service and target");
  const invalid = await executeAutomationAction(hass,{ id:"invalid", service:"homeassistant.turn_on" });
  assert(invalid.status === "error" && invalid.error.includes("explicit target"),
    "Action executor rejects actions without an explicit target");
  const confirmation = await executeAutomationAction(hass,{
    id:"confirmed", service:"homeassistant.turn_off", target_entity:"switch.heater", confirmation:true,
  },{ confirm:async () => false });
  assert(confirmation.status === "cancelled" && calls.length === 1,
    "Action executor honors confirmation without performing a cancelled call");
  await updateAutomationSetting(hass,resolved.settings[0],false);
  await updateAutomationSetting(hass,resolved.settings[1],"Home");
  await updateAutomationSetting(hass,resolved.settings[2],30);
  await updateAutomationSetting(hass,resolved.settings[3],"19:00:00");
  assert(calls.slice(1).map((call) => `${call.domain}.${call.service}`).join(",") ===
    "input_boolean.turn_off,input_select.select_option,input_number.set_value,input_datetime.set_datetime",
  "Scenario setting executor updates all supported helper domains through one boundary");

  const realDeviceConfig=normalizeAutomationScenarioConfig({
    id:"real-device-compatibility",template:"custom",status_entity:"sensor.real_status",
    settings:[
      {id:"heater",entity:"switch.real_water_heater",label:"Water Heater",role:"device"},
      {id:"room-temperature",entity:"sensor.real_room_temperature",label:"Room Temperature",format:"auto",role:"observed"},
      {id:"connected",entity:"binary_sensor.ev_connected",label:"EV Connected",format:"text",role:"observed"},
      {id:"target",entity:"number.real_target",label:"Target",role:"scenario"},
      {id:"mode",entity:"select.real_mode",label:"Mode",role:"scenario"},
    ],
    automation_groups:[{id:"temperature",label:"Temperature",automations:[{
      id:"temperature-control",entity:"automation.temperature_control",device:{entity:"climate.real_air_conditioner",name:"Air Conditioner"},
    }]},{id:"ventilation",label:"Ventilation",automations:[{
      id:"fan-control",entity:"automation.fan_control",device:{entity:"fan.real_room_fan",name:"Room Fan"},
    }]},{id:"hot-water",label:"Hot Water",automations:[{
      id:"water-control",entity:"automation.water_control",device:{entity:"water_heater.real_tank",name:"Water Heater"},
    }]},{id:"shade",label:"Shade",automations:[{
      id:"cover-control",entity:"automation.cover_control",device:{entity:"cover.real_blind",name:"Blind"},
    }]},{id:"lighting",label:"Lighting",automations:[{
      id:"light-control",entity:"automation.light_control",device:{entity:"light.real_room",name:"Room Light"},
    }]}],
  }).config;
  const realDeviceRuntime=resolveAutomationScenarioRuntime({states:{
    "sensor.real_status":state("running"),
    "switch.real_water_heater":state("on",{friendly_name:"Water Heater"}),
    "sensor.real_room_temperature":state("29.2",{device_class:"temperature",unit_of_measurement:"°C"}),
    "binary_sensor.ev_connected":state("on",{device_class:"connectivity"}),
    "number.real_target":state("24",{min:10,max:30,step:.5,unit_of_measurement:"°C"}),
    "select.real_mode":state("Eco",{options:["Auto","Eco","Boost"]}),
    "automation.temperature_control":state("on"),
    "climate.real_air_conditioner":state("cool",{friendly_name:"Air Conditioner",current_temperature:29.2,temperature:24,hvac_action:"cooling",hvac_mode:"cool"}),
    "automation.fan_control":state("on"),"fan.real_room_fan":state("on",{friendly_name:"Room Fan",percentage:60,percentage_step:10,supported_features:1}),
    "automation.water_control":state("on"),"water_heater.real_tank":state("heating",{current_temperature:48,temperature:60,operation_mode:"eco",operation_list:["eco","performance"],min_temp:40,max_temp:75,target_temp_step:1,supported_features:3}),
    "automation.cover_control":state("on"),"cover.real_blind":state("open",{current_position:65,supported_features:15}),
    "automation.light_control":state("on"),"light.real_room":state("on",{brightness:179,supported_features:1}),
  }},realDeviceConfig);
  const realRoles=classifyScenarioSettings(realDeviceRuntime.settings,realDeviceRuntime.automationGroups);
  const realAssociatedControls=getAssociatedDeviceSettings(realDeviceRuntime);
  const climateControl=realAssociatedControls.find(item=>item.entityId==="climate.real_air_conditioner");
  const fanControl=realAssociatedControls.find(item=>item.entityId==="fan.real_room_fan");
  const waterHeaterControl=realAssociatedControls.find(item=>item.entityId==="water_heater.real_tank");
  const coverControl=realAssociatedControls.find(item=>item.entityId==="cover.real_blind");
  const lightControl=realAssociatedControls.find(item=>item.entityId==="light.real_room");
  assert(realRoles.device[0]?.entityId==="switch.real_water_heater"&&realRoles.device[0].control==="toggle"&&
    realRoles.observed.map(item=>item.entityId).join(",")==="sensor.real_room_temperature,binary_sensor.ev_connected"&&
    realRoles.scenario.map(item=>`${item.entityId}:${item.control}`).join(",")==="number.real_target:number,select.real_mode:select",
  "Real switch, sensor, binary_sensor, number, and select replacements retain semantic regions while adapting controls by capability");
  assert(realRoles.observed[0].value==="29.2"&&realRoles.observed[0].unit==="°C"&&realRoles.observed[1].value==="Connected",
    "Observed values use HA temperature metadata and binary_sensor device-class semantics");
  assert(climateControl?.entityId==="climate.real_air_conditioner"&&climateControl.control==="unsupported"&&climateControl.rawValue==="cooling"&&
    climateControl.entityAttributes?.current_temperature===29.2&&climateControl.entityAttributes?.temperature===24,
  "Associated climate remains a stateful capability presentation with live HVAC attributes instead of becoming a toggle");
  assert(fanControl?.control==="toggle"&&fanControl.rawValue==="on"&&fanControl.entityAttributes?.percentage===60,
    "Associated fan preserves stateful on/off control and native percentage capability");
  assert(waterHeaterControl?.control==="unsupported"&&waterHeaterControl.entityAttributes?.current_temperature===48&&waterHeaterControl.entityAttributes?.operation_mode==="eco"&&
    coverControl?.control==="unsupported"&&coverControl.entityAttributes?.current_position===65&&lightControl?.control==="toggle"&&lightControl.entityAttributes?.brightness===179,
  "Water heater, cover, and light associated devices retain the attributes required by capability-driven presentation");
  const capabilityControlSource=readFileSync(new URL("../src/components/automation/scenario-setting-control.ts",import.meta.url),"utf8");
  assert(["set_temperature","set_hvac_mode","set_operation_mode","set_percentage","close_cover","stop_cover","open_cover","brightness_pct"].every(fragment=>capabilityControlSource.includes(fragment))&&
    capabilityControlSource.includes("supported&1")&&capabilityControlSource.includes("supported&4")&&capabilityControlSource.includes("supported&8"),
  "Inline device controls use official domain services and gate optional controls on supported capabilities");
  const offlineRuntime=resolveAutomationScenarioRuntime({states:{
    "sensor.real_status":state("running"),
    "switch.real_water_heater":state("unavailable"),
    "sensor.real_room_temperature":state("unknown",{device_class:"temperature",unit_of_measurement:"°C"}),
    "binary_sensor.ev_connected":state("unavailable",{device_class:"connectivity"}),
    "number.real_target":state("24"),"select.real_mode":state("Eco",{options:["Eco"]}),
    "automation.temperature_control":state("on"),"climate.real_air_conditioner":state("unavailable"),
    "automation.fan_control":state("on"),"fan.real_room_fan":state("unavailable"),
    "automation.water_control":state("on"),"water_heater.real_tank":state("unavailable"),
    "automation.cover_control":state("on"),"cover.real_blind":state("unavailable"),
    "automation.light_control":state("on"),"light.real_room":state("unavailable"),
  }},realDeviceConfig);
  assert(offlineRuntime.settings.find(item=>item.entityId==="switch.real_water_heater")?.value==="Unavailable"&&
    offlineRuntime.settings.find(item=>item.entityId==="sensor.real_room_temperature")?.value==="Unknown"&&
    offlineRuntime.settings.find(item=>item.entityId==="binary_sensor.ev_connected")?.value==="Unavailable"&&
    getAssociatedDeviceSettings(offlineRuntime)[0]?.available===false&&Object.keys(getAssociatedDeviceSettings(offlineRuntime)[0]?.entityAttributes??{}).length===0,
  "Unknown and unavailable remain distinct, truthful, and non-interactive across observed and device presentation");
  const restoredRuntime=resolveAutomationScenarioRuntime({states:{"sensor.real_status":state("running"),"switch.real_water_heater":state("restored",{stale_attribute:"must-not-render"})}},realDeviceConfig);
  const restoredSwitch=restoredRuntime.settings.find(item=>item.entityId==="switch.real_water_heater");
  assert(restoredSwitch?.value==="Restored"&&restoredSwitch.available===false&&Object.keys(restoredSwitch.entityAttributes??{}).length===0,
    "Restored device state is explicit and non-interactive, and stale attributes are discarded");
  await updateAutomationSetting(hass,{...realRoles.device[0],entityId:"switch.real_water_heater",control:"toggle"},false);
  await updateAutomationSetting(hass,{...realRoles.scenario[0],entityId:"number.real_target",control:"number"},25);
  await updateAutomationSetting(hass,{...realRoles.scenario[1],entityId:"select.real_mode",control:"select"},"Boost");
  assert(calls.slice(-3).map(call=>`${call.domain}.${call.service}`).join(",")==="switch.turn_off,number.set_value,select.select_option",
    "Real switch, number, and select entities use their native HA service domains");

  const overrideScenario = normalizeAutomationScenarioConfig({
    id:"generic-overrides",template:"custom",status_entity:"input_select.override_status",
    settings:[
      { id:"direct",label:"Manual override",entity:"input_boolean.direct",control:"auto" },
      { id:"time",label:"Target time",entity:"input_datetime.regular_time",control:"auto",change_mode:"next_run",override:{value_entity:"input_datetime.override_time",active_entity:"input_boolean.override_time_active"} },
      { id:"number",label:"Target amount",entity:"input_number.regular_amount",control:"auto",change_mode:"next_run",override:{value_entity:"input_number.override_amount",active_entity:"input_boolean.override_amount_active"} },
      { id:"select",label:"Strategy",entity:"input_select.regular_strategy",control:"auto",change_mode:"next_run",override:{value_entity:"input_select.override_strategy",active_entity:"input_boolean.override_strategy_active"} },
      { id:"datetime",label:"Departure",entity:"input_datetime.regular_departure",control:"auto",change_mode:"next_run",override:{value_entity:"input_datetime.override_departure",active_entity:"input_boolean.override_departure_active"} },
    ],
  }).config;
  const overrideStates = {
    "input_select.override_status":state("waiting"),
    "input_boolean.direct":state("off"),
    "input_datetime.regular_time":state("18:00:00",{has_time:true,has_date:false}),
    "input_datetime.override_time":state("19:00:00",{has_time:true,has_date:false}),
    "input_boolean.override_time_active":state("off"),
    "input_number.regular_amount":state("20",{min:0,max:100,step:5}),
    "input_number.override_amount":state("30",{min:0,max:100,step:5}),
    "input_boolean.override_amount_active":state("off"),
    "input_select.regular_strategy":state("Balanced",{options:["Balanced","Fast"]}),
    "input_select.override_strategy":state("Fast",{options:["Balanced","Fast"]}),
    "input_boolean.override_strategy_active":state("off"),
    "input_datetime.regular_departure":state("2026-08-14 18:00:00",{has_time:true,has_date:true}),
    "input_datetime.override_departure":state("2026-08-14 19:00:00",{has_time:true,has_date:true}),
    "input_boolean.override_departure_active":state("off"),
  };
  const overrideHass = { states:overrideStates,callService:async (domain,service,data) => { calls.push({domain,service,data}); } };
  const regularResolved = resolveAutomationScenarioRuntime(overrideHass,overrideScenario);
  assert(regularResolved.settings[0].changeMode === "direct" && regularResolved.settings[1].changeMode === "next_run" &&
    regularResolved.settings[1].regularRawValue === "18:00:00" && regularResolved.settings[1].rawValue === "18:00:00" &&
    regularResolved.settings[1].effectiveValue === regularResolved.settings[1].value && !regularResolved.settings[1].overrideActive &&
    regularResolved.settings[1].overrideState === "inactive",
    "Settings default to direct while next-run settings expose regular, override, and effective values");
  const activeResolved = resolveAutomationScenarioRuntime({ ...overrideHass,states:{...overrideStates,"input_boolean.override_time_active":state("on")} },overrideScenario);
  assert(activeResolved.settings[1].rawValue === "19:00:00" && activeResolved.settings[1].effectiveRawValue === "19:00:00" &&
    activeResolved.settings[1].regularRawValue === "18:00:00" && activeResolved.settings[1].overrideActive &&
    activeResolved.settings[1].overrideValue === "19:00:00" && activeResolved.settings[1].overrideAvailable && activeResolved.settings[1].overrideState === "active",
    "An active one-time override becomes the effective value without changing the regular value");
  const consumedResolved = resolveAutomationScenarioRuntime(overrideHass,overrideScenario);
  assert(consumedResolved.settings[1].rawValue === "18:00:00" && !consumedResolved.settings[1].override.active,
    "After Automation clears the active helper the effective value returns to the regular value");
  const overrideCallStart = calls.length;
  await setOneTimeAutomationSettingOverride(overrideHass,regularResolved.settings[1],"19:30:00");
  assert(calls.slice(overrideCallStart).map((call) => `${call.domain}.${call.service}:${call.data.entity_id}`).join(",") ===
    "input_datetime.set_datetime:input_datetime.override_time,homeassistant.turn_on:input_boolean.override_time_active",
    "Just Once writes the override value before activation and never writes the regular helper");
  await clearAutomationSettingOverride(overrideHass,activeResolved.settings[1]);
  assert(calls.at(-1).service === "turn_off" && calls.at(-1).data.entity_id === "input_boolean.override_time_active",
    "Override clear uses the explicit active Helper contract");
  const permanentStart = calls.length;
  await updateAutomationSettingPermanently(overrideHass,activeResolved.settings[1],"20:00:00");
  assert(calls.slice(permanentStart).map((call) => `${call.service}:${call.data.entity_id}`).join(",") ===
    "set_datetime:input_datetime.regular_time,turn_off:input_boolean.override_time_active",
    "Permanent changes write the regular Helper and clear an active override");
  const genericStart = calls.length;
  await setOneTimeAutomationSettingOverride(overrideHass,regularResolved.settings[2],35);
  await setOneTimeAutomationSettingOverride(overrideHass,regularResolved.settings[3],"Fast");
  assert(calls.slice(genericStart).map((call) => `${call.domain}.${call.service}`).join(",") ===
    "input_number.set_value,homeassistant.turn_on,input_select.select_option,homeassistant.turn_on",
    "The same generic override executor supports number and select Helpers without Scenario branches");
  const dateTimeStart=calls.length;
  await setOneTimeAutomationSettingOverride(overrideHass,regularResolved.settings[4],"2026-08-14T20:30:00");
  assert(calls[dateTimeStart].domain === "input_datetime" && calls[dateTimeStart].service === "set_datetime" &&
    calls[dateTimeStart].data.entity_id === "input_datetime.override_departure" && calls[dateTimeStart].data.datetime === "2026-08-14T20:30:00" &&
    resolveScenarioSettingPresentationControl(regularResolved.settings[4],overrideStates["input_datetime.regular_departure"].attributes) === "datetime",
    "Date-plus-time overrides use the generic input_datetime path and preserve datetime presentation");
  const unavailableOverride = resolveAutomationScenarioRuntime({ ...overrideHass,states:{...overrideStates,"input_datetime.override_time":state("unavailable"),"input_boolean.override_time_active":state("on")} },overrideScenario).settings[1];
  assert(!unavailableOverride.available && !unavailableOverride.override.available,
    "An unavailable active override is exposed as unavailable instead of silently using stale regular data");
  for (const invalidSetting of [
    {id:"missing-value",entity:"input_datetime.value",change_mode:"next_run",override:{active_entity:"input_boolean.active"}},
    {id:"missing-active",entity:"input_datetime.value",change_mode:"next_run",override:{value_entity:"input_datetime.override"}},
  ]) {
    let validationFailed=false;
    try { normalizeAutomationScenarioConfig({id:"invalid",template:"custom",status_entity:"input_select.status",settings:[invalidSetting]}); }
    catch(error) { validationFailed=error instanceof AutomationConfigValidationError; }
    assert(validationFailed,"Incomplete next-run override bindings fail configuration validation");
  }
  const failingCalls=[];
  const failingHass={...overrideHass,callService:async (domain,service,data) => {
    failingCalls.push({domain,service,data});
    if (service === "turn_on") throw new Error("activation failed");
  }};
  let partialFailure;
  try { await setOneTimeAutomationSettingOverride(failingHass,regularResolved.settings[1],"21:00:00"); }
  catch(error) { partialFailure=error; }
  assert(partialFailure instanceof AutomationSettingOverrideError && partialFailure.stage === "activation" &&
    failingCalls.map((call) => call.service).join(",") === "set_datetime,turn_on,turn_off" &&
    failingCalls.every((call) => call.data.entity_id !== "input_datetime.regular_time"),
    "Partial activation failure reports its stage, attempts the inactive safety state, and leaves the regular value untouched");
  const permanentFailureCalls=[];
  const permanentFailureHass={...overrideHass,callService:async (domain,service,data) => {
    permanentFailureCalls.push({domain,service,data});
    if (data.entity_id === "input_datetime.regular_time") throw new Error("regular write failed");
  }};
  let permanentFailed=false;
  try { await updateAutomationSettingPermanently(permanentFailureHass,activeResolved.settings[1],"22:00:00"); }
  catch { permanentFailed=true; }
  assert(permanentFailed && permanentFailureCalls.length === 1 && permanentFailureCalls[0].data.entity_id === "input_datetime.regular_time",
    "A failed permanent regular write never clears the active one-time override");
  const settingExecutor = new AutomationSettingChangeExecutor();
  const releaseSettings=[];
  const slowSettingHass={...overrideHass,callService:() => new Promise((resolve) => { releaseSettings.push(resolve); })};
  const firstSettingChange=settingExecutor.setOnce(slowSettingHass,regularResolved.settings[1],"21:30:00");
  assert(settingExecutor.isPending("time"),"One-time setting changes expose centralized pending state");
  let duplicateGuarded=false;
  try { await settingExecutor.setOnce(slowSettingHass,regularResolved.settings[1],"22:00:00"); }
  catch(error) { duplicateGuarded=error instanceof AutomationSettingOverrideError && error.stage === "validation"; }
  assert(duplicateGuarded,"One-time setting changes reject duplicate submissions while pending");
  releaseSettings.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert(releaseSettings.length === 1,"One-time executor activates only after the override value write completes");
  releaseSettings.shift()();
  await firstSettingChange;
  assert(!settingExecutor.isPending("time"),"Setting pending state clears after completion");
  const pendingExecutor = new AutomationActionExecutor();
  let releasePending;
  const slowHass = { ...hass, callService:() => new Promise((resolve) => { releasePending = resolve; }) };
  const pendingAction = { id:"slow", service:"button.press", target_entity:"button.feed_now" };
  const firstPending = pendingExecutor.execute(slowHass,pendingAction);
  assert(pendingExecutor.isPending("slow"),"Quick Action exposes pending state while HA service is running");
  const duplicatePending = await pendingExecutor.execute(slowHass,pendingAction);
  assert(duplicatePending.status === "error","Quick Action prevents duplicate execution while pending");
  releasePending();
  await firstPending;

  const legacy = normalizeAutomationScenarioConfig({
    title:"Legacy Solar", status_entity:"input_select.solar_status",
    strategy_entity:"input_select.solar_strategy", manual_override_entity:"input_boolean.solar_override",
    device_entity:"switch.water_heater", power_entity:"sensor.water_power",
    automation_entity:"automation.solar_heating",
    actions:{ run_now:{ domain:"automation",service:"trigger",entity_id:"automation.solar_heating" } },
  });
  assert(legacy.migratedLegacy && legacy.config.settings[0].entity === "input_boolean.solar_override" &&
    legacy.config.automationGroups[0].automations[0].entity === "automation.solar_heating" &&
    legacy.config.automationGroups[0].automations[0].quick_actions.length === 1,
  "legacy Solar YAML maps to one generic Scenario, default group, linked Automation, setting, and quick action");
}

function verifyAutomationEditorFoundation() {
  assert(createStableEditorId("Pet Care",[]) === "pet-care" &&
    createStableEditorId("Pet Care",["pet-care"]) === "pet-care-2",
  "Automation Editor creates stable non-index IDs without collisions");
  const pet = createScenarioFromPreset("pet_care","input_select.pet_status",[]);
  assert(pet.template === "pet-care" && pet.identity?.title === "Pet Care" && pet.automation_groups?.map(group => group.id).join(",") === "feeding,environment,monitoring",
    "Pet Care preset uses the formal template and creates recommended structure without creating HA entities");
  const petLifecycleCases={
    Feeding:"running",feeding:"running",FEEDING:"running",Cooling:"running",Monitoring:"waiting",
    "Feeding Complete":"completed","Feeding Completed":"completed",Low_Food:"blocked","Low Food":"blocked",
    Warning:"blocked",Offline:"unavailable",Unavailable:"unavailable",Unknown:"unknown",
  };
  const normalizedPet=normalizeAutomationScenarioConfig(pet).config;
  for(const [raw,expected] of Object.entries(petLifecycleCases)) {
    const resolved=resolveAutomationScenarioRuntime({states:{"input_select.pet_status":{state:raw,attributes:{}}}},normalizedPet);
    assert(resolved.lifecycle.status===expected,`Pet Care lifecycle maps ${raw} to ${expected}`);
  }
  const oldCustomPet=normalizeAutomationScenarioConfig({...pet,template:"custom",status_mappings:undefined}).config;
  assert(resolveAutomationScenarioRuntime({states:{"input_select.pet_status":{state:"Feeding",attributes:{}}}},oldCustomPet).lifecycle.status==="unknown",
    "Existing custom Pet Care remains valid without forced template migration");
  const feedBinding = scenarioPresetBindings.pet_care.find((binding) => binding.key === "feed-now");
  assert(feedBinding?.target === "quick_action" && feedBinding.domains?.join(",") === "input_button,button" && feedBinding.service === "input_button.press",
    "Pet Care preset accepts helper and real HA button entities for the same Feed Now binding");
  const petWithFeeding = {
    ...pet,
    automation_groups:pet.automation_groups.map((group) => group.id === "feeding"
      ? { ...group,automations:[createLinkedAutomation("automation.pet_feeding","Pet Feeding",[])] }
      : group),
  };
  const petWithFeedAction = applyPresetBinding(petWithFeeding,feedBinding,"input_button.feed_now");
  const feedAction = petWithFeedAction.actions[0];
  assert(feedAction.service === "input_button.press" && feedAction.target_entity === "input_button.feed_now" && feedAction.group_id === "feeding" && !petWithFeedAction.automation_groups[0].automations[0].quick_actions,
    "Pet Care Feed Now binding writes a Scenario action with explicit group presentation metadata");
  const realFeedAction=applyPresetBinding(petWithFeeding,feedBinding,"button.real_feeder_feed").actions[0];
  assert(realFeedAction.service==="button.press"&&realFeedAction.target_entity==="button.real_feeder_feed"&&realFeedAction.group_id==="feeding",
    "Replacing an input_button with a real button adapts the one-shot service without changing Scenario structure");
  const normalizedFeed=normalizeAutomationScenarioConfig(petWithFeedAction).config;
  const resolvedFeed=resolveAutomationScenarioRuntime({states:{
    "input_select.pet_status":{state:"waiting",attributes:{}},
    "input_button.feed_now":{state:"2026-08-14T08:00:00Z",attributes:{}},
    "automation.pet_feeding":{state:"on",attributes:{friendly_name:"Pet Feeding"}},
  }},normalizedFeed);
  assert(resolvedFeed.actions.length===1 && resolvedFeed.actions[0].group_id==="feeding" && resolvedFeed.actions[0].available,
    "Scenario Feed Now group metadata and action availability survive normalization and runtime resolution");
  const fiveFeedingAutomations={...petWithFeedAction,automation_groups:petWithFeedAction.automation_groups.map(group=>group.id==="feeding"?{...group,automations:Array.from({length:5},(_,index)=>createLinkedAutomation(`automation.feed_${index}`,`Feed ${index}`,[]))}:group)};
  const withoutFirst={...fiveFeedingAutomations,automation_groups:fiveFeedingAutomations.automation_groups.map(group=>group.id==="feeding"?{...group,automations:group.automations.slice(1)}:group)};
  const withoutAny={...withoutFirst,automation_groups:withoutFirst.automation_groups.map(group=>group.id==="feeding"?{...group,automations:[]}:group)};
  const reordered={...fiveFeedingAutomations,automation_groups:fiveFeedingAutomations.automation_groups.map(group=>group.id==="feeding"?{...group,automations:moveEditorItem(group.automations,0,1)}:group)};
  assert(fiveFeedingAutomations.actions.length===1 && withoutFirst.actions[0]===feedAction && withoutAny.actions[0]===feedAction && reordered.actions[0]===feedAction,
    "Scenario Feed Now survives one, many, deleted, empty, and reordered Feeding automation collections");
  const settingBase={id:"setting",entityId:"input_boolean.setting",control:"toggle",changeMode:"direct"};
  const associatedDeviceGroups=[{id:"environment",label:"Environment",automations:[{device:{entityId:"input_boolean.setting"}}]}];
  assert(isDeviceControlSetting({...settingBase,scope:"device"},[]) && !isDeviceControlSetting({...settingBase,scope:"scenario"},[]) && !isDeviceControlSetting(settingBase,[]) &&
    isDeviceControlSetting(settingBase,associatedDeviceGroups) && isDeviceControlSetting({...settingBase,scope:"scenario"},associatedDeviceGroups),
    "Exact associated-device semantics override raw helper domains and stale Scenario placement");
  const scenarioSetting={...settingBase,id:"care-mode",entityId:"input_select.care_mode",control:"select",scope:"scenario"};
  const scenarioDeviceCases=[
    ["Solar Water Heating","input_boolean.water_heater","water-heater"],
    ["Pet Care","input_boolean.air_conditioner","air-conditioner"],
    ["EV Charging","input_boolean.ev_charger","charger"],
  ];
  for (const [label,entityId,id] of scenarioDeviceCases) {
    const deviceSetting={...settingBase,id,entityId,scope:"scenario"};
    const groups=[{id:"devices",label:"Devices",automations:[{device:{entityId}}]}];
    const classified=classifyScenarioSettings([scenarioSetting,deviceSetting],groups);
    assert(classified.scenario.map(setting=>setting.id).join(",")==="care-mode" && classified.device.map(setting=>setting.id).join(",")===id,
      `${label}: device operation appears only in Device Controls and Scenario Control retains configuration only`);
  }
  const feedOnly=getPresentedScenarioActions([{id:"feed-now",label:"Feed Now",service:"input_button.press",target_entity:"input_button.feed_now",tone:"primary",available:true}]);
  assert(feedOnly.length===1 && feedOnly[0].id==="feed-now",
    "Pet Care: Feed Now remains a Device Controls action and never enters Scenario settings");
  const semanticBindings=classifyScenarioSettings([
    {...settingBase,id:"observed",entityId:"input_boolean.connected",role:"observed"},
    {...settingBase,id:"device",entityId:"input_boolean.device",role:"device"},
    {...settingBase,id:"scenario",entityId:"input_boolean.preference",role:"scenario"},
    {...settingBase,id:"override-any-id",entityId:"input_boolean.override",role:"manual_override"},
    {...settingBase,id:"unknown",entityId:"input_boolean.unknown"},
  ],[]);
  assert(semanticBindings.observed.map(item=>item.id).join(",")==="observed" &&
    semanticBindings.device.map(item=>item.id).join(",")==="device" &&
    semanticBindings.scenario.map(item=>item.id).join(",")==="scenario" &&
    semanticBindings.manualOverride?.id==="override-any-id" &&
    ![...semanticBindings.observed,...semanticBindings.device,...semanticBindings.scenario].some(item=>item.id==="unknown"),
  "Explicit semantic roles exclusively place observed, device, Scenario, and Manual Override bindings while unknown remains non-editable");
  assert(canonicalAutomationEntityId(" INPUT_BOOLEAN.EV_CONNECTED ")==="input_boolean.ev_connected" &&
    getPrimaryScenarioSettings([
      {...settingBase,id:"first",entityId:"input_boolean.ev_connected"},
      {...settingBase,id:"duplicate",entityId:" INPUT_BOOLEAN.EV_CONNECTED "},
    ]).length===1 &&
    getPresentedScenarioActions([{id:"duplicate",label:"Duplicate",service:"homeassistant.turn_on",target_entity:" INPUT_BOOLEAN.DEVICE ",tone:"neutral",available:true}], ["input_boolean.device"]).length===0,
  "Canonical entity identity deduplicates whitespace and case across settings and action targets");
  const evConnectedBinding=scenarioPresetBindings.ev_smart_charging.find(binding=>binding.key==="ev-connected");
  assert(evConnectedBinding?.role==="observed" && evConnectedBinding.target==="setting",
    "EV Connected is explicitly modeled as a read-only observed binding");
  const evWithObserved=applyPresetBinding(createScenarioFromPreset("ev_smart_charging","input_select.ev_status",[]),evConnectedBinding,"input_boolean.ev_connected");
  const evObservedRuntime=resolveAutomationScenarioRuntime({states:{
    "input_select.ev_status":{state:"connected",attributes:{}},
    "input_boolean.ev_connected":{state:"on",attributes:{}},
  }},normalizeAutomationScenarioConfig(evWithObserved).config);
  const evObservedPresentation=classifyScenarioSettings(evObservedRuntime.settings,evObservedRuntime.automationGroups);
  assert(!evObservedPresentation.scenario.length && !evObservedPresentation.device.length && evObservedPresentation.observed[0]?.id==="ev-connected" && evObservedPresentation.observed[0]?.rawValue==="on",
    "EV Connected resolves only as compact read-only Current Activity data, never as an editable control");
  const executionControl=getScenarioExecutionSetting(resolveAutomationScenarioRuntime({states:{
    "input_select.ev_status":{state:"charging",attributes:{}},
    "switch.ev_charger":{state:"on",attributes:{friendly_name:"EV Charger"}},
  }},normalizeAutomationScenarioConfig({status_entity:"input_select.ev_status",execution:{entity:" switch.ev_charger ",control:{type:"switch"}}}).config));
  assert(executionControl?.role==="device" && executionControl.entityId==="switch.ev_charger" && executionControl.control==="toggle",
    "Explicit execution actuators become canonical Device Controls independently of entity-name heuristics");
  const insightConfig=normalizeAutomationScenarioConfig({
    id:"generic-insight",status_entity:"input_select.insight_status",
    strategy:{entity:"input_select.strategy",presentation:"segmented"},
    settings:[{id:"strategy",entity:"input_select.strategy",control:"select",role:"scenario"}],
    progress:{current_entity:"sensor.current",target_entity:"sensor.target",estimated_entity:"input_datetime.ready",label:"Goal Progress",unit:"%"},
    explanation:{decision_context:{observed_entity:"sensor.observed",threshold_entity:"sensor.threshold",observed_label:"Observed",threshold_label:"Threshold",message_entity:"input_text.decision"}},
    next_decision:{time_entity:"input_datetime.next",label_entity:"input_text.next_label",condition_entity:"input_text.next_condition"},
  }).config;
  const insightRuntime=resolveAutomationScenarioRuntime({states:{
    "input_select.insight_status":{state:"waiting",attributes:{}},
    "input_select.strategy":{state:"balanced",attributes:{options:["solar","balanced","fast"]}},
    "sensor.current":{state:"68",attributes:{unit_of_measurement:"%"}},
    "sensor.target":{state:"80",attributes:{unit_of_measurement:"%"}},
    "input_datetime.ready":{state:"2026-08-14 17:35:00",attributes:{}},
    "sensor.observed":{state:"3000",attributes:{unit_of_measurement:"W"}},
    "sensor.threshold":{state:"2000",attributes:{unit_of_measurement:"W"}},
    "input_text.decision":{state:"Solar surplus available",attributes:{}},
    "input_datetime.next":{state:"23:00:00",attributes:{}},
    "input_text.next_label":{state:"Cheap-rate charging window",attributes:{}},
    "input_text.next_condition":{state:"Target 80% by 07:30",attributes:{}},
  }},insightConfig);
  assert(insightRuntime.progress?.currentValue==="68 %" && insightRuntime.progress.targetValue==="80 %" && insightRuntime.progress.remainingValue==="12 %" && insightRuntime.progress.ratio===.68 && insightRuntime.progress.markerPosition===.8 && insightRuntime.progress.rangeMinValue==="0 %" && insightRuntime.progress.rangeMaxValue==="100 %" &&
    insightRuntime.progress.sourceEntityIds.join(",")==="sensor.current,sensor.target,input_datetime.ready" &&
    insightRuntime.decisionContext?.observedValue==="3.0 kW" && insightRuntime.decisionContext.thresholdValue==="2.0 kW" && insightRuntime.decisionContext.differenceValue==="+1.0 kW" && insightRuntime.decisionContext.difference===1000 && insightRuntime.decisionContext.message==="Solar surplus available" && insightRuntime.decisionContext.currentPosition>insightRuntime.decisionContext.markerPosition &&
    insightRuntime.decisionContext.sourceEntityIds.join(",")==="sensor.observed,sensor.threshold,input_text.decision" &&
    insightRuntime.nextDecision?.time==="23:00" && insightRuntime.nextDecision.label==="Cheap-rate charging window" && insightRuntime.nextDecision.condition==="Target 80% by 07:30" &&
    insightRuntime.nextDecision.sourceEntityIds.join(",")==="input_datetime.next,input_text.next_label,input_text.next_condition" &&
    insightRuntime.settings[0].presentation==="segmented",
  "Generic config resolves insight presentation and retains canonical source identities for binding-based Dashboard attribution");
  const unavailableInsight=resolveAutomationScenarioRuntime({states:{"input_select.insight_status":{state:"waiting",attributes:{}}}},insightConfig);
  assert(unavailableInsight.progress?.ratio===undefined && unavailableInsight.progress.currentValue==="-- %" && unavailableInsight.decisionContext?.difference===undefined && unavailableInsight.decisionContext?.observedValue==="--",
    "Unavailable insight entities remain truthful and never fabricate numeric zero");
  const belowThresholdInsight=resolveAutomationScenarioRuntime({states:{
    "input_select.insight_status":{state:"waiting",attributes:{}},
    "sensor.observed":{state:"10",attributes:{unit_of_measurement:"掳C"}},
    "sensor.threshold":{state:"30",attributes:{unit_of_measurement:"掳C",min:0,max:40}},
  }},insightConfig).decisionContext;
  assert(belowThresholdInsight?.difference===-20&&belowThresholdInsight.differenceValue==="-20.0 掳C"&&
    belowThresholdInsight.currentPosition===.25&&belowThresholdInsight.markerPosition===.75,
  "Decision comparison geometry places truthful Pet-style Current left of Cooling Threshold across the physical range");
  const thresholdProgressConfig=normalizeAutomationScenarioConfig({id:"threshold-progress",template:"custom",status_entity:"sensor.progress_status",progress:{current_entity:"sensor.food_remaining",target_entity:"input_number.low_stock",mode:"threshold",label:"Food Remaining",target_label:"Low Stock"}}).config;
  const thresholdProgress=resolveAutomationScenarioRuntime({states:{"sensor.progress_status":{state:"waiting",attributes:{}},"sensor.food_remaining":{state:"62",attributes:{unit_of_measurement:"%"}},"input_number.low_stock":{state:"20",attributes:{unit_of_measurement:"%",min:0,max:100}}}},thresholdProgressConfig).progress;
  assert(thresholdProgress?.mode==="threshold"&&thresholdProgress.currentPosition===.62&&thresholdProgress.markerPosition===.2&&thresholdProgress.rangeKnown&&thresholdProgress.targetLabel==="Low Stock",
    "Threshold Progress positions Current and warning threshold independently across the physical range");
  const temperatureProgressConfig=normalizeAutomationScenarioConfig({id:"temperature-progress",template:"custom",status_entity:"sensor.progress_status",progress:{current_entity:"sensor.water_temperature",target_entity:"input_number.target_temperature",mode:"target",label:"Water Temperature"}}).config;
  const temperatureProgress=resolveAutomationScenarioRuntime({states:{"sensor.progress_status":{state:"running",attributes:{}},"sensor.water_temperature":{state:"50",attributes:{unit_of_measurement:"°C"}},"input_number.target_temperature":{state:"60",attributes:{unit_of_measurement:"°C",min:0,max:80}}}},temperatureProgressConfig).progress;
  assert(temperatureProgress?.currentPosition===.625&&temperatureProgress.markerPosition===.75&&temperatureProgress.rangeMinValue==="0 °C"&&temperatureProgress.rangeMaxValue==="80 °C",
    "Target Progress uses entity range metadata so Target remains a marker rather than the bar endpoint");
  const aboveTargetProgress=resolveAutomationScenarioRuntime({states:{"sensor.progress_status":{state:"running",attributes:{}},"sensor.water_temperature":{state:"70",attributes:{unit_of_measurement:"°C"}},"input_number.target_temperature":{state:"60",attributes:{unit_of_measurement:"°C",min:0,max:80}}}},temperatureProgressConfig).progress;
  assert(aboveTargetProgress?.currentPosition===.875&&aboveTargetProgress.markerPosition===.75,
    "Current Progress continues to its real physical-range position after crossing Target");
  const targetUnavailable=resolveAutomationScenarioRuntime({states:{"sensor.progress_status":{state:"running",attributes:{}},"sensor.water_temperature":{state:"50",attributes:{unit_of_measurement:"°C",min:0,max:80}},"input_number.target_temperature":{state:"unavailable",attributes:{min:0,max:80,unit_of_measurement:"°C"}}}},temperatureProgressConfig).progress;
  assert(targetUnavailable?.currentAvailable&&targetUnavailable.targetAvailable===false&&targetUnavailable.currentPosition===.625&&targetUnavailable.markerPosition===undefined,
    "Unavailable Progress Target retains truthful Current position and omits the target marker");
  const thresholdWithoutMarkerConfig=normalizeAutomationScenarioConfig({id:"level-only-progress",template:"custom",status_entity:"sensor.progress_status",progress:{current_entity:"sensor.food_remaining",mode:"threshold",label:"Food Remaining"}}).config;
  const thresholdWithoutMarker=resolveAutomationScenarioRuntime({states:{"sensor.progress_status":{state:"waiting",attributes:{}},"sensor.food_remaining":{state:"62",attributes:{unit_of_measurement:"%"}}}},thresholdWithoutMarkerConfig).progress;
  assert(thresholdWithoutMarker?.currentPosition===.62&&thresholdWithoutMarker.markerPosition===undefined&&thresholdWithoutMarker.rangeKnown,
    "Threshold Progress safely falls back to a plain percentage level when no threshold is configured");
  const multiGroupDeviceScenario={actions:[{id:"feed",label:"Feed Now",group_id:"feeding",service:"input_button.press",target_entity:"input_button.feed_now",tone:"primary",available:true}],automationGroups:[
    {id:"feeding",label:"Feeding",automations:[{device:{entityId:"switch.feeder",name:"Feeder",state:"on",available:true},quickActions:[]}]},
    {id:"temperature",label:"Temperature",automations:[{device:{entityId:" climate.pet_room ",name:"Air Conditioner",state:"cool",available:true},quickActions:[]}]},
    {id:"duplicate-temperature",label:"Temperature Safety",automations:[{device:{entityId:"CLIMATE.PET_ROOM",name:"Duplicate AC",state:"cool",available:true},quickActions:[]}]},
  ]};
  const associatedControls=getAssociatedDeviceSettings(multiGroupDeviceScenario);
  assert(associatedControls.length===1 && associatedControls[0].entityId==="climate.pet_room" && associatedControls[0].label==="Air Conditioner" &&
    getPresentedScenarioActions(multiGroupDeviceScenario.actions).map(action=>action.id).join(",")==="feed",
  "Scenario-wide device aggregation keeps explicit Feeding action plus one canonical Air Conditioner actuator across all groups");
  const selectorSource=readFileSync(new URL("../src/components/automation/automation-selector.ts",import.meta.url),"utf8");
  assert(selectorSource.includes("this.groups.map(group=>") && !selectorSource.includes('role="tablist"') && !selectorSource.includes("selectAutomationGroupId"),
    "Linked Automations renders every group as stacked content without active-group tabs or visibility selection");
  const actionWins=classifyScenarioSettings([
    {...settingBase,id:"stale-setting",entityId:" input_boolean.shared ",role:"scenario"},
  ],[],"",[{id:"device-action",label:"Operate",service:"homeassistant.turn_on",target_entity:"input_boolean.shared",tone:"neutral",available:true}]);
  assert(!actionWins.scenario.length && !actionWins.device.length && !actionWins.observed.length,
    "A canonical device action outranks a conflicting non-device setting so the action remains the single operation");
  const solar = createScenarioFromPreset("solar_water_heating","input_select.solar_status",[pet.id]);
  assert(solar.template === "solar_water_heating" && solar.identity.icon === "mdi:water-boiler" && solar.automation_groups?.[0]?.id === "heating" && solar.automation_groups[0].automations.length === 0,
    "Solar preset applies Scenario template defaults without creating an Automation");
  const ev = createScenarioFromPreset("ev_smart_charging","input_select.ev_status",[]);
  assert(ev.identity.icon === "mdi:ev-station" && ev.automation_groups.map(group => group.id).join(",") === "charging,optimization",
    "EV preset uses the approved generic Scenario defaults and recommended Groups");
  let petBound = createScenarioFromPreset("pet_care","",[]);
  const petBindings = scenarioPresetBindings.pet_care;
  const bindPet=(key,entity) => { petBound=applyPresetBinding(petBound,petBindings.find(binding=>binding.key===key),entity); };
  bindPet("status","input_select.pet_status");
  bindPet("feeding-status","input_select.feeding_status");
  bindPet("food-remaining","input_number.food_remaining");
  bindPet("room-temperature","sensor.pet_room_temperature");
  bindPet("care-mode","input_select.pet_mode");
  bindPet("strategy","input_select.pet_strategy");
  bindPet("manual-override","input_boolean.pet_override");
  const petModeScenario=normalizeAutomationScenarioConfig(petBound).config;
  for(const mode of ["Away","Vacation"]) {
    const resolved=resolveAutomationScenarioRuntime({states:{
      "input_select.pet_status":{state:"Monitoring",attributes:{}},
      "input_select.pet_mode":{state:mode,attributes:{options:["Home","Away","Night","Vacation"]}},
      "input_select.pet_strategy":{state:"comfort",attributes:{}},
      "input_select.feeding_status":{state:"Idle",attributes:{}},
      "input_number.food_remaining":{state:"50",attributes:{}},
      "sensor.pet_room_temperature":{state:"23",attributes:{}},
      "input_boolean.pet_override":{state:"off",attributes:{}},
    }},petModeScenario);
    assert(resolved.lifecycle.status==="waiting" && resolved.settings.find(setting=>setting.id==="care-mode")?.rawValue===mode,
      `Pet Care mode ${mode} remains a setting and does not participate in lifecycle mapping`);
  }
  assert(petBound.status_entity === "input_select.pet_status" && petBound.strategy.entity === "input_select.pet_strategy" && petBound.strategy.presentation === "segmented" && petBound.settings.length === 3 && petBound.settings.find(setting=>setting.id==="strategy")?.role === "scenario" &&
    petBound.metrics.map(metric=>metric.label).join(",") === "Feeding Status,Food Remaining,Room Temperature",
    "Pet guided setup maps recommended fields only into generic Scenario schema");
  const recommendedMetricLabels = {
    pet:scenarioPresetBindings.pet_care.filter(binding=>binding.target==="metric").map(binding=>binding.label),
    solar:scenarioPresetBindings.solar_water_heating.filter(binding=>binding.target==="metric").map(binding=>binding.label),
    ev:scenarioPresetBindings.ev_smart_charging.filter(binding=>binding.target==="metric").map(binding=>binding.label),
  };
  const prohibitedDefaultMetrics=/target time|departure time|next action|manual override|water heater|ev connected/i;
  assert(Object.values(recommendedMetricLabels).flat().every(label=>!prohibitedDefaultMetrics.test(label)) &&
    recommendedMetricLabels.pet.join(",") === "Feeding Status,Food Remaining,Room Temperature" &&
    recommendedMetricLabels.solar.join(",") === "Water Temperature,Solar Surplus" &&
    recommendedMetricLabels.ev.join(",") === "Battery Level,Charger Power,Solar Surplus,Electricity Price",
    "Pet, Solar, and EV guided presets recommend live status, resource, environmental, and numeric Metrics instead of controls or schedules");
  const configurePreset=(preset,bindings) => bindings.reduce((scenario,[key,entity])=>applyPresetBinding(scenario,scenarioPresetBindings[preset].find(binding=>binding.key===key),entity),createScenarioFromPreset(preset,`input_select.${preset}_status`,[]));
  const configuredEv=configurePreset("ev_smart_charging",[["strategy","input_select.ev_strategy"],["battery-level","sensor.ev_soc"],["target-soc","input_number.ev_target_soc"],["estimated-ready","input_datetime.ev_ready"],["solar-surplus","sensor.ev_solar_surplus"],["start-threshold","input_number.ev_start_threshold"],["decision-message","input_text.ev_decision"],["next-decision-time","input_datetime.ev_next_window"],["next-decision-label","input_text.ev_next_label"],["next-decision-condition","input_text.ev_next_condition"]]);
  const configuredSolar=configurePreset("solar_water_heating",[["strategy","input_select.heating_strategy"],["water-temperature","sensor.water_temperature"],["target-temperature","input_number.target_temperature"],["estimated-ready","input_datetime.heating_ready"],["solar-power","sensor.solar_surplus"],["start-threshold","input_number.solar_threshold"],["decision-message","input_text.heating_decision"],["next-decision-time","input_datetime.grid_backup"],["next-decision-label","input_text.grid_backup_label"],["next-decision-condition","input_text.grid_backup_condition"]]);
  const configuredPet=configurePreset("pet_care",[["strategy","input_select.care_strategy"],["food-remaining","sensor.food_remaining"],["food-low-threshold","input_number.food_low_threshold"],["room-temperature","sensor.room_temperature"],["cooling-threshold","input_number.cooling_threshold"],["decision-message","input_text.cooling_decision"],["next-decision-time","input_datetime.next_feeding"],["next-decision-label","input_text.next_feeding_label"]]);
  assert(configuredEv.progress?.current_entity==="sensor.ev_soc"&&configuredEv.progress.target_entity==="input_number.ev_target_soc"&&configuredEv.progress.mode==="target"&&configuredEv.progress.label==="Battery"&&configuredEv.explanation?.decision_context?.observed_entity==="sensor.ev_solar_surplus"&&configuredEv.next_decision?.time_entity==="input_datetime.ev_next_window"&&configuredEv.strategy?.presentation==="segmented"&&
    configuredSolar.progress?.current_entity==="sensor.water_temperature"&&configuredSolar.progress.mode==="target"&&configuredSolar.progress.label==="Water Temperature"&&configuredSolar.explanation?.decision_context?.threshold_entity==="input_number.solar_threshold"&&configuredSolar.next_decision?.label_entity==="input_text.grid_backup_label"&&configuredSolar.strategy?.presentation==="segmented"&&
    configuredPet.progress?.current_entity==="sensor.food_remaining"&&configuredPet.progress.target_entity==="input_number.food_low_threshold"&&configuredPet.progress.mode==="threshold"&&configuredPet.progress.target_label==="Low Stock"&&configuredPet.explanation?.decision_context?.observed_entity==="sensor.room_temperature"&&configuredPet.next_decision?.time_entity==="input_datetime.next_feeding"&&configuredPet.strategy?.presentation==="segmented",
  "EV, Solar, and Pet presets bind generic target or threshold Progress while retaining independent Decision Context and Next Decision layers");
  assert(automationTemplateRegistry.get("solar_water_heating").metricRecommendations.map(metric=>metric.label).join(",") === "Water Temperature,Current Power" &&
    automationTemplateRegistry.get("ev_smart_charging").metricRecommendations.map(metric=>metric.label).join(",") === "Current SOC,Charging Power",
    "Automation template metadata prioritizes live numeric, environmental, and resource Metrics");
  const linked = createLinkedAutomation("automation.smart_pet_feeding","Smart Pet Feeding",[]);
  const second = createLinkedAutomation("automation.smart_pet_feeding","Smart Pet Feeding",[linked.id]);
  assert(linked.entity === "automation.smart_pet_feeding" && linked.name === "Smart Pet Feeding" && linked.id !== second.id,
    "Link Existing Automation uses friendly-name suggestion and collision-safe stable IDs");
  assert(moveEditorItem(["pet","solar"],0,1).join(",") === "solar,pet" && moveEditorItem(["pet"],0,-1)[0] === "pet",
    "Automation Editor reorder is immutable and boundary safe");
  assert(formatEditorCount(0,"Metric") === "0 Metrics" && formatEditorCount(1,"Group") === "1 Group" && formatEditorCount(2,"Automation") === "2 Automations",
    "Automation Editor configuration summaries use correct singular and plural labels");
  assert(getAutomationEditorParentKind("metric") === "metrics" && getAutomationEditorParentKind("metrics") === "scenario" &&
    getAutomationEditorParentKind("control") === "controls" && getAutomationEditorParentKind("automation") === "group" &&
    getAutomationEditorParentKind("group") === "groups" && getAutomationEditorParentKind("groups") === "scenario" &&
    getAutomationEditorParentKind("scenario-status") === "scenario" && getAutomationEditorParentKind("automation-activity") === "scenario" &&
    getAutomationEditorParentKind("activity-footer") === "scenario" && getAutomationEditorParentKind("activity-progress") === undefined &&
    getAutomationEditorParentKind("threshold-comparison") === undefined && getAutomationEditorParentKind("last-action") === undefined &&
    getAutomationEditorParentKind("next-decision") === undefined,
    "Automation Editor subpages preserve one-level Back navigation hierarchy");
  assert(validateScenarioDraftForEditor(createScenarioFromPreset("blank","",[]))[0].includes("Status Entity") &&
    validateScenarioDraftForEditor(createScenarioFromPreset("blank","sensor.status",[])).length === 0,
    "Guided Setup converts required status validation into human-readable copy");
  for (const preset of ["blank","pet_care","solar_water_heating","ev_smart_charging"]) {
    const skeleton=createScenarioFromPreset(preset,`input_select.${preset}_status`,[]);
    assert(!skeleton.progress&&!skeleton.next_decision&&!skeleton.explanation?.decision_context&&
      !(skeleton.metrics?.length)&&!(skeleton.settings?.length),
    `${preset} creation preset produces a sparse Scenario without empty display or control bindings`);
    assert(validateScenarioDraftForEditor(skeleton).length===0,
      `${preset} sparse Scenario remains valid with zero linked automations`);
  }
  const invalidAction = { ...pet,automation_groups:[{id:"feeding",label:"Feeding",automations:[{...linked,quick_actions:[{id:"bad",label:"Bad",service:"button"}]}]}] };
  assert(validateScenarioDraftForEditor(invalidAction).some(error => error.includes("domain.service")),
    "Guided Setup exposes invalid Quick Action service safely");
  const persisted = normalizeAutomationSectionConfig({
    type:"custom:energy-automation-section", title:"Automation", scenarios:[
      { ...pet, automation_groups:[{ id:"feeding",label:"Feeding",automations:[{
        ...linked, quick_actions:[{ id:"feed",label:"Feed Now",service:"button.press",target_entity:"input_button.feed_now" }],
      }]}]},
      { ...solar, automation_groups:[{ id:"heating",label:"Heating",automations:[createLinkedAutomation("automation.smart_water_heater_2","Smart Water Heater",[])] }] },
    ],
  });
  assert(persisted.scenarios.length === 2 && persisted.scenarios[0].automationGroups[0].automations[0].entity === "automation.smart_pet_feeding" && persisted.scenarios[1].automationGroups[0].automations[0].entity === "automation.smart_water_heater_2",
    "Editor-produced Pet and Solar persisted config enters the existing normalizer unchanged");
  const visibility=normalizeAutomationSectionConfig({scenarios:[{...pet,id:"shown"},{...solar,id:"hidden",visible:false}]});
  assert(visibility.scenarios[0].visible===true&&visibility.scenarios[1].visible===false,
    "Scenario presentation visibility defaults to shown and preserves an explicit hidden state without removing config");
  const sharedSolar={id:"shared-solar",template:"custom",status_entity:"input_select.solar_status",metrics:[{entity:"input_number.solar_power",label:"Solar Power"}],progress:{current_entity:"input_number.solar_power",target_entity:"input_number.solar_threshold"},explanation:{decision_context:{observed_entity:"input_number.solar_power",threshold_entity:"input_number.solar_threshold"}},settings:[{id:"heater",entity:"input_boolean.water_heater",label:"Water Heater",role:"device"}],automation_groups:[{id:"heat",label:"Heating",automations:[{id:"controller",entity:"automation.pv_surplus_heat_pump_controller",device:{entity:"input_boolean.water_heater",name:"Water Heater"},current:{entity:"input_number.solar_power",label:"Solar Power"}}]}]};
  const telemetryRebound=replaceScenarioEntityBinding(sharedSolar,"input_number.solar_power","sensor.real_pv_power");
  const fullyRebound=replaceScenarioEntityBinding(telemetryRebound,"input_boolean.water_heater","water_heater.real_tank");
  const reboundNormalized=normalizeAutomationScenarioConfig(fullyRebound).config;
  assert(reboundNormalized.metrics[0].entity==="sensor.real_pv_power"&&reboundNormalized.progress?.current_entity==="sensor.real_pv_power"&&reboundNormalized.explanation.decision_context?.observed_entity==="sensor.real_pv_power"&&reboundNormalized.automationGroups[0].automations[0].current?.entity==="sensor.real_pv_power"&&reboundNormalized.settings[0].entity==="water_heater.real_tank"&&reboundNormalized.automationGroups[0].automations[0].device?.entity==="water_heater.real_tank"&&collectScenarioEntityBindings(fullyRebound).includes("automation.pv_surplus_heat_pump_controller"),
    "One canonical visual-editor replacement updates Solar telemetry and Water Heater references across Dashboard, Activity, Progress, settings, and associated-device paths without inferring them from the Automation entity");
  const automationSectionSource=readFileSync(new URL("../src/components/energy-automation-section.ts",import.meta.url),"utf8");
  const scenarioManagerSource=readFileSync(new URL("../src/components/automation/automation-scenario-manager.ts",import.meta.url),"utf8");
  assert(automationSectionSource.includes('label="Manage scenarios"')&&automationSectionSource.includes('new CustomEvent("config-changed"')&&
    scenarioManagerSource.includes("scenario-manager-change")&&scenarioManagerSource.includes("moveEditorItem")&&scenarioManagerSource.includes("Add Scenario"),
    "Automation Section reuses its header action pattern and persists show/hide, order, and guided Add Scenario changes through section config");
}

function verifyCircuitCarouselAlignment() {
  assert(getCircuitStaticColumnCount(4) === 4,
    "desktop static Circuit layout preserves four slots for two Circuits plus Add");
  const desktopStatic = planCircuitCarouselAlignment({
    previousVisibleCount:4,nextVisibleCount:4,
    previousUsesCarousel:false,nextUsesCarousel:false,
    settledIndex:0,itemCount:3,nextTrackStep:250,
  });
  assert(desktopStatic.scrollLeft === 0 && desktopStatic.settledIndex === 0,
    "desktop static Circuit layout starts at the first of four slots");

  const columnsChanged = planCircuitCarouselAlignment({
    previousVisibleCount:4,nextVisibleCount:2,
    previousUsesCarousel:false,nextUsesCarousel:true,
    settledIndex:2,itemCount:5,nextTrackStep:310,
  });
  assert(columnsChanged.reset && columnsChanged.settledIndex === 0 && columnsChanged.scrollLeft === 0,
    "Circuit column changes reset stale carousel page and pixels");

  const zoomResize = planCircuitCarouselAlignment({
    previousVisibleCount:2,nextVisibleCount:2,
    previousUsesCarousel:true,nextUsesCarousel:true,
    settledIndex:2,itemCount:5,nextTrackStep:280,
  });
  assert(!zoomResize.reset && zoomResize.settledIndex === 2 && zoomResize.scrollLeft === 560,
    "same-column zoom resize preserves logical page using the new track step");

  const carouselToStatic = planCircuitCarouselAlignment({
    previousVisibleCount:2,nextVisibleCount:4,
    previousUsesCarousel:true,nextUsesCarousel:false,
    settledIndex:2,itemCount:3,nextTrackStep:250,
  });
  assert(carouselToStatic.reset && carouselToStatic.scrollLeft === 0,
    "carousel to static transition clears stale horizontal position");

  const initial = planCircuitCarouselAlignment({
    previousVisibleCount:4,nextVisibleCount:4,
    previousUsesCarousel:false,nextUsesCarousel:false,
    settledIndex:0,itemCount:3,nextTrackStep:250,
  });
  assert(initial.scrollLeft === desktopStatic.scrollLeft && initial.settledIndex === desktopStatic.settledIndex,
    "post-resize static placement matches refresh-equivalent initial placement");
}

function verifyTrendCanvasColors() {
  const sample = (color) => color.startsWith("rgb")
    ? color
    : color === "#444D9E" ? "rgba(68, 77, 158, 1)" : undefined;
  assert(
    normalizeTrendCanvasColor("#444D9E",(color) => color,sample) ===
      "rgba(68, 77, 158, 1)",
    "hex theme colors normalize to a concrete Canvas color"
  );
  const mixed = normalizeTrendCanvasColor(
    "color-mix(in srgb, #444D9E 72%, white)",
    () => "rgb(121, 128, 185)",
    sample
  );
  assert(
    mixed === "rgb(121, 128, 185)" && !isUnresolvedCanvasColor(mixed),
    "color-mix theme tokens resolve before reaching Canvas"
  );
  for (const index of [3,4,5]) {
    const fallback = getTrendSeriesFallbackColor(index);
    const unsupported = normalizeTrendCanvasColor(
      "color-mix(in srgb, #444D9E 80%, white)",
      () => "",
      sample,
      fallback
    );
    assert(
      unsupported !== "rgb(0, 0, 0)" && unsupported !== "rgba(0, 0, 0, 1)" &&
        !isUnresolvedCanvasColor(unsupported),
      `unsupported palette slot ${index + 1} resolves to a Canvas-safe non-black fallback`
    );
  }
  assert(
    normalizeTrendCanvasColor("var(--en-color-series-1)",() => "rgb(68, 77, 158)",sample) ===
      "rgb(68, 77, 158)",
    "Line and Area Series share the same concrete theme color boundary"
  );
  const failingGradientContext = {
    createLinearGradient() {
      return { addColorStop() { throw new Error("invalid Canvas color"); } };
    },
  };
  assert(
    createTrendAreaFill(failingGradientContext,0,100,"rgb(68, 77, 158)") ===
      "rgba(68, 77, 158, 0.18)",
    "a failing Area gradient falls back without aborting later Series"
  );
}

function verifyTrendRenderGuard() {
  assert(isValidTrendPlotSize(640,240),"positive finite Trend plot dimensions are drawable");
  assert(!isValidTrendPlotSize(0,240),"zero-width Trend plots are skipped safely");
  assert(!isValidTrendPlotSize(640,0),"zero-height Trend plots are skipped safely");
  const finite = getFiniteTrendGeometry([
    { x:0,y:1 },
    { x:Number.NaN,y:2 },
    { x:3,y:Number.POSITIVE_INFINITY },
    { x:4,y:5 },
  ]);
  assert(finite.length === 2 && finite[1].x === 4,
    "invalid Trend geometry points are filtered at the Canvas boundary");

  let saves = 0;
  let restores = 0;
  let laterSeriesDrawn = false;
  const context = {
    save() { saves += 1; },
    restore() { restores += 1; },
  };
  const failed = runIsolatedTrendSeriesRender(context,() => {
    throw new Error("stroke failed");
  });
  const drawn = runIsolatedTrendSeriesRender(context,() => {
    laterSeriesDrawn = true;
    return true;
  });
  assert(failed.status === "error" && drawn.status === "drawn" && laterSeriesDrawn,
    "one failing Trend Series does not prevent a later Series from drawing");
  assert(saves === 2 && restores === 2,
    "Trend Series Canvas state is restored after success and failure");
  assert(runIsolatedTrendSeriesRender(context,() => false).status === "skipped",
    "Series with insufficient geometry are skipped without throwing");

  for (const mode of ["area","line","bar"]) {
    let nextModeDrawn = false;
    const failedMode = runIsolatedTrendSeriesRender(context,() => {
      throw new Error(`${mode} failed`);
    });
    const nextMode = runIsolatedTrendSeriesRender(context,() => {
      nextModeDrawn = true;
      return true;
    });
    assert(failedMode.status === "error" && nextMode.status === "drawn" && nextModeDrawn,
      `${mode} failure is isolated from the next Trend Series`);
  }
}

function verifyTrendBarBaseline() {
  const plot = { left:0,top:0,width:400,height:200 };
  const resolve = (min,max) => resolveTrendAxis({
    id:"power:W",category:"power",unit:"W",precision:0,min,max,
  });
  const positiveAxis = resolve(100,900);
  const negativeAxis = resolve(-900,-100);
  const mixedAxis = resolve(-500,1_000);

  assert(positiveAxis.min === 0 && negativeAxis.max === 0,
    "positive-only and negative-only Bar axes retain a zero baseline");
  assert(mixedAxis.min < 0 && mixedAxis.max > 0,
    "mixed Bar axes preserve both sides of zero");

  const positive = getTrendBarGeometry(600,mixedAxis,plot);
  const negative = getTrendBarGeometry(-300,mixedAxis,plot);
  const zero = getTrendBarGeometry(0,mixedAxis,plot);
  assert(positive.top === positive.valueY && positive.bottom === positive.zeroY,
    "positive Bars extend upward from the scaled zero baseline");
  assert(negative.top === negative.zeroY && negative.bottom === negative.valueY,
    "negative Bars extend downward from the same scaled zero baseline");
  assert(zero.height === 0 && positive.zeroY === negative.zeroY,
    "zero and repeatedly crossing values share one exact zero baseline");
  assert(getTrendZeroBaselineY(positiveAxis,plot) === getTrendBarGeometry(0,positiveAxis,plot).zeroY &&
    getTrendZeroBaselineY(negativeAxis,plot) === getTrendBarGeometry(0,negativeAxis,plot).zeroY,
  "zero grid lines use the same Y scale as positive-only and negative-only Bars");

  const rightAxis = { ...mixedAxis,id:"power:right",axisGroup:"right" };
  assert(getTrendBarGeometry(250,rightAxis,plot).zeroY === positive.zeroY,
    "left/right and mixed Bar/Line axes use axis-local zero geometry");
}

function verifyTrendInitialLayoutCommit() {
  const initial = createTrendChartLayout(900,240,{
    hasLeftAxis:true,leftAxisWidth:50,hasRightAxis:false,
  });
  assert(!areTrendChartLayoutsEqual(undefined,initial),
    "first valid Trend measurement requires a render commit");
  assert(areTrendChartLayoutsEqual(initial,{ ...initial,plot:{ ...initial.plot } }),
    "same dimensions after the initial commit do not schedule a redundant update");

  const resized = createTrendChartLayout(650,240,{
    hasLeftAxis:true,leftAxisWidth:50,hasRightAxis:false,
  });
  assert(!areTrendChartLayoutsEqual(initial,resized),
    "Trend viewport dimension changes require a new layout commit");

  const changedAxes = createTrendChartLayout(900,240,{
    hasLeftAxis:true,leftAxisWidth:76,hasRightAxis:true,rightAxisWidth:58,
  });
  assert(!areTrendChartLayoutsEqual(initial,changedAxes),
    "axis-dependent plot geometry changes commit at unchanged outer dimensions");

  // On hard refresh the measurement-only chart starts without layout. The
  // first assertion is the lifecycle gate that schedules the next render,
  // where both the renderer and pointer surface are created.
  const firstObserverLayout = { ...initial,plot:{ ...initial.plot } };
  assert(areTrendChartLayoutsEqual(initial,firstObserverLayout),
    "matching first ResizeObserver dimensions are safe after synchronous commit scheduling");
}

async function verifyCircuitConfigAuthority() {
  let loadCalled = false;
  const repository = {
    async load() {
      loadCalled = true;
      return [{
        id:"legacy-circuit",
        entity:"sensor.legacy_power",
        name:"Legacy Circuit",
        icon:"mdi:history",
        category:"legacy",
        enabled:false,
        order:99,
      }];
    },
    async save() {},
  };
  const coordinator = new CircuitConfigCoordinator(repository);
  const lovelaceCircuits = [{
    id:"current-circuit",
    entity:"sensor.current_power",
    name:"Current Circuit",
    icon:"mdi:flash",
    category:"appliance",
    enabled:true,
    order:0,
  }];
  const resolved = await coordinator.resolve(lovelaceCircuits);
  assert(!loadCalled, "circuit resolution does not read legacy repository state");
  assert(
    resolved.length === 1 &&
      resolved[0]?.id === "current-circuit" &&
      resolved[0]?.entity === "sensor.current_power" &&
      resolved[0]?.name === "Current Circuit" &&
      resolved[0]?.icon === "mdi:flash" &&
      resolved[0]?.category === "appliance" &&
      resolved[0]?.enabled === true &&
      resolved[0]?.order === 0,
    "Lovelace circuit fields remain authoritative over legacy storage"
  );
  assert(resolved !== lovelaceCircuits && resolved[0] !== lovelaceCircuits[0],
    "circuit resolution returns an isolated Lovelace snapshot");
}

function verifyLegacyCircuitImport() {
  const current = [{
    id:"current",
    entity:"sensor.current_power",
    name:"Current",
    enabled:true,
    order:0,
  }];
  const legacy = [{
    id:"current",
    entity:"sensor.old_duplicate_id",
    name:"Duplicate ID",
    enabled:true,
    order:0,
  }, {
    id:"duplicate-entity",
    entity:"sensor.current_power",
    name:"Duplicate entity",
    enabled:true,
    order:1,
  }, {
    id:"legacy-load",
    entity:"sensor.legacy_load",
    name:"Legacy Load",
    icon:"mdi:washing-machine",
    category:"appliance",
    enabled:false,
    order:3,
  }, {
    id:"legacy-solar",
    entity:"sensor.legacy_solar",
    name:"Legacy Solar",
    enabled:true,
    order:2,
  }];
  const importable = getImportableLegacyCircuits(current, legacy);
  assert(
    importable.length === 2 &&
      importable[0]?.id === "legacy-solar" &&
      importable[1]?.id === "legacy-load",
    "legacy Circuit import deduplicates by ID and entity while preserving relative order"
  );
  const merged = mergeLegacyCircuits(current, legacy);
  assert(
    merged.importedCount === 2 &&
      merged.circuits.length === 3 &&
      merged.circuits[2]?.icon === "mdi:washing-machine" &&
      merged.circuits[2]?.category === "appliance" &&
      merged.circuits[2]?.enabled === false,
    "legacy Circuit import preserves valid item fields without overwriting Lovelace"
  );
}

async function verifyPendingCircuitRepository() {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable:true,
    value:{
      getItem:(key) => values.get(key) ?? null,
      setItem:(key, value) => values.set(key, value),
    },
  });
  try {
    const repository = new LocalStoragePendingCircuitRepository();
    const pending = {
      id:"pending-load",
      entity:"sensor.pending_load",
      name:"Pending Load",
      icon:"mdi:electric-switch",
      enabled:true,
      order:0,
    };
    assert(await repository.add("active-circuits", pending),
      "pending Circuit repository adds a new item");
    assert(!await repository.add("active-circuits", { ...pending, id:"other" }),
      "pending Circuit repository deduplicates by entity");
    assert((await repository.load("active-circuits")).length === 1,
      "pending Circuit survives repository reload");
    assert((await repository.load("other-section")).length === 0,
      "pending Circuit storage remains scoped per section");
    await repository.remove("active-circuits", pending.id);
    assert((await repository.load("active-circuits")).length === 0,
      "pending Circuit can be removed without affecting formal config");
    assert(values.has(CIRCUIT_PENDING_STORAGE_KEY),
      "pending Circuit uses the dedicated storage key");

    const anchored = {
      type:"custom:energy-circuit-section",
      title:"Original title",
      circuits:[pending],
    };
    assert(
      getPendingCircuitScope(anchored) === getPendingCircuitScope({
        ...anchored, title:"Renamed section",
      }),
      "pending Circuit scope survives a section title rename"
    );
    assert(
      getPendingCircuitScope({ ...anchored, id:"card-a" }) !==
        getPendingCircuitScope({ ...anchored, id:"card-b" }),
      "explicit card identity isolates otherwise identical sections"
    );

    const legacyConfig = { ...anchored, title:"Legacy Circuits" };
    const legacyScope = getLegacyPendingCircuitScope(legacyConfig);
    await repository.add(legacyScope, pending);
    const migrated = await loadPendingCircuitsForConfig(repository, legacyConfig);
    assert(
      migrated.scope === getPendingCircuitScope(legacyConfig) &&
        migrated.circuits.some((circuit) => circuit.id === pending.id) &&
        (await repository.load(migrated.scope)).some((circuit) => circuit.id === pending.id),
      "title-scoped pending Circuits are copied into the stable card scope"
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

async function verifyPendingTrendSeries() {
  const formal = [{ id:"main", entity:"sensor.main", name:"Main" }];
  const pending = [{ id:"main", entity:"sensor.other" }, {
    id:"duplicate", entity:"sensor.main",
  }, {
    id:"solar", entity:"sensor.solar", name:"Solar", color:"#444D9E",
    axis:"right", decimals:3, chartMode:"area", visible:false,
  }];
  const importable = getImportablePendingSeries(formal, pending);
  assert(importable.length === 1 && importable[0]?.entity === "sensor.solar",
    "pending Trend Series deduplicate against Lovelace by ID and entity");
  const merged = mergePendingSeries(formal, pending);
  assert(
    merged.importedCount === 1 && merged.series.length === 2 &&
      merged.series[1]?.color === "#444D9E" &&
      merged.series[1]?.axis === "right" &&
      merged.series[1]?.decimals === 3 &&
      merged.series[1]?.chartMode === "area" &&
      merged.series[1]?.visible === false,
    "pending Trend import preserves Series fields without overwriting formal Series"
  );

  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable:true,
    value:{
      getItem:(key) => values.get(key) ?? null,
      setItem:(key, value) => values.set(key, value),
    },
  });
  try {
    const repository = new LocalStoragePendingTrendSeriesRepository();
    assert(await repository.add("energy-trend", pending[2]),
      "pending Trend repository adds a Series");
    assert(!await repository.add("energy-trend", { entity:"sensor.solar" }),
      "pending Trend repository deduplicates by entity");
    assert((await repository.load("energy-trend")).length === 1,
      "pending Trend Series survives repository reload");
    await repository.remove("energy-trend", "solar", "sensor.solar");
    assert((await repository.load("energy-trend")).length === 0,
      "pending Trend Series can be deleted directly");
    assert(values.has(TREND_PENDING_STORAGE_KEY),
      "pending Trend Series uses the dedicated storage key");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

async function verifyPendingTrendRemovals() {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable:true,
    value:{ getItem:(key) => values.get(key) ?? null, setItem:(key, value) => values.set(key, value) },
  });
  try {
    const repository = new LocalStoragePendingTrendRemovalRepository();
    await repository.add("energy-trend", { id:"main", entity:"sensor.main_power" });
    await repository.add("energy-trend", { id:"main", entity:"sensor.main_power" });
    const removals = await repository.load("energy-trend");
    assert(removals.length === 1, "pending Trend removals deduplicate stable identity");
    assert(matchesPendingTrendRemoval({ id:"main", entity:"sensor.changed" }, removals[0]),
      "pending Trend removal matches stable Series ID");
    assert(matchesPendingTrendRemoval({ entity:"sensor.main_power" }, removals[0]),
      "pending Trend removal falls back to entity identity");
    assert(values.has(TREND_PENDING_REMOVALS_STORAGE_KEY),
      "pending Trend removals use a dedicated storage key");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

async function verifyPendingKpis() {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable:true,
    value:{
      getItem:(key) => values.get(key) ?? null,
      setItem:(key, value) => values.set(key, value),
    },
  });
  try {
    const repository = new LocalStoragePendingKpiRepository();
    const item = { id:"custom-solar", entity:"sensor.solar", title:"Solar", enabled:true };
    assert(await repository.add("energy-overview", item), "pending KPI repository adds an item");
    assert(!await repository.add("energy-overview", { ...item, id:"duplicate" }),
      "pending KPI repository deduplicates by entity");
    assert((await repository.load("energy-overview")).length === 1,
      "pending KPI additions survive repository reload");
    await repository.remove("energy-overview", "custom-solar");
    assert((await repository.load("energy-overview")).length === 0,
      "pending KPI additions can be deleted directly");
    assert(values.has(KPI_PENDING_STORAGE_KEY), "pending KPI uses its dedicated key");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

function verifyNumberAndUnitFormatting() {
  assert(formatNumber(12.345, { decimals: 2 }) === "12.35", "decimal formatting");
  assert(formatNumber(12, { decimals: 2 }) === "12.00", "trailing zero formatting");

  const watts = convertUnit(1_200, "W", { autoScale: true });
  assert(watts.value === 1.2 && watts.unit === "kW", "W to kW conversion");

  const wattHours = convertUnit(3_200, "Wh", { autoScale: true });
  assert(
    wattHours.value === 3.2 && wattHours.unit === "kWh",
    "Wh to kWh conversion"
  );

  const kiloWattHours = convertUnit(1_250, "kWh", {
    autoScale: true,
  });
  assert(
    kiloWattHours.value === 1.25 &&
      kiloWattHours.unit === "MWh",
    "kWh to MWh conversion"
  );

  const usage = formatValue(11_307.51, "Wh", {
    autoScale: true,
    decimals: 2,
  });
  assert(
    usage.value === "11.31" && usage.unit === "kWh",
    "KPI Wh value is formatted as kWh"
  );

  const lowEnergy = formatValue(100, "Wh", {
    autoScale: true,
    decimals: 2,
  });
  assert(
    lowEnergy.value === "100.00" && lowEnergy.unit === "Wh",
    "energy below 1000 Wh remains Wh"
  );

  const upperKiloWattHours = formatValue(999_999, "Wh", {
    autoScale: true,
    decimals: 2,
  });
  assert(
    upperKiloWattHours.value === "999.99" &&
      upperKiloWattHours.unit === "kWh",
    "energy below 1000000 Wh remains kWh"
  );

  const megaWattHours = formatValue(1_000_000, "Wh", {
    autoScale: true,
    decimals: 2,
  });
  assert(
    megaWattHours.value === "1.00" &&
      megaWattHours.unit === "MWh",
    "energy at 1000000 Wh is formatted as MWh"
  );

  const lowPower = formatValue(571.32, "W", {
    autoScale: true,
    decimals: 2,
  });
  assert(
    lowPower.value === "571.32" && lowPower.unit === "W",
    "KPI power below threshold remains W"
  );

  const highPower = formatValue(2_571.32, "W", {
    autoScale: true,
    decimals: 2,
  });
  assert(
    highPower.value === "2.57" && highPower.unit === "kW",
    "KPI power above threshold is formatted as kW"
  );
}

function verifyKpiResolverSemantics() {
  const hass = {
    states: {
      "sensor.power": {
        state: "unknown",
        attributes: {
          friendly_name: "Power",
          unit_of_measurement: "W",
        },
      },
      "sensor.energy_total": {
        state: "10",
        attributes: {
          friendly_name: "Energy Total",
          unit_of_measurement: "kWh",
          last_period: 8,
        },
      },
    },
  };

  const metric = resolveKpiMetricViewModel(hass, {
    entity: "sensor.power",
    unit: "W",
  });
  assert(metric?.status === "unknown", "resolver preserves unknown state");

  const trend = resolveKpiTrendViewModel(hass, {
    entity: "sensor.energy_total",
    title: "Today Energy",
    trendMode: "none",
  });
  assert(trend.text === "", "trend mode none disables comparison text");
}

function verifyLineChart() {
  const values = [10, 20];
  const size = { width: 120, height: 28 };
  assert(
    createLinePath(values, size) === "M 0.00 28.00 L 120.00 0.00",
    "line path"
  );
  assert(
    createPolylinePoints(values, size) === "0.00,28.00 120.00,0.00",
    "polyline points"
  );
}

function verifyCircuitSorting() {
  const circuit = (id, power) => ({
    config: { id, name: id, entity: `sensor.${id}` },
    power,
    value: power === null ? "--" : String(power),
    unit: "W",
    stateStatus: power === null ? "missing" : "valid",
    active: power !== null && power > 0,
  });
  const sorted = sortCircuitsByPower([
    circuit("fridge", 200),
    circuit("heater", 800),
    circuit("missing", null),
    circuit("ac", 1_200),
  ]);

  assert(
    sorted.map((item) => item.config.id).join(",") ===
      "ac,heater,fridge,missing",
    "circuits sort by descending power with invalid states last"
  );
}

function verifyConfigNormalization() {
  const card = normalizeKpiCardConfig({ entity: "sensor.power" });
  assert(card.autoScale === true && card.decimals === 2, "card defaults");

  const section = normalizeEnergyKpiSectionConfig({
    cards: [{ id: "power" }],
  });
  assert(section.title === "Energy Overview", "section title default");
  assert(section.cards.length === 1, "section cards");
  assert(section.cards[0].autoScale === undefined, "template defaults preserved");
}

function verifyConfigValidation() {
  const missingEntity = validateKpiCardConfig({
    id: "power",
    enabled: true,
    entity: "",
  });
  assert(missingEntity.status === "invalid", "enabled KPI requires entity");
  assert(
    missingEntity.status === "invalid" &&
      missingEntity.reason === "Entity required",
    "missing entity reason"
  );

  assert(
    validateKpiCardConfig({
      id: "power",
      enabled: true,
      entity: "sensor.power",
    }).status === "valid",
    "configured KPI is valid"
  );

  assert(
    validateKpiCardConfig({
      id: "power",
      enabled: false,
      entity: "",
    }).status === "valid",
    "disabled KPI may remain incomplete"
  );
}

function verifyKpiModel() {
  const overviewTemplates = defaultKpiTemplates.slice(0, 4);
  assert(
    overviewTemplates.map((template) => template.id).join(",") ===
      "total_usage,usage,power,solar_generation",
    "Energy Overview templates have the expected order"
  );
  assert(
    overviewTemplates.every((template) => template.defaultEnabled === true),
    "four Energy Overview templates are enabled by default"
  );
  assert(
    defaultKpiTemplates
      .slice(4)
      .every((template) => template.defaultEnabled === false),
    "additional KPI templates remain disabled by default"
  );
  assert(
    overviewTemplates.map((template) => template.unit).join(",") ===
      "Wh,Wh,W,W",
    "Energy Overview template units are configured"
  );

  const templates = [
    {
      id: "power",
      title: "Power",
      unit: "W",
      defaultEnabled: true,
      autoScale: true,
      decimals: 2,
    },
  ];

  const merged = mergeKpiCards(
    [{ id: "power", entity: "sensor.power" }],
    templates
  );
  assert(merged[0].entity === "sensor.power", "configured entity preserved");
  assert(merged[0].autoScale === true, "definition defaults merged");

  const discoveredFromEmptyEntity = mergeKpiCards(
    [{ id: "power", entity: "" }],
    [{ ...templates[0], entity: "", defaultEntity: "" }],
    { power: [{ entityId: "sensor.discovered_power" }] }
  );
  assert(
    discoveredFromEmptyEntity[0].entity === "sensor.discovered_power",
    "empty entity falls back to discovery"
  );

  const definitionEntityPreferred = mergeKpiCards(
    [{ id: "power", entity: "   " }],
    [{
      ...templates[0],
      entity: "sensor.definition_power",
      defaultEntity: "sensor.default_power",
    }],
    { power: [{ entityId: "sensor.discovered_power" }] }
  );
  assert(
    definitionEntityPreferred[0].entity === "sensor.definition_power",
    "first configured entity preserves priority"
  );

  assert(
    !("defaultEnabled" in merged[0]) && !("defaultEntity" in merged[0]),
    "template metadata is not stored in card instances"
  );

  const toggled = toggleKpiCard(merged, templates[0]);
  assert(toggled[0].enabled === false, "KPI toggle");

  const locked = updateKpiCardEntity(
    merged,
    "power",
    "sensor.other",
    { power: true }
  );
  assert(locked.locked && !locked.changed, "explicit entity lock");

  const changed = updateKpiCardEntity(
    merged,
    "power",
    "sensor.other",
    {}
  );
  assert(changed.changed, "entity update");
  assert(changed.cards[0].entity === "sensor.other", "updated entity value");
}

function verifyKpiCardManager() {
  const manager = new KpiCardManager([]);
  const original = [];

  const created = manager.create(original, {
    id: "custom-power",
    title: "Custom Power",
    entity: "sensor.power",
    enabled: true,
  });
  assert(created.changed && created.cards.length === 1, "manager create");
  assert(original.length === 0, "manager mutations are immutable");

  const updated = manager.update(created.cards, "custom-power", {
    title: "Power Now",
  });
  assert(updated.changed, "manager update");
  assert(updated.cards[0].title === "Power Now", "manager update value");

  const disabled = manager.disable(updated.cards, "custom-power");
  assert(
    disabled.changed && disabled.cards[0].enabled === false,
    "manager disable"
  );

  const enabled = manager.enable(disabled.cards, "custom-power");
  assert(
    enabled.changed && enabled.cards[0].enabled === true,
    "manager enable"
  );

  const second = manager.create(enabled.cards, {
    id: "custom-energy",
    title: "Custom Energy",
  });
  const reordered = manager.reorder(second.cards, 1, 0);
  assert(
    reordered.changed && reordered.cards[0].id === "custom-energy",
    "manager reorder"
  );

  const removed = manager.remove(reordered.cards, "custom-power");
  assert(
    removed.changed &&
      removed.cards.length === 1 &&
      removed.cards[0].id === "custom-energy",
    "manager remove"
  );
}

async function verifyInMemoryRepository() {
  const initialCards = [{
    id: "power",
    entity: "sensor.power",
    history: [1, 2],
  }];
  const repository = new InMemoryKpiConfigRepository(initialCards);

  initialCards[0].entity = "sensor.external_mutation";
  initialCards[0].history.push(3);

  const firstLoad = await repository.load();
  assert(
    firstLoad[0].entity === "sensor.power",
    "repository clones constructor input"
  );
  assert(
    firstLoad[0].history.length === 2,
    "repository clones nested history"
  );

  firstLoad[0].title = "Mutated Load";
  const secondLoad = await repository.load();
  assert(
    secondLoad[0].title === undefined,
    "repository load returns an isolated copy"
  );

  const savedCards = [{
    id: "energy",
    entity: "sensor.energy",
    enabled: true,
  }];
  await repository.save(savedCards);
  savedCards[0].entity = "sensor.changed_after_save";

  const savedLoad = await repository.load();
  assert(savedLoad.length === 1, "repository save replaces stored cards");
  assert(
    savedLoad[0].entity === "sensor.energy",
    "repository save stores an isolated copy"
  );
}

function verifyKpiConfigMerger() {
  const templates = [{
    id: "power",
    title: "Power",
    defaultEntity: "sensor.template_power",
    defaultEnabled: true,
    autoScale: true,
    decimals: 2,
  }, {
    id: "energy",
    title: "Energy",
    defaultEntity: "",
    defaultEnabled: true,
  }];

  const resolved = mergeKpiConfigSources({
    templates,
    repositoryCards: [{
      id: "power",
      entity: "sensor.repository_power",
      autoScale: false,
      enabled: false,
    }, {
      id: "repository-only",
      title: "Repository Only",
      entity: "sensor.repository_only",
      enabled: true,
    }],
    yamlCards: [{
      id: "power",
      entity: "",
      decimals: 0,
    }, {
      id: "yaml-only",
      title: "YAML Only",
      entity: "sensor.yaml_only",
      enabled: true,
    }],
    discovery: {
      power: [{ entityId: "sensor.discovered_power" }],
      energy: [{ entityId: "sensor.discovered_energy" }],
    },
  });

  const power = resolved.find((card) => card.config.id === "power");
  assert(power.config.entity === "sensor.repository_power", "empty YAML entity falls back");
  assert(power.config.decimals === 0, "zero is an explicit YAML value");
  assert(power.config.autoScale === false, "false is an explicit repository value");
  assert(power.config.enabled === false, "disabled template remains disabled");
  assert(power.metadata.origin === "yaml", "highest declared source is recorded");
  assert(power.metadata.entityLocked === false, "empty YAML entity does not lock");
  assert(power.metadata.removable === false, "template instance is not removable");

  const energy = resolved.find((card) => card.config.id === "energy");
  assert(
    energy.config.entity === "sensor.discovered_energy",
    "discovery fills a missing entity"
  );

  assert(
    resolved.some((card) => card.config.id === "repository-only"),
    "repository-only card is preserved"
  );
  assert(
    resolved.some((card) => card.config.id === "yaml-only"),
    "YAML-only card is preserved"
  );
  assert(
    resolved.find((card) => card.config.id === "yaml-only").metadata.removable,
    "custom card is removable"
  );

  const yamlLocked = mergeKpiConfigSources({
    templates,
    repositoryCards: [{
      id: "power",
      entity: "sensor.repository_power",
    }],
    yamlCards: [{
      id: "power",
      entity: "sensor.yaml_power",
      metadata: { entityLocked: true },
    }],
    discovery: {
      power: [{ entityId: "sensor.discovered_power" }],
    },
  })[0];
  assert(yamlLocked.config.entity === "sensor.yaml_power", "YAML entity wins");
  assert(yamlLocked.metadata.entityLocked, "explicit YAML entity lock");

  const yamlEditable = mergeKpiConfigSources({
    templates,
    repositoryCards: [{
      id: "power",
      entity: "sensor.user_power",
    }],
    yamlCards: [{
      id: "power",
      entity: "sensor.yaml_power",
    }],
  })[0];
  assert(
    yamlEditable.metadata.entityLocked === false,
    "YAML entity remains editable without explicit lock metadata"
  );
  assert(
    yamlEditable.config.entity === "sensor.user_power",
    "saved user entity overrides unlocked YAML entity"
  );

  const legacyEntity = mergeKpiConfigSources({
    templates: [],
    repositoryCards: [{
      entity: "sensor.legacy",
      title: "Repository title",
      enabled: true,
    }],
    yamlCards: [{
      entity: "sensor.legacy",
      title: "YAML title",
    }],
  });
  assert(legacyEntity.length === 1, "legacy entity identity merges");
  assert(legacyEntity[0].config.title === "YAML title", "legacy YAML fields win");

  const legacyTitle = mergeKpiConfigSources({
    templates: [],
    repositoryCards: [{
      title: "  Daily Usage ",
      enabled: false,
    }],
    yamlCards: [{
      title: "daily usage",
      enabled: true,
      entity: "sensor.daily_usage",
    }],
  });
  assert(legacyTitle.length === 1, "normalized legacy title identity merges");

  const invalid = mergeKpiConfigSources({
    templates: [],
    yamlCards: [{ enabled: true }],
  })[0];
  assert(!invalid.validation.valid, "incomplete enabled card is invalid");
  assert(
    invalid.validation.errors.entity === "Entity required",
    "entity validation error is returned"
  );
  assert(
    invalid.validation.errors.id === "Card identity required",
    "identity validation error is returned"
  );
  assert(!("validation" in invalid.config), "validation is not persisted in config");
}

function verifySharedEffectiveKpiCards() {
  const templates = [{
    id:"power", title:"Power", defaultEntity:"", defaultEnabled:true,
  }, {
    id:"energy", title:"Energy", defaultEntity:"", defaultEnabled:true,
  }, {
    id:"disabled", title:"Disabled", defaultEntity:"sensor.disabled", defaultEnabled:false,
  }];
  const formalCards = [{
    id:"power", entity:"sensor.formal_power", enabled:true, order:0,
  }, {
    id:"custom-formal", title:"Formal custom", entity:"sensor.formal_custom",
    enabled:true, order:1,
  }];
  const pendingCards = [{
    id:"power", entity:"sensor.stale_pending", enabled:true,
  }, {
    id:"custom-pending", title:"Pending custom", entity:"sensor.pending_custom",
    enabled:true, order:2,
  }];
  const discovery = {
    power:[{ entityId:"sensor.discovered_power" }],
    energy:[{ entityId:"sensor.discovered_energy" }],
  };
  const sources = { templates,formalCards,pendingCards,discovery };
  const runtime = getVisibleEffectiveKpiCards(sources);
  const editor = getVisibleEffectiveKpiCards(sources);
  assert(
    runtime.map((item) => getKpiCardKey(item.config)).join(",") ===
      editor.map((item) => getKpiCardKey(item.config)).join(",") &&
      runtime.map((item) => item.config.entity).join(",") ===
      editor.map((item) => item.config.entity).join(","),
    "runtime and editor KPI selectors share IDs, count, order, and entities"
  );
  const effective = resolveEffectiveKpiCards(sources);
  assert(
    effective.find((item) => item.config.id === "power")?.config.entity ===
      "sensor.formal_power",
    "formal KPI entity blocks discovery and pending overrides"
  );
  assert(
    effective.find((item) => item.config.id === "power")?.origin === "formal" &&
      effective.filter((item) => item.config.id === "power").length === 1,
    "formal KPI has one stable-ID result with formal origin"
  );
  assert(
    effective.find((item) => item.config.id === "energy")?.config.entity ===
      "sensor.discovered_energy" &&
      effective.find((item) => item.config.id === "energy")?.discoveryFilled,
    "discovery fills a template-only KPI without becoming formal config"
  );
  assert(
    runtime.some((item) => item.config.id === "custom-pending" && item.origin === "pending") &&
      runtime.some((item) => item.config.id === "custom-formal") &&
      !runtime.some((item) => item.config.id === "disabled"),
    "pending/custom ordering and enabled filtering match runtime display rules"
  );
}

function verifyKpiEditorRemoval() {
  const templates = [{ id:"power",title:"Power",defaultEnabled:true }, {
    id:"energy",title:"Energy",defaultEnabled:true,
  }];
  const discovery = { power:[{ entityId:"sensor.power" }] };
  const builtIn = (origin,config,discoveryFilled = false) => ({
    key:config.id,origin,discoveryFilled,isBuiltInTemplate:true,originalConfig:config,
  });
  const formalBuiltIn = applyFormalKpiRemoval(
    [{ id:"power",entity:"sensor.formal_power",enabled:true }, {
      id:"custom-keep",entity:"sensor.keep",enabled:true,
    }],
    builtIn("formal",{ id:"power",entity:"sensor.formal_power",enabled:true })
  );
  assert(
    formalBuiltIn.some((item) => item.id === "power" && item.enabled === false) &&
      formalBuiltIn.some((item) => item.id === "custom-keep"),
    "formal built-in removal creates suppression without affecting other KPIs"
  );
  assert(
    !getVisibleEffectiveKpiCards({
      templates,formalCards:formalBuiltIn,discovery,
    }).some((item) => item.config.id === "power"),
    "disabled formal built-in remains hidden after effective resolver rerun"
  );
  const templateSuppression = applyFormalKpiRemoval(
    [],builtIn("template",{ id:"power",entity:"sensor.power",enabled:true },true)
  );
  assert(
    templateSuppression.length === 1 && templateSuppression[0].id === "power" &&
      templateSuppression[0].enabled === false &&
      !getVisibleEffectiveKpiCards({
        templates,formalCards:templateSuppression,discovery,
      }).some((item) => item.config.id === "power"),
    "template/discovery-only removal creates a formal hidden identity"
  );
  const formalCustom = applyFormalKpiRemoval(
    [{ id:"custom-remove",entity:"sensor.remove",enabled:true }, {
      id:"custom-keep",entity:"sensor.keep",enabled:true,
    }],{
      key:"custom-remove",origin:"formal",discoveryFilled:false,
      isBuiltInTemplate:false,
      originalConfig:{ id:"custom-remove",entity:"sensor.remove",enabled:true },
    }
  );
  assert(
    !formalCustom.some((item) => item.id === "custom-remove") &&
      formalCustom.some((item) => item.id === "custom-keep"),
    "formal custom removal splices only the selected custom KPI"
  );
  const pendingCustom = applyFormalKpiRemoval([],{
    key:"custom-pending",origin:"pending",discoveryFilled:false,
    isBuiltInTemplate:false,
    originalConfig:{ id:"custom-pending",entity:"sensor.pending",enabled:true },
  });
  assert(!pendingCustom.length,
    "pending custom removal does not create a formal Lovelace entry");
  const pendingBuiltIn = applyFormalKpiRemoval([],builtIn(
    "pending",{ id:"energy",entity:"sensor.energy",enabled:true }
  ));
  assert(pendingBuiltIn[0]?.id === "energy" && pendingBuiltIn[0]?.enabled === false,
    "pending built-in removal produces a formal suppression entry");
}

function verifyKpiCardHeightGeometry() {
  const heights = [130,140,150,170,200,240];
  for (const height of heights) {
    const geometry = resolveKpiCardGeometry(height);
    const contentHeight = height - geometry.paddingBlock * 2 - 2;
    const requiredRows = 22.5 + geometry.titleGap + 42 +
      geometry.subtitleSlotHeight;
    assert(contentHeight >= requiredRows,
      `KPI ${height}px height budget contains title, value, and subtitle rows`);
  }
  const compact = resolveKpiCardGeometry(130);
  const normal = resolveKpiCardGeometry(170);
  const tall = resolveKpiCardGeometry(240);
  assert(
    compact.paddingBlock === 10 && compact.titleGap === 2 &&
      compact.subtitleSlotHeight === 20 && compact.subtitlePaddingTop === 3,
    "compact KPI geometry reduces whitespace before content"
  );
  assert(
    normal.paddingBlock === 20 && normal.titleGap === 4 &&
      normal.subtitleSlotHeight === 23 && normal.subtitlePaddingTop === 6 &&
      JSON.stringify(tall) === JSON.stringify(normal),
    "170px and taller KPIs preserve the established normal geometry"
  );
}

function verifyTrendAxisOverflowPolicy() {
  const axis = (id,category,unit,axisGroup) => ({
    id,category,unit,axisGroup,precision:2,min:-100,max:1_000,
  });
  const series = (id,axisId,category,unit,chartMode = "line") => ({
    id,entity:`sensor.${id}`,name:id,axisId,category,unit,chartMode,
    precision:2,visible:true,lineStyle:"solid",
    points:[{ timestamp:1,value:-10 },{ timestamp:2,value:100 }],
  });
  const axes = [
    axis("power:W","power","W","left"),
    axis("energy:Wh","energy","Wh","right"),
    axis("unit:EUR","cost","EUR"),
    axis("unit:%","energy","%"),
  ];
  const input = [
    series("power","power:W","power","W","bar"),
    series("energy","energy:Wh","energy","Wh","area"),
    series("cost","unit:EUR","cost","EUR"),
    series("percentage","unit:%","energy","%"),
  ];
  const prepared = new TrendChartModelCache().resolve(
    input,axes,new Set(),"24H","high_precision"
  );
  assert(
    prepared.series.map((item) => item.id).join(",") === "power,energy" &&
      prepared.excludedSeries.map((item) => item.id).join(",") === "cost,percentage",
    "additional incompatible Trend axes are reported explicitly instead of disappearing silently"
  );
  assert(
    prepared.axes.length === 2 && prepared.excludedAxisCount === 2,
    "Trend keeps the two-visible-axis UI while exposing overflow metadata"
  );
  assert(
    prepared.hoverTimestamps.join(",") === "1,2",
    "hover timestamps cover every drawable Series after axis selection"
  );
  assert(
    convertToBaseUnit(1,"kW").unit === convertToBaseUnit(1,"W").unit &&
      convertToBaseUnit(1,"kWh").unit === convertToBaseUnit(1,"Wh").unit,
    "compatible power and energy units share their base axis family"
  );

  const explicitRight = transformTrendHistory({
    "sensor.auto_power":[{ state:"1",last_changed:"2026-08-13T00:00:00Z",attributes:{ unit_of_measurement:"W" } }],
    "sensor.auto_energy":[{ state:"1",last_changed:"2026-08-13T00:00:00Z",attributes:{ unit_of_measurement:"Wh" } }],
    "sensor.explicit_cost":[{ state:"1",last_changed:"2026-08-13T00:00:00Z",attributes:{ unit_of_measurement:"EUR" } }],
  },[
    { entity:"sensor.auto_power",axis:"auto" },
    { entity:"sensor.auto_energy",axis:"auto" },
    { entity:"sensor.explicit_cost",axis:"right",category:"cost" },
  ],"energy");
  assert(
    explicitRight.axes.find((item) => item.id.includes("unit:EUR"))?.axisGroup === "right",
    "explicit right-axis preference is reserved before automatic axis assignment"
  );
}

async function verifyKpiConfigCoordinator() {
  const repository = new InMemoryKpiConfigRepository([{
    id: "power",
    entity: "sensor.repository_power",
    enabled: true,
  }]);
  const coordinator = new KpiConfigCoordinator(repository, [{
    id: "power",
    title: "Power",
    defaultEnabled: true,
  }, {
    id: "energy",
    title: "Energy",
    defaultEnabled: true,
  }]);

  const resolved = await coordinator.resolve({
    yamlCards: [{
      id: "power",
      entity: "sensor.yaml_power",
    }],
    discovery: {
      energy: [{ entityId: "sensor.discovered_energy" }],
    },
  });
  assert(
    resolved.find((card) => card.config.id === "power").config.entity ===
      "sensor.yaml_power",
    "coordinator keeps Lovelace/YAML authoritative over legacy repository state"
  );
  assert(
    resolved.find((card) => card.config.id === "energy").config.entity ===
      "sensor.discovered_energy",
    "coordinator passes discovery to merger"
  );

  const repositoryAfterResolve = await repository.load();
  assert(
    repositoryAfterResolve.length === 1 &&
      repositoryAfterResolve[0].entity === "sensor.repository_power",
    "resolve does not persist derived or discovery data"
  );

  await coordinator.saveUserCards([{
    id: "custom",
    entity: "sensor.custom",
    history: [1, 2],
    identity: "derived-identity",
    metadata: { removable: true },
    validation: { valid: true, errors: {} },
    discovery: { entityId: "sensor.discovered" },
  }]);
  const persisted = await repository.load();
  assert(persisted.length === 1, "coordinator saves user cards");
  assert(!("identity" in persisted[0]), "derived identity is not persisted");
  assert(!("metadata" in persisted[0]), "derived metadata is not persisted");
  assert(!("validation" in persisted[0]), "validation is not persisted");
  assert(!("discovery" in persisted[0]), "discovery metadata is not persisted");

  const saveOrder = [];
  const orderedRepository = {
    async load() {
      return [];
    },
    async save(cards) {
      await Promise.resolve();
      saveOrder.push(cards[0].id);
    },
  };
  const orderedCoordinator = new KpiConfigCoordinator(
    orderedRepository,
    []
  );
  await Promise.all([
    orderedCoordinator.saveUserCards([{ id: "first" }]),
    orderedCoordinator.saveUserCards([{ id: "second" }]),
  ]);
  assert(
    saveOrder.join(",") === "first,second",
    "concurrent saves preserve invocation order"
  );

  const saveFailure = new KpiConfigCoordinator({
    async load() {
      return [];
    },
    async save() {
      throw new Error("save failed");
    },
  }, []);
  let saveError;
  try {
    await saveFailure.saveUserCards([{ id: "failure" }]);
  } catch (error) {
    saveError = error;
  }
  assert(
    saveError instanceof KpiConfigCoordinatorError &&
      saveError.stage === "save",
    "save errors include coordinator stage"
  );
}

function verifyKpiRepositorySnapshot() {
  const templates = [{
    id: "power",
    title: "Power",
    defaultEnabled: true,
    defaultEntity: "",
    autoScale: true,
    decimals: 2,
  }];
  const snapshot = buildKpiRepositorySnapshot({
    templates,
    cards: [{
      id: "power",
      title: "Power",
      entity: "sensor.discovered_power",
      enabled: false,
      autoScale: true,
      decimals: 0,
    }, {
      id: "yaml-only",
      title: "YAML title",
      entity: "sensor.yaml",
      enabled: true,
    }, {
      id: "custom",
      title: "Custom",
      entity: "sensor.custom",
      enabled: true,
      validation: { valid: true },
    }],
    yamlCards: [{
      id: "yaml-only",
      title: "YAML title",
      entity: "sensor.yaml",
      enabled: true,
    }],
    discovery: {
      power: [{ entityId: "sensor.discovered_power" }],
    },
  });

  const power = snapshot.find((card) => card.id === "power");
  assert(power.enabled === false, "template disable override is persisted");
  assert(power.decimals === 0, "zero override is persisted");
  assert(!("entity" in power), "discovered entity is not persisted");
  assert(!("autoScale" in power), "template defaults are not persisted");
  assert(
    !snapshot.some((card) => card.id === "yaml-only"),
    "unchanged YAML-only card is not persisted"
  );

  const custom = snapshot.find((card) => card.id === "custom");
  assert(custom.entity === "sensor.custom", "custom card is persisted");
  assert(!("validation" in custom), "derived custom metadata is removed");

  const yamlExtension = buildKpiRepositorySnapshot({
    templates: [],
    cards: [{
      id: "yaml-card",
      title: "YAML",
      entity: "sensor.yaml",
      enabled: true,
      decimals: 0,
    }],
    yamlCards: [{
      id: "yaml-card",
      title: "YAML",
      entity: "sensor.yaml",
      enabled: true,
    }],
  });
  assert(
    yamlExtension.length === 1 &&
      yamlExtension[0].id === "yaml-card" &&
      yamlExtension[0].decimals === 0,
    "YAML extension keeps identity and user override"
  );
}

function verifyKpiCardDraft() {
  const normalized = normalizeKpiCardDraft({
    title: "  Today's Usage  ",
    entity: " sensor.energy_today ",
    unit: " kWh ",
    decimals: "0",
    enabled: false,
    autoScale: false,
  });
  assert(normalized.title === "Today's Usage", "draft title is trimmed");
  assert(normalized.entity === "sensor.energy_today", "draft entity is trimmed");
  assert(normalized.unit === "kWh", "draft unit is trimmed");
  assert(normalized.decimals === 0, "draft decimals string is normalized");
  assert(normalized.enabled === false, "draft false value is preserved");

  const invalid = validateKpiCardDraft(normalizeKpiCardDraft({
    title: "",
    entity: "invalid entity",
    decimals: 7,
  }));
  assert(!invalid.valid, "invalid draft is rejected");
  assert(invalid.errors.title === "Title required", "draft title error");
  assert(invalid.errors.entity === "Invalid entity ID", "draft entity error");
  assert(
    invalid.errors.decimals === "Decimals must be an integer from 0 to 4",
    "draft decimals error"
  );

  const duplicate = validateKpiCardDraft(normalizeKpiCardDraft({
    id: "custom-power",
    title: "Power",
    entity: "sensor.power",
  }), ["CUSTOM-POWER"]);
  assert(
    duplicate.errors.id === "Card ID already exists",
    "draft duplicate ID is case insensitive"
  );

  assert(
    createCustomKpiId(normalizeKpiCardDraft({
      title: "Today's Usage",
      entity: "sensor.energy_today",
    })) === "custom-today-s-usage",
    "draft ID is generated from title"
  );
  assert(
    createCustomKpiId(normalizeKpiCardDraft({
      title: "Power",
      entity: "sensor.power",
    }), ["custom-power", "custom-power-2"]) === "custom-power-3",
    "draft ID collision gets stable suffix"
  );

  const built = buildCustomKpiConfig({
    title: "Power",
    entity: "sensor.power",
    category: "energy",
    unit: "W",
    icon: "mdi:flash",
    decimals: 0,
    autoScale: true,
  });
  assert(built.valid, "valid draft builds config");
  assert(built.config.type === "custom", "built config is explicitly custom");
  assert(built.config.name === "Power", "built config stores display name");
  assert(built.config.id === "custom-power", "built config has generated ID");
  assert(built.config.decimals === 0, "built config preserves zero decimals");
  assert(built.config.autoScale === true, "built config preserves auto scale");
  assert(!("config" in buildCustomKpiConfig({
    title: "",
    entity: "",
  })), "invalid draft does not produce config");
}

function verifyTrendConfig() {
  const normalized = normalizeEnergyTrendCardConfig({
    title: "  Power Trend  ",
    height: 350,
    timeframe: "1H",
    category: "power",
    entities: [{
      entity: " sensor.main_power ",
      name: " Main Power ",
      color: " var(--en-color-primary) ",
    }, {
      entity: " ",
      name: "Invalid",
    }],
  });

  assert(normalized.title === "Power Trend", "trend title is normalized");
  assert(normalized.height === 350, "trend height is preserved");
  assert(normalized.timeframe === "1H", "trend timeframe is preserved");
  assert(normalized.category === "power", "trend category is preserved");
  assert(normalized.entities.length === 1, "empty trend entity is removed");
  assert(
    normalized.entities[0].entity === "sensor.main_power",
    "trend entity ID is trimmed"
  );
  assert(
    normalized.entities[0].color === "var(--en-color-primary)",
    "explicit trend series colors remain configured"
  );

  const defaults = normalizeEnergyTrendCardConfig({ entities: [] });
  assert(defaults.title === "Energy Trend", "trend title default");
  assert(defaults.height === 350, "trend height default");
  assert(defaults.timeframe === "24H", "trend timeframe default");
  assert(defaults.curve === "smooth", "trend curve defaults to smooth");
  assert(defaults.renderMode === "smooth", "trend render mode defaults smooth");
  const defaultSeriesMode = normalizeEnergyTrendCardConfig({
    entities:[{ entity:"sensor.power" }],
  });
  assert(
    defaultSeriesMode.entities[0]?.chartMode === "line" &&
      defaultSeriesMode.entities[0]?.color === undefined,
    "trend series defaults to line and keeps theme color unconfigured"
  );
  const migratedSeriesMode = normalizeEnergyTrendCardConfig({
    chartMode:"area",
    entities:[{ entity:"sensor.power" }],
  });
  assert(
    migratedSeriesMode.chartMode === undefined &&
      migratedSeriesMode.entities[0]?.chartMode === "area",
    "legacy global chart mode migrates to each series"
  );
}

async function verifyTrendData() {
  const end = new Date("2026-07-30T12:00:00.000Z");
  const range = getTrendTimeRange("24H", end);
  assert(
    range.start.toISOString() === "2026-07-29T12:00:00.000Z",
    "trend timeframe creates correct start"
  );

  let requestedPath = "";
  const history = await loadTrendHistory({
    async callApi(method, path) {
      assert(method === "GET", "trend history uses GET");
      requestedPath = path;
      return [[{
        entity_id: "sensor.main_power",
        state: "820",
        last_changed: "2026-07-30T11:00:00.000Z",
      }], [{
        entity_id: "sensor.solar_power",
        state: "0.23",
        last_changed: "2026-07-30T11:00:00.000Z",
      }]];
    },
  }, [
    "sensor.main_power",
    "sensor.solar_power",
    "sensor.main_power",
  ], "1H", end);

  assert(
    requestedPath.includes("history/period/") &&
      requestedPath.includes("minimal_response") &&
      requestedPath.includes("no_attributes"),
    "trend history requests minimal REST data"
  );
  assert(
    requestedPath.includes(
      "sensor.main_power%2Csensor.solar_power"
    ),
    "trend history de-duplicates entity IDs"
  );
  assert(
    Object.keys(history.entities).length === 2,
    "trend history maps multiple entities"
  );

  const transformed = transformTrendHistory(
    {
      "sensor.main_power": [{
        state: "820",
        last_changed: "2026-07-30T11:00:00.000Z",
      }, {
        state: "unavailable",
        last_changed: "2026-07-30T11:30:00.000Z",
      }],
      "sensor.solar_power": [{
        state: "0.23",
        last_changed: "2026-07-30T11:00:00.000Z",
      }],
      "sensor.energy": [{
        state: "3.2",
        last_changed: "2026-07-30T11:00:00.000Z",
      }],
    },
    [{
      entity: "sensor.main_power",
      name: "Main Power",
      unit: "W",
      category: "power",
    }, {
      entity: "sensor.solar_power",
      name: "Solar",
      unit: "kW",
      category: "power",
    }, {
      entity: "sensor.energy",
      unit: "kWh",
      category: "energy",
    }],
    "power"
  );

  assert(transformed.series.length === 3, "trend creates all series");
  assert(
    transformed.series[0].points.length === 1,
    "trend filters unavailable states"
  );
  assert(
    transformed.series[1].points[0].value === 230,
    "trend converts kW points to W"
  );
  assert(
    transformed.series[0].axisId === transformed.series[1].axisId,
    "W and kW share one power axis"
  );
  assert(
    transformed.series[2].axisId !== transformed.series[0].axisId,
    "power and energy use separate axes"
  );
  assert(transformed.axes.length === 2, "trend creates multiple axes");

  const rightAxis = transformTrendHistory(
    { "sensor.main_power": [{
      state:"820",
      last_changed:"2026-07-30T11:00:00.000Z",
    }] },
    [{ entity:"sensor.main_power", unit:"W", axis:"right" }],
    "power"
  );
  assert(
    rightAxis.axes[0]?.axisGroup === "right",
    "single trend axis honors right-side configuration"
  );

  const baseEnergy = convertToBaseUnit(3.2, "kWh");
  assert(
    baseEnergy.value === 3200 && baseEnergy.unit === "Wh",
    "shared unit helper converts energy to base unit"
  );
}

function verifyTrendChartAndStatistics() {
  const precisionAxis = {
    id:"power:W",
    category:"power",
    unit:"W",
    precision:3,
    min:0,
    max:1000,
    displayUnit:"W",
    displayScale:1,
    tickStep:200,
    ticks:[],
  };
  assert(
    formatTrendAxisValue(123.4567, precisionAxis) === "123.457",
    "trend axis formatter uses series precision"
  );
  assert(
    formatTrendSeriesValue(123.4567, precisionAxis, 0) === "123 W",
    "trend tooltip formatter accepts zero decimals"
  );
  const responsiveLayout = createTrendChartLayout(640, 280, {
    axisCount: 1,
  });
  assert(responsiveLayout.width === 640, "trend layout uses container width");
  assert(responsiveLayout.height === 280, "trend layout uses container height");
  assert(
    responsiveLayout.plot.right === 632 &&
      responsiveLayout.plot.bottom === 250,
    "trend plot reserves axis space"
  );
  assert(
    responsiveLayout.plot.width ===
      responsiveLayout.plot.right - responsiveLayout.plot.left,
    "trend plot dimensions share one coordinate system"
  );
  assert(
    responsiveLayout.plot.left === 50,
    "single Y axis reserves the minimum readable left spacing"
  );

  const resolvedPowerAxis = resolveTrendAxis({
    id: "power:W",
    category: "power",
    unit: "W",
    min: 364.11,
    max: 17_300,
  });
  assert(
    resolvedPowerAxis.displayUnit === "kW" &&
      resolvedPowerAxis.displayScale === 1_000,
    "a power axis selects one display unit"
  );
  assert(
    resolvedPowerAxis.ticks.map((tick) => tick.displayValue).join(",") ===
      "0,5,10,15,20",
    "power axis ticks share the selected display unit"
  );
  const powerRanges = [
    [500, "W", 100],
    [1_500, "W", 500],
    [5_000, "W", 1_000],
    [20_000, "kW", 5],
  ];
  powerRanges.forEach(([max, unit, step]) => {
    const resolution = resolveTrendAxisUnit(
      "power",
      "W",
      0,
      max
    );
    assert(
      resolution.displayUnit === unit &&
        resolution.tickStep === step,
      `power axis engineering resolution for ${max}W`
    );
  });
  const threeKilowattAxis = resolveTrendAxis({
    id: "power:W",
    category: "power",
    unit: "W",
    min: 0,
    max: 3_000,
  });
  assert(
    threeKilowattAxis.displayUnit === "W" &&
      threeKilowattAxis.ticks
        .map((tick) => tick.displayValue)
        .join(",") === "0,500,1000,1500,2000,2500,3000",
    "3kW range preserves watt engineering precision"
  );
  const dayDomain = {
    min: new Date(2026, 6, 29, 1, 10).getTime(),
    max: new Date(2026, 6, 30, 1, 10).getTime(),
  };
  const dayTicks = createTrendTimeTicks(dayDomain, "24H", 600);
  assert(
    dayTicks.every((timestamp) => {
      const date = new Date(timestamp);
      return date.getMinutes() === 0 && date.getHours() % 6 === 0;
    }),
    "24H ticks align to six-hour boundaries"
  );
  const twoPointCurve = createMonotoneCurve([
    { x: 0, y: 100 },
    { x: 100, y: 20 },
  ]);
  assert(twoPointCurve.length === 1, "two points create one curve segment");
  assert(
    twoPointCurve[0].start.x === 0 &&
      twoPointCurve[0].end.x === 100,
    "curve preserves series endpoints"
  );
  const peakCurve = createMonotoneCurve([
    { x: 0, y: 100 },
    { x: 50, y: 10 },
    { x: 100, y: 80 },
  ]);
  assert(
    peakCurve[0].control2.y === 10 &&
      peakCurve[1].control1.y === 10,
    "monotone curve does not overshoot a local peak"
  );

  const series = {
    id: "sensor.power",
    entity: "sensor.power",
    name: "Power",
    category: "power",
    unit: "W",
    axisId: "power:W",
    visible: true,
    points: [{
      timestamp: 1000,
      value: 100,
    }, {
      timestamp: 2000,
      value: 5000,
    }, {
      timestamp: 3000,
      value: 1000,
    }],
  };
  const axis = {
    id: "power:W",
    category: "power",
    unit: "W",
    min: 0,
    max: 5000,
  };
  const domain = getTrendTimeDomain([series]);
  const path = createTrendSeriesPath(series, axis, domain, {
    left: 0,
    top: 0,
    width: 100,
    height: 50,
  });

  assert(
    path === "M 0.00 49.00 L 50.00 0.00 L 100.00 40.00",
    "trend chart path uses time and axis domains"
  );
  assert(
    findNearestTrendPoint(series.points, 2100)?.value === 5000,
    "trend tooltip finds nearest point"
  );
  assert(
    createLinearTicks(0, 100, 3).join(",") === "0,50,100",
    "trend creates automatic linear ticks"
  );
  const densePoints = Array.from({ length: 2_000 }, (_, index) => ({
    timestamp: new Date(2026, 6, 29, 0, 0).getTime() + index * 60_000,
    value: index === 1_000 ? 10_000 : index % 100,
  }));
  const sampledPoints = sampleTrendPointsByTime(
    densePoints,
    "24H",
    "power"
  );
  assert(sampledPoints.length === 96, "24H sampling is limited to 96 points");
  assert(
    sampledPoints.every((point) => {
      const date = new Date(point.timestamp);
      return date.getMinutes() % 15 === 0 && date.getSeconds() === 0;
    }),
    "24H buckets align to local quarter hours"
  );
  assert(
    resolveTrendSamplingStrategy("1H", "power").intervalMinutes === 1 &&
      resolveTrendSamplingStrategy("7D", "power").intervalMinutes === 120 &&
      resolveTrendSamplingStrategy("30D", "power").intervalMinutes === 480,
    "timeframes resolve fixed sampling intervals"
  );
  assert(
    resolveTrendSamplingStrategy(
      "1H",
      "power",
      "high_precision"
    ).intervalMinutes === 0.25 &&
      resolveTrendSamplingStrategy(
        "24H",
        "power",
        "high_precision"
      ).intervalMinutes === 1 &&
      resolveTrendSamplingStrategy(
        "7D",
        "power",
        "high_precision"
      ).intervalMinutes === 15 &&
      resolveTrendSamplingStrategy(
        "30D",
        "power",
        "high_precision"
      ).intervalMinutes === 60,
    "high precision resolves denser timeframe intervals"
  );
  const precisionSample = sampleTrendPointsByTime([
    { timestamp: new Date(2026, 6, 29, 10, 1, 5).getTime(), value: 100 },
    { timestamp: new Date(2026, 6, 29, 10, 1, 35).getTime(), value: 900 },
    { timestamp: new Date(2026, 6, 29, 10, 1, 50).getTime(), value: 300 },
  ], "24H", "power", "high_precision");
  assert(
    precisionSample.map((point) => point.value).join(",") === "100,900",
    "high precision preserves real bucket minimum and maximum"
  );
  const localBucket = getLocalTrendBucketStart(
    new Date(2026, 6, 29, 10, 37, 42).getTime(),
    15
  );
  assert(
    new Date(localBucket).getMinutes() === 30,
    "sampling aligns from local clock boundaries"
  );
  const cumulativeSample = sampleTrendPointsByTime([
    { timestamp: new Date(2026, 6, 29, 10, 1).getTime(), value: 100 },
    { timestamp: new Date(2026, 6, 29, 10, 14).getTime(), value: 120 },
  ], "24H", "energy");
  assert(
    cumulativeSample[0].value === 120,
    "cumulative energy buckets preserve the last value"
  );
  const samplingCache = new TrendSamplingCache();
  const cachedSample = samplingCache.sample(densePoints, "24H", "power");
  assert(
    cachedSample === samplingCache.sample(densePoints, "24H", "power"),
    "trend sampling reuses cached point arrays"
  );
  const modelCache = new TrendChartModelCache();
  const cachedSeries = [series];
  const cachedAxes = [axis];
  const firstModel = modelCache.resolve(
    cachedSeries,
    cachedAxes,
    new Set(),
    "24H",
    "smooth"
  );
  const secondModel = modelCache.resolve(
    cachedSeries,
    cachedAxes,
    new Set(),
    "24H",
    "smooth"
  );
  assert(
    firstModel === secondModel &&
      firstModel.series === secondModel.series &&
      firstModel.axes === secondModel.axes,
    "hover renders reuse prepared chart model references"
  );

}

verifyNumberAndUnitFormatting();
verifyTrendSeriesColors();
verifyTrendConfigChangeClassification();
verifyTrendCanvasColors();
verifyTrendRenderGuard();
verifyTrendBarBaseline();
verifyTrendAxisOverflowPolicy();
verifyTrendInitialLayoutCommit();
verifyTrendHoverTimestampIndex();
verifyAutomationScenarioSemantics();
verifyAutomationDomainFoundation();
await verifyAutomationRuntimeFoundation();
verifyAutomationEditorFoundation();
verifyKpiResolverSemantics();
verifyLineChart();
verifyCircuitSorting();
verifyCircuitPowerEntityFilter();
verifyCircuitCarouselAlignment();
verifyConfigNormalization();
verifyConfigValidation();
verifyKpiModel();
verifyKpiCardManager();
await verifyInMemoryRepository();
verifyKpiConfigMerger();
verifySharedEffectiveKpiCards();
verifyKpiEditorRemoval();
verifyKpiCardHeightGeometry();
await verifyKpiConfigCoordinator();
verifyKpiRepositorySnapshot();
verifyKpiCardDraft();
verifyTrendConfig();
await verifyTrendConfigPersistence();
await verifyCircuitConfigAuthority();
verifyLegacyCircuitImport();
await verifyPendingCircuitRepository();
await verifyPendingTrendSeries();
await verifyPendingTrendRemovals();
await verifyPendingKpis();
await verifyTrendData();
verifyTrendChartAndStatistics();

console.log("Core verification passed.");
