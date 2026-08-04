export type TrendTimeframe = "1H" | "24H" | "7D" | "30D";
export type TrendCurveMode = "smooth" | "raw" | "step";
export type TrendRenderMode = "smooth" | "high_precision";
export type TrendLineStyle = "solid" | "dashed";
export type TrendChartMode = "line" | "area" | "bar";

export type TrendCategory =
  | "power"
  | "energy"
  | "cost"
  | "circuit";

export interface TrendEntityConfig {
  entity: string;
  order?: number;
  chartMode?: TrendChartMode;
  name?: string;
  color?: string;
  category?: TrendCategory;
  unit?: string;
  enabled?: boolean;
  decimals?: number;
  autoScale?: boolean;
  lineStyle?: TrendLineStyle;
  axis?: "auto" | "left" | "right";
  renderMode?: TrendRenderMode;
}

export interface EnergyTrendCardConfig {
  id?: string;
  type?: string;
  title?: string;
  height?: number;
  /** @deprecated Read only for migration; chart mode now belongs to each series. */
  chartMode?: TrendChartMode;
  curve?: TrendCurveMode;
  renderMode?: TrendRenderMode;
  fullWidth?: boolean;
  timeframe?: TrendTimeframe;
  category?: TrendCategory;
  entities: TrendEntityConfig[];
}

export interface TrendPoint {
  timestamp: number;
  value: number;
}

export interface TrendHistoryState {
  entity_id?: string;
  state: string;
  last_changed?: string;
  last_updated?: string;
  attributes?: Record<string, unknown>;
}

export type TrendHistoryByEntity = Record<
  string,
  TrendHistoryState[]
>;

export interface TrendEntityMetadata {
  name?: string;
  unit?: string;
}

export interface TrendHistoryResult {
  start: Date;
  end: Date;
  entities: TrendHistoryByEntity;
}

export interface TrendSeries {
  id: string;
  entity: string;
  name: string;
  color?: string;
  chartMode: TrendChartMode;
  category: TrendCategory;
  unit: string;
  axisId: string;
  axisGroup?: "left" | "right";
  precision: number;
  points: TrendPoint[];
  visible: boolean;
  lineStyle: TrendLineStyle;
  renderMode?: TrendRenderMode;
}

export interface TrendAxis {
  id: string;
  axisGroup?: "left" | "right";
  category: TrendCategory;
  unit: string;
  precision: number;
  min: number;
  max: number;
}

export interface TrendAxisTick {
  value: number;
  displayValue: number;
}

export interface ResolvedTrendAxis extends TrendAxis {
  displayUnit: string;
  displayScale: number;
  tickStep: number;
  ticks: TrendAxisTick[];
}

export interface TransformedTrendData {
  series: TrendSeries[];
  axes: TrendAxis[];
}

export type TrendDataStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error";
