import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, UserCircle, CalendarDays, MapPin, Users, Search, Building2, Sparkles, Award, LogOut } from 'lucide-react';
import PortalBrand from '../../components/PortalBrand';
import { AlertModal } from '../../components/Modals';
import { DialogFrame, MetricCard, StatusBadge } from '../../components/UI';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [clubsList, setClubsList] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState({});
  const [myCertificates, setMyCertificates] = useState({});
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState({ isOpen: false, imageUrl: null });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, eventId: null, rating: 5, comment: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [eventCategory, setEventCategory] = useState('all');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = '';

  const isStudentRole = user.role === 'student' || user.permissions?.dashboard_type === 'student';
  const perms = user.permissions?.permissions?.student_portal || {};
  const canViewEvents = perms.view_events ?? isStudentRole;
  const canRegisterEvents = perms.register_events ?? isStudentRole;
  const canViewRecommendations = perms.view_recommendations ?? isStudentRole;
  const canViewCertificates = perms.view_certificates ?? isStudentRole;
  const canSubmitFeedback = perms.submit_feedback ?? isStudentRole;
  const canViewClubs = perms.view_clubs ?? isStudentRole;

  const fetchData = async () => {
    try {
      const [eventsRes, regRes, recRes, certRes, clubsRes] = await Promise.all([
        canViewEvents ? axios.get(`${baseURL}/api/events`) : Promise.resolve({data: []}),
        isStudentRole ? axios.get(`${baseURL}/api/events/me/registrations`) : Promise.resolve({data: []}),
        (isStudentRole && canViewRecommendations) ? axios.get(`${baseURL}/api/events/me/recommendations`) : Promise.resolve({data: []}),
        (isStudentRole && canViewCertificates) ? axios.get(`${baseURL}/api/certificates/me`) : Promise.resolve({data: []}),
        axios.get(`${baseURL}/api/clubs/list`)
      ]);
      
      setEvents(eventsRes.data);
      setClubsList(clubsRes.data);
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
      setAlertModal({ isOpen: true, title: 'Registration failed', message: err.response?.data?.detail || 'Failed to register for this event.', isError: true });
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
      setAlertModal({ isOpen: true, title: 'Ticket unavailable', message: err.response?.data?.detail || 'Failed to load the event ticket.', isError: true });
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
      setAlertModal({ isOpen: true, title: 'Feedback submitted', message: `Thank you. Your feedback was recorded as ${response.data.sentiment}.`, isError: false });
      setFeedbackModal({ isOpen: false, eventId: null, rating: 5, comment: '' });
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not submit feedback', message: err.response?.data?.detail || 'Failed to submit feedback.', isError: true });
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
      setAlertModal({ isOpen: true, title: 'Download failed', message: 'Failed to download the certificate. Please try again.', isError: true });
      console.error(err);
    }
  };

  return (
    <div className="student-dashboard-shell dashboard-theme">
      <AlertModal {...alertModal} onClose={() => setAlertModal((previous) => ({ ...previous, isOpen: false }))} />
      <aside className="student-dashboard-sidebar">
        <PortalBrand portal="Student Portal" />
        <nav className="student-dashboard-nav" aria-label="Student dashboard">
          <span className="student-nav-label">CAMPUS</span>
          {canViewEvents && <a href="#student-events"><CalendarDays size={18} /> Discover events</a>}
          {canViewRecommendations && recommendations.length > 0 && <a href="#student-recommendations"><Sparkles size={18} /> Recommended</a>}
          {canViewCertificates && Object.keys(myCertificates).length > 0 && <a href="#student-certificates"><Award size={18} /> My certificates</a>}
          {canViewClubs && <button onClick={() => navigate('/clubs')}><Building2 size={18} /> Clubs directory</button>}
          <span className="student-nav-label student-account-label">ACCOUNT</span>
          <button onClick={() => navigate('/profile')}><UserCircle size={18} /> My profile</button>
          {(user.is_club_admin || user.permissions?.dashboard_type === 'admin' || ['admin', 'coordinator', 'finance'].includes(user.role)) && <button onClick={() => navigate('/admin')}><Building2 size={18} /> Coordinator portal</button>}
          <button onClick={() => { logout(); navigate('/login'); }}><LogOut size={18} /> Sign out</button>
        </nav>
        <div className="student-sidebar-user"><span className="student-avatar">{(user.name || 'U').charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
      </aside>
      <main className="student-dashboard-main">
      {/* Header */}
      <header className="student-dashboard-topbar animate-fade-in" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.5rem 2rem', marginBottom: '3rem', borderTop: '4px solid var(--primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Brain size={34} color="var(--primary)" />
          <div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 800, margin: 0 }}>
              BRAINWARE <span style={{ color: 'var(--secondary)' }}>UNIVERSITY</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Your university events and activities</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/profile')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCircle size={20} /> My Profile
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {isStudentRole && <div className="ui-metrics-grid student-overview-metrics">
          {canViewEvents && <MetricCard icon={CalendarDays} label="Events to explore" value={events.length} detail="Available in your portal" tone="blue" />}
          <MetricCard icon={Users} label="My registrations" value={Object.keys(myRegistrations).length} detail="Event sign-ups" tone="purple" />
          {canViewCertificates && <MetricCard icon={Award} label="My certificates" value={Object.keys(myCertificates).length} detail="Ready to view or download" tone="green" />}
        </div>}
        
        {/* Recommendations Section */}
        {isStudentRole && canViewRecommendations && recommendations.length > 0 && (
          <div id="student-recommendations" className="student-content-section" style={{ marginBottom: '2rem' }}>
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

        {canViewEvents && (
          <section id="student-events" className="student-content-section" style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Event discovery</p>
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', letterSpacing: '-0.03em' }}>Find your next campus event</h2>
            </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <label style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #dbe2ea', borderRadius: '10px', padding: '0 0.85rem', background: 'white' }}>
              <Search size={18} color="#64748b" />
              <input type="search" aria-label="Search events" placeholder="Search clubs and events" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ border: 0, outline: 0, width: '100%', padding: '0.8rem 0', font: 'inherit', background: 'transparent' }} />
            </label>
            <select aria-label="Filter by club" value={filterClub} onChange={e => setFilterClub(e.target.value)} className="input-glass" style={{ flex: '0 1 230px', background: 'white' }}>
              <option value="">All clubs</option>
              {clubsList.map(club => <option key={club.id} value={club.name}>{club.name}</option>)}
            </select>
          </div>

          <div className="student-category-filter" aria-label="Event categories">
            {categoryOptions.map(option => {
              const count = option.id === 'all' ? events.length : events.filter(event => event.event_category === option.id).length;
              const selected = eventCategory === option.id;
              return (
                <button key={option.id} type="button" aria-pressed={selected} onClick={() => setEventCategory(option.id)} style={{ border: selected ? '1px solid #1d4ed8' : '1px solid #dbe2ea', borderRadius: '999px', background: selected ? '#eff6ff' : 'white', color: selected ? '#1d4ed8' : '#475569', padding: '0.55rem 0.9rem', fontWeight: 650, cursor: 'pointer' }}>
                  {option.label} <span style={{ opacity: 0.72, marginLeft: '0.25rem' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px' }}>Loading events…</div>
          ) : visibleEvents.length === 0 ? (
            <div className="student-empty-events" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', background: 'white', border: '1px dashed #cbd5e1', borderRadius: '14px' }}>
              <h3 style={{ color: '#0f172a', margin: '0 0 0.4rem' }}>No events found</h3>
              <p style={{ margin: 0 }}>Try another category or change your search.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.1rem' }}>
              {visibleEvents.map(event => {
                const eventCategoryLabel = categoryOptions.find(option => option.id === event.event_category)?.label || 'Campus event';
                return (
                  <article key={event.id} className="student-event-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '290px', boxShadow: '0 5px 18px rgba(15,23,42,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.9rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}><Building2 size={14} />{eventCategoryLabel}</span>
                      {event.state === 'completed' && <StatusBadge status="Completed" />}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', lineHeight: 1.35, margin: '0 0 0.45rem', color: '#0f172a' }}>{event.title}</h3>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#64748b', margin: '0 0 1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.description}</p>
                    <div style={{ display: 'grid', gap: '0.55rem', color: '#475569', fontSize: '0.85rem', marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid #eef2f6' }}>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CalendarDays size={16} color="#64748b" />{new Date(event.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><MapPin size={16} color="#64748b" />{event.location || 'Location to be announced'}</span>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Sparkles size={16} color="#64748b" />{event.club_name}{event.host_department ? ` · ${event.host_department}` : ''}</span>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Users size={16} color="#64748b" />{event.registered_count} registered · {event.capacity} seats</span>
                    </div>
                    {isStudentRole ? (
                      <div style={{ display: 'flex', gap: '0.55rem', marginTop: '1rem' }}>
                        {myRegistrations[event.id] ? (
                          <>
                            <span style={{ alignSelf: 'center', color: '#047857', fontSize: '0.82rem', fontWeight: 700 }}>Registered</span>
                            <button onClick={() => handleViewQR(myRegistrations[event.id].reg_id)} className="btn-primary" style={{ flex: 1, padding: '0.65rem' }}>View ticket</button>
                            {event.state === 'completed' && canSubmitFeedback && <button onClick={() => setFeedbackModal({ isOpen: true, eventId: event.id, rating: 5, comment: '' })} className="btn-secondary" style={{ padding: '0.65rem' }}>Feedback</button>}
                          </>
                        ) : (
                          canRegisterEvents && <button onClick={() => handleRegister(event.id)} className="btn-primary" style={{ width: '100%', padding: '0.7rem' }}>Register for event</button>
                        )}
                      </div>
                    ) : (
                      event.state === 'completed' && canSubmitFeedback && (
                        <div style={{ display: 'flex', gap: '0.55rem', marginTop: '1rem' }}>
                          <button onClick={() => setFeedbackModal({ isOpen: true, eventId: event.id, rating: 5, comment: '' })} className="btn-secondary" style={{ padding: '0.65rem', width: '100%' }}>Submit Feedback</button>
                        </div>
                      )
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}

      </div>

      {/* My Certificates Section */}
      {isStudentRole && canViewCertificates && Object.keys(myCertificates).length > 0 && (
        <div id="student-certificates" className="animate-fade-in student-content-section" style={{ animationDelay: '0.4s', marginTop: '2rem' }}>
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
        <DialogFrame title="Your secure ticket" onClose={() => setQrModal({ isOpen: false, imageUrl: null })} className="ticket-dialog">
            <p className="ui-dialog-description">Scan this code at the venue entrance</p>
            
            <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <img src={qrModal.imageUrl} alt="QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <button onClick={() => setQrModal({ isOpen: false, imageUrl: null })} className="btn-secondary" style={{ width: '100%' }}>
                Close Ticket
              </button>
            </div>
        </DialogFrame>
      )}

      {/* Feedback Modal */}
      {feedbackModal.isOpen && (
        <DialogFrame title="Event feedback" onClose={() => setFeedbackModal({ isOpen: false, eventId: null, rating: 5, comment: '' })} className="feedback-dialog" initialFocus="input">
            <form onSubmit={submitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="feedback-rating">Rating (1-5)</label>
                <input 
                  id="feedback-rating"
                  type="number" min="1" max="5" 
                  value={feedbackModal.rating} 
                  onChange={e => setFeedbackModal({...feedbackModal, rating: parseInt(e.target.value)})}
                  className="input-glass"
                />
              </div>
              <div>
                <label htmlFor="feedback-comment">Comments</label>
                <textarea 
                  id="feedback-comment"
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
        </DialogFrame>
      )}
      </main>
    </div>
  );
};

export default Dashboard;
