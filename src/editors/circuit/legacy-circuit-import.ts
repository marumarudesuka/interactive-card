import type { CircuitConfigInput } from "../../types/circuit.ts";

function normalizedKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function getImportableLegacyCircuits(
  current: readonly CircuitConfigInput[],
  legacy: readonly CircuitConfigInput[]
): CircuitConfigInput[] {
  const ids = new Set(current.map((circuit) => normalizedKey(circuit.id)));
  const entities = new Set(
    current.map((circuit) => normalizedKey(circuit.entity))
  );

  return legacy
    .map((circuit, sourceIndex) => ({ circuit, sourceIndex }))
    .filter(({ circuit }) => Boolean(
      normalizedKey(circuit.id) &&
      normalizedKey(circuit.entity) &&
      circuit.name?.trim()
    ))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.circuit.order)
        ? left.circuit.order as number
        : left.sourceIndex;
      const rightOrder = Number.isFinite(right.circuit.order)
        ? right.circuit.order as number
        : right.sourceIndex;
      return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex;
    })
    .flatMap(({ circuit }) => {
      const id = normalizedKey(circuit.id);
      const entity = normalizedKey(circuit.entity);
      if (ids.has(id) || entities.has(entity)) return [];
      ids.add(id);
      entities.add(entity);
      return [{
        id:circuit.id.trim(),
        entity:circuit.entity.trim(),
        name:circuit.name.trim(),
        icon:typeof circuit.icon === "string" && circuit.icon.trim()
          ? circuit.icon.trim()
          : undefined,
        category:typeof circuit.category === "string" && circuit.category.trim()
          ? circuit.category.trim()
          : undefined,
        enabled:circuit.enabled !== false,
        order:circuit.order,
      }];
    });
}

export function mergeLegacyCircuits(
  current: readonly CircuitConfigInput[],
  legacy: readonly CircuitConfigInput[]
): { circuits:CircuitConfigInput[]; importedCount:number } {
  const importable = getImportableLegacyCircuits(current, legacy);
  return {
    circuits:[
      ...current.map((circuit, order) => ({ ...circuit, order })),
      ...importable.map((circuit, index) => ({
        ...circuit,
        order:current.length + index,
      })),
    ],
    importedCount:importable.length,
  };
}
