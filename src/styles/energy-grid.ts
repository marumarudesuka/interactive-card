import { css } from "lit";

/**
 * Shared Overview grid. Energy cards fill their grid cell; sections own sizing.
 */
export const energyGridStyle = css`
  .energy-card-grid {
    display: grid;
    width: 100%;
    min-width: 0;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--energy-grid-gap, 16px);
    overflow: visible;
  }

  .energy-card-grid > * {
    width: 100%;
    min-width: 0;
  }

  @container (max-width: 1200px) {
    .energy-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @container (max-width: 599px) {
    .energy-card-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--energy-grid-mobile-gap, 10px);
    }
  }
`;
