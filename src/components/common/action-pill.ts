import { LitElement, css, html } from "lit";

/**
 * Compact primary action using the same geometry as dashboard pill controls.
 * Business components provide only the icon and label.
 */
export class IcActionPill extends LitElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
  };

  disabled = false;

  static styles = css`
    :host {
      display: inline-block;
      width: auto;
      min-width: 0;
    }

    :host([full-width]) {
      display: block;
      width: 100%;
    }

    button {
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      width: 100%;
      height: var(--ic-pill-height, var(--en-control-height, 40px));
      box-sizing: border-box;
      align-items: center;
      column-gap: 8px;
      padding: 0 var(--ic-pill-padding-inline, 16px);
      border: 0;
      border-radius: var(--en-radius-round, 999px);
      background: var(--en-color-primary);
      color: #fff;
      cursor: pointer;
      font-family: inherit;
      font-size: var(--ic-pill-font-size, 14px);
      font-weight: 600;
      line-height: 1;
      text-align: left;
      transition:
        filter var(--en-motion-fast, 180ms)
          var(--en-easing-standard, ease),
        transform var(--en-motion-fast, 180ms)
          var(--en-easing-standard, ease);
    }

    button:hover {
      background: var(--en-color-primary-active);
      filter: brightness(1.04);
    }

    button:active {
      transform: scale(.98);
    }

    button:disabled {
      cursor: default;
      opacity: .5;
    }

    .icon {
      display: flex;
      width: 16px;
      height: 16px;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 14px;
    }

    .label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  render() {
    return html`
      <button type="button" ?disabled=${this.disabled}>
        <span class="icon"><slot name="icon"></slot></span>
        <span class="label"><slot></slot></span>
      </button>
    `;
  }
}

customElements.define("ic-action-pill", IcActionPill);
