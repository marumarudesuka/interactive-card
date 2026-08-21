import type { HomeAssistant } from "custom-card-helpers";
import type { ScenarioActionConfig } from "./automation-scenario.types.ts";

export interface ResolvedAutomationActionCall {
  domain: string;
  service: string;
  targetEntity: string;
  data: Record<string, unknown>;
  confirmationRequired: boolean;
}

export type AutomationActionExecutionResult =
  | { status:"success"; call:ResolvedAutomationActionCall }
  | { status:"cancelled"; call:ResolvedAutomationActionCall }
  | { status:"error"; error:string; call?:ResolvedAutomationActionCall };

export interface AutomationActionExecutorOptions {
  confirm?: (action: ScenarioActionConfig) => boolean | Promise<boolean>;
}

export function resolveAutomationActionCall(
  action: ScenarioActionConfig
): ResolvedAutomationActionCall {
  const scriptEntity = action.script_entity?.trim();
  const serviceName = scriptEntity ? "script.turn_on" : action.service?.trim();
  const targetEntity = scriptEntity || action.target_entity?.trim();
  if (!action.id?.trim()) throw new Error("Automation action requires id");
  if (!serviceName || !/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(serviceName)) {
    throw new Error(`Automation action ${action.id} requires a valid domain.service`);
  }
  if (!targetEntity || !/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(targetEntity)) {
    throw new Error(`Automation action ${action.id} requires an explicit target entity`);
  }
  const [domain,service] = serviceName.split(".");
  return {
    domain,
    service,
    targetEntity,
    data:{ ...(action.data ?? {}), entity_id:targetEntity },
    confirmationRequired:action.confirmation === true,
  };
}

export async function executeAutomationAction(
  hass: HomeAssistant,
  action: ScenarioActionConfig,
  options: AutomationActionExecutorOptions = {}
): Promise<AutomationActionExecutionResult> {
  let call:ResolvedAutomationActionCall;
  try {
    call = resolveAutomationActionCall(action);
  } catch (error) {
    return { status:"error", error:error instanceof Error ? error.message : String(error) };
  }
  if (call.confirmationRequired) {
    if (!options.confirm) return { status:"error", error:"Confirmation is required", call };
    if (!await options.confirm(action)) return { status:"cancelled", call };
  }
  try {
    await hass.callService(call.domain,call.service,call.data);
    return { status:"success", call };
  } catch (error) {
    return { status:"error", error:error instanceof Error ? error.message : String(error), call };
  }
}

export class AutomationActionExecutor {
  private readonly pendingIds = new Set<string>();

  isPending(actionId: string): boolean { return this.pendingIds.has(actionId); }

  async execute(
    hass: HomeAssistant,
    action: ScenarioActionConfig,
    options: AutomationActionExecutorOptions = {}
  ): Promise<AutomationActionExecutionResult> {
    if (this.pendingIds.has(action.id)) {
      return { status:"error", error:`Automation action ${action.id} is already pending` };
    }
    this.pendingIds.add(action.id);
    try {
      return await executeAutomationAction(hass,action,options);
    } finally {
      this.pendingIds.delete(action.id);
    }
  }
}
