import type { HomeAssistant } from "custom-card-helpers";
import type { ResolvedScenarioSetting } from "./automation-scenario.types.ts";

export class AutomationSettingOverrideError extends Error {
  readonly stage:"validation"|"value"|"activation"|"clear";
  readonly cause?:unknown;
  constructor(stage:"validation"|"value"|"activation"|"clear",message:string,cause?:unknown) {
    super(message);
    this.name="AutomationSettingOverrideError";
    this.stage=stage;
    this.cause=cause;
  }
}

async function updateSettingEntity(
  hass:HomeAssistant,
  entity_id:string,
  control:ResolvedScenarioSetting["control"],
  value:string|number|boolean
):Promise<void> {
  const domain=entity_id.split(".",1)[0];
  switch (control) {
    case "toggle":
      await hass.callService(domain,value ? "turn_on" : "turn_off",{entity_id}); return;
    case "select":
      await hass.callService(domain,"select_option",{entity_id,option:String(value)}); return;
    case "number":
      await hass.callService(domain,"set_value",{entity_id,value:Number(value)}); return;
    case "time":
    case "datetime":
      await hass.callService("input_datetime","set_datetime",{
        entity_id,...(String(value).includes("T") ? {datetime:String(value)} : {time:String(value)}),
      }); return;
    case "unsupported": throw new Error(`Unsupported setting entity: ${entity_id}`);
  }
}

export async function updateAutomationSetting(
  hass: HomeAssistant,
  setting: ResolvedScenarioSetting,
  value: string | number | boolean
): Promise<void> {
  await updateSettingEntity(hass,setting.entityId,setting.control,value);
}

function requireOverride(setting:ResolvedScenarioSetting) {
  if (setting.changeMode !== "next_run" || !setting.override?.valueEntityId || !setting.override.activeEntityId) {
    throw new AutomationSettingOverrideError("validation",`${setting.label} does not have complete next-run override bindings`);
  }
  return setting.override;
}

export async function clearAutomationSettingOverride(hass:HomeAssistant,setting:ResolvedScenarioSetting):Promise<void> {
  const override=requireOverride(setting);
  try { await hass.callService("homeassistant","turn_off",{entity_id:override.activeEntityId}); }
  catch(error) { throw new AutomationSettingOverrideError("clear",`Unable to clear the one-time override for ${setting.label}`,error); }
}

export async function setOneTimeAutomationSettingOverride(
  hass:HomeAssistant,setting:ResolvedScenarioSetting,value:string|number|boolean
):Promise<void> {
  const override=requireOverride(setting);
  try { await updateSettingEntity(hass,override.valueEntityId,setting.control,value); }
  catch(error) { throw new AutomationSettingOverrideError("value",`Unable to save the one-time value for ${setting.label}`,error); }
  try { await hass.callService("homeassistant","turn_on",{entity_id:override.activeEntityId}); }
  catch(error) {
    let rollbackError:unknown;
    try { await hass.callService("homeassistant","turn_off",{entity_id:override.activeEntityId}); }
    catch(rollback) { rollbackError=rollback; }
    throw new AutomationSettingOverrideError("activation",rollbackError
      ? `The one-time value was saved, activation failed, and the inactive safety state could not be confirmed for ${setting.label}`
      : `The one-time value was saved but was not activated for ${setting.label}`,error);
  }
}

export async function updateAutomationSettingPermanently(
  hass:HomeAssistant,setting:ResolvedScenarioSetting,value:string|number|boolean
):Promise<void> {
  await updateAutomationSetting(hass,setting,value);
  if (setting.override?.active) await clearAutomationSettingOverride(hass,setting);
}

export class AutomationSettingChangeExecutor {
  private readonly pendingSettingIds = new Set<string>();

  isPending(settingId:string):boolean {
    return this.pendingSettingIds.has(settingId);
  }

  async setOnce(
    hass:HomeAssistant,setting:ResolvedScenarioSetting,value:string|number|boolean
  ):Promise<void> {
    await this.run(setting,() => setOneTimeAutomationSettingOverride(hass,setting,value));
  }

  async setPermanently(
    hass:HomeAssistant,setting:ResolvedScenarioSetting,value:string|number|boolean
  ):Promise<void> {
    await this.run(setting,() => updateAutomationSettingPermanently(hass,setting,value));
  }

  private async run(setting:ResolvedScenarioSetting,operation:()=>Promise<void>):Promise<void> {
    if (this.pendingSettingIds.has(setting.id)) {
      throw new AutomationSettingOverrideError("validation",`${setting.label} already has a change in progress`);
    }
    this.pendingSettingIds.add(setting.id);
    try { await operation(); }
    finally { this.pendingSettingIds.delete(setting.id); }
  }
}
