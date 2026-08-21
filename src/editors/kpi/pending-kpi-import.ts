import { getKpiCardKey } from "../../data/kpi-card-model.ts";
import type { CustomKpiConfig } from "../../types/kpi.ts";

export function getImportablePendingKpis(
  formal:readonly CustomKpiConfig[],
  pending:readonly CustomKpiConfig[]
):CustomKpiConfig[] {
  const keys = new Set(formal.map(getKpiCardKey).filter(Boolean));
  const entities = new Set(formal.map((item) => item.entity).filter(Boolean));
  return pending.filter((item) => {
    const key = getKpiCardKey(item);
    return Boolean(key && !keys.has(key) && (!item.entity || !entities.has(item.entity)));
  }).map((item) => ({ ...item }));
}

export function mergePendingKpis(
  formal:readonly CustomKpiConfig[],
  pending:readonly CustomKpiConfig[]
) {
  const importable = getImportablePendingKpis(formal, pending);
  return { items:[...formal.map((item) => ({ ...item })), ...importable], importedCount:importable.length };
}
