import type { EnergyKpiSectionConfig } from "../config/config.types.ts";
import type { CustomKpiConfig } from "../types/kpi.ts";

interface PendingKpiEnvelope {
  version:1;
  scopes:Record<string, CustomKpiConfig[]>;
}

export const KPI_PENDING_STORAGE_KEY = "interactive-card:kpi-pending:v1";

export function getPendingKpiScope(config:EnergyKpiSectionConfig):string {
  const identity = String(config.id ?? "").trim() || config.title?.trim() || "energy-kpis";
  return identity.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function valid(value:unknown):value is CustomKpiConfig {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CustomKpiConfig>;
  return Boolean(item.id?.trim() || item.entity?.trim());
}

export class LocalStoragePendingKpiRepository {
  private readonly storageKey:string;

  constructor(storageKey = KPI_PENDING_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  private read():PendingKpiEnvelope {
    try {
      const raw = globalThis.localStorage?.getItem(this.storageKey);
      if (!raw) return { version:1, scopes:{} };
      const value = JSON.parse(raw) as Partial<PendingKpiEnvelope>;
      return value.version === 1 && value.scopes
        ? { version:1, scopes:value.scopes }
        : { version:1, scopes:{} };
    } catch {
      return { version:1, scopes:{} };
    }
  }

  async load(scope:string):Promise<CustomKpiConfig[]> {
    const items = this.read().scopes[scope];
    return Array.isArray(items)
      ? items.filter(valid).map((item, order) => ({
          ...item,
          id:item.id?.trim() || undefined,
          entity:item.entity?.trim() || undefined,
          order:Number.isFinite(item.order) ? item.order : order,
          enabled:item.enabled,
        }))
      : [];
  }

  async save(scope:string, items:readonly CustomKpiConfig[]):Promise<void> {
    const envelope = this.read();
    const scopes = { ...envelope.scopes };
    if (items.length) scopes[scope] = items.map((item) => ({ ...item }));
    else delete scopes[scope];
    globalThis.localStorage?.setItem(
      this.storageKey,
      JSON.stringify({ version:1, scopes } satisfies PendingKpiEnvelope)
    );
  }

  async add(scope:string, item:CustomKpiConfig):Promise<boolean> {
    const current = await this.load(scope);
    if (current.some((candidate) =>
      (candidate.id && item.id && candidate.id === item.id) ||
      (candidate.entity && item.entity && candidate.entity === item.entity)
    )) return false;
    await this.save(scope, [...current, { ...item }]);
    return true;
  }

  async upsert(scope:string, item:CustomKpiConfig):Promise<void> {
    const current = await this.load(scope);
    const index = current.findIndex((candidate) =>
      (item.id && candidate.id === item.id) ||
      (!item.id && item.entity && candidate.entity === item.entity)
    );
    if (index < 0) await this.save(scope, [...current, { ...item }]);
    else await this.save(scope, current.map((candidate, position) =>
      position === index ? { ...candidate, ...item, id:item.id ?? candidate.id } : candidate
    ));
  }

  async remove(scope:string, key:string):Promise<void> {
    const current = await this.load(scope);
    await this.save(scope, current.filter((item) =>
      item.id !== key && item.entity !== key
    ));
  }
}
