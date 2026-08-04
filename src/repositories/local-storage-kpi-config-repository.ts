import type { CustomKpiConfig } from "../types/kpi";
import type { KpiConfigRepository } from "./kpi-config-repository";

interface KpiStorageEnvelope {
  version: 1;
  cards: CustomKpiConfig[];
}

const DEFAULT_STORAGE_KEY = "interactive-card:kpi-config:v1";

function cloneCards(
  cards: readonly CustomKpiConfig[]
): CustomKpiConfig[] {
  return cards.map((card) => ({
    ...card,
    history: Array.isArray(card.history) ? [...card.history] : undefined,
  }));
}

function isKpiConfig(value: unknown): value is CustomKpiConfig {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<CustomKpiConfig>;
  return Boolean(
    (typeof card.id === "string" && card.id.trim()) ||
    (typeof card.entity === "string" && card.entity.trim()) ||
    (typeof card.title === "string" && card.title.trim())
  );
}

export class LocalStorageKpiConfigRepository
  implements KpiConfigRepository {
  private readonly storageKey: string;

  constructor(storageKey = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  async load(): Promise<CustomKpiConfig[]> {
    const raw = globalThis.localStorage?.getItem(this.storageKey);
    if (!raw) return [];

    try {
      const envelope = JSON.parse(raw) as Partial<KpiStorageEnvelope>;
      if (envelope.version !== 1 || !Array.isArray(envelope.cards)) {
        return [];
      }
      return cloneCards(envelope.cards.filter(isKpiConfig));
    } catch {
      return [];
    }
  }

  async save(cards: readonly CustomKpiConfig[]): Promise<void> {
    const envelope: KpiStorageEnvelope = {
      version: 1,
      cards: cloneCards(cards),
    };
    globalThis.localStorage?.setItem(
      this.storageKey,
      JSON.stringify(envelope)
    );
  }
}
