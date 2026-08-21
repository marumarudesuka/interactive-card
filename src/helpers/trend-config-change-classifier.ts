import type {
  EnergyTrendCardConfig,
  TrendEntityConfig,
  TrendSeries,
} from "../types/trend.ts";

function historyEntities(config:EnergyTrendCardConfig):string[] {
  return config.entities.map((entity) => JSON.stringify({
    entity:entity.entity,
    unit:entity.unit ?? "",
    category:entity.category ?? "",
    axis:entity.axis ?? "auto",
  })).sort();
}

export interface TrendConfigChangeClassification {
  reloadHistory:boolean;
  entitySetChanged:boolean;
}

export function classifyTrendConfigChange(
  previous:EnergyTrendCardConfig | undefined,
  next:EnergyTrendCardConfig
):TrendConfigChangeClassification {
  if (!previous) return { reloadHistory:true, entitySetChanged:true };
  const previousEntities = historyEntities(previous);
  const nextEntities = historyEntities(next);
  const entitySetChanged = previous.entities.map((item) => item.entity).sort().join("\0") !==
    next.entities.map((item) => item.entity).sort().join("\0");
  return {
    reloadHistory:previous.timeframe !== next.timeframe ||
      previous.category !== next.category ||
      previousEntities.join("\0") !== nextEntities.join("\0"),
    entitySetChanged,
  };
}

function entityKey(entity:Pick<TrendEntityConfig,"id"|"entity">):string {
  return entity.id || entity.entity;
}

export function applyTrendPresentationConfig(
  series:readonly TrendSeries[],
  config:EnergyTrendCardConfig
):TrendSeries[] {
  const byId = new Map(series.map((item) => [item.id,item]));
  const byEntity = new Map(series.map((item) => [item.entity,item]));
  return config.entities.flatMap((entity) => {
    const current = byId.get(entityKey(entity)) ?? byEntity.get(entity.entity);
    if (!current) return [];
    return [{
      ...current,
      id:entity.id ?? current.id,
      name:entity.name ?? current.name,
      color:entity.color,
      chartMode:entity.chartMode ?? current.chartMode,
      precision:entity.decimals ?? current.precision,
      visible:entity.visible ?? entity.enabled ?? true,
      lineStyle:entity.lineStyle ?? "solid",
      renderMode:entity.renderMode,
    }];
  });
}
