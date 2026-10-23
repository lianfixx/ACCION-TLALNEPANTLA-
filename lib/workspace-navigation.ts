const tabs = ["solicitud", "expediente", "afiliacion", "actividades", "equipo", "archivo"] as const;
export function workspaceTab(value: unknown) {
  return typeof value === "string" && tabs.includes(value as typeof tabs[number]) ? value : "";
}
