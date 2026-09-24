import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Users, Star, Trophy, Calendar, CheckCircle } from 'lucide-react';
import { PromptModal, ConfirmModal } from '../../components/Modals';

const ClubsDashboard = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinMessage, setJoinMessage] = useState('');
  const [selectedClubForJoin, setSelectedClubForJoin] = useState(null);
  
  const [showGallery, setShowGallery] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', placeholder: '', onConfirm: null, onCancel: () => setPromptModal({ isOpen: false }) });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: () => setConfirmModal({ isOpen: false }) });
  
  const { user } = useContext(AuthContext);
  const baseURL = '';

  const [myRequests, setMyRequests] = useState({ join_requests: [], leave_requests: [] });

  useEffect(() => {
    fetchClubs();
    if (user) {
      fetchMyMemberships();
      fetchMyRequests();
    }
  }, [user]);

  const fetchMyMemberships = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/clubs/my-memberships`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMyMemberships(res.data);
    } catch (err) {
      console.error('Failed to fetch memberships', err);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/clubs/my-requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMyRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const fetchClubs = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/clubs/list`);
      setClubs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${baseURL}/api/clubs/${selectedClubForJoin}/join`, 
        { message: joinMessage },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Join request sent successfully! Awaiting approval.');
      setSelectedClubForJoin(null);
      setJoinMessage('');
      fetchMyRequests();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to send join request. You may already be a member or have a pending request.'}`);
    }
  };

  const handleLeaveClub = (clubId) => {
    setPromptModal({
      isOpen: true,
      title: 'Leave Club',
      message: 'Why do you want to leave this club? (Reason required)',
      placeholder: 'Type your reason here...',
      defaultValue: '',
      onCancel: () => setPromptModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async (reason) => {
        setPromptModal(prev => ({ ...prev, isOpen: false }));
        if (!reason) return;
        try {
          await axios.post(`${baseURL}/api/clubs/${clubId}/leave`, { reason }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          alert('Leave request submitted. Awaiting approval.');
          fetchMyRequests();
        } catch (err) {
          alert(`Error: ${err.response?.data?.detail || 'You are not a member.'}`);
        }
      }
    });
  };

  const viewGallery = async (club) => {
    try {
      const res = await axios.get(`${baseURL}/api/clubs/${club.id}/gallery`);
      setGalleryImages(res.data);
      setShowGallery(club);
    } catch (err) {
      alert("Error loading gallery.");
    }
  };

  const handleGalleryUpload = async (e) => {
    if (!showGallery) return;
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${baseURL}/api/clubs/${showGallery.id}/gallery`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
      });
      alert('Photo uploaded successfully!');
      // refresh gallery
      viewGallery(showGallery);
    } catch (err) {
      alert(`Error uploading photo: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleEditRequest = (reqId, type, currentValue) => {
    setPromptModal({
      isOpen: true,
      title: `Edit ${type === 'join' ? 'Message' : 'Reason'}`,
      defaultValue: currentValue,
      placeholder: 'Type your message...',
      onCancel: () => setPromptModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async (newValue) => {
        setPromptModal(prev => ({ ...prev, isOpen: false }));
        if (!newValue || newValue === currentValue) return;

        try {
          await axios.put(`${baseURL}/api/clubs/${type}-requests/${reqId}`, 
            type === 'join' ? { message: newValue } : { reason: newValue },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          alert('Request updated successfully.');
          fetchMyRequests();
        } catch (err) {
          alert('Error updating request');
        }
      }
    });
  };

  const handleWithdrawRequest = (reqId, type) => {
    setConfirmModal({
      isOpen: true,
      title: 'Withdraw Request',
      message: 'Are you sure you want to withdraw this request?',
      confirmText: 'Withdraw',
      confirmColor: '#dc2626',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${baseURL}/api/clubs/${type}-requests/${reqId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          alert('Request withdrawn.');
          fetchMyRequests();
        } catch (err) {
          alert('Error withdrawing request');
        }
      }
    });
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Clubs Directory...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      
      {(myRequests.join_requests.length > 0 || myRequests.leave_requests.length > 0) && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '2px solid var(--primary)' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>My Pending Requests</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {myRequests.join_requests.filter(r => r.status.startsWith('pending')).map(r => (
              <div key={`join-${r.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.5)', padding: '0.8rem', borderRadius: '6px' }}>
                <div>
                  <strong>Join Request:</strong> {r.club_name}
                  <span className="badge badge-warning" style={{ marginLeft: '1rem' }}>{r.status === 'pending_admin' ? 'Awaiting Admin' : 'Awaiting Coordinator'}</span>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'gray' }}>Message: {r.message}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEditRequest(r.id, 'join', r.message)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Edit</button>
                  <button onClick={() => handleWithdrawRequest(r.id, 'join')} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none' }}>Withdraw</button>
                </div>
              </div>
            ))}
            {myRequests.leave_requests.filter(r => r.status.startsWith('pending')).map(r => (
              <div key={`leave-${r.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.5)', padding: '0.8rem', borderRadius: '6px' }}>
                <div>
                  <strong>Leave Request:</strong> {r.club_name}
                  <span className="badge badge-warning" style={{ marginLeft: '1rem' }}>{r.status === 'pending_admin' ? 'Awaiting Admin' : 'Awaiting Coordinator'}</span>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'gray' }}>Reason: {r.reason}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEditRequest(r.id, 'leave', r.reason)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Edit</button>
                  <button onClick={() => handleWithdrawRequest(r.id, 'leave')} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none' }}>Withdraw</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Users size={32} color="var(--primary)" />
        <h2 style={{ fontSize: '2rem', margin: 0 }}>University Clubs Directory</h2>
      </div>

      <PromptModal {...promptModal} />
      <ConfirmModal {...confirmModal} />

      <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '800px' }}>
        Discover and join various communities! Faculties, Mentors, and Students from any department are welcome to join and contribute. Find a club that matches your passion below.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
        {clubs.map(club => (
          <div key={club.id} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-main)', fontWeight: 'bold' }}>{club.name}</h3>
              <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Star size={14} fill="currentColor" /> {club.rating ? club.rating.toFixed(1) : 'New'}
              </span>
            </div>

            <p style={{ color: 'var(--text-muted)', flex: 1, marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {club.description || "No description provided."}
            </p>

            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Trophy size={18} color="var(--secondary)" style={{ marginTop: '0.1rem' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Achievements</strong>
                  <span style={{ fontSize: '0.95rem' }}>{club.achievements || "Rising stars in the making!"}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Calendar size={18} color="var(--primary)" style={{ marginTop: '0.1rem' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Active Event</strong>
                  <span style={{ fontSize: '0.95rem' }}>
                    {club.last_event_date ? new Date(club.last_event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "No events hosted yet"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={() => viewGallery(club)} className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                View Gallery
              </button>
              {user && (user.role === 'student' || user.role === 'faculty') && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setSelectedClubForJoin(club.id)} className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} /> Join
                  </button>
                  <button onClick={() => handleLeaveClub(club.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    Leave
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '90%', maxWidth: '800px', background: 'rgba(255,255,255,0.95)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: 0 }}>
                {showGallery.name} Gallery
              </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {myMemberships.find(m => m.club_id === showGallery.id && ['core', 'president', 'head'].includes(m.role)) && (
                  <label className="btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                    Upload Photo
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleGalleryUpload} />
                  </label>
                )}
                <button onClick={() => setShowGallery(null)} className="btn-secondary">Close</button>
              </div>
            </div>
            
            {galleryImages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No photos uploaded yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {galleryImages.map(img => (
                  <div key={img.id} style={{ borderRadius: '8px', overflow: 'hidden', border: '2px solid #e2e8f0', aspectRatio: '1/1' }}>
                    <img src={`${baseURL}${img.image_url}`} alt="Gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join Request Modal */}
      {selectedClubForJoin && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '450px', background: 'rgba(255,255,255,0.95)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: 'var(--primary)' }}>
              Join {clubs.find(c => c.id === selectedClubForJoin)?.name}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {user.role === 'student' 
                ? "Your request will be sent to your Department Coordinator for approval. Please confirm your details below." 
                : "Your request will be sent to the Admin for approval. Please confirm your details below."}
            </p>
            
            <form onSubmit={handleJoinRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'gray' }}>Full Name</label>
                  <input type="text" className="input-glass" readOnly value={user?.name || ''} style={{ background: '#f8fafc', color: 'gray' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'gray' }}>Email ID</label>
                  <input type="email" className="input-glass" readOnly value={user?.email || ''} style={{ background: '#f8fafc', color: 'gray' }} />
                </div>
              </div>

              {user.role === 'student' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'gray' }}>Department</label>
                      <input type="text" className="input-glass" readOnly value={user?.department || 'N/A'} style={{ background: '#f8fafc', color: 'gray' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'gray' }}>Section / Year</label>
                      <input type="text" className="input-glass" readOnly value={`${user?.section || 'N/A'} / Year ${user?.year || 'N/A'}`} style={{ background: '#f8fafc', color: 'gray' }} />
                    </div>
                  </div>
                  <textarea 
                    style={{ marginTop: '0.5rem' }}
                    onChange={e => setJoinMessage(e.target.value)}
                    className="input-glass"
                    rows="2"
                    placeholder="Briefly describe your interest in joining..."
                    required
                  />
                </>
              )}

              {user.role === 'faculty' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'gray' }}>Department</label>
                  <input type="text" className="input-glass" readOnly value={user?.department || 'N/A'} style={{ background: '#f8fafc', color: 'gray' }} />
                  <textarea 
                    style={{ marginTop: '1rem' }}
                    onChange={e => setJoinMessage(e.target.value)}
                    className="input-glass"
                    rows="2"
                    placeholder="Briefly describe your interest in joining..."
                    required
                  />
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Send Request</button>
                <button type="button" onClick={() => setSelectedClubForJoin(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubsDashboard;
