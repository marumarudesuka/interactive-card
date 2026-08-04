import type { CircuitTemplate } from "../types/circuit";

/**
 * Device-independent defaults. Customer and Lovelace configurations provide
 * actual circuit entities; the library must not assume installation-specific IDs.
 */
export const defaultCircuitConfigs: readonly CircuitTemplate[] = [];
