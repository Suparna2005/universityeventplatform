import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users } from 'lucide-react';

const UserManagement = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [usersList, setUsersList] = useState([]);
  const baseURL = '';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsersList(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await axios.post(`${baseURL}/api/admin/users`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage(`Successfully created credentials for ${formData.email} as a ${formData.role}!`);
      setFormData({ name: '', email: '', password: '', role: 'student', department: '' });
      fetchUsers(); // Refresh the list!
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating user');
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
      
      {/* LEFT: Generation Form */}
      <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <UserPlus size={28} color="var(--primary)" />
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>Generate User Credentials</h2>
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Only administrators have permission to generate credentials for new platform users.
        </p>

        {message && <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '1rem' }}>{message}</div>}
        {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
            <input type="text" className="input-glass" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>University Email</label>
            <input type="email" className="input-glass" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Temporary Password</label>
            <input type="text" className="input-glass" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>System Role</label>
            <select className="input-glass" required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="coordinator">Coordinator</option>
              <option value="finance">Finance</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Department</label>
            <select className="input-glass" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
              <option value="" disabled>Select Department</option>
              <option value="CSE">Computer Science & Engineering (CSE)</option>
              <option value="ECE">Electronics & Communication (ECE)</option>
              <option value="ME">Mechanical Engineering (ME)</option>
              <option value="CE">Civil Engineering (CE)</option>
              <option value="BBA">Business Administration (BBA)</option>
              <option value="BCA">Computer Applications (BCA)</option>
              <option value="Law">School of Law</option>
              <option value="Other">Other / Administration</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '0.8rem' }}>Generate Credentials</button>
        </form>
      </div>

      {/* RIGHT: List of Users */}
      <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <Users size={28} color="var(--primary)" />
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>Registered Users ({usersList.length})</h2>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem 0.5rem' }}>Name</th>
                <th style={{ padding: '1rem 0.5rem' }}>Email</th>
                <th style={{ padding: '1rem 0.5rem' }}>Role</th>
                <th style={{ padding: '1rem 0.5rem' }}>Department</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
                      background: u.role === 'admin' ? '#fee2e2' : u.role === 'coordinator' ? '#dbeafe' : '#f1f5f9',
                      color: u.role === 'admin' ? '#991b1b' : u.role === 'coordinator' ? '#1e40af' : '#475569'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>{u.department || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
