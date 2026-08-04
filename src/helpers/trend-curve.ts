export interface TrendCurvePoint {
  x: number;
  y: number;
}

export interface TrendCurveSegment {
  start: TrendCurvePoint;
  control1: TrendCurvePoint;
  control2: TrendCurvePoint;
  end: TrendCurvePoint;
}

function createTangents(points: readonly TrendCurvePoint[]): number[] {
  if (points.length < 2) return points.map(() => 0);

  const widths = points.slice(0, -1).map(
    (point, index) => Math.max(points[index + 1].x - point.x, 0.0001)
  );
  const slopes = widths.map(
    (width, index) => (points[index + 1].y - points[index].y) / width
  );
  const tangents = Array<number>(points.length).fill(0);
  tangents[0] = slopes[0];
  tangents[tangents.length - 1] = slopes[slopes.length - 1];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = slopes[index - 1];
    const next = slopes[index];
    if (previous === 0 || next === 0 || previous * next <= 0) {
      tangents[index] = 0;
      continue;
    }
    const previousWidth = widths[index - 1];
    const nextWidth = widths[index];
    const weight1 = 2 * nextWidth + previousWidth;
    const weight2 = nextWidth + 2 * previousWidth;
    tangents[index] =
      (weight1 + weight2) /
      (weight1 / previous + weight2 / next);
  }

  return tangents;
}

export function createMonotoneCurve(
  points: readonly TrendCurvePoint[]
): TrendCurveSegment[] {
  if (points.length < 2) return [];
  const tangents = createTangents(points);

  return points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const width = Math.max(end.x - start.x, 0.0001);
    return {
      start,
      control1: {
        x: start.x + width / 3,
        y: start.y + (tangents[index] * width) / 3,
      },
      control2: {
        x: end.x - width / 3,
        y: end.y - (tangents[index + 1] * width) / 3,
      },
      end,
    };
  });
}
