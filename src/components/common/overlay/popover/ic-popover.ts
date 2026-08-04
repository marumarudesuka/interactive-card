import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";
import { popoverManager } from "./popover-manager";
import { scrollbarStyle } from "../../../../design-system/scrollbar";

export class IcPopover extends LitElement {
  static properties = {
    open: { type:Boolean, reflect:true },
    align: { type:String },
    anchor: { attribute:false },
    placement: { type:String },
    offset: { type:Number },
    closeOnOutsideClick: {
      type:Boolean,
      attribute:"close-on-outside-click",
    },
  };
  open = false;
  align: "start" | "end" = "end";
  anchor?: HTMLElement;
  placement: "bottom-start" | "bottom-end" = "bottom-end";
  offset = 8;
  closeOnOutsideClick = true;

  static styles = [scrollbarStyle, css`
    :host { display:inline-flex; }
    .popover {
      position:fixed;
      z-index:1000;
      left:var(--popover-left,0);
      top:var(--popover-top,0);
      min-width:var(--popover-min-width,210px);
      max-width:var(--popover-max-width,calc(100vw - 16px));
      max-height:var(--popover-max-height,calc(100vh - 16px));
      overflow:hidden;
      padding:6px;
      box-sizing:border-box;
      border:var(--ic-border-popover,var(--ic-popover-border,var(--en-border)));
      border-radius:var(--popover-radius,var(--ic-radius-popover));
      background:var(--ic-popover-background,var(--en-surface-floating,var(--en-surface-primary,var(--ic-card-background))));
      color:var(--en-text-primary,var(--ic-card-primary-text,var(--primary-text-color)));
      box-shadow:var(--ic-shadow-popover,var(--ic-popover-shadow,var(--en-shadow-floating)));
      backdrop-filter:var(--ic-popover-blur,var(--en-blur-floating,var(--en-blur,var(--ic-card-backdrop-filter))));
      -webkit-backdrop-filter:var(--ic-popover-blur,var(--en-blur-floating,var(--en-blur,var(--ic-card-backdrop-filter))));
      opacity:0;
      visibility:hidden;
      pointer-events:none;
      transform:translateY(-4px) scale(.98);
      transform-origin:top right;
      transition:
        opacity var(--en-motion-fast,180ms) var(--en-easing-standard,ease),
        transform var(--en-motion-fast,180ms) var(--en-easing-standard,ease),
        visibility var(--en-motion-fast,180ms);
    }
    .popover.end { transform-origin:top right; }
    .popover.start { transform-origin:top left; }
    .popover.open {
      opacity:1; visibility:visible; pointer-events:auto;
      transform:translateY(0) scale(1);
    }
    ::slotted(button) {
      width:100%;
      border:0;
      border-radius:var(--ic-radius-control);
      padding:10px 12px;
      background:transparent;
      color:inherit;
      text-align:left;
      cursor:pointer;
    }
    ::slotted(button:hover) {
      background:var(--ic-action-hover-background,rgba(127,127,127,.14));
    }
  `];

  private outsidePointer = (event: PointerEvent) => {
    if (
      this.closeOnOutsideClick &&
      !event.composedPath().includes(this)
    ) {
      this.requestClose();
    }
  };
  private escape = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.requestClose();
  };
  private managerClose = () => this.requestClose();
  private reposition = () => this.positionPopover();

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("popover-manager-close", this.managerClose);
  }
  disconnectedCallback() {
    document.removeEventListener("pointerdown", this.outsidePointer, true);
    document.removeEventListener("keydown", this.escape);
    window.removeEventListener("resize", this.reposition);
    window.removeEventListener("scroll", this.reposition, true);
    popoverManager.close(this);
    super.disconnectedCallback();
  }
  protected updated(changed: PropertyValues<this>) {
    if (!changed.has("open")) return;
    if (this.open) {
      popoverManager.open(this);
      this.positionPopover();
      queueMicrotask(() => document.addEventListener("pointerdown", this.outsidePointer, true));
      document.addEventListener("keydown", this.escape);
      window.addEventListener("resize", this.reposition);
      window.addEventListener("scroll", this.reposition, true);
    } else {
      document.removeEventListener("pointerdown", this.outsidePointer, true);
      document.removeEventListener("keydown", this.escape);
      window.removeEventListener("resize", this.reposition);
      window.removeEventListener("scroll", this.reposition, true);
      popoverManager.close(this);
    }
  }
  private requestClose() {
    if (!this.open) return;
    this.dispatchEvent(new CustomEvent("popover-close", { bubbles:true, composed:true }));
  }

  private positionPopover() {
    const popover =
      this.renderRoot.querySelector<HTMLElement>(".popover");
    const slot =
      this.renderRoot.querySelector<HTMLSlotElement>('slot[name="anchor"]');
    const anchor =
      this.anchor ??
      slot?.assignedElements({ flatten:true })[0] as HTMLElement | undefined;
    if (!popover || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const edge = 8;
    const root = this.getRootNode();
    const boundary = root instanceof ShadowRoot
      ? root.host as HTMLElement
      : undefined;
    const boundaryRect = boundary?.getBoundingClientRect();
    const minLeft = Math.max(edge, boundaryRect?.left ?? edge);
    const maxRight = Math.min(
      window.innerWidth - edge,
      boundaryRect?.right ?? window.innerWidth - edge
    );
    popover.style.setProperty(
      "--popover-max-width",
      `${Math.max(0, maxRight - minLeft)}px`
    );
    const maxHeight = Math.max(
      120,
      Math.min(
        window.innerHeight - anchorRect.bottom - this.offset - edge,
        (boundaryRect?.bottom ?? window.innerHeight - edge) -
          anchorRect.bottom - this.offset
      )
    );
    popover.style.setProperty("--popover-max-height", `${maxHeight}px`);
    const popoverRect = popover.getBoundingClientRect();
    const preferStart =
      this.placement === "bottom-start" || this.align === "start";
    let left = preferStart
      ? anchorRect.left
      : anchorRect.right - popoverRect.width;
    left = Math.min(
      Math.max(minLeft, left),
      Math.max(minLeft, maxRight - popoverRect.width)
    );

    let top = anchorRect.bottom + this.offset;
    const above = anchorRect.top - popoverRect.height - this.offset;
    if (
      top + popoverRect.height > window.innerHeight - edge &&
      above >= edge
    ) {
      top = above;
    }

    popover.style.setProperty("--popover-left", `${left}px`);
    popover.style.setProperty("--popover-top", `${top}px`);
    popover.classList.toggle(
      "start",
      left <= anchorRect.left + 1
    );
    popover.classList.toggle(
      "end",
      left > anchorRect.left + 1
    );
  }
  render() {
    return html`<slot name="anchor"></slot><div
      class="popover ${this.align} ${this.open ? "open" : ""}"
      role="menu"
    ><slot></slot></div>`;
  }
}
customElements.define("ic-popover", IcPopover);
