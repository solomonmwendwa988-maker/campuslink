import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};


export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);
  if (!open) return null;
  return <div className="campus-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section className="campus-dialog" role="alertdialog" aria-modal="true" aria-labelledby="campus-dialog-title" aria-describedby={description ? 'campus-dialog-description' : undefined}>
      <button className="campus-dialog-close" type="button" aria-label="Close dialog" disabled={busy} onClick={onCancel}><X size={17}/></button>
      <div className={`campus-dialog-icon ${tone}`}><span className="campus-dialog-alert-mark">!</span></div>
      <h2 id="campus-dialog-title">{title}</h2>
      {description && <p id="campus-dialog-description">{description}</p>}
      <div className="campus-dialog-actions"><button type="button" className="campus-dialog-cancel" disabled={busy} onClick={onCancel}>{cancelLabel}</button><button ref={confirmRef} type="button" className={`campus-dialog-confirm ${tone}`} disabled={busy} onClick={() => void onConfirm()}>{busy ? 'Please wait…' : confirmLabel}{!busy && <Check size={16}/>}</button></div>
    </section>
  </div>;
}

type ReportDialogProps = { open: boolean; username: string; busy?: boolean; onSubmit: (details: string) => void | Promise<void>; onCancel: () => void };
export function ReportDialog({ open, username, busy = false, onSubmit, onCancel }: ReportDialogProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [details, setDetails] = useState('');
  useEffect(() => { if (open) { setDetails(''); fieldRef.current?.focus(); } }, [open]);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onCancel(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [open, busy, onCancel]);
  if (!open) return null;
  return <div className="campus-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}><section className="campus-dialog campus-report-dialog" role="dialog" aria-modal="true" aria-labelledby="campus-report-title"><button className="campus-dialog-close" type="button" aria-label="Close dialog" disabled={busy} onClick={onCancel}><X size={17}/></button><div className="campus-dialog-icon primary"><span className="campus-dialog-alert-mark">!</span></div><h2 id="campus-report-title">Report @{username}</h2><p>Share any details that could help our team review this report. This is optional.</p><textarea ref={fieldRef} value={details} onChange={event => setDetails(event.target.value)} placeholder="What happened? (optional)" maxLength={1000}/><div className="campus-dialog-actions"><button className="campus-dialog-cancel" type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="campus-dialog-confirm primary" type="button" disabled={busy} onClick={() => void onSubmit(details.trim())}>{busy ? 'Submitting…' : 'Submit report'}<Check size={16}/></button></div></section></div>;
}


