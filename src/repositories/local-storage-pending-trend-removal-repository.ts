import type { TrendEntityConfig } from "../types/trend.ts";
import { getPendingTrendScope } from "./local-storage-pending-trend-series-repository.ts";

export interface PendingTrendRemoval {
  id?:string;
  entity:string;
}

interface Envelope { version:1; scopes:Record<string, PendingTrendRemoval[]>; }
export const TREND_PENDING_REMOVALS_STORAGE_KEY = "interactive-card:trend-pending-removals:v1";
export { getPendingTrendScope };

export function matchesPendingTrendRemoval(
  series:Pick<TrendEntityConfig,"id"|"entity">,
  removal:PendingTrendRemoval
):boolean {
  return Boolean((series.id && removal.id && series.id === removal.id) || series.entity === removal.entity);
}

export class LocalStoragePendingTrendRemovalRepository {
  private readonly storageKey:string;
  constructor(storageKey:string = TREND_PENDING_REMOVALS_STORAGE_KEY) {
    this.storageKey = storageKey;
  }
  private read():Envelope {
    try {
      const value = JSON.parse(globalThis.localStorage?.getItem(this.storageKey) ?? "") as Partial<Envelope>;
      return value.version === 1 && value.scopes ? { version:1, scopes:value.scopes } : { version:1, scopes:{} };
    } catch { return { version:1, scopes:{} }; }
  }
  async load(scope:string):Promise<PendingTrendRemoval[]> {
    const items = this.read().scopes[scope];
    return Array.isArray(items) ? items.flatMap((item) =>
      item?.entity?.trim() ? [{ id:item.id?.trim() || undefined, entity:item.entity.trim() }] : []
    ) : [];
  }
  async save(scope:string, items:readonly PendingTrendRemoval[]):Promise<void> {
    const envelope = this.read();
    const scopes = { ...envelope.scopes };
    if (items.length) scopes[scope] = items.map((item) => ({ ...item }));
    else delete scopes[scope];
    globalThis.localStorage?.setItem(this.storageKey, JSON.stringify({ version:1, scopes } satisfies Envelope));
  }
  async add(scope:string, series:Pick<TrendEntityConfig,"id"|"entity">):Promise<void> {
    const current = await this.load(scope);
    if (current.some((item) => matchesPendingTrendRemoval(series, item))) return;
    await this.save(scope, [...current, { id:series.id, entity:series.entity }]);
  }
}
