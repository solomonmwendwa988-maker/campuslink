import { useId, type ReactNode } from 'react';
import { CircleHelp, RefreshCw, Search } from 'lucide-react';

type StateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};
type ErrorStateProps = Omit<StateProps, 'title'> & { title?: string };

export function LoadingState({ label = 'Loading…', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={`cl-state cl-state-loading${compact ? ' compact' : ''}`} role="status" aria-live="polite" aria-atomic="true">
      <RefreshCw className="cl-state-spinner" size={compact ? 18 : 24} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action, icon, className = '' }: StateProps) {
  const titleId = useId();
  return (
    <section className={`cl-state cl-state-empty ${className}`} aria-labelledby={titleId}>
      <div className="cl-state-icon" aria-hidden="true">{icon ?? <Search size={22} />}</div>
      <h3 id={titleId}>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="cl-state-action">{action}</div>}
    </section>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete this request. Please try again.',
  action,
  icon,
  className = '',
}: ErrorStateProps) {
  const titleId = useId();
  return (
    <section className={`cl-state cl-state-error ${className}`} role="alert" aria-labelledby={titleId}>
      <div className="cl-state-icon" aria-hidden="true">{icon ?? <CircleHelp size={22} />}</div>
      <h3 id={titleId}>{title}</h3>
      <p>{description}</p>
      {action && <div className="cl-state-action">{action}</div>}
    </section>
  );
}

export function InlineNotice({
  children,
  tone = 'info',
  className = '',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  return (
    <div className={`cl-inline-notice ${tone} ${className}`} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
