import { css } from "lit";

/**
 * Theme-aware scrollbar styling for scroll containers inside Shadow DOM.
 * Native theme resolves these declarations to auto/revert.
 */
export const scrollbarStyle = css`
  * {
    scrollbar-color:
      var(--en-scrollbar-thumb, auto)
      var(--en-scrollbar-track, auto);
    scrollbar-width: var(--en-scrollbar-width, auto);
  }

  *::-webkit-scrollbar {
    width: var(--en-scrollbar-size, revert);
    height: var(--en-scrollbar-size, revert);
  }

  *::-webkit-scrollbar-track {
    background: var(--en-scrollbar-track, revert);
    border-radius: var(--en-scrollbar-radius, revert);
  }

  *::-webkit-scrollbar-thumb {
    border: var(--en-scrollbar-thumb-border, revert);
    border-radius: var(--en-scrollbar-radius, revert);
    background: var(--en-scrollbar-thumb, revert);
    backdrop-filter: var(--en-scrollbar-blur, revert);
    -webkit-backdrop-filter: var(--en-scrollbar-blur, revert);
  }

  *::-webkit-scrollbar-thumb:hover {
    background: var(--en-scrollbar-thumb-hover, revert);
  }
`;
