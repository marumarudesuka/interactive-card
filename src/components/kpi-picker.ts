import { LitElement, html, css } from "lit";


import "./kpi-item";
import "./common/scroll-area";
import "./common/menu-item";
import "./common/action-menu";



export class KpiPicker extends LitElement {
  static properties = {
    items: { type: Array },
    customItems: { type: Array },
    selectedItems: { type: Array },
    hass: { type: Object }
  };

  items:any[] = [];
  customItems:any[] = [];
  selectedItems:string[] = [];
  hass:any;
  private _toggleKpiLocal(item:any){
    this.dispatchEvent(new CustomEvent('toggle-kpi',{detail:item,bubbles:true,composed:true}));
  }

  private _createCustomKpi(){
    this.dispatchEvent(new CustomEvent('create-custom-kpi',{bubbles:true,composed:true}));
  }

  private _editCustomKpi(item:any){
    this.dispatchEvent(new CustomEvent('edit-custom-kpi',{detail:item,bubbles:true,composed:true}));
  }

  private _toggleCustomKpi(item:any){
    this.dispatchEvent(new CustomEvent('toggle-custom-kpi',{detail:item,bubbles:true,composed:true}));
  }

  private _toggleItem(item:any){
    if(item?.type === "custom" || item?.id?.startsWith("custom-")){
      this._toggleCustomKpi(item);
      return;
    }
    this._toggleKpiLocal(item);
  }








  static styles = css`
    :host{
      display:block;
      width:100%;
      max-height:min(
        520px,
        calc(100vh - 120px),
        var(--popover-max-height,520px)
      );
      min-width:0;
      overflow:hidden;
    }

    .panel{
      width:100%;
      max-height:inherit;
    }

    .section-title{
      font-size:11px;
      text-transform: uppercase;
      color:var(--en-text-secondary,var(--secondary-text-color));
      letter-spacing:0.08em;
      margin:10px 8px 6px;
    }

    .empty{
      font-size:14px;
      color: var(--secondary-text-color);
      margin: 6px 0 0;
    }

    kpi-item{
      display:block;
      margin:0;
    }

    .empty{
      display:grid;
      gap:4px;
      margin:4px 8px 8px;
      padding:10px 0;
    }

    button{
      padding:8px 10px;
      border:1px solid var(--en-border,var(--divider-color));
      border-radius:var(--en-control-radius,999px);
      background:transparent;
      color:var(--en-text-primary,var(--primary-text-color));
      cursor:pointer;
    }

    .more{
      display:grid;
      width:28px;
      height:28px;
      padding:0;
      place-items:center;
      border:0;
    }

    .more ha-icon{
      width:16px;
      height:16px;
      --mdc-icon-size:16px;
    }
  `;












  render(){
    const activeIds = this.selectedItems || [];
    const isActive = (item:any) =>
      item.id ? activeIds.includes(item.id) : activeIds.includes(item.entity);
    const activeItems = [
      ...this.items.filter(isActive),
    ];
    const inactiveItems = [
      ...this.items.filter((item:any) => !isActive(item)),
    ];

    return html`
      <ic-action-menu class="panel">
        <div class="section-title">Displayed Cards</div>
        ${activeItems.length ? activeItems.map((item:any) => html`
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;" @click=${()=>this._toggleItem(item)}>
              <kpi-item
                .item=${item}
                .selected=${true}
              ></kpi-item>
            </div>
          </div>
        `) : html`<div class="empty">No active cards yet.</div>`}

        <div class="section-title">Available Cards</div>
        ${inactiveItems.length ? inactiveItems.map((item:any) => html`
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;" @click=${()=>this._toggleItem(item)}>
              <kpi-item
                .item=${item}
                .selected=${false}
              ></kpi-item>
            </div>
          </div>
        `) : html`<div class="empty">All cards are enabled.</div>`}

        <div class="section-title">Custom cards</div>
        ${this.customItems.length ? this.customItems.map((item:any) => html`
          <kpi-item
            .item=${{
              ...item,
              title:item.title ?? item.name ?? "Custom KPI",
            }}
            .selected=${Boolean(item.enabled)}
            leadingIcon="mdi:check"
            @click=${()=>this._toggleCustomKpi(item)}
          >
            <button
              slot="action"
              class="more"
              type="button"
              aria-label=${`Edit ${item.title ?? item.name ?? "custom KPI"}`}
              @click=${(event:Event)=>{
                event.stopPropagation();
                this._editCustomKpi(item);
              }}
            >
              <ha-icon icon="mdi:dots-horizontal"></ha-icon>
            </button>
          </kpi-item>
        `) : html`
          <div class="empty">
            <span>No custom cards yet</span>
          </div>
        `}

        <ic-menu-item
          tone="primary"
          indicator="plus"
          @click=${this._createCustomKpi}
        >Create Custom KPI</ic-menu-item>

      </ic-action-menu>
    `;
  }


}




customElements.define(

  "kpi-picker",

  KpiPicker

);
