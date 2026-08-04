import { LitElement, css, html } from "lit";

export class SectionHeader extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    showActions: { type: Boolean, attribute: "show-actions" },
    level: { type: String },
  };

  title = "";
  subtitle = "";
  showActions = true;
  level: "page" | "section" = "section";

  static styles = css`
    :host {
      display: block;
      color: var(--en-body-primary, var(--primary-text-color));
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: var(--en-section-heading-margin-bottom, 16px);
    }

    .copy {
      min-width: 0;
    }

    .title {
      color: var(--en-heading-primary, var(--primary-text-color));
      font-size: var(--en-title-lg-size, 24px);
      font-weight: var(--en-title-lg-weight, 600);
      line-height: var(--en-title-lg-line-height, 1.2);
      letter-spacing: var(--en-title-lg-letter-spacing, -0.3px);
    }

    .title.page {
      font-size: var(--en-title-xl-size, 34px);
      font-weight: var(--en-title-xl-weight, 600);
      line-height: var(--en-title-xl-line-height, 1.15);
      letter-spacing: var(--en-title-xl-letter-spacing, -0.5px);
    }

    .subtitle {
      margin-top: 4px;
      color: var(--en-subtitle-secondary, var(--secondary-text-color));
      font-size: var(--section-header-subtitle-size, 13px);
    }

    .actions {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: var(--section-header-action-gap, 8px);
    }

    ::slotted([slot="actions"]) {
      flex: 0 0 auto;
    }
  `;

  render() {
    return html`
      <div class="header">
        <div class="copy">
          <div class="title ${this.level}">${this.title}</div>
          ${this.subtitle
            ? html`<div class="subtitle">${this.subtitle}</div>`
            : null}
        </div>
        ${this.showActions
          ? html`
              <div class="actions">
                <slot name="actions"></slot>
              </div>
            `
          : null}
      </div>
    `;
  }
}

customElements.define("ic-section-header", SectionHeader);
