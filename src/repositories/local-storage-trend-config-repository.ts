import type { EnergyTrendCardConfig } from "../types/trend";
import type { TrendConfigRepository } from "./trend-config-repository";

interface TrendStorageEnvelope {
  version: 1;
  cards: Record<string, EnergyTrendCardConfig>;
}

const DEFAULT_STORAGE_KEY = "interactive-card:trend-config:v1";

function cloneConfig(config: EnergyTrendCardConfig): EnergyTrendCardConfig {
  return {
    ...config,
    entities: config.entities.map((entity) => ({ ...entity })),
  };
}

function isTrendConfig(value: unknown): value is EnergyTrendCardConfig {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as Partial<EnergyTrendCardConfig>).entities)
  );
}

export class LocalStorageTrendConfigRepository
  implements TrendConfigRepository {
  private readonly storageKey: string;

  constructor(storageKey = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  async load(cardId: string): Promise<EnergyTrendCardConfig | undefined> {
    const raw = globalThis.localStorage?.getItem(this.storageKey);
    if (!raw) return undefined;

    try {
      const envelope = JSON.parse(raw) as Partial<TrendStorageEnvelope>;
      const config = envelope.version === 1 ? envelope.cards?.[cardId] : undefined;
      return isTrendConfig(config) ? cloneConfig(config) : undefined;
    } catch {
      return undefined;
    }
  }

  async save(cardId: string, config: EnergyTrendCardConfig): Promise<void> {
    let cards: Record<string, EnergyTrendCardConfig> = {};
    const raw = globalThis.localStorage?.getItem(this.storageKey);
    if (raw) {
      try {
        const envelope = JSON.parse(raw) as Partial<TrendStorageEnvelope>;
        if (envelope.version === 1 && envelope.cards) cards = envelope.cards;
      } catch {
        cards = {};
      }
    }

    const envelope: TrendStorageEnvelope = {
      version: 1,
      cards: { ...cards, [cardId]: cloneConfig(config) },
    };
    globalThis.localStorage?.setItem(this.storageKey, JSON.stringify(envelope));
  }
}
