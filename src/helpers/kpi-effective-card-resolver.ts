import { mergeKpiConfigSources } from "../config/kpi-config-merger.ts";
import { getKpiCardKey } from "../data/kpi-card-model.ts";
import type { CustomKpiConfig, KpiTemplate } from "../types/kpi.ts";
import type { KpiConfigSources, ResolvedKpiConfig } from "../types/kpi-config-resolution.ts";

export type EffectiveKpiOrigin = "formal" | "pending" | "template";

export interface EffectiveKpiCard {
  identity:string;
  config:CustomKpiConfig;
  origin:EffectiveKpiOrigin;
  discoveryFilled:boolean;
  resolved?:ResolvedKpiConfig;
}

export interface EffectiveKpiCardSources {
  templates:readonly KpiTemplate[];
  formalCards:readonly CustomKpiConfig[];
  pendingCards?:readonly CustomKpiConfig[];
  discovery?:KpiConfigSources["discovery"];
}

export function getEligiblePendingKpiCards(
  formalCards:readonly CustomKpiConfig[],
  pendingCards:readonly CustomKpiConfig[]
):CustomKpiConfig[] {
  const formalKeys = new Set(formalCards.map(getKpiCardKey).filter(Boolean));
  const formalEntities = new Set(formalCards.map((item) => item.entity).filter(Boolean));
  return pendingCards.filter((item) => {
    const key = getKpiCardKey(item);
    return !formalKeys.has(key) && (!item.entity || !formalEntities.has(item.entity));
  }).map((item) => ({ ...item }));
}

/**
 * One pure composition path for both the runtime section and Native Editor.
 * Derived template/discovery values remain metadata-rich view data; callers
 * decide whether an explicit user action should copy them into an editor draft.
 */
export function resolveEffectiveKpiCards(
  sources:EffectiveKpiCardSources
):EffectiveKpiCard[] {
  const resolved = mergeKpiConfigSources({
    templates:sources.templates,
    yamlCards:sources.formalCards,
    discovery:sources.discovery,
  });
  const pending = getEligiblePendingKpiCards(
    sources.formalCards,
    sources.pendingCards ?? []
  );
  const pendingByKey = new Map(pending.map((item) => [getKpiCardKey(item),item]));
  const cards:EffectiveKpiCard[] = resolved.map((item) => {
    const pendingItem = pendingByKey.get(getKpiCardKey(item.config));
    const config = pendingItem ? { ...item.config, ...pendingItem } : item.config;
    const discoveryEntity = item.metadata.templateId
      ? sources.discovery?.[item.metadata.templateId]?.[0]?.entityId
      : undefined;
    return {
      identity:item.identity,
      config,
      origin:item.metadata.origin === "yaml"
        ? "formal"
        : pendingItem ? "pending" : "template",
      discoveryFilled:Boolean(
        discoveryEntity && config.entity === discoveryEntity &&
        !sources.formalCards.some((formal) =>
          getKpiCardKey(formal) === getKpiCardKey(config) && Boolean(formal.entity)
        )
      ),
      resolved:item,
    };
  });
  const resolvedKeys = new Set(cards.map((item) => getKpiCardKey(item.config)));
  for (const item of pending) {
    const key = getKpiCardKey(item);
    if (resolvedKeys.has(key)) continue;
    cards.push({
      identity:key ? `pending:${key}` : `pending:${cards.length}`,
      config:{ ...item },
      origin:"pending",
      discoveryFilled:false,
    });
    resolvedKeys.add(key);
  }
  return cards;
}

export function getVisibleEffectiveKpiCards(
  sources:EffectiveKpiCardSources
):EffectiveKpiCard[] {
  return resolveEffectiveKpiCards(sources).filter((item) => item.config.enabled === true);
}
