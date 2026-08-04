export class PopoverManager {
  private active?: HTMLElement;

  open(popover: HTMLElement) {
    if (this.active && this.active !== popover) {
      this.active.dispatchEvent(new CustomEvent("popover-manager-close"));
    }
    this.active = popover;
  }

  close(popover: HTMLElement) {
    if (this.active === popover) this.active = undefined;
  }
}

export const popoverManager = new PopoverManager();
