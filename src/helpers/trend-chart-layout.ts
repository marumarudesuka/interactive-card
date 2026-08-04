export interface TrendChartPlot {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface TrendChartLayout {
  width: number;
  height: number;
  plot: TrendChartPlot;
}

export interface TrendChartLayoutOptions {
  axisCount?: number;
  leftAxisWidth?: number;
  rightAxisWidth?: number;
  hasLeftAxis?: boolean;
  hasRightAxis?: boolean;
  top?: number;
  bottom?: number;
}

export function createTrendChartLayout(
  width: number,
  height: number,
  options: TrendChartLayoutOptions = {}
): TrendChartLayout {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const axisCount = Math.min(2, Math.max(1, options.axisCount ?? 1));
  const hasLeftAxis = options.hasLeftAxis ?? true;
  const hasRightAxis = options.hasRightAxis ?? axisCount > 1;
  const left = 8 + (hasLeftAxis ? options.leftAxisWidth ?? 42 : 0);
  const rightPadding =
    8 + (hasRightAxis ? options.rightAxisWidth ?? 42 : 0);
  const top = options.top ?? 12;
  const bottomPadding = options.bottom ?? 30;
  const right = Math.max(left, safeWidth - rightPadding);
  const bottom = Math.max(top, safeHeight - bottomPadding);

  return {
    width: safeWidth,
    height: safeHeight,
    plot: {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    },
  };
}
