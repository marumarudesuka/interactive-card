import type { AutomationScenarioTemplate } from "./automation-template.types.ts";
import type { AutomationTemplateId } from "./automation-scenario.types.ts";
import { customAutomationTemplate } from "./templates/custom.ts";
import { evSmartChargingTemplate } from "./templates/ev-smart-charging.ts";
import { petCareTemplate } from "./templates/pet-care.ts";
import { solarWaterHeatingTemplate } from "./templates/solar-water-heating.ts";

export class AutomationTemplateRegistry {
  private readonly templates = new Map<string, AutomationScenarioTemplate>();

  constructor(templates: AutomationScenarioTemplate[] = []) {
    templates.forEach((template) => this.register(template));
  }

  register(template: AutomationScenarioTemplate): void {
    if (!template.id?.trim()) throw new Error("Automation template requires an id");
    this.templates.set(template.id, template);
  }

  has(id: AutomationTemplateId): boolean { return this.templates.has(id); }
  get(id: AutomationTemplateId): AutomationScenarioTemplate | undefined { return this.templates.get(id); }
  getOrCustom(id?: AutomationTemplateId): AutomationScenarioTemplate {
    return this.get(id ?? "custom") ?? this.get("custom") ?? customAutomationTemplate;
  }
  list(): AutomationScenarioTemplate[] { return [...this.templates.values()]; }
}

export const automationTemplateRegistry = new AutomationTemplateRegistry([
  customAutomationTemplate,
  petCareTemplate,
  solarWaterHeatingTemplate,
  evSmartChargingTemplate,
]);
