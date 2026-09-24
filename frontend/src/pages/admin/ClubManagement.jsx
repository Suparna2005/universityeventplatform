import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Users, Edit2, Check, X, Trash2 } from 'lucide-react';

const ClubManagement = () => {
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
  const [newClubData, setNewClubData] = useState({ name: '', description: '', club_type: 'university', department: '' });

  const handleCreateClubSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${baseURL}/api/clubs/`, newClubData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Club created successfully!');
      setShowCreateModal(false);
      setNewClubData({ name: '', description: '', club_type: 'university', department: '' });
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

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member from the club?")) return;
    try {
      await axios.delete(`${baseURL}/api/clubs/${selectedClub}/members/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMembers(members.filter(m => m.user_id !== userId));
    } catch (err) {
      alert(`Error removing member: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleAddMember = async () => {
    const email = window.prompt("Enter the exact email address of the user to add:");
    if (!email) return;
    const role = window.prompt("Enter role (member, core, head, president). Note: If they are a Coordinator, this will be auto-detected:", "member");
    if (!role) return;
    try {
      await axios.post(`${baseURL}/api/clubs/${selectedClub}/members/add`, {
        email: email,
        role: role.toLowerCase(),
        club_department: ""
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Member added successfully!');
      handleSelectClub(selectedClub); // refresh members
    } catch (err) {
      alert(`Error adding member: ${err.response?.data?.detail || err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Clubs...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
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
                  <select className="input-glass" value={newClubData.club_type} onChange={e => setNewClubData({...newClubData, club_type: e.target.value, department: e.target.value === 'university' ? '' : newClubData.department})}>
                    <option value="university">University Club (All Departments)</option>
                    <option value="departmental">Departmental Club</option>
                  </select>
                  {newClubData.club_type === 'departmental' && (
                    <>
                      <input 
                        list="club-dept-options"
                        type="text"
                        className="input-glass"
                        required
                        value={newClubData.department}
                        onChange={e => setNewClubData({...newClubData, department: e.target.value})}
                        placeholder="Select existing or type a new one..."
                      />
                      <datalist id="club-dept-options">
                        {[...new Set(["CSE", "ECE", "ME", "EE", "CE", "BBA", "BCA", ...clubs.map(c => c.department).filter(Boolean)])].sort().map(d => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </>
                  )}
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
                    <button onClick={handleAddMember} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                      + Add Member
                    </button>
                  )}
                  <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    Export CSV
                  </button>
                  <label className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer', margin: 0 }}>
                    Upload Photo
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleGalleryUpload} />
                  </label>
                </div>
              </div>

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
                        <th style={{ padding: '1rem' }}>Role</th>
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
                          
                          {/* Role Column */}
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
