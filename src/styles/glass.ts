import { css } from "lit";

export const glassStyle = css`
  :host {
    display: block;
    width: 100%;
    min-width: 0;
  }

  .card {
    position: relative;
    width: 100%;
    min-width: 0;
    height: var(--glass-container-height, 170px);
    padding: var(--glass-container-padding, var(--en-space-lg, 24px));
    box-sizing: border-box;
    overflow: hidden;
    border-radius: var(--ic-radius-card);
    background: var(
      --en-surface-primary,
      var(--ic-card-background,
      rgba(255,255,255,0.08)
      )
    );
    backdrop-filter: var(--en-blur, var(--ic-card-backdrop-filter, blur(25px)));
    -webkit-backdrop-filter: var(--en-blur, var(--ic-card-backdrop-filter, blur(25px)));
    border: var(--ic-border-card);
    box-shadow: var(--ic-shadow-card);
    transition:
      transform var(--en-motion-normal, .25s) var(--en-easing-standard, ease),
      box-shadow var(--en-motion-normal, .25s) var(--en-easing-standard, ease);
    color: var(--en-text-primary, var(--primary-text-color));
  }

  .card:hover {
    transform: var(--ic-card-hover-transform, translateY(-4px));
    box-shadow: var(--ic-shadow-card);
  }

  .card:active {
    transform: var(--ic-card-active-transform, scale(.98));
  }

  .card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    min-width: 0;
    height: 45%;
    pointer-events: none;
    background: var(
      --ic-card-highlight,
      linear-gradient(180deg, rgba(255,255,255,0.16), transparent)
    );
  }

  .content {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
  }
`;
