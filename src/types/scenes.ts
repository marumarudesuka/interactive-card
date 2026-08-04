export type SceneInsightSeverity =
  | "normal"
  | "warning"
  | "success"
  | "achievement";

export interface SceneMetric {
  title: string;
  value: number | string;
  unit?: string;
  icon?: string;
}

export interface SceneStatus {
  label: string;
  state: "active" | "idle" | "complete" | "warning";
}

export interface SceneInsight {
  severity: SceneInsightSeverity;
  title: string;
  description: string;
  icon?: string;
}

export interface SceneChartSeries {
  name: string;
  color: string;
  values: number[];
}

export interface SceneHistoryEntry {
  title: string;
  subtitle?: string;
  values: string[];
}

export interface SceneConfig {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  metrics?: SceneMetric[];
  insight?: SceneInsight;
}
