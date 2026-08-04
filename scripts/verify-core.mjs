import {
  createLinePath,
  createPolylinePoints,
} from "../src/helpers/line-chart.ts";
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
import {
  getTrendTimeRange,
  loadTrendHistory,
} from "../src/helpers/trend-data-provider.ts";
import { transformTrendHistory } from "../src/helpers/trend-transformer.ts";
import {
  createLinearTicks,
  createTrendSeriesPath,
  findNearestTrendPoint,
  getTrendTimeDomain,
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
} from "../src/helpers/trend-chart-formatters.ts";
import { createMonotoneCurve } from "../src/helpers/trend-curve.ts";
import { sortCircuitsByPower } from "../src/helpers/circuit-utils.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    restored.timeframe === "7D" &&
      restored.fullWidth === false &&
      restored.height === 420,
    "trend chart settings restore from repository"
  );
  assert(
    restored.entities[0]?.entity === "sensor.solar_power" &&
      restored.entities[0]?.name === "Solar" &&
      restored.entities[0]?.enabled === false &&
      restored.entities[0]?.axis === "right" &&
      restored.entities[0]?.decimals === 3 &&
      restored.entities[0]?.chartMode === "bar" &&
      restored.entities[0]?.renderMode === "high_precision",
    "trend series settings restore from repository"
  );
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
      "sensor.repository_power",
    "coordinator preserves saved entity over unlocked YAML source"
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

  const loadFailure = new KpiConfigCoordinator({
    async load() {
      throw new Error("load failed");
    },
    async save() {},
  }, []);
  let loadError;
  try {
    await loadFailure.resolve();
  } catch (error) {
    loadError = error;
  }
  assert(
    loadError instanceof KpiConfigCoordinatorError &&
      loadError.stage === "load",
    "load errors include coordinator stage"
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
    invalid.errors.decimals === "Decimals must be an integer from 0 to 6",
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
    defaultSeriesMode.entities[0]?.chartMode === "line",
    "trend series chart mode defaults to line"
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
verifyLineChart();
verifyCircuitSorting();
verifyConfigNormalization();
verifyConfigValidation();
verifyKpiModel();
verifyKpiCardManager();
await verifyInMemoryRepository();
verifyKpiConfigMerger();
await verifyKpiConfigCoordinator();
verifyKpiRepositorySnapshot();
verifyKpiCardDraft();
verifyTrendConfig();
await verifyTrendConfigPersistence();
await verifyTrendData();
verifyTrendChartAndStatistics();

console.log("Core verification passed.");
