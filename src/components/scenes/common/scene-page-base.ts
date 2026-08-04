import { LitElement } from "lit";
import type { SceneConfig } from "../../../types/scenes";

export abstract class ScenePageElement extends LitElement {
  protected sceneConfig: Partial<SceneConfig> = {};

  setConfig(config: Partial<SceneConfig>) {
    this.sceneConfig = { ...config };
    this.requestUpdate();
  }

  getGridOptions() {
    return { columns: "full" };
  }
}
