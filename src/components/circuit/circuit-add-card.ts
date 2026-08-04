import { LitElement, css, html } from "lit";

import "../common/ic-card-container";

export class CircuitAddCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    ic-card-container {
      --energy-card-height: var(--circuit-card-height, 150px);
      --energy-card-padding: 18px;
      --ic-shadow-card: var(--circuit-card-shadow, 0 8px 18px rgba(0,0,0,.16));
      --ic-card-hover-transform: translateY(-1px);
      --ic-card-active-transform: translateY(-1px);
      cursor: pointer;
    }

    :host(:hover) ic-card-container {
      --ic-border-card: 1px solid color-mix(
        in srgb,
        var(--en-color-primary) 28%,
        transparent
      );
      --ic-shadow-card: inset 0 0 0 1px color-mix(
        in srgb,
        var(--en-color-primary) 18%,
        transparent
      ), 0 8px 18px rgba(0,0,0,.18);
    }

    ic-card-container:focus-visible {
      outline: var(--ic-focus-ring);
      outline-offset: 3px;
    }

    .content {
      display: grid;
      height: 100%;
      place-items: center;
      align-content: center;
      gap: 10px;
      color: var(--en-surface-text-primary, var(--primary-text-color));
    }

    .plus {
      display: grid;
      width: 38px;
      height: 38px;
      place-items: center;
      border: 1px solid var(--en-surface-card-border, var(--divider-color));
      border-radius: 50%;
      background: var(--en-surface-secondary, rgba(255, 255, 255, 0.08));
      color: var(--en-surface-icon-primary, var(--primary-text-color));
      opacity: 1;
      --mdc-icon-size: 20px;
    }

    .label {
      font-size: 14px;
      font-weight: 600;
    }
  `;

  private requestAdd() {
    this.dispatchEvent(new CustomEvent("add-circuit-request", {
      bubbles: true,
      composed: true,
    }));
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.requestAdd();
  }

  render() {
    return html`
      <ic-card-container
        role="button"
        tabindex="0"
        aria-label="Add Circuit"
        @click=${this.requestAdd}
        @keydown=${this.handleKeydown}
      >
        <div class="content">
          <ha-icon class="plus" icon="mdi:plus" aria-hidden="true"></ha-icon>
          <span class="label">Add Circuit</span>
        </div>
      </ic-card-container>
    `;
  }
}

customElements.define("ic-circuit-add-card", CircuitAddCard);
