import { IcSelectItem } from "./select-item";

/** Semantic rounded-rectangle result row for entity and icon pickers. */
export class IcPickerItem extends IcSelectItem {
  variant:"default"|"compact" = "default";
}

customElements.define("ic-picker-item",IcPickerItem);
