import type { ResolvedLinkedAutomation } from "./automation-scenario.types.ts";

/**
 * Home Assistant does not expose a stable public Automation-editor launcher to
 * custom cards. Until one is available, this deliberately falls back to the
 * entity's native more-info dialog instead of guessing a URL or DOM path.
 */
export function openAutomationEditorOrMoreInfo(
  host: EventTarget,
  automation: ResolvedLinkedAutomation
): "more-info" {
  host.dispatchEvent(new CustomEvent("hass-more-info", {
    detail:{ entityId:automation.entityId },
    bubbles:true,
    composed:true,
  }));
  return "more-info";
}
