import { css } from "lit";

/**
 * Shared outer layout for Home Assistant native card editors.
 * The editor host is the only vertical scroll container; domain editors and
 * item managers remain in normal document flow.
 */
export const editorLayoutStyles = css`
  :host {
    --en-editor-section-gap: 20px;
    --en-editor-section-content-gap: 12px;
    --en-editor-field-row-gap: 14px;
    --en-editor-field-column-gap: 18px;
    --en-editor-control-surface: rgba(127, 127, 127, .10);
    --en-editor-control-surface-hover: rgba(127, 127, 127, .15);
    --en-editor-control-border: rgba(127, 127, 127, .28);
    --ic-control-background: var(--en-editor-control-surface);
    --ic-border-control: 1px solid var(--en-editor-control-border);
    --ic-action-hover-background: var(--en-editor-control-surface-hover);
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 0;
    max-height: var(--en-native-editor-max-height, calc(100dvh - 220px));
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: auto;
    color: var(--en-text-primary, var(--primary-text-color));
    container-type: inline-size;
    /* Reserve the vertical scrollbar footprint symmetrically so equal inline
       padding remains visually equal when the editor needs to scroll. */
    scrollbar-gutter: stable both-edges;
  }

  .editor {
    display: grid;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    gap: var(--en-editor-section-gap);
    padding: 16px 24px 20px;
    border-top: 1px solid var(
      --en-editor-section-divider,
      var(--divider-color, rgba(127, 127, 127, .22))
    );
  }

  .editor-section {
    display: grid;
    min-width: 0;
    gap: var(--en-editor-section-content-gap);
  }

  .section-heading {
    display: grid;
    min-width: 0;
    gap: 3px;
  }

  .section-title {
    color: var(--en-heading-primary, var(--primary-text-color));
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
  }

  .section-description {
    margin: 0;
    color: var(--en-text-secondary, var(--secondary-text-color));
    font-size: 13px;
    line-height: 1.4;
  }

  .field-grid {
    display: grid;
    min-width: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
    gap: var(--en-editor-field-row-gap) var(--en-editor-field-column-gap);
  }

  .field-grid.compact-three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .control-label {
    display: grid;
    min-width: 0;
    gap: 7px;
    color: var(--en-text-primary, var(--primary-text-color));
    font-size: 14px;
    font-weight: 500;
    line-height: 1.35;
  }

  .field-helper, .secondary-copy {
    margin: 0;
    color: var(--en-text-secondary, var(--secondary-text-color));
    font-size: 12px;
    line-height: 1.4;
  }

  @supports (color: color-mix(in srgb, black, white)) {
    :host {
      --en-editor-control-surface: color-mix(in srgb, var(--primary-text-color) 9%, transparent);
      --en-editor-control-surface-hover: color-mix(in srgb, var(--primary-text-color) 14%, transparent);
      --en-editor-control-border: color-mix(in srgb, var(--primary-text-color) 25%, transparent);
    }
  }

  @container (max-width: 599px) {
    .editor {
      padding-inline: 16px;
    }

    .field-grid, .field-grid.compact-three {
      grid-template-columns: 1fr;
    }
  }
`;
