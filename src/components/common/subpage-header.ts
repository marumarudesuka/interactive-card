import { LitElement, css, html } from "lit";

/** Shared dialog subpage header used by settings flows. */
export class IcSubpageHeader extends LitElement {
  static properties = { title:{ type:String } };

  title = "";

  static styles = css`
    :host {
      display:flex;
      flex:1 1 auto;
      min-width:0;
      align-items:center;
      gap:8px;
    }
    button {
      display:grid;
      width:var(--subpage-back-size,40px);
      height:var(--subpage-back-size,40px);
      flex:0 0 var(--subpage-back-size,40px);
      place-items:center;
      padding:0;
      border:0;
      border-radius:var(--en-control-radius,999px);
      outline:0;
      background:transparent;
      color:inherit;
      cursor:pointer;
    }
    button:hover {
      background:var(--ic-action-hover-background,rgba(127,127,127,.14));
    }
    button:focus-visible {
      outline:var(--ic-focus-ring,2px solid var(--en-color-focus));
      outline-offset:2px;
    }
    ha-icon {
      width:var(--subpage-back-icon-size,18px);
      height:var(--subpage-back-icon-size,18px);
      --mdc-icon-size:var(--subpage-back-icon-size,18px);
      transform:translateY(var(--en-chevron-offset-y,-3px));
    }
    span {
      min-width:0;
      overflow:hidden;
      font-size:var(--subpage-title-size,inherit);
      font-weight:var(--subpage-title-weight,inherit);
      line-height:var(--subpage-title-line-height,inherit);
      letter-spacing:var(--subpage-title-letter-spacing,inherit);
      text-overflow:ellipsis;
      white-space:nowrap;
    }
  `;

  render() {
    return html`
      <button type="button" aria-label="Back"
        @click=${() => this.dispatchEvent(new CustomEvent("subpage-back", {
          bubbles:true,
          composed:true,
        }))}>
        <ha-icon icon="mdi:chevron-left"></ha-icon>
      </button>
      <span>${this.title}</span>
    `;
  }
}

customElements.define("ic-subpage-header", IcSubpageHeader);
