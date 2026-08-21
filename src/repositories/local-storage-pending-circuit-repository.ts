import type { CircuitConfig, EnergyCircuitSectionConfig } from "../types/circuit.ts";

interface PendingCircuitEnvelope {
  version:1;
  scopes:Record<string, CircuitConfig[]>;
}

export const CIRCUIT_PENDING_STORAGE_KEY = "interactive-card:circuit-pending:v1";

function clone(circuits:readonly CircuitConfig[]):CircuitConfig[] {
  return circuits.map((circuit) => ({ ...circuit }));
}

function isCircuit(value:unknown):value is CircuitConfig {
  if (!value || typeof value !== "object") return false;
  const circuit = value as Partial<CircuitConfig>;
  return Boolean(
    circuit.id?.trim() && circuit.entity?.trim() && circuit.name?.trim()
  );
}

function legacyTitleScope(config:EnergyCircuitSectionConfig):string {
  const title = config.title?.trim().toLowerCase() || "active-circuits";
  return title.replace(/[^a-z0-9_-]+/g, "-");
}

function hashScope(value:string):string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function getLegacyPendingCircuitScope(config:EnergyCircuitSectionConfig):string {
  return legacyTitleScope(config);
}

export function getPendingCircuitScope(config:EnergyCircuitSectionConfig):string {
  const explicitId = config.id?.trim();
  if (explicitId) return `card-${hashScope(explicitId)}`;

  const anchor = config.circuits?.find((circuit) =>
    Boolean(circuit?.id?.trim() || circuit?.entity?.trim())
  );
  if (anchor) {
    return `card-${hashScope(`${config.type ?? "energy-circuit-section"}|${anchor.id ?? ""}|${anchor.entity ?? ""}`)}`;
  }

  // Empty legacy cards have no persistent identity available from HA. Keep a
  // namespaced title fallback so existing pending data stays reachable. Once a
  // card has an explicit id or formal Circuit, title is no longer its identity.
  return `legacy-title-${legacyTitleScope(config)}`;
}

function mergePending(
  current:readonly CircuitConfig[], legacy:readonly CircuitConfig[]
):CircuitConfig[] {
  const merged = clone(current);
  const ids = new Set(merged.map((circuit) => circuit.id));
  const entities = new Set(merged.map((circuit) => circuit.entity));
  for (const circuit of legacy) {
    if (ids.has(circuit.id) || entities.has(circuit.entity)) continue;
    merged.push({ ...circuit });
    ids.add(circuit.id);
    entities.add(circuit.entity);
  }
  return merged;
}

export class LocalStoragePendingCircuitRepository {
  private readonly storageKey:string;

  constructor(storageKey = CIRCUIT_PENDING_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  private read():PendingCircuitEnvelope {
    try {
      const raw = globalThis.localStorage?.getItem(this.storageKey);
      if (!raw) return { version:1, scopes:{} };
      const parsed = JSON.parse(raw) as Partial<PendingCircuitEnvelope>;
      return parsed.version === 1 && parsed.scopes
        ? { version:1, scopes:parsed.scopes }
        : { version:1, scopes:{} };
    } catch {
      return { version:1, scopes:{} };
    }
  }

  async load(scope:string):Promise<CircuitConfig[]> {
    const circuits = this.read().scopes[scope];
    return Array.isArray(circuits)
      ? circuits.filter(isCircuit).map((circuit, order) => ({
          ...circuit,
          id:circuit.id.trim(),
          entity:circuit.entity.trim(),
          name:circuit.name.trim(),
          enabled:circuit.enabled !== false,
          order:Number.isFinite(circuit.order) ? circuit.order : order,
        }))
      : [];
  }

  async save(scope:string, circuits:readonly CircuitConfig[]):Promise<void> {
    const envelope = this.read();
    const scopes = { ...envelope.scopes };
    if (circuits.length) scopes[scope] = clone(circuits);
    else delete scopes[scope];
    globalThis.localStorage?.setItem(
      this.storageKey,
      JSON.stringify({ version:1, scopes } satisfies PendingCircuitEnvelope)
    );
  }

  async add(scope:string, circuit:CircuitConfig):Promise<boolean> {
    const current = await this.load(scope);
    if (current.some((item) =>
      item.id === circuit.id || item.entity === circuit.entity
    )) return false;
    await this.save(scope, [...current, { ...circuit }]);
    return true;
  }

  async remove(scope:string, circuitId:string):Promise<void> {
    const current = await this.load(scope);
    await this.save(scope, current.filter((circuit) => circuit.id !== circuitId));
  }
}

export async function loadPendingCircuitsForConfig(
  repository:LocalStoragePendingCircuitRepository,
  config:EnergyCircuitSectionConfig
):Promise<{ scope:string; circuits:CircuitConfig[] }> {
  const scope = getPendingCircuitScope(config);
  const current = await repository.load(scope);
  const oldTitleScope = getLegacyPendingCircuitScope(config);
  if (scope === oldTitleScope) return { scope, circuits:current };

  const legacy = await repository.load(oldTitleScope);
  const circuits = mergePending(current, legacy);
  if (circuits.length !== current.length) {
    await repository.save(scope, circuits);
  }
  return { scope, circuits };
}
