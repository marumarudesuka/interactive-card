export interface KpiCardGeometry {
  paddingBlock:number;
  titleGap:number;
  subtitleSlotHeight:number;
  subtitlePaddingTop:number;
}

export function resolveKpiCardGeometry(height:number):KpiCardGeometry {
  const normalized = Number.isFinite(height)
    ? Math.max(130,Math.min(240,height))
    : 170;
  const progress = Math.max(0,Math.min(1,(normalized - 130) / 40));
  const interpolate = (compact:number,normal:number) =>
    compact + (normal - compact) * progress;
  return {
    paddingBlock:interpolate(10,20),
    titleGap:interpolate(2,4),
    subtitleSlotHeight:interpolate(20,23),
    subtitlePaddingTop:interpolate(3,6),
  };
}

export function getKpiCardGeometryStyle(height:number):string {
  const geometry = resolveKpiCardGeometry(height);
  return [
    `--kpi-padding-block:${geometry.paddingBlock}px`,
    `--kpi-title-gap:${geometry.titleGap}px`,
    `--kpi-subtitle-slot-height:${geometry.subtitleSlotHeight}px`,
    `--kpi-subtitle-padding-top:${geometry.subtitlePaddingTop}px`,
  ].join(";");
}
