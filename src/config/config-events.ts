import type {
  BaseCardConfig,
  ConfigChangedDetail,
} from "./config.types";

export function createConfigChangedEvent<TConfig extends BaseCardConfig>(
  config: TConfig
): CustomEvent<ConfigChangedDetail<TConfig>> {
  return new CustomEvent("config-changed", {
    detail: { config },
    bubbles: true,
    composed: true,
  });
}

export function dispatchConfigChanged<TConfig extends BaseCardConfig>(
  target: EventTarget,
  config: TConfig
): boolean {
  return target.dispatchEvent(createConfigChangedEvent(config));
}
