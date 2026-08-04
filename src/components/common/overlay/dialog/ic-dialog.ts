import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";
import { dialogManager } from "./dialog-manager";
import { motionMs } from "../../../../design-system/motion";
import { scrollbarStyle } from "../../../../design-system/scrollbar";

export type DialogCloseReason = "backdrop" | "escape" | "button";
export interface DialogCloseDetail { reason: DialogCloseReason; }

export class IcDialog extends LitElement {
  static properties = {
    open: { type:Boolean, reflect:true },
    title: { type:String },
    closeOnBackdrop: { type:Boolean, attribute:"close-on-backdrop" },
    closeOnEscape: { type:Boolean, attribute:"close-on-escape" },
  };

  open = false;
  title = "";
  closeOnBackdrop = true;
  closeOnEscape = true;
  private closeTimer?: number;

  static styles = [scrollbarStyle, css`
    :host { display:contents; }
    dialog {
      z-index:10000;
      position:fixed;
      inset:0;
      width:100vw;
      height:100vh;
      margin:0;
      max-width:none;
      max-height:none;
      padding:0;
      border:0;
      overflow:hidden;
      background:transparent;
      color:var(--en-text-primary,var(--ic-card-primary-text,var(--primary-text-color)));
    }
    dialog::backdrop {
      background:transparent;
    }
    .visual-backdrop {
      position:absolute;
      inset:0;
      opacity:0;
      will-change:opacity;
      transition:opacity var(--en-motion-normal,280ms) var(--en-easing-standard,cubic-bezier(.25,.1,.25,1));
    }
    .visual-backdrop::before {
      content:"";
      position:absolute;
      inset:0;
      background:rgba(0,0,0,.3);
      backdrop-filter:blur(2px);
    }
    dialog.visible .visual-backdrop {
      opacity:1;
    }
    .surface {
      position:absolute;
      left:50%;
      top:50%;
      display:flex;
      flex-direction:column;
      width:min(calc(100vw - 24px),var(--dialog-width,var(--app-dialog-width,520px)));
      max-width:calc(100vw - 24px);
      max-height:calc(100dvh - 24px);
      box-sizing:border-box;
      overflow:hidden;
      border:var(--ic-border-dialog,var(--ic-dialog-border,var(--en-border)));
      border-radius:var(--dialog-radius,var(--ic-radius-dialog));
      background:var(--ic-dialog-background,var(--en-surface-primary,var(--ic-card-background,rgba(255,255,255,.12))));
      box-shadow:var(--ic-shadow-dialog,var(--ic-dialog-shadow,var(--en-shadow-surface)));
      backdrop-filter:var(--ic-dialog-blur,var(--en-blur,var(--ic-card-backdrop-filter,blur(30px))));
      -webkit-backdrop-filter:var(--ic-dialog-blur,var(--en-blur,var(--ic-card-backdrop-filter,blur(30px))));
      opacity:0;
      transform:translate(-50%,-50%) translateY(10px) scale(.96);
      transition:
        opacity var(--en-motion-normal,280ms) var(--en-easing-standard,cubic-bezier(.25,.1,.25,1)),
        transform var(--en-motion-normal,280ms) var(--en-easing-standard,cubic-bezier(.25,.1,.25,1));
    }
    dialog.visible .surface {
      opacity:1;
      transform:translate(-50%,-50%) translateY(0) scale(1);
    }
    header {
      display:flex;
      align-items:center;
      justify-content:var(--dialog-header-justify,space-between);
      gap:var(--dialog-header-gap,8px);
      min-height:var(--dialog-header-min-height,77px);
      box-sizing:border-box;
      padding:var(--dialog-header-padding,var(--app-dialog-header-padding,24px 32px));
      border-bottom:var(--dialog-header-border,var(--ic-dialog-border,1px solid rgba(255,255,255,.1)));
      color:var(--en-heading-primary,var(--primary-text-color));
      font-size:var(--en-title-lg-size,24px);
      font-weight:var(--en-title-lg-weight,600);
      line-height:var(--en-title-lg-line-height,1.2);
      letter-spacing:var(--en-title-lg-letter-spacing,-0.3px);
      flex:0 0 auto;
    }
    .close {
      order:var(--dialog-close-order,0);
      display:grid;
      width:var(--dialog-close-size,40px);
      height:var(--dialog-close-size,40px);
      flex:0 0 var(--dialog-close-size,40px);
      place-items:center;
      padding:0; border:0; background:transparent; color:inherit;
      border-radius:var(--en-control-radius,999px);
      outline:none;
      cursor:pointer; font:inherit; font-size:22px;
    }
    .close:focus-visible {
      outline:var(--ic-focus-ring);
      outline-offset:2px;
    }
    .body {
      flex:1 1 auto;
      min-height:0;
      overflow-y:auto;
      overflow-x:hidden;
      padding:var(--dialog-body-padding,var(--app-dialog-body-padding,0));
    }
    footer {
      flex:0 0 auto;
      display:block;
      width:100%;
      min-width:0;
      box-sizing:border-box;
    }
    footer > slot[name="footer"] {
      display:block;
      width:100%;
      min-width:0;
      box-sizing:border-box;
    }
    footer > slot[name="footer"]::slotted(*) {
      display:block;
      width:100%;
      min-width:0;
      box-sizing:border-box;
    }
    footer:empty { display:none; }

    @media (max-width: 719px) {
      header {
        min-height: 64px;
        padding: 16px;
        font-size: var(--en-title-md-size, 20px);
      }

      .close {
        width: 36px;
        height: 36px;
        flex-basis: 36px;
      }
    }
  `];

  protected updated(changed: PropertyValues<this>) {
    if (!changed.has("open")) return;
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog");
    if (!dialog) return;
    if (this.open && !dialog.open) {
      window.clearTimeout(this.closeTimer);
      dialogManager.register(dialog);
      dialog.showModal();
      requestAnimationFrame(() => dialog.classList.add("visible"));
    } else if (!this.open && dialog.open) {
      dialog.classList.remove("visible");
      window.clearTimeout(this.closeTimer);
      this.closeTimer = window.setTimeout(() => {
        if (dialog.open) dialog.close();
        dialogManager.unregister(dialog);
    }, motionMs.normal);
    }
  }

  disconnectedCallback() {
    window.clearTimeout(this.closeTimer);
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog");
    if (dialog) dialogManager.unregister(dialog);
    super.disconnectedCallback();
  }

  private requestClose(reason: DialogCloseReason) {
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog");
    if (!dialog || !dialogManager.isTop(dialog)) return;
    this.dispatchEvent(new CustomEvent<DialogCloseDetail>("dialog-close", {
      detail:{ reason }, bubbles:true, composed:true,
    }));
  }

  render() {
    return html`<dialog aria-modal="true"
      @cancel=${(event: Event) => {
        event.preventDefault();
        if (this.closeOnEscape) this.requestClose("escape");
      }}
    >
      <div
        class="visual-backdrop"
        @click=${() => {
          if (this.closeOnBackdrop) this.requestClose("backdrop");
        }}
      ></div>
      <section class="surface" role="document">
        <header>
          <slot name="header">${this.title}</slot>
          <button class="close" type="button" aria-label="Close"
            @click=${() => this.requestClose("button")}>&times;</button>
        </header>
        <div class="body"><slot></slot></div>
        <footer><slot name="footer"></slot></footer>
      </section>
    </dialog>`;
  }
}
customElements.define("ic-dialog", IcDialog);
