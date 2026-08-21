import type { CircuitConfig } from "../types/circuit";

export class CircuitConfigCoordinator {
  // Retain an ignored optional argument for source compatibility with older
  // callers. Runtime formal mutation is deliberately not supported here.
  constructor(_legacyRepository?: unknown) {}

  async resolve(
    defaults: readonly CircuitConfig[]
  ): Promise<CircuitConfig[]> {
    // Lovelace/YAML is the only persistent source of truth. Legacy repository
    // snapshots may contain stale circuits and must never participate in
    // runtime config resolution.
    return defaults.map((circuit) => ({ ...circuit }));
  }
}
