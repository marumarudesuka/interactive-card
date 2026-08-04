import type { HomeAssistant } from "custom-card-helpers";

import type { ParsedNumericState } from "../types/entity-state";
import { getEntity } from "./entity.ts";

function createInvalidState(
  entityId: string,
  status: ParsedNumericState["status"],
  name = entityId,
  unit = ""
): ParsedNumericState {
  return {
    entityId,
    status,
    value: null,
    unit,
    name,
  };
}

export function parseNumericEntityState(
  hass: HomeAssistant | undefined,
  entityId: string
): ParsedNumericState {
  if (!hass || !entityId) {
    return createInvalidState(entityId, "missing");
  }

  const entity = getEntity(hass, entityId);
  if (!entity) {
    return createInvalidState(entityId, "missing");
  }

  const name = entity.attributes.friendly_name ?? entityId;
  const unit = entity.attributes.unit_of_measurement ?? "";
  const state = entity.state.trim();

  if (state === "unknown") {
    return createInvalidState(entityId, "unknown", name, unit);
  }

  if (state === "unavailable") {
    return createInvalidState(entityId, "unavailable", name, unit);
  }

  if (state === "") {
    return createInvalidState(entityId, "invalid", name, unit);
  }

  const value = Number(state);
  if (!Number.isFinite(value)) {
    return createInvalidState(entityId, "invalid", name, unit);
  }

  return {
    entityId,
    status: "valid",
    value,
    unit,
    name,
  };
}
