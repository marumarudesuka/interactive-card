export interface LineChartSize {
  width: number;
  height: number;
}

interface ChartPoint {
  x: number;
  y: number;
}

function createChartPoints(
  values: readonly number[],
  size: LineChartSize
): ChartPoint[] {
  if (!values.length) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? size.width / (values.length - 1) : size.width;

  return values.map((value, index) => ({
    x: index * step,
    y: size.height - ((value - min) / range) * size.height,
  }));
}

export function createLinePath(
  values: readonly number[],
  size: LineChartSize
): string {
  return createChartPoints(values, size)
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(" ");
}

export function createPolylinePoints(
  values: readonly number[],
  size: LineChartSize
): string {
  return createChartPoints(values, size)
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
}
