import type { DashboardRecommendationPreview } from "../recommendation/recommendation.types";
import type {
  SetupCompleteDetail,
  SetupDraft,
  SetupSection,
} from "./setup.types";

export function createSetupDraft(
  preview:DashboardRecommendationPreview
):SetupDraft {
  return {
    kpis:preview.kpis.map((item, order) => ({
      enabled:true,
      entityId:item.entityId,
      displayName:item.displayName,
      order,
      kind:item.kind,
      title:item.title,
      source:item,
    })),
    trend:preview.trend.map((item, order) => ({
      enabled:true, entityId:item.entityId, displayName:item.displayName,
      order, source:item,
    })),
    circuits:preview.circuits.map((item, order) => ({
      enabled:true, entityId:item.entityId, displayName:item.displayName,
      order, source:item,
    })),
    source:preview,
  };
}

export function toggleSetupItem(
  draft:SetupDraft,
  section:SetupSection,
  order:number
):SetupDraft {
  const items = draft[section].map((item) =>
    item.order === order ? { ...item, enabled:!item.enabled } : item
  );
  return { ...draft, [section]:items } as SetupDraft;
}

export function moveSetupItem(
  draft:SetupDraft,
  section:SetupSection,
  order:number,
  direction:-1 | 1
):SetupDraft {
  const sorted = [...draft[section]].sort(
    (left, right) => left.order - right.order
  );
  const index = sorted.findIndex((item) => item.order === order);
  const target = index + direction;
  if (index >= 0 && target >= 0 && target < sorted.length) {
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  }
  const items = sorted.map((item, nextOrder) => ({ ...item, order:nextOrder }));
  return { ...draft, [section]:items } as SetupDraft;
}

export function updateSetupItem(
  draft:SetupDraft,
  section:SetupSection,
  order:number,
  changes:{ entityId?:string; displayName?:string }
):SetupDraft {
  const items = draft[section].map((item) =>
    item.order === order ? { ...item, ...changes } : item
  );
  return { ...draft, [section]:items } as SetupDraft;
}

export function createSetupCompleteDetail(draft:SetupDraft):SetupCompleteDetail {
  return { draft:structuredClone(draft) };
}
