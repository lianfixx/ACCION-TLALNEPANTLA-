const zone = "America/Mexico_City";
export function activityLocalTime(value?: number) {
  return value ? new Intl.DateTimeFormat("sv-SE", {timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(value).replace(" ","T") : "";
}
/** Resolve local wall time through the same IANA zone used for display, including historical DST. */
export function activityTimeToEpoch(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return NaN;
  const [,year,month,day,hour,minute] = match.map(Number);
  const wall = Date.UTC(year, month-1, day, hour, minute);
  let result = wall + 6 * 3600000;
  for (let step=0;step<3;step++) {
    const parts = new Intl.DateTimeFormat("en-CA", {timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(result);
    const p = Object.fromEntries(parts.map(part=>[part.type,Number(part.value)]));
    result += wall - Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
  }
  return activityLocalTime(result) === value ? result : NaN;
}
