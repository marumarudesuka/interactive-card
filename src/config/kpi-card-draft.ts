import type { CustomKpiConfig } from "../types/kpi";
import type {
  KpiCardBuildResult,
  KpiCardDraft,
  KpiCardDraftValidation,
  NormalizedKpiCardDraft,
} from "../types/kpi-card-builder";

const entityIdPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const customIdPattern = /^[a-z0-9][a-z0-9_-]*$/;

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeDecimals(value: number | string | undefined): number {
  if (value === undefined || value === "") return 2;
  if (typeof value === "number") return value;
  const normalized = value.trim();
  return normalized ? Number(normalized) : 2;
}

export function normalizeKpiCardDraft(
  draft: KpiCardDraft
): NormalizedKpiCardDraft {
  return {
    id: optionalText(draft.id),
    title: draft.title?.trim() ?? "",
    entity: draft.entity?.trim() ?? "",
    category: optionalText(draft.category),
    unit: optionalText(draft.unit),
    icon: optionalText(draft.icon),
    enabled: draft.enabled ?? true,
    autoScale: draft.autoScale ?? true,
    decimals: normalizeDecimals(draft.decimals),
    order: draft.order,
    subtitle: (draft.subtitle ?? draft.trend)?.trim() ?? "",
    trendMode: draft.trendMode ?? "none",
  };
}

export function validateKpiCardDraft(
  draft: NormalizedKpiCardDraft,
  existingIds: readonly string[] = []
): KpiCardDraftValidation {
  const errors: KpiCardDraftValidation["errors"] = {};

  if (!draft.title) {
    errors.title = "Title required";
  }

  if (!draft.entity) {
    errors.entity = "Entity required";
  } else if (!entityIdPattern.test(draft.entity)) {
    errors.entity = "Invalid entity ID";
  }

  if (draft.id) {
    if (!customIdPattern.test(draft.id)) {
      errors.id = "Invalid card ID";
    } else if (
      existingIds.some(
        (existingId) => existingId.toLowerCase() === draft.id?.toLowerCase()
      )
    ) {
      errors.id = "Card ID already exists";
    }
  }

  if (
    !Number.isInteger(draft.decimals) ||
    draft.decimals < 0 ||
    draft.decimals > 4
  ) {
    errors.decimals = "Decimals must be an integer from 0 to 4";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createCustomKpiId(
  draft: Pick<NormalizedKpiCardDraft, "title" | "entity">,
  existingIds: readonly string[] = []
): string {
  const entityName = draft.entity.split(".")[1] ?? "";
  const base = slugify(draft.title) || slugify(entityName) || "kpi";
  const root = `custom-${base}`;
  const usedIds = new Set(existingIds.map((id) => id.toLowerCase()));

  if (!usedIds.has(root)) return root;

  let suffix = 2;
  while (usedIds.has(`${root}-${suffix}`)) suffix++;
  return `${root}-${suffix}`;
}

export function buildCustomKpiConfig(
  input: KpiCardDraft,
  existingIds: readonly string[] = []
): KpiCardBuildResult {
  const draft = normalizeKpiCardDraft(input);
  const validation = validateKpiCardDraft(draft, existingIds);

  if (!validation.valid) {
    return {
      valid: false,
      draft,
      validation,
    };
  }

  const config: CustomKpiConfig = {
    type: "custom",
    id: draft.id ?? createCustomKpiId(draft, existingIds),
    name: draft.title,
    title: draft.title,
    entity: draft.entity,
    enabled: draft.enabled,
    autoScale: draft.autoScale,
    decimals: draft.decimals,
    order: draft.order,
    subtitle: draft.subtitle || "",
    trendMode: draft.trendMode ?? "none",
  };

  if (draft.category) config.category = draft.category;
  if (draft.unit) config.unit = draft.unit;
  if (draft.icon) config.icon = draft.icon;

  return {
    valid: true,
    draft,
    config,
    validation,
  };
}
