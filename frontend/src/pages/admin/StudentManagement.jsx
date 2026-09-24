import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Search } from 'lucide-react';

const StudentManagement = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const baseURL = '';

  const [csvFile, setCsvFile] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/coordinator/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudentsList(res.data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    
    setMessage('');
    setError('');
    const form = new FormData();
    form.append('file', csvFile);

    try {
      const res = await axios.post(`${baseURL}/api/coordinator/students/csv`, form, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage(res.data.message || 'Students imported successfully.');
      setCsvFile(null);
      e.target.reset();
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading CSV');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      if (editingUserId) {
        const res = await axios.put(`${baseURL}/api/coordinator/students/${editingUserId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage(res.data.message);
        setEditingUserId(null);
      } else {
        const res = await axios.post(`${baseURL}/api/coordinator/students`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage(res.data.message);
      }
      setFormData({ name: '', email: '', password: '' });
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving student');
    }
  };

  const handleEditClick = (u) => {
    setEditingUserId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      password: ''
    });
    setMessage('');
    setError('');
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await axios.delete(`${baseURL}/api/coordinator/students/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchStudents();
    } catch (err) {
      alert(`Error deleting student: ${err.response?.data?.detail || err.message}`);
    }
  };

  const searchedStudents = studentsList.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '2rem' }}>
      
      {/* LEFT: Generation Form */}
      <div className="glass-card" style={{ padding: '2rem', height: 'fit-content', position: 'sticky', top: '100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <UserPlus size={28} color="var(--primary)" />
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>{editingUserId ? "Edit Student" : "Manage Students"}</h2>
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {editingUserId ? "Modify the student's details." : "Generate credentials for students in your department individually or via CSV."}
        </p>

        {message && <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '1rem' }}>{message}</div>}
        {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: editingUserId ? '0' : '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
            <input type="text" className="input-glass" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>University Email</label>
            <input type="email" className="input-glass" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{editingUserId ? "New Password (Optional)" : "Temporary Password"}</label>
            <input type="text" className="input-glass" required={!editingUserId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingUserId ? "Leave blank to keep current" : ""} />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '0.8rem' }}>
            {editingUserId ? "Save Changes" : "Generate Student"}
          </button>
          
          {editingUserId && (
            <button type="button" onClick={() => {setEditingUserId(null); setFormData({name:'',email:'',password:''});}} className="btn-secondary" style={{ marginTop: '0.5rem', padding: '0.8rem' }}>
              Cancel Edit
            </button>
          )}
        </form>

        {!editingUserId && (
          <div style={{ borderTop: '2px dashed var(--glass-border)', paddingTop: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Bulk Upload via CSV</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Upload a CSV with columns: <strong>name, email, password, year, section</strong></p>
            <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="file" accept=".csv" required onChange={e => setCsvFile(e.target.files[0])} className="input-glass" />
              <button type="submit" className="btn-primary">Upload & Generate</button>
            </form>
          </div>
        )}
      </div>

      {/* RIGHT: List of Students */}
      <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Users size={28} color="var(--primary)" />
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>My Department Students ({studentsList.length})</h2>
          </div>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search students by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-glass"
              style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem 0.5rem' }}>Name</th>
                <th style={{ padding: '1rem 0.5rem' }}>Email</th>
                <th style={{ padding: '1rem 0.5rem' }}>Department</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {searchedStudents.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>{u.department || '-'}</td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEditClick(u)} 
                      style={{ padding: '0.4rem 0.8rem', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Edit Profile
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(u.id)} 
                      style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {searchedStudents.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
