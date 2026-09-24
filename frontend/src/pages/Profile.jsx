import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    phone_number: '',
    department: '',
    gender: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        phone_number: user.phone_number || '',
        department: user.department || '',
        gender: user.gender || ''
      });
      setProfilePicture(user.profile_picture);
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const uploadData = new FormData();
    uploadData.append('file', file);
    
    try {
      setLoading(true);
      const res = await axios.post(`${baseURL}/api/profile/upload-picture`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePicture(res.data.profile_picture);
      setUser(res.data); // Update context
      setMessage('Profile picture updated successfully!');
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Upload failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.put(`${baseURL}/api/profile/me`, formData);
      setUser(res.data);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Update failed'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => navigate(user.role === 'student' ? '/dashboard' : '/admin')} className="btn-secondary" style={{ marginBottom: '2rem' }}>
        &larr; Back to Dashboard
      </button>

      <div className="glass-card animate-fade-in" style={{ padding: '3rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--primary)' }}>My Profile</h2>
        
        {message && <div className="badge badge-warning" style={{ display: 'block', marginBottom: '1rem', padding: '1rem' }}>{message}</div>}

        <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>
          {/* Picture Upload */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '150px', height: '150px', borderRadius: '50%', 
              backgroundColor: 'var(--bg)', border: '4px solid var(--secondary)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              {profilePicture ? (
                <img src={`${baseURL}${profilePicture}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>👤</span>
              )}
            </div>
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
              Change Picture
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} disabled={loading} />
            </label>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input-glass" required />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={user.email} className="input-glass" disabled style={{ opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label>Phone Number</label>
                <input type="text" name="phone_number" value={formData.phone_number} onChange={handleInputChange} className="input-glass" />
              </div>
              <div style={{ flex: 1 }}>
                <label>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="input-glass">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label>Department</label>
              <input type="text" name="department" value={formData.department} onChange={handleInputChange} className="input-glass" />
            </div>
            <div>
              <label>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleInputChange} className="input-glass" rows="4" placeholder="Tell us about yourself..." />
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => setShowChangePassword(true)}>
              Change Password
            </button>
          </form>
        </div>
      </div>
      
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default Profile;
