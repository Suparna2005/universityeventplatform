import React, { useEffect, useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { DialogFrame } from './UI';

export const PromptModal = ({ isOpen, title, message, defaultValue = '', placeholder = '', onConfirm, onCancel }) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const submit = (event) => {
    event.preventDefault();
    onConfirm?.(value);
    setValue(defaultValue);
  };

  return (
    <DialogFrame title={title} onClose={onCancel} className="ui-prompt-dialog" initialFocus="input">
      {message && <p className="ui-dialog-description">{message}</p>}
      <form onSubmit={submit}>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="input-glass"
          aria-label={title}
        />
        <div className="ui-dialog-actions">
          <button type="button" onClick={onCancel} className="btn-secondary ui-dialog-cancel">Cancel</button>
          <button type="submit" className="btn-primary">Submit</button>
        </div>
      </form>
    </DialogFrame>
  );
};

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmColor = 'var(--primary)' }) => {
  if (!isOpen) return null;

  return (
    <DialogFrame title={title} onClose={onCancel} className="ui-confirm-dialog" initialFocus=".ui-dialog-cancel">
      {message && <p className="ui-dialog-description">{message}</p>}
      <div className="ui-dialog-actions">
        <button type="button" onClick={onCancel} className="btn-secondary ui-dialog-cancel">Cancel</button>
        <button type="button" onClick={onConfirm} className="btn-primary" style={{ background: confirmColor }}>{confirmText}</button>
      </div>
    </DialogFrame>
  );
};

export const AlertModal = ({ isOpen, title = 'Notification', message, onClose, isError = false }) => {
  if (!isOpen) return null;

  return (
    <DialogFrame title={title} onClose={onClose} className="ui-alert-dialog" initialFocus="button">
      <div className={`ui-dialog-status-icon${isError ? ' is-error' : ''}`} aria-hidden="true">
        {isError ? <CircleAlert size={25} /> : <Check size={25} />}
      </div>
      <p className="ui-dialog-description">{message}</p>
      <div className="ui-dialog-actions">
        <button type="button" onClick={onClose} className="btn-primary">Okay</button>
      </div>
    </DialogFrame>
  );
};
