import type { HomeAssistant } from "custom-card-helpers";

/**
 * 获取 Entity
 */
export function getEntity(
  hass: HomeAssistant,
  entityId: string
) {
  return hass.states[entityId];
}

/**
 * 获取 state（字符串）
 */
export function getState(
  hass: HomeAssistant,
  entityId: string
): string {

  const entity = getEntity(hass, entityId);

  if (!entity) {
    return "";
  }

  return entity.state;
}

/**
 * 获取数字
 */
export function getNumber(
  hass: HomeAssistant,
  entityId: string
): number {

  const value = Number(
    getState(hass, entityId)
  );

  if (isNaN(value)) {
    return 0;
  }

  return value;
}

/**
 * 获取 Attribute
 */
export function getAttribute<T = any>(
  hass: HomeAssistant,
  entityId: string,
  attribute: string
): T | undefined {

  const entity = getEntity(hass, entityId);

  if (!entity) {
    return undefined;
  }

  return entity.attributes[
    attribute
  ] as T;
}

/**
 * 获取 Friendly Name
 */
export function getFriendlyName(
  hass: HomeAssistant,
  entityId: string
): string {

  const entity = getEntity(hass, entityId);

  if (!entity) {
    return entityId;
  }

  return (
    entity.attributes.friendly_name ??
    entityId
  );
}