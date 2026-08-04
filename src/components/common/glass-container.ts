import { LitElement, html } from "lit";

import { glassStyle } from "../../styles/glass";

export class GlassContainer extends LitElement {
  static styles = glassStyle;

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

customElements.define("ic-glass-container", GlassContainer);
