'use client';
import { useRef, useState, type FormHTMLAttributes } from 'react';
import { DraftChangeContext } from './VersionedForm';

export default function DraftForm({ children, onChange, onReset, onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const [dirty, setDirty] = useState(false);
  const [saving,setSaving]=useState(false),inFlight=useRef(false);
  return <DraftChangeContext.Provider value={() => setDirty(true)}><form {...props} data-dirty={dirty ? 'true' : undefined}
    onSubmit={async event=>{event.preventDefault();if(inFlight.current)return;inFlight.current=true;setSaving(true);try{await onSubmit?.(event);}finally{inFlight.current=false;setSaving(false);}}}
    onChange={event => { setDirty(true); onChange?.(event); }}
    onReset={event => { setDirty(false); onReset?.(event); }}>
    <fieldset className="admin-form-fields" disabled={saving}>{children}</fieldset>
  </form></DraftChangeContext.Provider>;
}
