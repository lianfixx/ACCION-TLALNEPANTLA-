export function safeReturnTo(value: unknown) {
  if (typeof value !== "string" || value.length > 800 || /[\\\r\n]/.test(value)) return "";
  return /^\/((?:participacion|mi-comision)(?:[?#]|$)|actualidad\/[a-z0-9-]+(?:[?#]|$))/.test(value) ? value : "";
}
export function signInPath(returnTo = "/participacion") {
  return `/ingresar?returnTo=${encodeURIComponent(safeReturnTo(returnTo) || "/participacion")}`;
}
