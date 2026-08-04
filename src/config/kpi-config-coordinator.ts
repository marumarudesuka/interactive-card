import type { KpiConfigRepository } from "../repositories/kpi-config-repository";
import type { CustomKpiConfig, KpiTemplate } from "../types/kpi";
import type {
  KpiConfigSources,
  ResolvedKpiConfig,
} from "../types/kpi-config-resolution";
import { mergeKpiConfigSources } from "./kpi-config-merger.ts";

export interface ResolveKpiConfigInput {
  yamlCards?: KpiConfigSources["yamlCards"];
  discovery?: KpiConfigSources["discovery"];
}

export type KpiConfigCoordinatorStage = "load" | "save";

export class KpiConfigCoordinatorError extends Error {
  readonly stage: KpiConfigCoordinatorStage;

  constructor(
    stage: KpiConfigCoordinatorStage,
    message: string,
    cause: unknown
  ) {
    super(message, { cause });
    this.name = "KpiConfigCoordinatorError";
    this.stage = stage;
  }
}

function cloneConfigValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
}

function toPersistableConfig(
  card: CustomKpiConfig
): CustomKpiConfig {
  const persistable: CustomKpiConfig = {};
  const derivedKeys = new Set([
    "identity",
    "metadata",
    "validation",
    "discovery",
  ]);

  for (const [key, value] of Object.entries(card)) {
    if (!derivedKeys.has(key)) {
      persistable[key] = cloneConfigValue(value);
    }
  }

  return persistable;
}

export class KpiConfigCoordinator {
  private readonly repository: KpiConfigRepository;
  private readonly templates: readonly KpiTemplate[];
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(
    repository: KpiConfigRepository,
    templates: readonly KpiTemplate[]
  ) {
    this.repository = repository;
    this.templates = templates;
  }

  async resolve(
    input: ResolveKpiConfigInput = {}
  ): Promise<ResolvedKpiConfig[]> {
    await this.saveQueue;

    let repositoryCards: CustomKpiConfig[];
    try {
      repositoryCards = await this.repository.load();
    } catch (error) {
      throw new KpiConfigCoordinatorError(
        "load",
        "Unable to load KPI configuration",
        error
      );
    }

    return mergeKpiConfigSources({
      templates: this.templates,
      repositoryCards,
      yamlCards: input.yamlCards,
      discovery: input.discovery,
    });
  }

  saveUserCards(
    cards: readonly CustomKpiConfig[]
  ): Promise<void> {
    const snapshot = cards.map(toPersistableConfig);
    const operation = this.saveQueue.then(async () => {
      try {
        await this.repository.save(snapshot);
      } catch (error) {
        throw new KpiConfigCoordinatorError(
          "save",
          "Unable to save KPI configuration",
          error
        );
      }
    });

    this.saveQueue = operation.catch(() => undefined);
    return operation;
  }
}
