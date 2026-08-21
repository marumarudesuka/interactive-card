/**
 * Compatibility-sensitive Home Assistant integration.
 *
 * Home Assistant currently renders the automatic card preview inside the
 * private `hui-dialog-edit-card` shadow root, under `.element-preview`. There
 * is no public custom-card API for disabling that preview. This helper hides
 * only that HA-owned wrapper after strict feature detection. If HA changes its
 * internal structure, detection fails closed: the automatic preview remains
 * visible and neither the editor nor the runtime card is modified.
 */

const OWNER_ATTRIBUTE = "data-enecess-preview-suppressed";
let ownerSequence = 0;

interface InlineStyleSnapshot {
  value:string;
  priority:string;
}

interface SuppressedWrapper {
  element:HTMLElement;
  display:InlineStyleSnapshot;
  pointerEvents:InlineStyleSnapshot;
}

export interface HaAutomaticPreviewSuppression {
  disconnect():void;
}

function createOwnerId():string {
  ownerSequence += 1;
  return `enecess-editor-${ownerSequence}`;
}

function findOwningEditCardDialog(start:HTMLElement):HTMLElement | undefined {
  let cursor:Node | null = start;
  const visited = new Set<Node>();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    if (cursor instanceof HTMLElement && cursor.localName === "hui-dialog-edit-card") {
      return cursor;
    }

    const root = cursor.getRootNode();
    if (root instanceof ShadowRoot) {
      cursor = root.host;
      continue;
    }

    cursor = cursor instanceof HTMLElement ? cursor.parentElement : null;
  }

  return undefined;
}

function isExpectedPreviewHost(element:Element):boolean {
  if (element.localName !== "hui-card" && element.localName !== "hui-section") {
    return false;
  }
  return element.hasAttribute("preview") ||
    (element as Element & { preview?:boolean }).preview === true;
}

class PreviewSuppressionController implements HaAutomaticPreviewSuppression {
  private readonly editor:HTMLElement;
  private readonly ownerId = createOwnerId();
  private readonly suppressed = new Map<HTMLElement, SuppressedWrapper>();
  private observer?:MutationObserver;
  private dialog?:HTMLElement;
  private stopped = false;
  private retryFrame?:number;
  private retryAttempts = 0;
  private warned = false;

  constructor(editor:HTMLElement) {
    this.editor = editor;
    this.connect();
  }

  private connect() {
    if (this.stopped) return;
    const dialog = findOwningEditCardDialog(this.editor);
    if (!dialog?.shadowRoot) {
      this.scheduleRetry();
      return;
    }

    this.dialog = dialog;
    this.observer = new MutationObserver(() => this.suppressCurrentWrapper());
    this.observer.observe(dialog.shadowRoot, { childList:true, subtree:true });
    this.suppressCurrentWrapper();
  }

  private scheduleRetry() {
    if (this.stopped || this.retryFrame !== undefined || this.retryAttempts >= 4) {
      return;
    }
    this.retryAttempts += 1;
    this.retryFrame = window.requestAnimationFrame(() => {
      this.retryFrame = undefined;
      this.connect();
    });
  }

  private suppressCurrentWrapper() {
    const root = this.dialog?.shadowRoot;
    if (!root || this.stopped) return;

    const wrappers = root.querySelectorAll<HTMLElement>(".element-preview");
    if (wrappers.length === 0) return;
    if (wrappers.length !== 1) {
      this.warnCompatibility("expected exactly one .element-preview wrapper");
      return;
    }

    const wrapper = wrappers[0];
    const previewHosts = Array.from(wrapper.children).filter(isExpectedPreviewHost);
    if (previewHosts.length !== 1) {
      this.warnCompatibility("expected one hui-card[preview] or hui-section[preview]");
      return;
    }

    const existingOwner = wrapper.getAttribute(OWNER_ATTRIBUTE);
    if (existingOwner && existingOwner !== this.ownerId) return;
    if (this.suppressed.has(wrapper)) return;

    const record:SuppressedWrapper = {
      element:wrapper,
      display:{
        value:wrapper.style.getPropertyValue("display"),
        priority:wrapper.style.getPropertyPriority("display"),
      },
      pointerEvents:{
        value:wrapper.style.getPropertyValue("pointer-events"),
        priority:wrapper.style.getPropertyPriority("pointer-events"),
      },
    };
    wrapper.setAttribute(OWNER_ATTRIBUTE, this.ownerId);
    wrapper.style.setProperty("display", "none", "important");
    wrapper.style.setProperty("pointer-events", "none", "important");
    this.suppressed.set(wrapper, record);
  }

  private warnCompatibility(reason:string) {
    if (this.warned) return;
    this.warned = true;
    console.warn(
      `[Enecess] HA automatic preview was left visible: ${reason}. ` +
      "Home Assistant's internal Edit Card DOM may have changed."
    );
  }

  disconnect() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.retryFrame !== undefined) {
      window.cancelAnimationFrame(this.retryFrame);
      this.retryFrame = undefined;
    }
    this.observer?.disconnect();
    this.observer = undefined;

    for (const record of this.suppressed.values()) {
      const wrapper = record.element;
      if (wrapper.getAttribute(OWNER_ATTRIBUTE) !== this.ownerId) continue;
      this.restoreStyle(wrapper, "display", record.display);
      this.restoreStyle(wrapper, "pointer-events", record.pointerEvents);
      wrapper.removeAttribute(OWNER_ATTRIBUTE);
    }
    this.suppressed.clear();
    this.dialog = undefined;
  }

  private restoreStyle(
    element:HTMLElement,
    property:string,
    snapshot:InlineStyleSnapshot
  ) {
    if (snapshot.value) {
      element.style.setProperty(property, snapshot.value, snapshot.priority);
    } else {
      element.style.removeProperty(property);
    }
  }
}

export function suppressHaAutomaticCardPreview(
  editor:HTMLElement
):HaAutomaticPreviewSuppression {
  return new PreviewSuppressionController(editor);
}
