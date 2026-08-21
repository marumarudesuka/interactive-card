import type { EnergyTrendCardConfig, TrendEntityConfig } from "../types/trend.ts";

interface PendingTrendEnvelope {
  version:1;
  scopes:Record<string, TrendEntityConfig[]>;
}

export const TREND_PENDING_STORAGE_KEY = "interactive-card:trend-pending:v1";

export function getPendingTrendScope(config:EnergyTrendCardConfig):string {
  const identity = config.id?.trim() || config.title?.trim() || "energy-trend";
  return identity.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function valid(series:unknown):series is TrendEntityConfig {
  if (!series || typeof series !== "object") return false;
  const item = series as Partial<TrendEntityConfig>;
  return Boolean(item.entity?.trim());
}

export class LocalStoragePendingTrendSeriesRepository {
  private readonly storageKey:string;

  constructor(storageKey = TREND_PENDING_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  private read():PendingTrendEnvelope {
    try {
      const raw = globalThis.localStorage?.getItem(this.storageKey);
      if (!raw) return { version:1, scopes:{} };
      const value = JSON.parse(raw) as Partial<PendingTrendEnvelope>;
      return value.version === 1 && value.scopes
        ? { version:1, scopes:value.scopes }
        : { version:1, scopes:{} };
    } catch {
      return { version:1, scopes:{} };
    }
  }

  async load(scope:string):Promise<TrendEntityConfig[]> {
    const series = this.read().scopes[scope];
    return Array.isArray(series)
      ? series.filter(valid).map((item, order) => ({
          ...item,
          id:item.id?.trim() || undefined,
          entity:item.entity.trim(),
          name:item.name?.trim() || undefined,
          order:Number.isFinite(item.order) ? item.order : order,
        }))
      : [];
  }

  async save(scope:string, series:readonly TrendEntityConfig[]):Promise<void> {
    const envelope = this.read();
    const scopes = { ...envelope.scopes };
    if (series.length) scopes[scope] = series.map((item) => ({ ...item }));
    else delete scopes[scope];
    globalThis.localStorage?.setItem(
      this.storageKey,
      JSON.stringify({ version:1, scopes } satisfies PendingTrendEnvelope)
    );
  }

  async add(scope:string, series:TrendEntityConfig):Promise<boolean> {
    const current = await this.load(scope);
    if (current.some((item) =>
      (item.id && series.id && item.id === series.id) ||
      item.entity === series.entity
    )) return false;
    await this.save(scope, [...current, { ...series }]);
    return true;
  }

  async remove(scope:string, seriesId:string, entityId:string):Promise<void> {
    const current = await this.load(scope);
    await this.save(scope, current.filter((item) =>
      item.id !== seriesId && item.entity !== entityId
    ));
  }
}
