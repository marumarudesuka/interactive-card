import { LitElement, css, html } from "lit";

export interface TrendHoverMarker {
  id: string;
  x: number;
  y: number;
  color: string;
}

export class TrendHoverMarkers extends LitElement {
  static properties = {
    markers: { attribute: false },
  };

  markers: TrendHoverMarker[] = [];

  static styles = css`
    :host {
      position: absolute;
      z-index: 2;
      inset: 0;
      pointer-events: none;
    }

    span {
      position: absolute;
      width: 7px;
      height: 7px;
      border: 2px solid var(--card-background-color, #fff);
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
  `;

  render() {
    return html`
      ${this.markers.map(
        (marker) => html`
          <span
            style=${`left:${marker.x}px;top:${marker.y}px;background:${marker.color}`}
          ></span>
        `
      )}
    `;
  }
}

customElements.define("ic-trend-hover-markers", TrendHoverMarkers);
