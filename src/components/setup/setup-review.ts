import { LitElement, css, html } from "lit";
import type { SetupDraft } from "../../setup/setup.types";

export class SetupReview extends LitElement {
  static properties = { draft:{ attribute:false } };
  draft?:SetupDraft;
  static styles = css`
    :host{display:block}.counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.count{padding:12px;border:1px solid var(--divider-color);border-radius:12px}.entities{display:grid;gap:6px}.technical{color:var(--secondary-text-color);font-size:12px}
  `;
  render() {
    if (!this.draft) return html``;
    const groups = [
      ["KPIs", this.draft.kpis.filter((item) => item.enabled)],
      ["Series", this.draft.trend.filter((item) => item.enabled)],
      ["Circuits", this.draft.circuits.filter((item) => item.enabled)],
    ] as const;
    const warnings = [
      !this.draft.kpis.some((item) => item.enabled && item.kind === "cost")
        ? "Cost data was not selected. This is optional." : "",
      !this.draft.circuits.some((item) => item.enabled)
        ? "No circuits are selected. You can add them later." : "",
    ].filter(Boolean);
    return html`
      <h2>Review</h2>
      <div class="counts">${groups.map(([label, items]) => html`
        <div class="count"><strong>${items.length}</strong><div>${label}</div></div>
      `)}</div>
      ${groups.map(([label, items]) => html`<section><h3>${label}</h3>
        ${items.length ? html`<div class="entities">${items.map((item) => html`
          <div>${item.displayName}<div class="technical">${item.entityId}</div></div>
        `)}</div>` : html`<p>Nothing selected.</p>`}
      </section>`)}
      ${warnings.length ? html`<section><h3>Optional data</h3>
        ${warnings.map((warning) => html`<p>${warning}</p>`)}</section>` : null}
      <p>No dashboard has been created yet.</p>
    `;
  }
}
if (!customElements.get("setup-review")) {
  customElements.define("setup-review", SetupReview);
}
