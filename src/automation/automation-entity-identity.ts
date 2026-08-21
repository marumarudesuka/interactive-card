export function canonicalAutomationEntityId(entityId:string|undefined):string {
  return entityId?.trim().toLowerCase() ?? "";
}
