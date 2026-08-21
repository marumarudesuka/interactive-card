import {LitElement,css,html,nothing} from "lit";
import type {AutomationScenarioConfig} from "../../automation/automation-scenario.types.ts";
import {moveEditorItem} from "../../editors/automation/automation-editor-helpers.ts";
import "../common/app-dialog.ts";
import "../common/button.ts";

export interface ScenarioManagerChangeDetail {scenarios:AutomationScenarioConfig[]}

export class AutomationScenarioManager extends LitElement{
  static properties={open:{type:Boolean},scenarios:{attribute:false}};
  open=false;
  scenarios:AutomationScenarioConfig[]=[];
  static styles=css`
    :host{display:contents}.content{display:grid;min-width:0;padding:8px 20px 18px}.heading{padding:4px 2px 8px;color:var(--en-text-secondary,var(--secondary-text-color));font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.row{display:grid;min-height:46px;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.2))}.visibility,.move{display:grid;width:36px;height:36px;place-items:center;padding:0;border:0;border-radius:8px;background:transparent;color:var(--en-text-secondary,var(--secondary-text-color));cursor:pointer}.visibility[aria-pressed="true"]{color:var(--en-color-primary,var(--primary-color))}.visibility:hover,.move:hover{background:var(--ic-action-hover-background,rgba(127,127,127,.14))}.identity{display:grid;min-width:0;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:8px}.identity ha-icon{width:18px;height:18px;--mdc-icon-size:18px}.title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}.actions{display:flex}.actions button:disabled{opacity:.3;cursor:default}.footer{display:flex;justify-content:flex-start;padding-top:12px}@media(max-width:420px){.row{grid-template-columns:auto minmax(0,1fr) auto;gap:5px}.move{width:32px}}
  `;
  private emit(scenarios:AutomationScenarioConfig[]){this.dispatchEvent(new CustomEvent<ScenarioManagerChangeDetail>("scenario-manager-change",{detail:{scenarios},bubbles:true,composed:true}));}
  private close(){this.dispatchEvent(new CustomEvent("scenario-manager-close",{bubbles:true,composed:true}));}
  render(){return html`<ic-app-dialog .open=${this.open} title="Manage Scenarios" @dialog-close=${this.close}><div class="content"><div class="heading">Shown on Dashboard</div>${this.scenarios.length?this.scenarios.map((scenario,index)=>{const title=scenario.identity?.title??scenario.title??scenario.id??"Scenario";const visible=scenario.visible!==false;return html`<div class="row"><button class="visibility" type="button" aria-label=${`${visible?"Hide":"Show"} ${title}`} aria-pressed=${visible} @click=${()=>this.emit(this.scenarios.map(item=>item===scenario?{...item,visible:!visible}:item))}><ha-icon icon=${visible?"mdi:checkbox-marked":"mdi:checkbox-blank-outline"}></ha-icon></button><div class="identity">${scenario.identity?.icon||scenario.icon?html`<ha-icon .icon=${scenario.identity?.icon??scenario.icon}></ha-icon>`:nothing}<span class="title">${title}</span></div><div class="actions"><button class="move" type="button" aria-label=${`Move ${title} up`} ?disabled=${index===0} @click=${()=>this.emit(moveEditorItem(this.scenarios,index,-1))}><ha-icon icon="mdi:chevron-up"></ha-icon></button><button class="move" type="button" aria-label=${`Move ${title} down`} ?disabled=${index===this.scenarios.length-1} @click=${()=>this.emit(moveEditorItem(this.scenarios,index,1))}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div></div>`;}):html`<div class="heading">No scenarios configured.</div>`}<div class="footer"><ic-button variant="secondary" @click=${()=>this.dispatchEvent(new CustomEvent("scenario-manager-add",{bubbles:true,composed:true}))}>Add Scenario</ic-button></div></div></ic-app-dialog>`;}
}
if(!customElements.get("automation-scenario-manager"))customElements.define("automation-scenario-manager",AutomationScenarioManager);
