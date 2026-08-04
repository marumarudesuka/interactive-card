export interface MiddleTruncationOptions {
  maxLength?: number;
  tailLength?: number;
}

/** Shared display limits for entity-bearing controls. Raw values remain untouched. */
export const ENTITY_ID_DISPLAY_LENGTH = {
  compactMenu: 28,
  pickerItem: 38,
  readonlyField: 46,
} as const;
export type EntityIdDisplayVariant = keyof typeof ENTITY_ID_DISPLAY_LENGTH;

export function formatEntityId(
  value:string,
  variant:EntityIdDisplayVariant = "pickerItem"
):string {
  return truncateMiddle(value, { maxLength:ENTITY_ID_DISPLAY_LENGTH[variant] });
}

/**
 * Keeps identifying information at both ends of long labels.
 * The original value should still be exposed through a title/tooltip.
 */
export function truncateMiddle(
  value: string,
  options: MiddleTruncationOptions = {}
): string {
  const characters = Array.from(value);
  const maxLength = Math.max(9, options.maxLength ?? 42);
  if (characters.length <= maxLength) return value;

  const requestedTail = options.tailLength ?? Math.round(maxLength * 0.32);
  const tailLength = Math.max(
    4,
    Math.min(requestedTail, maxLength - 7)
  );
  const headLength = maxLength - tailLength - 3;

  return `${characters.slice(0, headLength).join("")}...${characters
    .slice(-tailLength)
    .join("")}`;
}
