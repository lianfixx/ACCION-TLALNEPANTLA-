import { getRuntimeEnv } from "./runtime-env";
import type { CommissionId } from "./commissions";
import { commissionIds, contentBlocks, contentDefaults, parseContentBlock, processStepKeys, type CommissionContent, type ProcessStep, type ProcessStepKey } from "./site-content-defaults";

export type ContentRecord = { key: string; value: Record<string, unknown>; updatedAt: number; updatedBy: string; custom: boolean };
type Row = { key: string; value_json: string; updated_at: number; updated_by: string };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Every block with its saved value merged over the default. A missing or invalid row uses the default. */
export async function readContentRecords(): Promise<Record<string, ContentRecord>> {
  const records = Object.fromEntries(contentBlocks.map(block => [block.key, { key: block.key, value: clone(contentDefaults[block.key]), updatedAt: 0, updatedBy: "", custom: false }])) as Record<string, ContentRecord>;
  const db = getRuntimeEnv().DB;
  if (!db) return records;
  let rows: Row[] = [];
  try { rows = (await db.prepare("SELECT key, value_json, updated_at, updated_by FROM site_content").all<Row>()).results ?? []; }
  catch { return records; }
  for (const row of rows) {
    const record = records[row.key];
    if (!record) continue;
    try { record.value = parseContentBlock(row.key, JSON.parse(row.value_json)); }
    catch { /* A row that no longer validates keeps the default text visible. */ }
    // The version is kept even for an invalid row so the panel can replace or reset it.
    record.custom = true;
    record.updatedAt = row.updated_at;
    record.updatedBy = row.updated_by;
  }
  return records;
}

export async function readContentRecord(key: string) {
  return (await readContentRecords())[key] ?? null;
}

type Heading = { eyebrow: string; title: string; emphasis: string };
export type SiteContent = {
  commissions: CommissionContent[];
  steps: ProcessStep[];
  home: { hero: Heading; welcome: { title: string; text: string }; history: { title: string; emphasis: string; text: string }; commissions: Heading & { text: string }; combination: Heading; team: { name: string; role: string; note: string } };
  comisiones: Heading & { lead: string; stepsTitle: string };
  participacion: Heading & { lead: string };
  enlaces: {
    header: Heading & { lead: string };
    requirements: Heading & { intro: string; items: string[] };
    seats: Heading & { roles: Record<CommissionId, string> };
    calendar: { title: string; emphasis: string; items: Array<{ when: string; what: string }> };
    selection: { eyebrow: string; criteria: Array<{ label: string; percent: number }>; note: string };
    duties: { eyebrow: string; items: string[]; note: string };
    apply: { title: string; emphasis: string; note: string };
  };
};

/** Public text for the pages. Never throws: without D1 the defaults are returned. */
export async function siteContent(): Promise<SiteContent> {
  let records: Record<string, ContentRecord>;
  try { records = await readContentRecords(); }
  catch { records = Object.fromEntries(contentBlocks.map(block => [block.key, { key: block.key, value: clone(contentDefaults[block.key]), updatedAt: 0, updatedBy: "", custom: false }])); }
  const v = <T,>(key: string) => records[key].value as T;
  const order = v<{ order: CommissionId[] }>("commissions.order").order;
  const stepValues = v<{ steps: Record<ProcessStepKey, { title: string; hint: string }> }>("process.steps").steps;
  return {
    commissions: order.filter(id => commissionIds.includes(id)).map(id => ({ id, ...v<Omit<CommissionContent, "id">>(`commission.${id}`) })),
    steps: processStepKeys.map(key => ({ key, ...stepValues[key] })),
    home: { hero: v("home.hero"), welcome: v("home.welcome"), history: v("home.history"), commissions: v("home.commissions"), combination: v("home.combination"), team: v("home.team") },
    comisiones: v("comisiones.header"),
    participacion: v("participacion.intro"),
    enlaces: { header: v("enlaces.header"), requirements: v("enlaces.requirements"), seats: v("enlaces.seats"), calendar: v("enlaces.calendar"), selection: v("enlaces.selection"), duties: v("enlaces.duties"), apply: v("enlaces.apply") },
  };
}

export const commissionLabel = (list: Array<{ id: string; name: string }>, id: string) => list.find(item => item.id === id)?.name ?? id;
