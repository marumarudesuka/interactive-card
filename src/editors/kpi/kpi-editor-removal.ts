import { getKpiCardKey } from "../../data/kpi-card-model.ts";
import type { EffectiveKpiOrigin } from "../../helpers/kpi-effective-card-resolver.ts";
import type { CustomKpiConfig } from "../../types/kpi.ts";

export interface SelectedKpiContext {
  key:string;
  origin:EffectiveKpiOrigin;
  discoveryFilled:boolean;
  isBuiltInTemplate:boolean;
  originalConfig:CustomKpiConfig;
}

export function applyFormalKpiRemoval(
  cards:readonly CustomKpiConfig[],
  context:SelectedKpiContext
):CustomKpiConfig[] {
  if (context.isBuiltInTemplate) {
    const id = context.originalConfig.id ?? context.key;
    const suppression:CustomKpiConfig = { id,enabled:false };
    const index = cards.findIndex((item) => getKpiCardKey(item) === context.key);
    return index < 0
      ? [...cards.map((item) => ({ ...item })),suppression]
      : cards.map((item,itemIndex) => itemIndex === index ? suppression : { ...item });
  }
  if (context.origin === "formal") {
    return cards
      .filter((item) => getKpiCardKey(item) !== context.key)
      .map((item) => ({ ...item }));
  }
  return cards.map((item) => ({ ...item }));
}
