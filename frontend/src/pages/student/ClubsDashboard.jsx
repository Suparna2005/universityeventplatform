import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Users, Star, Trophy, Calendar, CheckCircle } from 'lucide-react';
import { PromptModal, ConfirmModal, AlertModal } from '../../components/Modals';
import PortalBrand from '../../components/PortalBrand';
import { LoadingState } from '../../components/UI';

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
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });

  const showAlert = (message, isError = false) => {
    setAlertModal({ isOpen: true, title: isError ? 'Error' : 'Success', message, isError });
  };
  
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isStandalone = location.pathname === '/clubs';
  const baseURL = '';

  const isStudentRole = user?.role === 'student' || user?.permissions?.dashboard_type === 'student';
  const studentPortalPerms = user?.permissions?.permissions?.student_portal || {};
  
  const joinDirect = studentPortalPerms.join_clubs_direct ?? false; // Usually false by default
  const joinViaCoordinator = studentPortalPerms.join_clubs_via_coordinator ?? isStudentRole; // True by default for students
  
  const canJoinClubs = user && (joinDirect || joinViaCoordinator);

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
      showAlert('Join request sent successfully! Awaiting approval.');
      setSelectedClubForJoin(null);
      setJoinMessage('');
      fetchMyRequests();
    } catch (err) {
      showAlert(`Error: ${err.response?.data?.detail || 'Failed to send join request. You may already be a member or have a pending request.'}`, true);
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
          showAlert('Leave request submitted. Awaiting approval.');
          fetchMyRequests();
        } catch (err) {
          showAlert(`Error: ${err.response?.data?.detail || 'You are not a member.'}`, true);
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
      showAlert("Error loading gallery.", true);
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
      showAlert('Photo uploaded successfully!');
      // refresh gallery
      viewGallery(showGallery);
    } catch (err) {
      showAlert(`Error uploading photo: ${err.response?.data?.detail || err.message}`, true);
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
          showAlert('Request updated successfully.');
          fetchMyRequests();
        } catch (err) {
          showAlert('Error updating request', true);
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
          showAlert('Request withdrawn.');
          fetchMyRequests();
        } catch (err) {
          showAlert('Error withdrawing request', true);
        }
      }
    });
  };

  if (loading) return <LoadingState label="Loading the clubs directory…" />;

  return (
    <div className="dashboard-theme clubs-page animate-fade-in">
      {isStandalone && <header className="standalone-topbar">
        <PortalBrand portal="University Portal" />
        <div className="standalone-topbar-actions">
          <span>Welcome, {user?.name}</span>
          <button onClick={() => navigate(['student', 'faculty', 'mentor'].includes(user?.role) || user?.permissions?.dashboard_type === 'student' ? '/dashboard' : '/admin')} className="btn-secondary">Main dashboard</button>
        </div>
      </header>}
      
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

      <header className="clubs-heading">
        <div className="clubs-heading-icon"><Users size={24} /></div>
        <div>
          <p className="clubs-eyebrow">Student life · Communities</p>
          <h2>University Clubs</h2>
          <p>Explore campus communities, meet their coordinators, and find your place.</p>
        </div>
        <span className="clubs-total">{clubs.length} {clubs.length === 1 ? 'club' : 'clubs'}</span>
      </header>

      <AlertModal {...alertModal} onClose={() => setAlertModal({ ...alertModal, isOpen: false })} />
      <PromptModal {...promptModal} />
      <ConfirmModal {...confirmModal} />

      <div className="clubs-grid">
        {clubs.map(club => (
          <article key={club.id} className="club-card">
            <div className="club-card-heading">
              <div>
                <span className="club-type">{club.club_type === 'departmental' ? (club.department || 'Departmental') : 'University club'}</span>
                <h3>{club.name}</h3>
              </div>
              <span className="club-rating"><Star size={14} fill="currentColor" /> {club.rating ? club.rating.toFixed(1) : 'New'}</span>
            </div>

            <p className="club-description">{club.description || 'No description has been provided yet.'}</p>

            <div className="club-facts">
              <div className="club-fact">
                <Users size={18} />
                <div><span>Club members</span><strong>{club.member_count ?? 0}</strong></div>
              </div>
              <div className="club-fact">
                <CheckCircle size={18} />
                <div><span>Coordinator</span><strong>{club.coordinator_name || 'Not assigned'}</strong></div>
              </div>
              <div className="club-fact">
                <Trophy size={18} />
                <div><span>Achievements</span><strong>{club.achievements || 'No achievements listed'}</strong></div>
              </div>
              <div className="club-fact">
                <Calendar size={18} />
                <div><span>Last active event</span><strong>{club.last_event_date ? new Date(club.last_event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'No events hosted yet'}</strong></div>
              </div>
            </div>

            <div className="club-actions">
              <button onClick={() => viewGallery(club)} className="btn-secondary club-gallery-button">
                View gallery
              </button>
              {user && canJoinClubs && (
                <div className="club-membership-actions">
                  <button onClick={() => setSelectedClubForJoin(club.id)} className="btn-primary"><CheckCircle size={17} /> Join club</button>
                  <button onClick={() => handleLeaveClub(club.id)} className="club-leave-button">Leave</button>
                </div>
              )}
            </div>
          </article>
        ))}
        {clubs.length === 0 && <div className="clubs-empty">No clubs are listed yet.</div>}
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
