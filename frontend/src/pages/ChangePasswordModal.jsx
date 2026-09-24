import React, { useState } from 'react';
import axios from 'axios';

const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      const baseURL = ''; // React injects proxy or you can use relative if configured
      await axios.post(`${baseURL}/api/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess("Password changed successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password");
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: '2rem', width: '400px', background: 'white', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✖</button>
        <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>Change Password</h3>
        
        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>{success}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Current Password</label>
            <input type="password" required className="input-glass" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>New Password</label>
            <input type="password" required className="input-glass" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Confirm New Password</label>
            <input type="password" required className="input-glass" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Update Password</button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
