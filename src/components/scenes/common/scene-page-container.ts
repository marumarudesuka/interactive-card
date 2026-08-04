import { LitElement, css, html } from "lit";

import "../../common/action-button";
import "../../common/section-header";
import "../../common/overlay/popover/ic-popover";

export class ScenePageContainer extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
  };

  title = "";
  subtitle = "";
  private menuOpen = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      color: var(--primary-text-color);
      container-type: inline-size;
    }

    .page {
      display: grid;
      width: 100%;
      min-width: 0;
      gap: var(--scene-section-gap, 22px);
    }

    ::slotted(*) {
      min-width: 0;
    }
  `;

  private requestSettings() {
    this.menuOpen = false;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent("scene-settings-request", {
      detail: { title: this.title },
      bubbles: true,
      composed: true,
    }));
  }

  private toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.requestUpdate();
  }

  render() {
    return html`
      <ic-section-header .title=${this.title} .subtitle=${this.subtitle} level="page">
        <ic-popover
          slot="actions"
          style="--popover-min-width:280px"
          .open=${this.menuOpen}
          placement="bottom-end"
          .offset=${8}
          .closeOnOutsideClick=${true}
          @popover-close=${() => {
            this.menuOpen = false;
            this.requestUpdate();
          }}
        >
          <ic-action-button
            slot="anchor"
            icon="mdi:cog-outline"
            label="Scene actions"
            @action-click=${this.toggleMenu}
          ></ic-action-button>
          <button type="button" @click=${this.requestSettings}>
            Settings
          </button>
        </ic-popover>
      </ic-section-header>
      <main class="page"><slot></slot></main>
    `;
  }
}

customElements.define("ic-scene-page-container", ScenePageContainer);
