import { LitElement, css, html } from "lit";

export class ActionButton extends LitElement {
  static properties = {
    icon: { type: String },
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
  };

  icon = "+";
  label = "Action";
  disabled = false;

  static styles = css`
    :host {
      display: inline-flex;
      flex: 0 0 auto;
    }

    button {
      display: grid;
      width: var(--section-action-size, 34px);
      height: var(--section-action-size, 34px);
      padding: 0;
      place-items: center;
      border: var(--ic-action-border, none);
      border-radius: var(--en-control-radius,999px);
      background: var(
        --section-action-background,
        var(--ic-action-background, rgba(255, 255, 255, 0.15))
      );
      color: var(--primary-text-color);
      cursor: pointer;
      font: inherit;
      font-size: var(--section-action-icon-size, 22px);
      line-height: 1;
      transition:
        transform var(--en-motion-fast, 0.2s) var(--en-easing-standard, ease),
        background var(--en-motion-fast, 0.2s) var(--en-easing-standard, ease);
    }

    button:hover {
      transform: scale(1.08);
      background: var(
        --section-action-hover-background,
        var(--ic-action-hover-background, rgba(255, 255, 255, 0.25))
      );
    }

    button:active {
      transform: scale(0.96);
    }

    button:focus-visible {
      outline: var(--ic-focus-ring);
      outline-offset: 2px;
    }

    button:disabled {
      cursor: default;
      opacity: 0.5;
      transform: none;
    }

    ha-icon {
      width: 18px;
      height: 18px;
      transform: var(--section-action-icon-transform, none);
    }
  `;

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent("action-click", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <button
        type="button"
        aria-label=${this.label}
        ?disabled=${this.disabled}
        @click=${this.handleClick}
      >
        ${this.icon.startsWith("mdi:")
          ? html`<ha-icon .icon=${this.icon}></ha-icon>`
          : this.icon}
      </button>
    `;
  }
}

customElements.define("ic-action-button", ActionButton);
