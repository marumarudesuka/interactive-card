import type {
  TrendTimeDomain,
} from "./trend-chart-geometry.ts";
import type { TrendTimeframe } from "../types/trend";

function startOfInterval(timestamp: number, minutes: number): number {
  const date = new Date(timestamp);
  const minuteOfDay = date.getHours() * 60 + date.getMinutes();
  const alignedMinutes = Math.ceil(minuteOfDay / minutes) * minutes;
  date.setHours(0, alignedMinutes, 0, 0);
  return date.getTime();
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  if (date.getTime() < timestamp) date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function createTrendTimeTicks(
  domain: TrendTimeDomain,
  timeframe: TrendTimeframe,
  width: number
): number[] {
  let cursor: number;
  let advance: (value: number) => number;

  if (timeframe === "1H") {
    cursor = startOfInterval(domain.min, 15);
    advance = (value) => value + 15 * 60 * 1_000;
  } else if (timeframe === "24H") {
    cursor = startOfInterval(domain.min, 360);
    advance = (value) => value + 6 * 60 * 60 * 1_000;
  } else {
    const dayStep =
      timeframe === "7D" ? 1 : width < 520 ? 7 : width < 800 ? 5 : 3;
    cursor = startOfDay(domain.min);
    advance = (value) => {
      const date = new Date(value);
      date.setDate(date.getDate() + dayStep);
      return date.getTime();
    };
  }

  const ticks: number[] = [];
  while (cursor <= domain.max) {
    ticks.push(cursor);
    cursor = advance(cursor);
  }
  return ticks;
}
