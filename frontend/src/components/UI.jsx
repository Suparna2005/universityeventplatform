import React, { useEffect, useId, useRef } from 'react';

export const PageHeader = ({ eyebrow, title, description, icon: Icon, actions }) => (
  <header className="ui-page-header">
    <div className="ui-page-heading">
      {Icon && <span className="ui-page-icon"><Icon size={21} aria-hidden="true" /></span>}
      <div>
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="ui-page-description">{description}</p>}
      </div>
    </div>
    {actions && <div className="ui-page-actions">{actions}</div>}
  </header>
);

export const MetricCard = ({ icon: Icon, label, value, detail, tone = 'blue' }) => (
  <article className={`ui-metric-card ui-metric-${tone}`}>
    {Icon && <span className="ui-metric-icon"><Icon size={21} aria-hidden="true" /></span>}
    <div className="ui-metric-content">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  </article>
);

const statusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (/reject|cancel|error|fail|absent|inactive/.test(normalized)) return 'danger';
  if (/pending|review|draft|upcoming|wait|not approved|unapproved/.test(normalized)) return 'warning';
  if (/complete|approved|publish|attend|success|active/.test(normalized)) return 'success';
  return 'neutral';
};

export const StatusBadge = ({ status, tone }) => (
  <span className={`ui-status-badge ui-status-${tone || statusTone(status)}`}>{status || 'Unknown'}</span>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="ui-empty-state" role="status">
    {Icon && <span className="ui-empty-icon"><Icon size={25} aria-hidden="true" /></span>}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action && <div className="ui-empty-action">{action}</div>}
  </div>
);

export const LoadingState = ({ label = 'Loading' }) => (
  <div className="ui-loading-state" role="status" aria-live="polite">
    <span className="ui-spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', description, action }) => (
  <div className="ui-error-state" role="alert">
    <strong>{title}</strong>
    {description && <span>{description}</span>}
    {action && <div>{action}</div>}
  </div>
);

export const FormField = ({ label, id, hint, error, children, className = '' }) => (
  <div className={`ui-form-field ${className}`.trim()}>
    {label && <label htmlFor={id}>{label}</label>}
    {children}
    {hint && !error && <small>{hint}</small>}
    {error && <small className="ui-field-error" role="alert">{error}</small>}
  </div>
);

export const TableToolbar = ({ children, className = '' }) => (
  <div className={`ui-table-toolbar ${className}`.trim()}>{children}</div>
);

export const DialogFrame = ({ title, children, onClose, className = '', initialFocus = 'button, input, select, textarea' }) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector(initialFocus)?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current?.();
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [initialFocus]);

  return (
    <div className="ui-dialog-backdrop">
      <section ref={dialogRef} className={`ui-dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="ui-dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
};
