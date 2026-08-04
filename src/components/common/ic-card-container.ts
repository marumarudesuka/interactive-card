import { LitElement, css, html } from "lit";

import { glassStyle } from "../../styles/glass";

/**
 * Shared visual shell for Energy dashboard cards.
 * Business components provide content and size overrides only.
 */
export class EnergyCardContainer extends LitElement {
  static styles = [
    glassStyle,
    css`
      :host {
        display: block;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        --glass-container-height: var(--energy-card-height, 170px);
        --glass-container-padding: var(--energy-card-padding, 24px);
      }
    `,
  ];

  render() {
    return html`
      <div class="card">
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define("ic-card-container", EnergyCardContainer);
