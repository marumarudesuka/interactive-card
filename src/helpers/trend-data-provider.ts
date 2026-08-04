import type { HomeAssistant } from "custom-card-helpers";
import type {
  TrendHistoryResult,
  TrendHistoryState,
  TrendTimeframe,
} from "../types/trend";

const timeframeDuration: Record<TrendTimeframe, number> = {
  "1H": 60 * 60 * 1_000,
  "24H": 24 * 60 * 60 * 1_000,
  "7D": 7 * 24 * 60 * 60 * 1_000,
  "30D": 30 * 24 * 60 * 60 * 1_000,
};

export function getTrendTimeRange(
  timeframe: TrendTimeframe,
  end = new Date()
): { start: Date; end: Date } {
  return {
    start: new Date(end.getTime() - timeframeDuration[timeframe]),
    end,
  };
}

function createHistoryPath(
  entityIds: readonly string[],
  start: Date,
  end: Date
): string {
  const startTime = encodeURIComponent(start.toISOString());
  const endTime = encodeURIComponent(end.toISOString());
  const entities = encodeURIComponent(entityIds.join(","));

  return (
    `history/period/${startTime}` +
    `?end_time=${endTime}` +
    `&filter_entity_id=${entities}` +
    "&minimal_response&no_attributes"
  );
}

export async function loadTrendHistory(
  hass: HomeAssistant,
  entityIds: readonly string[],
  timeframe: TrendTimeframe,
  end = new Date()
): Promise<TrendHistoryResult> {
  const uniqueEntityIds = [...new Set(
    entityIds.map((entityId) => entityId.trim()).filter(Boolean)
  )];
  const range = getTrendTimeRange(timeframe, end);

  if (!uniqueEntityIds.length) {
    return {
      ...range,
      entities: {},
    };
  }

  const response = await hass.callApi<TrendHistoryState[][]>(
    "GET",
    createHistoryPath(uniqueEntityIds, range.start, range.end)
  );
  if (!Array.isArray(response)) {
    throw new Error("Home Assistant returned an invalid history response");
  }
  const entities: Record<string, TrendHistoryState[]> = {};

  uniqueEntityIds.forEach((entityId, index) => {
    const group = Array.isArray(response[index]) ? response[index] : [];
    const responseEntityId = group.find((state) => state.entity_id)?.entity_id;
    entities[responseEntityId ?? entityId] = group;
  });

  return {
    ...range,
    entities,
  };
}
