import type {
  DiscoveredMetric,
  DiscoveryEvidence,
  DiscoveryStateLike,
  MetricType,
  SuggestedMetricRole,
} from "./discovery.types";

interface MetricClassification {
  metricType: MetricType;
  normalizedUnit: string;
  suggestedRole: SuggestedMetricRole;
  confidence: number;
  evidence: DiscoveryEvidence[];
}

const DEVICE_CLASS_TYPES: Readonly<Record<string, MetricType>> = {
  power: "power",
  apparent_power: "power",
  reactive_power: "power",
  energy: "energy",
  monetary: "cost",
  voltage: "voltage",
  current: "current",
  frequency: "frequency",
  power_factor: "power_factor",
};

const METRIC_KEYWORDS: ReadonlyArray<readonly [MetricType, readonly string[]]> = [
  ["power_factor", ["power factor", "power_factor", "cos phi", "cosphi"]],
  ["frequency", ["frequency", "freq", "hertz"]],
  ["voltage", ["voltage", "volt"]],
  ["current", ["current", "ampere", "amps"]],
  ["cost", ["cost", "price", "tariff", "monetary"]],
  ["energy", ["energy", "consumption", "usage", "kwh", "watt hour"]],
  ["power", ["power", "watt", "load", "demand"]],
  ["percentage", ["percentage", "percent", "ratio"]],
];

function normalizedText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeMetricUnit(unit: unknown): string {
  const raw = String(unit ?? "").trim();
  const compact = raw.replace(/\s+/g, "").toLowerCase();
  const units: Readonly<Record<string, string>> = {
    w: "W", kw: "kW", mw: "MW",
    wh: "Wh", kwh: "kWh", mwh: "MWh",
    v: "V", mv: "mV", kv: "kV",
    a: "A", ma: "mA", ka: "kA",
    hz: "Hz", khz: "kHz", "%": "%",
  };
  return units[compact] ?? raw;
}

function metricTypeFromUnit(unit: string): MetricType | undefined {
  if (["W", "kW", "MW"].includes(unit)) return "power";
  if (["Wh", "kWh", "MWh"].includes(unit)) return "energy";
  if (["V", "mV", "kV"].includes(unit)) return "voltage";
  if (["A", "mA", "kA"].includes(unit)) return "current";
  if (["Hz", "kHz"].includes(unit)) return "frequency";
  if (unit === "%") return "percentage";
  if (["\u20ac", "$", "\u00a3", "\u00a5", "\u20b9"].includes(unit)) return "cost";
  if (["€", "$", "£", "¥", "₹"].includes(unit)) return "cost";
  return undefined;
}

function metricTypeFromText(text: string): MetricType | undefined {
  const searchable = normalizedText(text).replace(/[._-]+/g, " ");
  return METRIC_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => searchable.includes(keyword))
  )?.[0];
}

function resolveSuggestedRole(
  metricType: MetricType,
  entityId: string,
  name: string,
  stateClass: string
): SuggestedMetricRole {
  const text = `${entityId} ${name}`.toLowerCase().replace(/[._-]+/g, " ");
  if (metricType === "power_factor") return "power_factor";
  if (metricType === "voltage") return "voltage";
  if (metricType === "current") return "current";
  if (metricType === "frequency") return "frequency";
  if (metricType === "percentage") return "percentage";
  if (metricType === "cost") return "energy_cost";
  if (metricType === "power" && text.includes("solar")) return "solar_power";
  if (metricType === "power" && /\b(main|total|whole home|grid)\b/.test(text)) return "main_power";
  if (metricType === "power") return "circuit_power";
  if (metricType === "energy" && /\b(today|daily|day)\b/.test(text)) return "daily_energy";
  if (metricType === "energy" && (
    stateClass === "total" || stateClass === "total_increasing" ||
    /\b(total|lifetime|overall)\b/.test(text)
  )) return "total_energy";
  return "unknown";
}

export function classifyMetric(
  entityId: string,
  state: DiscoveryStateLike
): MetricClassification {
  const attributes = state.attributes ?? {};
  const deviceClass = normalizedText(attributes.device_class);
  const stateClass = normalizedText(attributes.state_class);
  const rawUnit = String(attributes.unit_of_measurement ?? attributes.unit ?? "").trim();
  const normalizedUnit = normalizeMetricUnit(rawUnit);
  const name = String(attributes.friendly_name ?? entityId);
  const metadataType = normalizedText(attributes.metric_type) as MetricType;
  const evidence: DiscoveryEvidence[] = [];
  let metricType: MetricType | undefined;
  let confidence = 0;

  // Classification priority: device class, unit, state class, optional entity
  // metadata, entity id, friendly name, then fallback.
  if (DEVICE_CLASS_TYPES[deviceClass]) {
    metricType = DEVICE_CLASS_TYPES[deviceClass];
    confidence = 0.92;
    evidence.push({ source: "device_class", value: deviceClass, weight: 0.92 });
  }

  const unitType = metricTypeFromUnit(normalizedUnit);
  if (!metricType && unitType) {
    metricType = unitType;
    confidence = 0.84;
    evidence.push({ source: "unit_of_measurement", value: rawUnit, weight: 0.84 });
  } else if (metricType && unitType) {
    evidence.push({ source: "unit_of_measurement", value: rawUnit, weight: 0.08 });
    confidence = unitType === metricType
      ? Math.min(0.98, confidence + 0.06)
      : Math.max(0.55, confidence - 0.2);
  }

  if (stateClass) {
    evidence.push({ source: "state_class", value: stateClass, weight: 0.04 });
    if (metricType === "energy" && ["total", "total_increasing"].includes(stateClass)) {
      confidence = Math.min(0.99, confidence + 0.04);
    }
  }

  if (!metricType && DEVICE_CLASS_TYPES[metadataType]) {
    metricType = DEVICE_CLASS_TYPES[metadataType];
    confidence = 0.72;
    evidence.push({ source: "entity_metadata", value: metadataType, weight: 0.72 });
  }

  const entityNameType = metricTypeFromText(entityId);
  if (!metricType && entityNameType) {
    metricType = entityNameType;
    confidence = 0.52;
    evidence.push({ source: "entity_id", value: entityId, weight: 0.52 });
  }

  const friendlyNameType = metricTypeFromText(name);
  if (!metricType && friendlyNameType) {
    metricType = friendlyNameType;
    confidence = 0.42;
    evidence.push({ source: "friendly_name", value: name, weight: 0.42 });
  }

  if (!metricType) {
    metricType = "other";
    confidence = 0.1;
    evidence.push({ source: "fallback", value: "other", weight: 0.1 });
  }

  return {
    metricType,
    normalizedUnit,
    suggestedRole: resolveSuggestedRole(metricType, entityId, name, stateClass),
    confidence,
    evidence,
  };
}

export function createDiscoveredMetric(
  entityId: string,
  state: DiscoveryStateLike
): DiscoveredMetric {
  const attributes = state.attributes ?? {};
  const classification = classifyMetric(entityId, state);
  const rawState = String(state.state ?? "").trim();
  const unavailable = rawState === "unknown" || rawState === "unavailable" || rawState === "";
  return {
    entityId,
    name: String(attributes.friendly_name ?? entityId),
    metricType: classification.metricType,
    unit: String(attributes.unit_of_measurement ?? attributes.unit ?? "").trim(),
    normalizedUnit: classification.normalizedUnit,
    deviceClass: normalizedText(attributes.device_class) || undefined,
    stateClass: normalizedText(attributes.state_class) || undefined,
    suggestedRole: classification.suggestedRole,
    confidence: classification.confidence,
    available: !unavailable,
    numeric: !unavailable && Number.isFinite(Number(rawState)),
    evidence: classification.evidence,
  };
}
