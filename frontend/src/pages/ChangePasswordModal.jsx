import React, { useState } from 'react';
import axios from 'axios';
import { DialogFrame } from '../components/UI';

const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess('Password changed successfully.');
      window.setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogFrame title="Change password" onClose={onClose} className="change-password-dialog" initialFocus="input">
      {error && <div className="auth-error" role="alert">{error}</div>}
      {success && <div className="profile-notice profile-notice-success" role="status">{success}</div>}
      <form onSubmit={handleSubmit} className="change-password-form">
        <div className="ui-form-field"><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" required className="input-glass" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>
        <div className="ui-form-field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={6} required className="input-glass" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div>
        <div className="ui-form-field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required className="input-glass" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>
        <div className="ui-dialog-actions">
          <button type="button" onClick={onClose} className="btn-secondary ui-dialog-cancel">Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Update password'}</button>
        </div>
      </form>
    </DialogFrame>
  );
};

export default ChangePasswordModal;
