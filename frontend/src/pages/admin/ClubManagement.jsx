import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Users, Edit2, Check, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../components/Modals';

const ClubManagement = () => {
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: () => setConfirmModal({ isOpen: false }) });
  
  // Edit State
  const [editingMember, setEditingMember] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGlobalDept, setEditGlobalDept] = useState('');

  const { user } = useContext(AuthContext);
  const baseURL = '';

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/clubs/list`);
      setClubs(res.data);
      if (res.data.length > 0) {
        handleSelectClub(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClubData, setNewClubData] = useState({ name: '', description: '', club_type: 'university', department: '', coordinator_email: '' });

  const handleCreateClubSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${baseURL}/api/clubs/`, newClubData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const successMessage = newClubData.coordinator_email && newClubData.coordinator_email.trim() !== ''
        ? 'Club created successfully! Coordinator has been notified via email.'
        : 'Club created successfully!';
      alert(successMessage);
      setShowCreateModal(false);
      setNewClubData({ name: '', description: '', club_type: 'university', department: '', coordinator_email: '' });
      fetchClubs();
    } catch (err) {
      alert(`Error creating club: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleSelectClub = async (clubId) => {
    setSelectedClub(clubId);
    setEditingMember(null);
    setShowRequests(false);
    try {
      const membersRes = await axios.get(`${baseURL}/api/clubs/${clubId}/members`);
      setMembers(membersRes.data);
    } catch (err) {
      console.error("Failed to load members", err);
    }
    
    try {
      const requestsRes = await axios.get(`${baseURL}/api/clubs/${clubId}/requests`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setJoinRequests(requestsRes.data);
    } catch (err) {
      console.warn("Could not load requests (possibly unauthorized)");
      setJoinRequests([]);
    }
  };

  const handleRequestAction = async (reqId, action) => {
    try {
      if (action === 'forward') {
        await axios.put(`${baseURL}/api/clubs/requests/${reqId}/forward`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      } else {
        await axios.post(`${baseURL}/api/clubs/requests/${reqId}/${action}`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      }
      alert(`Request ${action}ed successfully!`);
      // Refresh the club to get updated members/requests
      handleSelectClub(selectedClub);
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Action failed'}`);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/clubs/${selectedClub}/members/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `club_${selectedClub}_members.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(`Error downloading CSV: ${err.response?.data?.detail || err.message}`);
    }
  };

  const savePoints = async (userId, newPoints) => {
    try {
      await axios.put(`${baseURL}/api/clubs/${selectedClub}/members/${userId}/points`, {
        activity_points: parseInt(newPoints)
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMembers(members.map(m => m.user_id === userId ? { ...m, activity_points: parseInt(newPoints) } : m));
    } catch (err) {
      alert(`Error updating points: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${baseURL}/api/clubs/${selectedClub}/gallery`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
      });
      alert('Photo uploaded to gallery!');
    } catch (err) {
      alert(`Error uploading photo: ${err.response?.data?.detail || err.message}`);
    }
  };

  const startEditing = (member) => {
    setEditingMember(member.id);
    setEditRole(member.role);
    setEditDept(member.club_department || '');
    setEditName(member.user_name || '');
    setEditEmail(member.user_email || '');
    setEditGlobalDept(member.user_department || '');
  };

  const saveEdit = async (userId, globalRole) => {
    try {
      // 1. Update club role
      await axios.put(`${baseURL}/api/clubs/${selectedClub}/members/${userId}/role`, {
        role: editRole,
        club_department: editDept
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // 2. Update global user profile
      await axios.put(`${baseURL}/api/admin/users/${userId}`, {
        name: editName,
        email: editEmail,
        department: editGlobalDept,
        role: globalRole || 'student', // Fallback
        password: ''
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state
      setMembers(members.map(m => 
        m.user_id === userId 
          ? { ...m, role: editRole, club_department: editDept, user_name: editName, user_email: editEmail, user_department: editGlobalDept } 
          : m
      ));
      setEditingMember(null);
    } catch (err) {
      alert(`Error updating member: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleRemoveMember = (userId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the club?',
      confirmText: 'Remove',
      confirmColor: '#dc2626',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${baseURL}/api/clubs/${selectedClub}/members/${userId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setMembers(members.filter(m => m.user_id !== userId));
        } catch (err) {
          alert(`Error removing member: ${err.response?.data?.detail || err.message}`);
        }
      }
    });
  };

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [manualAddData, setManualAddData] = useState({
    email: '',
    role: 'member',
    name: '',
    system_role: 'student',
    department: ''
  });
  const [csvFile, setCsvFile] = useState(null);

  const handleAddMemberManual = async (e) => {
    e.preventDefault();
    if (!manualAddData.email) return;
    try {
      await axios.post(`${baseURL}/api/clubs/${selectedClub}/members/add`, {
        email: manualAddData.email,
        role: manualAddData.role.toLowerCase(),
        name: manualAddData.name,
        system_role: manualAddData.system_role,
        department: manualAddData.department,
        club_department: ""
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Member added successfully!');
      handleSelectClub(selectedClub);
      setShowAddMemberModal(false);
      setManualAddData({ email: '', role: 'member', name: '', system_role: 'student', department: '' });
    } catch (err) {
      alert(`Error adding member: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleBulkUploadMembers = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    
    const form = new FormData();
    form.append('file', csvFile);

    try {
      const res = await axios.post(`${baseURL}/api/clubs/${selectedClub}/members/csv`, form, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert(res.data.message || 'Members imported successfully.');
      setCsvFile(null);
      setShowAddMemberModal(false);
      handleSelectClub(selectedClub);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error uploading CSV');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Clubs...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <ConfirmModal {...confirmModal} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Users size={32} color="var(--primary)" />
        <h2 style={{ fontSize: '2rem', margin: 0 }}>Club Management</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Sidebar: List of Clubs */}
        <div className="glass-card" style={{ padding: '1rem', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary)' }}>All Clubs</h3>
            {user?.role === 'admin' && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>+ New</button>
            )}
          </div>

          {showCreateModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="glass-card" style={{ padding: '2rem', width: '400px', background: 'white' }}>
                <h3 style={{ marginTop: 0 }}>Create New Club</h3>
                <form onSubmit={handleCreateClubSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="text" className="input-glass" placeholder="Club Name" required value={newClubData.name} onChange={e => setNewClubData({...newClubData, name: e.target.value})} />
                  <input type="text" className="input-glass" placeholder="Description" required value={newClubData.description} onChange={e => setNewClubData({...newClubData, description: e.target.value})} />
                  <input 
                    type="email" 
                    className="input-glass" 
                    placeholder="Club Coordinator Email (Optional)" 
                    value={newClubData.coordinator_email} 
                    onChange={e => setNewClubData({...newClubData, coordinator_email: e.target.value})} 
                  />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create</button>
                    <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {clubs.map(club => (
              <li 
                key={club.id} 
                onClick={() => handleSelectClub(club.id)}
                style={{ 
                  padding: '0.75rem', 
                  cursor: 'pointer', 
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  backgroundColor: selectedClub === club.id ? 'var(--primary)' : 'transparent',
                  color: selectedClub === club.id ? 'white' : 'var(--text-main)',
                  transition: 'background 0.2s'
                }}
              >
                {club.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Main Content: Members List */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          {selectedClub ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>
                  {clubs.find(c => c.id === selectedClub)?.name} - Members
                </h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {joinRequests.length > 0 && (
                    <span className="badge badge-warning" onClick={() => setShowRequests(!showRequests)} style={{ cursor: 'pointer' }}>
                      {joinRequests.length} Pending Requests
                    </span>
                  )}
                  <span className="badge badge-secondary">{members.length} Total Members</span>
                  {user?.role === 'admin' && (
                    <button onClick={() => setShowAddMemberModal(true)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                      + Add Member
                    </button>
                  )}

                  <label className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer', margin: 0 }}>
                    Upload Photo
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleGalleryUpload} />
                  </label>
                </div>
              </div>

              {showAddMemberModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div className="glass-card" style={{ padding: '2rem', width: '500px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0 }}>Add Club Members</h3>
                      <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✖</button>
                    </div>

                    {/* Manual Add Form */}
                    <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                      <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Option 1: Add by Email</h4>
                      <form onSubmit={handleAddMemberManual} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Full Name (required for new users):</label>
                          <input type="text" className="input-glass" placeholder="John Doe" value={manualAddData.name} onChange={(e) => setManualAddData({...manualAddData, name: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>User Email (Required):</label>
                          <input 
                            type="email" 
                            required 
                            className="input-glass" 
                            placeholder="e.g. student@university.edu" 
                            value={manualAddData.email} 
                            onChange={(e) => setManualAddData({...manualAddData, email: e.target.value})}
                            onBlur={async (e) => {
                              if (!e.target.value) return;
                              try {
                                const res = await axios.get(`${baseURL}/api/clubs/lookup-user?email=${e.target.value}`, {
                                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                });
                                if (res.data.exists) {
                                  setManualAddData(prev => ({
                                    ...prev,
                                    name: res.data.name,
                                    system_role: res.data.role,
                                    department: res.data.department || ''
                                  }));
                                }
                              } catch (err) {}
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>System Role (Auto-fetched if user exists):</label>
                          <select className="input-glass" value={manualAddData.system_role} onChange={(e) => setManualAddData({...manualAddData, system_role: e.target.value})}>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="coordinator">Department Coordinator</option>
                            <option value="club_coordinator">Club Coordinator</option>
                            <option value="finance">Finance</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Department (if new user):</label>
                          <input type="text" className="input-glass" placeholder="e.g. CSE" value={manualAddData.department} onChange={(e) => setManualAddData({...manualAddData, department: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Club Role:</label>
                          <select className="input-glass" value={manualAddData.role} onChange={(e) => setManualAddData({...manualAddData, role: e.target.value})}>
                            <option value="member">Member</option>
                            <option value="core">Core</option>
                            <option value="head">Head</option>
                            <option value="president">President</option>
                            <option value="club_coordinator">Club Coordinator</option>
                          </select>
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add Single Member</button>
                      </form>
                    </div>

                    {/* Bulk Upload Form */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>Option 2: Bulk Import (CSV)</h4>
                        <a href={`${baseURL}/api/clubs/${selectedClub}/members/csv/template`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                          Download CSV Template
                        </a>
                      </div>
                      <form onSubmit={handleBulkUploadMembers} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input 
                          type="file" 
                          accept=".csv"
                          required
                          onChange={(e) => setCsvFile(e.target.files[0])}
                          className="input-glass"
                          style={{ padding: '0.5rem' }}
                        />
                        <button type="submit" className="btn-secondary" style={{ marginTop: '0.5rem' }}>
                          Upload & Import Members
                        </button>
                      </form>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        * The system will automatically create accounts for new users and email them their login credentials. They will also be added directly to this club.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {showRequests && joinRequests.length > 0 && (
                <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#b45309' }}>Pending Join Requests</h4>
                  {joinRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                      <div>
                        <strong>{req.user_name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({req.user_email})</span>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#4b5563' }}>"{req.message}"</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleRequestAction(req.id, 'forward')} className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>Forward to Admin</button>
                        <button onClick={() => handleRequestAction(req.id, 'reject')} className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {members.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No members found for this club.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                        <th style={{ padding: '1rem' }}>Name</th>
                        <th style={{ padding: '1rem' }}>Email</th>
                        <th style={{ padding: '1rem' }}>System Role</th>
                        <th style={{ padding: '1rem' }}>Club Role</th>
                        <th style={{ padding: '1rem' }}>Department</th>
                        <th style={{ padding: '1rem' }}>Points</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => (
                        <tr key={member.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          {/* Name Column */}
                          <td style={{ padding: '1rem', fontWeight: 500 }}>
                            {editingMember === member.id ? (
                              <input type="text" className="input-glass" style={{ padding: '0.25rem', width: '120px' }} value={editName} onChange={e => setEditName(e.target.value)} />
                            ) : (
                              member.user_name
                            )}
                          </td>

                          {/* Email Column */}
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            {editingMember === member.id ? (
                              <input type="email" className="input-glass" style={{ padding: '0.25rem', width: '150px' }} value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                            ) : (
                              member.user_email
                            )}
                          </td>
                          
                          {/* System Role Column */}
                          <td style={{ padding: '1rem' }}>
                            <span style={{ textTransform: 'capitalize', color: 'gray' }}>
                              {member.global_role?.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Club Role Column */}
                          <td style={{ padding: '1rem' }}>
                            {editingMember === member.id ? (
                              <select 
                                value={editRole} 
                                onChange={(e) => setEditRole(e.target.value)}
                                className="input-glass"
                                style={{ padding: '0.25rem' }}
                              >
                                <option value="member">Member</option>
                                <option value="core">Core</option>
                                <option value="head">Head</option>
                                <option value="president">President</option>
                              </select>
                            ) : (
                              <span className={`badge ${
                                member.role === 'president' ? 'badge-primary' : 
                                member.role === 'core' ? 'badge-warning' : 
                                member.role === 'head' ? 'badge-success' : 'badge-secondary'
                              }`}>
                                {member.role.toUpperCase()}
                              </span>
                            )}
                          </td>

                          {/* Department Column */}
                          <td style={{ padding: '1rem' }}>
                            {editingMember === member.id ? (
                              <input type="text" className="input-glass" style={{ padding: '0.25rem', width: '100px' }} value={editGlobalDept} onChange={e => setEditGlobalDept(e.target.value)} />
                            ) : (
                              member.user_department || '-'
                            )}
                          </td>
                          
                          {/* Points Column */}
                          <td style={{ padding: '1rem' }}>
                            <input 
                              type="number" 
                              defaultValue={member.activity_points || 0}
                              onBlur={(e) => savePoints(member.user_id, e.target.value)}
                              className="input-glass"
                              style={{ padding: '0.25rem', width: '60px' }}
                              min="0"
                            />
                          </td>

                          {/* Actions Column */}
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {editingMember === member.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => saveEdit(member.user_id, member.global_role)} style={{ background: 'none', border: 'none', color: 'green', cursor: 'pointer' }} title="Save">
                                  <Check size={20} />
                                </button>
                                <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }} title="Cancel">
                                  <X size={20} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => startEditing(member)} 
                                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                  title="Edit Role"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button 
                                  onClick={() => handleRemoveMember(member.user_id)} 
                                  style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                                  title="Remove Member"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Select a club from the left to view members.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubManagement;
