import { LitElement, css, html } from "lit";

export class IconBadge extends LitElement {
  static properties = {
    icon: { type: String },
    tone: { type: String, reflect: true },
    size: { type: Number },
    iconSize: { type: Number, attribute: "icon-size" },
  };

  icon = "";
  tone: "primary" | "accent" | "success" = "primary";
  size = 0;
  iconSize = 0;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      --icon-badge-brand-color: var(--en-color-primary);
      --icon-badge-soft-color: var(--en-color-primary-soft);
    }

    :host([tone="accent"]) {
      --icon-badge-brand-color: var(--en-color-accent);
      --icon-badge-soft-color: var(--en-color-accent-soft);
    }

    :host([tone="success"]) {
      --icon-badge-brand-color: var(--en-color-success);
      --icon-badge-soft-color: var(--en-color-success-soft);
    }

    .badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-badge-size, 42px);
      height: var(--icon-badge-size, 42px);
      border: var(--en-icon-badge-border-width, 1px) solid color-mix(
        in srgb,
        var(--icon-badge-brand-color) var(--en-icon-badge-border-brand-strength, 0%),
        var(--en-icon-badge-border, transparent)
      );
      border-radius: 50%;
      background: color-mix(
        in srgb,
        var(--icon-badge-brand-color) var(--en-icon-badge-brand-strength, 0%),
        var(--en-icon-badge-background, transparent)
      );
      color: var(--icon-badge-brand-color);
      backdrop-filter: var(--en-icon-badge-blur, none);
      -webkit-backdrop-filter: var(--en-icon-badge-blur, none);
      box-shadow: var(--en-icon-badge-shadow);
      transition:
        transform 180ms ease,
        background 180ms ease,
        filter 180ms ease;
    }

    :host(:hover) .badge {
      background: color-mix(
        in srgb,
        var(--icon-badge-brand-color) var(--en-icon-badge-hover-brand-strength, 0%),
        var(--en-icon-badge-hover-background, transparent)
      );
      filter: brightness(1.08);
      transform: scale(1.03);
    }

    /* Solid does not pass through color-mix: older HA WebViews must receive
       the actual brand color as the material surface. */
    :host-context(html[data-ic-card-theme="solid"]) .badge {
      border: 0;
      background: var(--icon-badge-brand-color);
      color: #fff;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    :host-context(html[data-ic-card-theme="solid"]):hover .badge {
      background: var(--icon-badge-brand-color);
    }

    /* Native consumes semantic soft/border colors directly. This avoids
       muddy or unsupported runtime color mixing against HA card surfaces. */
    :host-context(html[data-ic-card-theme="native"]) .badge {
      border: 1px solid transparent;
      background: var(--icon-badge-soft-color);
      color: var(--icon-badge-brand-color);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    :host-context(html[data-ic-card-theme="native"]):hover .badge {
      background: var(--icon-badge-soft-color);
      filter: brightness(.94);
    }

    ha-icon {
      --mdc-icon-size: var(--icon-badge-icon-size, 21px);
      --state-icon-color: var(--en-icon-badge-foreground, var(--icon-badge-brand-color));
      --state-icon-active-color: var(--en-icon-badge-foreground, var(--icon-badge-brand-color));
      --paper-item-icon-color: var(--en-icon-badge-foreground, var(--icon-badge-brand-color));
      --iron-icon-fill-color: var(--en-icon-badge-foreground, var(--icon-badge-brand-color));
      color: var(--en-icon-badge-foreground, var(--icon-badge-brand-color));
      fill: currentColor;
    }

    :host-context(html[data-ic-card-theme="solid"]) ha-icon {
      --state-icon-color: #fff;
      --state-icon-active-color: #fff;
      --paper-item-icon-color: #fff;
      --iron-icon-fill-color: #fff;
      color: #fff;
      fill: #fff;
    }
  `;

  render() {
    const style = [
      this.size > 0 ? `--icon-badge-size:${this.size}px` : "",
      this.iconSize > 0
        ? `--icon-badge-icon-size:${this.iconSize}px`
        : "",
    ].filter(Boolean).join(";");

    return html`
      <span class="badge" style=${style}>
        <ha-icon .icon=${this.icon}></ha-icon>
      </span>
    `;
  }
}

customElements.define("ic-icon-badge", IconBadge);
