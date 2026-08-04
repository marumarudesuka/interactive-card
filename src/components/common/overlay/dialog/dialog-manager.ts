export class DialogManager {
  private stack: HTMLDialogElement[] = [];
  private returnFocus = new WeakMap<HTMLDialogElement, HTMLElement>();

  register(dialog: HTMLDialogElement) {
    this.stack = this.stack.filter((item) => item !== dialog);
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      this.returnFocus.set(dialog, active);
    }
    this.stack.push(dialog);
  }

  unregister(dialog: HTMLDialogElement) {
    this.stack = this.stack.filter((item) => item !== dialog);
    const target = this.returnFocus.get(dialog);
    this.returnFocus.delete(dialog);
    if (target?.isConnected) target.focus({ preventScroll:true });
  }

  isTop(dialog: HTMLDialogElement) {
    return this.stack.at(-1) === dialog;
  }
}

export const dialogManager = new DialogManager();
