import { LitElement,css,html,nothing } from "lit";
import type { NormalizedAutomationScenario } from "../../automation/automation-scenario.types.ts";

type ResolvedProgress=NonNullable<NormalizedAutomationScenario["progress"]>;
type ResolvedDecisionContext=NonNullable<NormalizedAutomationScenario["decisionContext"]>;

export class ScenarioProgressStrip extends LitElement {
  static properties={progress:{attribute:false},decisionContext:{attribute:false}};
  progress?:ResolvedProgress;
  decisionContext?:ResolvedDecisionContext;

  static styles=css`
    :host { display:block; min-width:0; container-type:inline-size; }
    .strip { display:grid; width:100%; min-width:0; gap:8px; }
    .head { display:grid; min-width:0; grid-template-columns:minmax(0,1fr) minmax(0,1fr); align-items:end; gap:16px; }
    .reading { display:grid; min-width:0; gap:3px; }
    .reading.reference { justify-items:end; text-align:right; }
    .label { min-width:0; overflow:hidden; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); text-overflow:ellipsis; white-space:nowrap; }
    .value { overflow:hidden; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:600; line-height:var(--en-body-line-height,1.4); text-overflow:ellipsis; white-space:nowrap; }
    .track { position:relative; width:100%; height:40px; overflow:hidden; border-radius:12px; background:transparent; }
    .track::before { content:""; position:absolute; inset:0; border-radius:inherit; background:var(--en-color-accent,#FBB03B); opacity:.18; }
    .fill { position:absolute; inset:0 auto 0 0; min-width:0; border-radius:12px; background:var(--en-color-accent,#FBB03B); }
    .marker.reference { position:absolute; top:9px; bottom:9px; z-index:2; width:4px; border-radius:2px; background:var(--en-control-active-foreground,#fff); box-shadow:0 0 0 1px rgba(0,0,0,.06); transform:translateX(-50%); }
    .range { display:flex; justify-content:space-between; gap:12px; margin-top:-4px; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); opacity:var(--en-helper-opacity,.7); }
    .footer { display:flex; min-width:0; justify-content:space-between; gap:12px; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); }
    .footer span:last-child { margin-left:auto; text-align:right; }
    .disabled .track { opacity:.55; }
    .disabled .fill { display:none; }
    @container (max-width:360px) { .head { grid-template-columns:1fr; gap:6px; } .reading.reference { justify-items:start; text-align:left; } .footer { align-items:flex-start; flex-direction:column; gap:3px; } .footer span:last-child { margin-left:0; text-align:left; } }
  `;

  render(){
    const decision=this.decisionContext;
    const progress=this.progress??(decision?{
      label:decision.observedLabel,mode:"threshold" as const,currentLabel:"Current",currentValue:decision.observedValue,
      targetLabel:decision.thresholdLabel,targetValue:decision.thresholdValue,remainingLabel:"Difference",
      remainingValue:decision.differenceValue?.replace(/^[+-]/,"")??"--",currentPosition:decision.currentPosition,
      markerPosition:decision.markerPosition,rangeKnown:false,currentAvailable:decision.available,targetAvailable:decision.available,
      available:decision.available,sourceEntityIds:decision.sourceEntityIds,
    }:undefined);
    if(!progress)return nothing;
    const markerStyle=progress.markerPosition===undefined?"":`left:${progress.markerPosition*100}%`;
    const currentValue=progress.currentAvailable?progress.currentValue:progress.currentValue.replace(/^--(?:\s.*)?$/,"Unavailable");
    const showRemaining=progress.mode==="target"&&progress.available&&!progress.remainingValue.trim().startsWith("-");
    const thresholdRelation=progress.mode==="threshold"&&!decision&&progress.available&&progress.targetAvailable&&progress.currentPosition!==undefined&&progress.markerPosition!==undefined
      ? `${progress.remainingValue.replace(/^[+-]/,"")} ${progress.currentPosition>=progress.markerPosition?"above":"below"} ${progress.targetLabel.toLowerCase()}`
      : undefined;
    return html`<div class="strip ${progress.mode} ${progress.currentAvailable?"":"disabled"}">
      <div class="head"><div class="reading current"><span class="label">${progress.label}</span><span class="value">${currentValue}</span></div>${progress.targetAvailable?html`<div class="reading reference"><span class="label">${progress.targetLabel}</span><span class="value">${progress.targetValue}</span></div>`:nothing}</div>
      <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${progress.currentPosition===undefined?nothing:Math.round(progress.currentPosition*100)}>
        ${progress.currentPosition!==undefined?html`<span class="fill" style=${`width:${progress.currentPosition*100}%`}></span>`:nothing}
        ${progress.markerPosition!==undefined?html`<span class="marker reference" style=${markerStyle}></span>`:nothing}
      </div>
      ${progress.rangeKnown?html`<div class="range"><span>${progress.rangeMinValue}</span><span>${progress.rangeMaxValue}</span></div>`:nothing}
      ${showRemaining||thresholdRelation||progress.estimated?html`<div class="footer"><span>${showRemaining?`${progress.remainingLabel} ${progress.remainingValue}`:thresholdRelation??nothing}</span><span>${progress.estimated?`Estimated ready ${progress.estimated}`:nothing}</span></div>`:nothing}
    </div>`;
  }
}

if(!customElements.get("scenario-progress-strip"))customElements.define("scenario-progress-strip",ScenarioProgressStrip);
