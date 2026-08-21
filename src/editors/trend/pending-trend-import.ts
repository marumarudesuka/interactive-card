import type { TrendEntityConfig } from "../../types/trend.ts";

export function getImportablePendingSeries(
  formal:readonly TrendEntityConfig[],
  pending:readonly TrendEntityConfig[]
):TrendEntityConfig[] {
  const ids = new Set(formal.map((item) => item.id).filter(Boolean));
  const entities = new Set(formal.map((item) => item.entity));
  return pending.flatMap((item) => {
    if (!item.entity?.trim()) return [];
    if ((item.id && ids.has(item.id)) || entities.has(item.entity)) return [];
    if (item.id) ids.add(item.id);
    entities.add(item.entity);
    return [{ ...item }];
  });
}

export function mergePendingSeries(
  formal:readonly TrendEntityConfig[],
  pending:readonly TrendEntityConfig[]
):{ series:TrendEntityConfig[]; importedCount:number } {
  const importable = getImportablePendingSeries(formal, pending);
  return {
    series:[
      ...formal.map((item, order) => ({ ...item, order })),
      ...importable.map((item, index) => ({
        ...item,
        order:formal.length + index,
      })),
    ],
    importedCount:importable.length,
  };
}
