import type { HomeAssistant } from "custom-card-helpers";

export type MatchRule = {
  device_class?: string;
  state_class?: string;
  units?: string[];
  keywords?: string[];
};

export type DiscoveryTemplate = {
  id?: string;
  title?: string;
  match?: MatchRule;
};

export type DiscoveryCandidate = {
  entityId: string;
  score: number;
  attributes: any;
  state: any;
};

function normalizeUnitCategory(unit?: string): string | undefined {
  if (!unit || typeof unit !== "string") return undefined;
  const normalized = unit.trim().toLowerCase();
  if (["kwh", "wh", "mwh", "j", "kj", "mj"].includes(normalized)) return "energy";
  if (["w", "kw", "mw"].includes(normalized)) return "power";
  if (["c", "₹", "$", "€", "£"].includes(normalized)) return "currency";
  return normalized;
}

function tokenize(text?: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[\-_\.\s]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function scoreEntity(entityId: string, attributes: any, template: DiscoveryTemplate): number {
  let score = 0;
  const deviceClass = (attributes?.device_class || "")?.toString().toLowerCase();
  const stateClass = (attributes?.state_class || "")?.toString().toLowerCase();
  const unit = normalizeUnitCategory(attributes?.unit_of_measurement || attributes?.unit);
  const title = template.title?.toLowerCase() ?? "";
  const keywords = (template.match?.keywords || []).map((k) => k.toLowerCase());
  const templateUnits = (template.match?.units || []).map(normalizeUnitCategory).filter(Boolean);

  if (deviceClass && template.match?.device_class && deviceClass === template.match.device_class.toLowerCase()) {
    score += 30;
  }
  if (stateClass && template.match?.state_class && stateClass === template.match.state_class.toLowerCase()) {
    score += 25;
  }
  if (unit && templateUnits.length) {
    if (templateUnits.includes(unit)) {
      score += 22;
    } else if (templateUnits.some((u) => u && unit === u)) {
      score += 18;
    }
  }

  const entityTokens = tokenize(entityId);
  const nameTokens = tokenize(attributes?.friendly_name || attributes?.friendlyName || "");

  for (const keyword of keywords) {
    if (entityId.toLowerCase().includes(keyword)) score += 10;
    if (entityTokens.includes(keyword)) score += 8;
    if (nameTokens.includes(keyword)) score += 6;
    if (title.includes(keyword)) score += 5;
  }

  if (entityId.toLowerCase().includes("ecomain") || (attributes?.friendly_name || "").toLowerCase().includes("ecomain")) {
    score += 5;
  }

  if (!entityId.startsWith("sensor.")) {
    score -= 50;
  }

  return Math.max(score, 0);
}

export function discoverForTemplate(
  hass: HomeAssistant,
  template: DiscoveryTemplate,
  topN = 5
): DiscoveryCandidate[] {
  const states = hass?.states ?? {};
  const candidates: DiscoveryCandidate[] = [];

  for (const entityId of Object.keys(states)) {
    if (!entityId.startsWith("sensor.")) continue;
    const stateEntry = states[entityId];
    const candidate: DiscoveryCandidate = {
      entityId,
      score: scoreEntity(entityId, stateEntry.attributes, template),
      attributes: stateEntry.attributes,
      state: stateEntry.state,
    };
    candidates.push(candidate);
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.entityId.localeCompare(b.entityId))
    .slice(0, topN);
}

export function discoverForTemplates(
  hass: HomeAssistant,
  templates: DiscoveryTemplate[],
  topN = 5
): Record<string, DiscoveryCandidate[]> {
  const results: Record<string, DiscoveryCandidate[]> = {};
  for (const template of templates) {
    const key = template.id ?? template.title ?? "unknown";
    results[key] = discoverForTemplate(hass, template, topN);
  }
  return results;
}
