import { useEffect, useRef, useState, type RefObject } from 'react';
import { AlertTriangle, Check, LogOut, X } from 'lucide-react';

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

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDialogKeyboard(open: boolean, busy: boolean, onCancel: () => void, dialogRef: RefObject<HTMLElement | null>) {
  const busyRef = useRef(busy);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    busyRef.current = busy;
    cancelRef.current = onCancel;
  }, [busy, onCancel]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])
      .filter(el => !el.hasAttribute('aria-hidden') && el.offsetParent !== null);
    const cancel = dialog?.querySelector<HTMLElement>('.campus-dialog-cancel');
    (cancel ?? dialog)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        cancelRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, dialogRef]);
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState(false);
  const actionBusy = busy || confirming;
  useDialogKeyboard(open, actionBusy, onCancel, dialogRef);
  if (!open) return null;
  const isLogout = /log\s*out|sign\s*out/i.test(title);

  const confirm = async () => {
    if (actionBusy) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="campus-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !actionBusy) onCancel(); }}>
      <section ref={dialogRef} tabIndex={-1} className={`campus-dialog ${isLogout ? "campus-dialog-logout" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby="campus-dialog-title" aria-describedby={description ? 'campus-dialog-description' : undefined}>
        <button className="campus-dialog-close" type="button" aria-label="Close dialog" disabled={actionBusy} onClick={onCancel}><X size={17}/></button>
        <div className={`campus-dialog-icon ${tone}`} aria-hidden="true">{isLogout ? <LogOut size={21} strokeWidth={2} /> : <AlertTriangle size={21} strokeWidth={2} />}</div>
        <h2 id="campus-dialog-title">{title}</h2>
        {description && <p id="campus-dialog-description">{description}</p>}
        <div className="campus-dialog-actions">
          <button type="button" className="campus-dialog-cancel" disabled={actionBusy} onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`campus-dialog-confirm ${tone}`} disabled={actionBusy} onClick={() => void confirm()}>{actionBusy ? 'Please wait…' : confirmLabel}{!actionBusy && <Check size={16}/>}</button>
        </div>
      </section>
    </div>
  );
}

type ReportDialogProps = { open: boolean; username: string; busy?: boolean; onSubmit: (details: string) => void | Promise<void>; onCancel: () => void };
export function ReportDialog({ open, username, busy = false, onSubmit, onCancel }: ReportDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const actionBusy = busy || submitting;

  useEffect(() => {
    if (open) setDetails('');
  }, [open]);
  useDialogKeyboard(open, actionBusy, onCancel, dialogRef);
  if (!open) return null;

  const submit = async () => {
    if (actionBusy) return;
    setSubmitting(true);
    try {
      await onSubmit(details.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="campus-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !actionBusy) onCancel(); }}>
      <section ref={dialogRef} tabIndex={-1} className="campus-dialog campus-report-dialog" role="dialog" aria-modal="true" aria-labelledby="campus-report-title">
        <button className="campus-dialog-close" type="button" aria-label="Close dialog" disabled={actionBusy} onClick={onCancel}><X size={17}/></button>
        <div className="campus-dialog-icon primary" aria-hidden="true"><span className="campus-dialog-alert-mark">!</span></div>
        <h2 id="campus-report-title">Report @{username}</h2>
        <p>Share any details that could help our team review this report. This is optional.</p>
        <label className="campus-report-label" htmlFor="campus-report-details">Additional details (optional)</label>
        <textarea id="campus-report-details" ref={fieldRef} value={details} onChange={event => setDetails(event.target.value)} placeholder="What happened?" maxLength={1000} disabled={actionBusy}/>
        <div className="campus-dialog-actions">
          <button className="campus-dialog-cancel" type="button" disabled={actionBusy} onClick={onCancel}>Cancel</button>
          <button className="campus-dialog-confirm primary" type="button" disabled={actionBusy} onClick={() => void submit()}>{actionBusy ? 'Submitting…' : 'Submit report'}{!actionBusy && <Check size={16}/>}</button>
        </div>
      </section>
    </div>
  );
}
