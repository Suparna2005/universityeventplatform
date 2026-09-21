import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, UserCircle } from 'lucide-react';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState({});
  const [myCertificates, setMyCertificates] = useState({});
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState({ isOpen: false, imageUrl: null });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, eventId: null, rating: 5, comment: '' });
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

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
              <h2 style={{ fontSize: '2rem' }}>✨ Recommended For You</h2>
              <span className="badge badge-warning" style={{ background: 'var(--primary)', color: 'white' }}>AI Powered</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
              {recommendations.map(rec => (
                <div key={rec.id} className="glass-card" style={{ padding: '2rem', border: '2px solid var(--secondary)' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{rec.title}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{rec.description}</p>
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

        <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Upcoming Discoveries</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading experiences...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
            {events.map(event => (
              <div key={event.id} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                <div style={{ marginBottom: '1rem' }}>
                  <span className="badge badge-warning" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{event.title}</h3>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{event.description}</p>
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '1.5rem 0' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', gap: '1rem' }}>
                      <span>📍 {event.location}</span>
                    </span>
                    <span>👥 {event.registered_count} / {event.capacity}</span>
                  </div>

                  {user.role === 'student' && (
                    myRegistrations[event.id] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                            ✓ Registered
                          </span>
                          <button onClick={() => handleViewQR(myRegistrations[event.id].reg_id)} className="btn-primary" style={{ flex: 1 }}>
                            🎫 View Ticket
                          </button>
                        </div>
                        {event.state === 'completed' && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button onClick={() => setFeedbackModal({ isOpen: true, eventId: event.id, rating: 5, comment: '' })} className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}>
                              ⭐ Leave Feedback
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => handleRegister(event.id)} className="btn-primary" style={{ width: '100%' }}>
                        Register Now
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Certificates Section */}
      {user.role === 'student' && Object.keys(myCertificates).length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: '0.4s', marginTop: '4rem' }}>
          <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>🎓 My Certificates</h2>
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
