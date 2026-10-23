"use client";

import { createContext, useContext, useState, useRef, type FormEvent, type ReactNode } from "react";
import { reconcileDraft, type Draft, type Versioned } from "@/lib/versioned-draft";

export const DraftChangeContext = createContext(() => {});
export const useVersionedChange = () => useContext(DraftChangeContext);

export default function VersionedForm<T extends Versioned>({ record, onSubmit, children, className }: {
  className?: string;
  record: T;
  onSubmit: (event: FormEvent<HTMLFormElement>, snapshot: T) => Promise<boolean>;
  children: (snapshot: T) => ReactNode;
}) {
  const [draft, setDraft] = useState<Draft<T>>({ record, dirty: false });
  const [saving,setSaving]=useState(false),inFlight=useRef(false);
  const current = reconcileDraft(draft, record);
  if (current !== draft) setDraft(current);
  const changedElsewhere = current.dirty && current.record.updatedAt !== record.updatedAt;

  return <DraftChangeContext.Provider value={() => setDraft(value => ({ ...value, dirty: true }))}><form className={className} key={current.record.updatedAt} data-dirty={current.dirty ? "true" : undefined}
    onChange={() => setDraft(value => ({ ...value, dirty: true }))}
    onSubmit={async event => {
      event.preventDefault();
      if(inFlight.current)return;inFlight.current=true;setSaving(true);
      try { if (await onSubmit(event, current.record)) setDraft(value => ({ ...value, dirty: false })); }
      finally {inFlight.current=false;setSaving(false);}
    }}>
    {changedElsewhere && <div className="admin-note" role="status">
      <p>Este registro cambió mientras lo editabas. Tu borrador sigue aquí; guardarlo no sobrescribirá la otra versión.</p>
      <button type="button" className="button button-secondary" disabled={saving} onClick={() => setDraft({ record, dirty: false })}>Descartar borrador y cargar versión actual</button>
    </div>}
    <input type="hidden" name="expectedUpdatedAt" value={current.record.updatedAt} />
    <fieldset className="admin-form-fields" disabled={saving}>{children(current.record)}</fieldset>
  </form></DraftChangeContext.Provider>;
}
