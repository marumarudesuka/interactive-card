
import { LitElement,css,html,nothing } from "lit";
import type { NormalizedAutomationScenario,ResolvedLinkedAutomationValue } from "../../automation/automation-scenario.types.ts";
import { buildAutomationScenarioCardModel } from "../../automation/automation-scenario-card-model.ts";
import { canonicalAutomationEntityId } from "../../automation/automation-entity-identity.ts";
import "../common/glass-container.ts";
import "../common/icon-badge.ts";
import "../common/status-pill.ts";
import "./scenario-progress-strip.ts";

export interface AutomationScenarioOpenDetail { scenarioId:string; }

export class AutomationScenarioCard extends LitElement {
  static properties={scenario:{attribute:false}};
  scenario?:NormalizedAutomationScenario;

  static styles=css`
    :host { display:grid; width:100%; min-width:0; box-sizing:border-box; align-self:stretch; color:var(--en-surface-text-primary,var(--en-text-primary,var(--primary-text-color))); container-type:inline-size; }
    ic-glass-container { display:grid; width:100%; min-width:0; box-sizing:border-box; align-self:stretch; --glass-container-height:auto; --glass-container-padding:0; --glass-container-content-display:grid; --ic-border-card:var(--en-border,1px solid var(--divider-color)); --ic-shadow-card:var(--en-shadow-card,0 8px 18px rgba(0,0,0,.16)); --ic-card-hover-transform:translateY(-1px); --ic-card-active-transform:translateY(-1px); }
    :host(:hover) ic-glass-container { --ic-border-card:1px solid color-mix(in srgb,var(--en-color-primary) 28%,transparent); --ic-shadow-card:inset 0 0 0 1px color-mix(in srgb,var(--en-color-primary) 18%,transparent),0 8px 18px rgba(0,0,0,.18); }
    button { display:grid; width:100%; min-width:0; box-sizing:border-box; align-self:stretch; grid-template-rows:auto auto minmax(0,1fr); grid-template-areas:"header" "current" "activity"; row-gap:var(--en-section-heading-margin-bottom,16px); padding:var(--en-card-content-inset,18px); border:0; outline:0; background:transparent; color:inherit; cursor:pointer; font:inherit; text-align:left; }
    button:focus-visible { outline:var(--ic-focus-ring); outline-offset:-3px; border-radius:var(--ic-radius-card); }
    .header { grid-area:header; display:grid; width:100%; min-width:0; grid-template-columns:auto minmax(0,1fr) auto; align-items:start; gap:14px; }
    ic-icon-badge { --icon-badge-size:42px; --icon-badge-icon-size:21px; }
    .identity { display:grid; min-width:0; grid-template-rows:auto minmax(22px,auto); gap:6px; }
    .title { overflow:hidden; color:var(--en-surface-text-primary,var(--en-heading-primary,var(--primary-text-color))); font-size:var(--en-title-md-size,18px); font-weight:var(--en-title-md-weight,600); line-height:var(--en-title-md-line-height,1.25); letter-spacing:var(--en-title-md-letter-spacing,-.1px); text-overflow:ellipsis; white-space:nowrap; }
    ic-status-pill { justify-self:end; margin-inline-end:8px; }
    .devices { display:flex; min-width:0; max-width:100%; min-height:22px; align-items:center; gap:6px; overflow:hidden; }
    .device-pill { min-width:0; max-width:120px; overflow:hidden; padding:3px 8px; border:1px solid color-mix(in srgb,var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))) 18%,transparent); border-radius:var(--en-control-radius,999px); background:color-mix(in srgb,var(--en-surface-text-primary,var(--primary-text-color)) 6%,transparent); color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:12px; font-weight:var(--en-helper-weight,400); line-height:1.3; text-overflow:ellipsis; white-space:nowrap; }
    .device-pill.more { flex:0 0 auto; }
    .section { display:grid; min-width:0; align-content:start; gap:8px; }
    .current { grid-area:current; display:grid; align-content:stretch; }
    .metric-stage { display:flex; min-width:0; align-items:center; }
    .automation-activity { grid-area:activity; display:grid; min-width:0; grid-template-rows:minmax(0,1fr) auto; align-content:stretch; gap:12px; padding-top:16px; border-top:1px solid color-mix(in srgb,var(--en-surface-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    .information-grid { display:grid; width:100%; min-width:0; grid-template-columns:repeat(var(--information-columns,3),minmax(0,1fr)); }
    .information-cell { position:relative; display:flex; width:100%; min-width:0; box-sizing:border-box; flex-direction:column; align-items:center; justify-content:flex-start; padding:0 14px; text-align:center; }
    .information-cell::before { content:""; position:absolute; top:3px; bottom:3px; left:0; width:1px; background:var(--en-surface-card-border,var(--divider-color)); opacity:.55; }
    .information-cell:first-child::before { display:none; }
    .metric-content { display:inline-grid; width:max-content; max-width:100%; min-width:0; grid-template-columns:auto minmax(0,1fr); align-items:start; justify-content:center; gap:9px; text-align:left; }
    .metric-content.no-icon { grid-template-columns:minmax(0,1fr); }
    .metric-icon { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; color:var(--metric-icon-color,var(--en-color-primary,#444D9E)); opacity:.78; }
    .metric-icon ha-icon { width:32px; height:32px; --mdc-icon-size:32px; color:inherit; fill:currentColor; }
    .metric-copy { display:grid; min-width:0; justify-items:start; }
    .current .value { justify-content:flex-start; font-weight:var(--metric-value-weight,var(--en-value-weight,700)); }
    .label { max-width:100%; overflow:hidden; color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); text-overflow:ellipsis; white-space:nowrap; }
    .value { display:inline-flex; max-width:100%; min-width:0; align-items:baseline; justify-content:center; gap:4px; margin-top:3px; overflow:hidden; color:var(--en-surface-text-primary,var(--en-text-primary,var(--primary-text-color))); font-size:var(--en-title-md-size,18px); font-weight:var(--en-data-weight,700); line-height:var(--en-title-md-line-height,1.25); letter-spacing:var(--en-title-md-letter-spacing,-.1px); white-space:nowrap; }
    .value-text { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .unit { flex:0 0 auto; color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:var(--en-helper-size,13px); font-weight:500; }
    .activity-blocks { display:grid; min-width:0; align-content:start; gap:8px; }
    .activity-block { display:grid; width:100%; min-width:0; box-sizing:border-box; gap:7px; padding:12px; border:var(--ic-border-control,var(--en-border,1px solid var(--divider-color))); border-radius:var(--ic-radius-control,var(--en-radius-control,12px)); background:var(--en-surface-control,rgba(127,127,127,.08)); }
    .automation-name { overflow:hidden; color:var(--en-surface-text-primary,var(--en-text-primary,var(--primary-text-color))); font-size:var(--en-body-size,14px); font-weight:600; line-height:var(--en-body-line-height,1.4); text-overflow:ellipsis; white-space:nowrap; }
    .group-state { display:grid; min-width:0; grid-template-columns:minmax(0,1fr) auto; align-items:baseline; gap:12px; }
    .group-state-label { overflow:hidden; color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); text-overflow:ellipsis; white-space:nowrap; }
    .group-state-value { overflow:hidden; color:var(--en-surface-text-primary,var(--en-text-primary,var(--primary-text-color))); font-size:var(--en-body-size,14px); font-weight:500; text-overflow:ellipsis; white-space:nowrap; }
    .activity-reason { display:-webkit-box; overflow:hidden; color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-body-line-height,1.4); -webkit-box-orient:vertical; -webkit-line-clamp:2; }
    .activity-progress,.activity-detail { min-width:0; }
    .decision-values { display:grid; gap:5px; }
    .decision-row { display:grid; min-width:0; grid-template-columns:minmax(0,1fr) auto; align-items:baseline; gap:12px; }
    .decision-label,.activity-label { color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); }
    .decision-value { color:var(--en-surface-text-primary,var(--en-text-primary,var(--primary-text-color))); font-size:var(--en-body-size,14px); font-weight:500; font-variant-numeric:tabular-nums; }
    .comparison { margin-top:6px; padding-top:6px; border-top:1px solid color-mix(in srgb,var(--en-surface-text-secondary,var(--secondary-text-color)) 18%,transparent); color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-body-line-height,1.4); }
    .activity-row { display:grid; min-width:0; grid-template-columns:18px 92px minmax(0,1fr); align-items:start; gap:6px; }
    .activity-icon { width:18px; height:18px; color:var(--en-color-primary); opacity:.8; transform:translate(4px,-4px); }
    .activity-icon.last { color:var(--en-color-success); }
    .activity-icon ha-icon { --mdc-icon-size:16px; }
    .activity-content { display:-webkit-box; min-width:0; overflow:hidden; color:var(--en-surface-text-primary,var(--en-text-primary,var(--primary-text-color))); font-size:var(--en-body-size,14px); font-weight:500; line-height:var(--en-body-line-height,1.4); -webkit-box-orient:vertical; -webkit-line-clamp:2; }
    .activity-secondary { grid-column:3; color:var(--en-surface-text-secondary,var(--en-text-secondary,var(--secondary-text-color))); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); }
    .activity-footer { display:grid; min-width:0; gap:8px; padding-top:2px; }
    @container (max-width:520px) { .information-cell { padding-inline:9px; } .device-pill { max-width:92px; } }
    @container (max-width:400px) { button { padding:var(--en-card-content-inset,18px); } .header { grid-template-columns:auto minmax(0,1fr); } ic-status-pill { grid-column:2; justify-self:start; margin-inline-end:0; } button { grid-template-rows:auto auto minmax(0,1fr); } .current { grid-template-rows:auto auto; } .metric-stage { display:block; } .information-grid { grid-template-columns:1fr; gap:8px; } .information-cell { padding:0; } .information-cell::before { display:none; } .information-cell + .information-cell { padding-top:8px; } .decision-row,.group-state { grid-template-columns:1fr; gap:2px; } .activity-row { grid-template-columns:18px minmax(0,1fr); } .activity-content,.activity-secondary { grid-column:2; } }
  `;

  private open(){if(this.scenario)this.dispatchEvent(new CustomEvent<AutomationScenarioOpenDetail>("automation-scenario-open",{detail:{scenarioId:this.scenario.id},bubbles:true,composed:true}));}

  render(){
    const scenario=this.scenario;if(!scenario)return nothing;
    const model=buildAutomationScenarioCardModel(scenario),canonical=(entity:string|undefined)=>canonicalAutomationEntityId(entity);
    const entries=scenario.automationGroups.flatMap(group=>group.automations.map(automation=>({key:`${group.id}/${automation.id}`,group,automation,refs:new Set([automation.entityId,automation.device?.entityId,automation.current?.entityId,automation.next?.entityId,automation.last?.entityId,...automation.parameters.map(parameter=>parameter.entityId),...automation.quickActions.flatMap(action=>[action.target_entity,action.script_entity])].map(canonical).filter((entity):entity is string=>Boolean(entity)))})));
    const attributedAutomation=(entities:readonly (string|undefined)[])=>{const ids=new Set(entities.map(canonical).filter((entity):entity is string=>Boolean(entity)));const matches=entries.filter(entry=>[...entry.refs].some(entity=>ids.has(entity)));return matches.length===1?matches[0]!.key:undefined;};
    const progressKey=scenario.progress?attributedAutomation(scenario.progress.sourceEntityIds):undefined,contextKey=scenario.decisionContext?attributedAutomation(scenario.decisionContext.sourceEntityIds):undefined,reasonKey=model.activity.reason?attributedAutomation([scenario.explanation.bindings.reason.entityId]):undefined;
    const richerPresentationIds=new Set([...(scenario.progress?.sourceEntityIds??[]),...(scenario.decisionContext?.sourceEntityIds??[]),scenario.explanation.bindings.reason.entityId].map(canonical).filter((entity):entity is string=>Boolean(entity)));
    const same=(left:string|undefined,right:string|undefined)=>left?.trim().toLocaleLowerCase()===right?.trim().toLocaleLowerCase();
    const metricHas=(item:ResolvedLinkedAutomationValue)=>model.metrics.some(metric=>same(metric.label,item.label)&&same(`${metric.value}${metric.unit?` ${metric.unit}`:""}`,`${item.value}${item.unit?` ${item.unit}`:""}`));
    const renderContext=()=>{const context=scenario.decisionContext;if(!context)return nothing;const comparison=context.difference!==undefined&&context.differenceValue?`${context.differenceValue.replace(/^[+-]/,"")} ${context.difference>=0?"above":"below"} ${context.thresholdLabel.toLowerCase()}`:undefined;return html`<div class="activity-detail">${context.message&&!same(context.message,model.activity.reason)?html`<div class="activity-reason">${context.message}</div>`:nothing}<scenario-progress-strip .decisionContext=${context}></scenario-progress-strip>${comparison?html`<div class="comparison">${comparison}</div>`:nothing}</div>`;};
    const renderBlock=(entry:typeof entries[number])=>{const seen=new Set<string>();const states=[entry.automation.current,entry.automation.next,entry.automation.last].filter((item):item is ResolvedLinkedAutomationValue=>Boolean(item)).filter(item=>{const id=canonical(item.entityId);if(!id||seen.has(id)||richerPresentationIds.has(id)||metricHas(item))return false;seen.add(id);return true;});const showContext=contextKey===entry.key,showProgress=!showContext&&progressKey===entry.key;return html`<div class="activity-block"><div class="automation-name">${entry.automation.name}</div>${states.map(item=>html`<div class="group-state"><span class="group-state-label">${item.label}</span><span class="group-state-value">${item.value}${item.unit?` ${item.unit}`:""}</span></div>`)}${reasonKey===entry.key?html`<div class="activity-reason">${model.activity.reason}</div>`:nothing}${showContext?renderContext():nothing}${showProgress?html`<div class="activity-progress"><scenario-progress-strip .progress=${scenario.progress}></scenario-progress-strip></div>`:nothing}</div>`;};
    const nextMain=scenario.nextDecision?[scenario.nextDecision.time,scenario.nextDecision.label].filter(Boolean).join(" · "):model.activity.nextAction;
    return html`<ic-glass-container><button type="button" @click=${this.open} aria-label=${`Open ${scenario.identity.title}`}><header class="header"><ic-icon-badge .icon=${scenario.identity.icon}></ic-icon-badge><div class="identity"><div class="title">${scenario.identity.title}</div><div class="devices" aria-hidden=${model.devices.length||model.hiddenDeviceCount?"false":"true"}>${model.devices.map(device=>html`<span class="device-pill" title=${device.name}>${device.name}</span>`)}${model.hiddenDeviceCount?html`<span class="device-pill more">+${model.hiddenDeviceCount}</span>`:nothing}</div></div><ic-status-pill .tone=${model.active?"active":"inactive"} .label=${model.active?"Active":"Inactive"}></ic-status-pill></header>
      <section class="section current">${model.metrics.length?html`<div class="metric-stage"><div class="information-grid" style=${`--information-columns:${model.metrics.length}`}>${model.metrics.map(metric=>html`<div class="information-cell"><div class="metric-content ${metric.icon?"":"no-icon"}">${metric.icon?html`<span class="metric-icon" style=${metric.iconColor?`--metric-icon-color:${metric.iconColor}`:""}><ha-icon .icon=${metric.icon}></ha-icon></span>`:nothing}<div class="metric-copy"><div class="label">${metric.label}</div><div class="value"><span class="value-text">${metric.value}</span>${metric.unit?html`<span class="unit">${metric.unit}</span>`:nothing}</div></div></div></div>`)}</div></div>`:nothing}</section>
      <section class="automation-activity"><div class="activity-blocks">${entries.map(renderBlock)}</div>${model.activity.lastAction||nextMain?html`<div class="activity-footer">${model.activity.lastAction?html`<div class="activity-row"><span class="activity-icon last"><ha-icon icon="mdi:check-circle-outline"></ha-icon></span><span class="activity-label">Last Action</span><span class="activity-content">${model.activity.lastAction}</span></div>`:nothing}${nextMain?html`<div class="activity-row"><span class="activity-icon"><ha-icon icon="mdi:arrow-right"></ha-icon></span><span class="activity-label">Next Decision</span><span class="activity-content">${nextMain}</span>${scenario.nextDecision?.condition?html`<span class="activity-secondary">${scenario.nextDecision.condition}</span>`:nothing}</div>`:nothing}</div>`:nothing}</section></button></ic-glass-container>`;
  }}

if(!customElements.get("automation-scenario-card"))customElements.define("automation-scenario-card",AutomationScenarioCard);
