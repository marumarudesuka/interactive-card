export type KpiTrendMode = "none" | "vs_yesterday" | "vs_last_period";

export interface CustomKpiConfig {
  type?: string;
  id?: string;
  name?: string;
  title?: string;
  entity?: string;
  category?: string;
  unit?: string;
  icon?: string;
  enabled?: boolean;
  autoScale?: boolean;
  decimals?: number;
  order?: number;
  precision?: number;
  subtitle?: string;
  /** @deprecated Legacy subtitle field. Read for migration only. */
  trend?: string;
  trendMode?: KpiTrendMode;
  history?: number[];
  entityType?: string;
  icon_bg?: string;
  icon_glow?: string;
  icon_color?: string;
  [key: string]: unknown;
}

export interface KpiTemplate {
  id: string;
  title: string;
  category?: string;
  unit?: string;
  icon?: string;
  entity?: string;
  defaultEntity?: string;
  defaultEnabled?: boolean;
  entityType?: string;
  autoScale?: boolean;
  decimals?: number;
  keyword?: string;
  keywords?: string[];
  units?: string[];
  icon_bg?: string;
  icon_glow?: string;
  icon_color?: string;
}
