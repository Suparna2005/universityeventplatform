import React, { useState } from 'react';

export const PromptModal = ({ isOpen, title, message, defaultValue = '', placeholder = '', onConfirm, onCancel }) => {
  const [value, setValue] = useState(defaultValue);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999
    }}>
      <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.95)' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>{title}</h3>
        {message && <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>{message}</p>}
        
        <input 
          type="text" 
          value={value} 
          onChange={(e) => setValue(e.target.value)} 
          placeholder={placeholder}
          className="input-glass"
          autoFocus
        />

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
          <button onClick={() => {
            onConfirm(value);
            setValue(defaultValue);
          }} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Submit</button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmColor = 'var(--primary)' }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999
    }}>
      <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.95)' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>{title}</h3>
        {message && <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{message}</p>}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
          <button onClick={onConfirm} className="btn-primary" style={{ padding: '0.5rem 1rem', background: confirmColor, borderColor: confirmColor }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export const AlertModal = ({ isOpen, title = "Notification", message, onClose, isError = false }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 10000
    }}>
      <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.95)', textAlign: 'center' }}>
        <div style={{ marginBottom: '1rem' }}>
          {isError ? (
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '1.5rem', fontWeight: 'bold' }}>!</div>
          ) : (
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '1.5rem', fontWeight: 'bold' }}>✓</div>
          )}
        </div>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{message}</p>

        <button onClick={onClose} className="btn-primary" style={{ padding: '0.6rem 2rem', width: '100%' }}>Okay</button>
      </div>
    </div>
  );
};
