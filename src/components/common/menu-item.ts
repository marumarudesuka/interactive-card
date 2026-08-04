import { IcSelectItem } from "./select-item";

/** Semantic compact action row used by every add/action menu. */
export class IcMenuItem extends IcSelectItem {
  variant:"default"|"compact" = "compact";
}

customElements.define("ic-menu-item",IcMenuItem);
