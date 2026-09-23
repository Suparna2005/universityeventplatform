import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Users, Star, Trophy, Calendar, CheckCircle } from 'lucide-react';

const ClubsDashboard = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinMessage, setJoinMessage] = useState('');
  const [selectedClubForJoin, setSelectedClubForJoin] = useState(null);
  
  const [showGallery, setShowGallery] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  
  const { user } = useContext(AuthContext);
  const baseURL = '';

  useEffect(() => {
    fetchClubs();
    if (user) {
      fetchMyMemberships();
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
      alert('Join request sent successfully! Awaiting approval from the Club President.');
      setSelectedClubForJoin(null);
      setJoinMessage('');
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to send join request. You may already be a member or have a pending request.'}`);
    }
  };

  const handleLeaveClub = async (clubId) => {
    if (!window.confirm("Are you sure you want to leave this club?")) return;
    try {
      await axios.delete(`${baseURL}/api/clubs/${clubId}/leave`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('You have successfully left the club.');
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'You are not a member.'}`);
    }
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

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Clubs Directory...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Users size={32} color="var(--primary)" />
        <h2 style={{ fontSize: '2rem', margin: 0 }}>University Clubs Directory</h2>
      </div>

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
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Introduce yourself! Let the club head know which department you are from and why you want to join.
            </p>
            
            <form onSubmit={handleJoinRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Message / Introduction</label>
                <textarea 
                  value={joinMessage} 
                  onChange={e => setJoinMessage(e.target.value)}
                  className="input-glass"
                  rows="4"
                  placeholder="I am a faculty/student from the IT department and I'm interested in..."
                  required
                />
              </div>
              
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
