import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, UserCircle, CalendarDays, MapPin, Users, Search, Building2, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState({});
  const [myCertificates, setMyCertificates] = useState({});
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState({ isOpen: false, imageUrl: null });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, eventId: null, rating: 5, comment: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [eventCategory, setEventCategory] = useState('all');
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = '';

  const fetchData = async () => {
    try {
      const [eventsRes, regRes, recRes, certRes] = await Promise.all([
        axios.get(`${baseURL}/api/events`),
        user.role === 'student' ? axios.get(`${baseURL}/api/events/me/registrations`) : Promise.resolve({data: []}),
        user.role === 'student' ? axios.get(`${baseURL}/api/events/me/recommendations`) : Promise.resolve({data: []}),
        user.role === 'student' ? axios.get(`${baseURL}/api/certificates/me`) : Promise.resolve({data: []})
      ]);
      
      setEvents(eventsRes.data);
      setRecommendations(recRes.data);
      
      const regMap = {};
      regRes.data.forEach(reg => {
        regMap[reg.event_id] = { status: reg.status, reg_id: reg.id };
      });
      setMyRegistrations(regMap);

      const certMap = {};
      certRes.data.forEach(cert => {
        certMap[cert.id] = cert;
      });
      setMyCertificates(certMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [baseURL, user.role]);

  const categoryOptions = [
    { id: 'all', label: 'All events' },
    { id: 'my_department', label: 'My department' },
    { id: 'other_departments', label: 'Other departments' },
    { id: 'university_clubs', label: 'University clubs' },
  ];
  const visibleEvents = events.filter(event => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [event.title, event.description, event.club_name, event.host_department]
      .some(value => (value || '').toLowerCase().includes(query));
    const matchesClub = !filterClub || event.club_name === filterClub;
    const matchesCategory = eventCategory === 'all' || event.event_category === eventCategory;
    return matchesSearch && matchesClub && matchesCategory;
  });

  const handleRegister = async (eventId) => {
    try {
      await axios.post(`${baseURL}/api/events/${eventId}/register`);
      await fetchData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to register'}`);
    }
  };

  const handleViewQR = async (registrationId) => {
    try {
      const response = await axios.get(`${baseURL}/api/tickets/${registrationId}/qr/live`, {
        responseType: 'blob'
      });
      const imageUrl = URL.createObjectURL(response.data);
      setQrModal({ isOpen: true, imageUrl, regId: registrationId });
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to load QR code'}`);
    }
  };

  useEffect(() => {
    let interval;
    if (qrModal.isOpen && qrModal.regId) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${baseURL}/api/tickets/${qrModal.regId}/qr/live`, { responseType: 'blob' });
          const imageUrl = URL.createObjectURL(response.data);
          setQrModal(prev => ({ ...prev, imageUrl }));
        } catch (err) {
          console.error("Failed to refresh QR", err);
        }
      }, 5000); // refresh every 5 seconds
    }
    return () => clearInterval(interval);
  }, [qrModal.isOpen, qrModal.regId, baseURL]);

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${baseURL}/api/feedback/events/${feedbackModal.eventId}`, {
        rating: feedbackModal.rating,
        comment: feedbackModal.comment
      });
      alert(`Success! AI Sentiment Detected: ${response.data.sentiment}`);
      setFeedbackModal({ isOpen: false, eventId: null, rating: 5, comment: '' });
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to submit feedback'}`);
    }
  };

  const downloadCertificate = async (certId) => {
    try {
      const response = await axios.get(`${baseURL}/api/certificates/${certId}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${certId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Failed to download certificate. Please try again.");
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <header className="glass-card animate-fade-in" style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.5rem 2rem', marginBottom: '3rem', borderTop: '4px solid var(--primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Brain size={48} color="var(--primary)" />
          <div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 800, margin: 0 }}>
              BRAINWARE <span style={{ color: 'var(--secondary)' }}>UNIVERSITY</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Welcome back, {user.name} ({user.role})</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/profile')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCircle size={20} /> My Profile
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        
        {/* Recommendations Section */}
        {user.role === 'student' && recommendations.length > 0 && (
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.6rem', color: '#0f172a', margin: 0 }}>Recommended for you</h2>
              <span className="badge badge-warning" style={{ background: 'var(--primary)', color: 'white' }}>AI Powered</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
              {recommendations.map(rec => (
                <div key={rec.id} className="glass-card" style={{ padding: '2rem', border: '2px solid var(--secondary)' }}>
                  <span className="badge badge-warning" style={{ marginBottom: '0.5rem', display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.75rem' }}>
                    {categoryOptions.find(option => option.id === rec.event_category)?.label || 'Campus event'} · {rec.club_name}
                  </span>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{rec.title}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{rec.description}</p>
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(rec.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}{rec.host_department ? ` · ${rec.host_department}` : ''}</p>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button onClick={() => handleRegister(rec.id)} className="btn-primary" style={{ width: '100%', background: 'var(--secondary)' }}>
                      Register Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <section style={{ marginBottom: '3rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Event discovery</p>
            <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', letterSpacing: '-0.03em' }}>Find your next campus event</h2>
            <p style={{ color: '#64748b', margin: '0.5rem 0 0', lineHeight: 1.6 }}>Browse events from {user.department || user.student_profile?.department || 'your department'}, other departments, and university clubs.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <label style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #dbe2ea', borderRadius: '10px', padding: '0 0.85rem', background: 'white' }}>
              <Search size={18} color="#64748b" />
              <input type="search" aria-label="Search events" placeholder="Search events, clubs, or departments" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ border: 0, outline: 0, width: '100%', padding: '0.8rem 0', font: 'inherit', background: 'transparent' }} />
            </label>
            <select aria-label="Filter by club" value={filterClub} onChange={e => setFilterClub(e.target.value)} className="input-glass" style={{ flex: '0 1 230px', background: 'white' }}>
              <option value="">All clubs</option>
              {[...new Set(events.map(e => e.club_name))].sort().map(club => <option key={club} value={club}>{club}</option>)}
            </select>
          </div>

          <div role="tablist" aria-label="Event categories" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: '1.25rem' }}>
            {categoryOptions.map(option => {
              const count = option.id === 'all' ? events.length : events.filter(event => event.event_category === option.id).length;
              const selected = eventCategory === option.id;
              return (
                <button key={option.id} role="tab" aria-selected={selected} onClick={() => setEventCategory(option.id)} style={{ border: selected ? '1px solid #1d4ed8' : '1px solid #dbe2ea', borderRadius: '999px', background: selected ? '#eff6ff' : 'white', color: selected ? '#1d4ed8' : '#475569', padding: '0.55rem 0.9rem', fontWeight: 650, cursor: 'pointer' }}>
                  {option.label} <span style={{ opacity: 0.72, marginLeft: '0.25rem' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px' }}>Loading events…</div>
          ) : visibleEvents.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', background: 'white', border: '1px dashed #cbd5e1', borderRadius: '14px' }}>
              <h3 style={{ color: '#0f172a', margin: '0 0 0.4rem' }}>No events found</h3>
              <p style={{ margin: 0 }}>Try another category or change your search.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.1rem' }}>
              {visibleEvents.map(event => {
                const eventCategoryLabel = categoryOptions.find(option => option.id === event.event_category)?.label || 'Campus event';
                return (
                  <article key={event.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '290px', boxShadow: '0 5px 18px rgba(15,23,42,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.9rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}><Building2 size={14} />{eventCategoryLabel}</span>
                      {event.state === 'completed' && <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>Completed</span>}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', lineHeight: 1.35, margin: '0 0 0.45rem', color: '#0f172a' }}>{event.title}</h3>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#64748b', margin: '0 0 1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.description}</p>
                    <div style={{ display: 'grid', gap: '0.55rem', color: '#475569', fontSize: '0.85rem', marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid #eef2f6' }}>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CalendarDays size={16} color="#64748b" />{new Date(event.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><MapPin size={16} color="#64748b" />{event.location || 'Location to be announced'}</span>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Sparkles size={16} color="#64748b" />{event.club_name}{event.host_department ? ` · ${event.host_department}` : ''}</span>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Users size={16} color="#64748b" />{event.registered_count} registered · {event.capacity} seats</span>
                    </div>
                    {user.role === 'student' && (
                      <div style={{ display: 'flex', gap: '0.55rem', marginTop: '1rem' }}>
                        {myRegistrations[event.id] ? (
                          <>
                            <span style={{ alignSelf: 'center', color: '#047857', fontSize: '0.82rem', fontWeight: 700 }}>Registered</span>
                            <button onClick={() => handleViewQR(myRegistrations[event.id].reg_id)} className="btn-primary" style={{ flex: 1, padding: '0.65rem' }}>View ticket</button>
                            {event.state === 'completed' && <button onClick={() => setFeedbackModal({ isOpen: true, eventId: event.id, rating: 5, comment: '' })} className="btn-secondary" style={{ padding: '0.65rem' }}>Feedback</button>}
                          </>
                        ) : <button onClick={() => handleRegister(event.id)} className="btn-primary" style={{ width: '100%', padding: '0.7rem' }}>Register for event</button>}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* My Certificates Section */}
      {user.role === 'student' && Object.keys(myCertificates).length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: '0.4s', marginTop: '4rem' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.6rem', color: '#0f172a' }}>My certificates</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
            {Object.values(myCertificates).map(cert => (
              <div key={cert.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{cert.event_title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cert.certificate_number}</p>
                </div>
                <button onClick={() => downloadCertificate(cert.id)} className="btn-secondary">
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal.isOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.95)' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Your Secure Ticket</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Scan this code at the venue entrance</p>
            
            <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <img src={qrModal.imageUrl} alt="QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <button onClick={() => setQrModal({ isOpen: false, imageUrl: null })} className="btn-secondary" style={{ width: '100%' }}>
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal.isOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.95)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: 'var(--primary)' }}>Event Feedback</h3>
            <form onSubmit={submitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Rating (1-5)</label>
                <input 
                  type="number" min="1" max="5" 
                  value={feedbackModal.rating} 
                  onChange={e => setFeedbackModal({...feedbackModal, rating: parseInt(e.target.value)})}
                  className="input-glass"
                />
              </div>
              <div>
                <label>Comments</label>
                <textarea 
                  value={feedbackModal.comment} 
                  onChange={e => setFeedbackModal({...feedbackModal, comment: e.target.value})}
                  className="input-glass"
                  rows="4"
                  placeholder="How was the event?"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Submit</button>
                <button type="button" onClick={() => setFeedbackModal({ isOpen: false, eventId: null, rating: 5, comment: '' })} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
