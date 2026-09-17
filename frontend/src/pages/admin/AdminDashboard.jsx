import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, UserCircle, QrCode } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import BudgetDashboard from './BudgetDashboard';
import AnalyticsDashboard from './AnalyticsDashboard';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('events'); // events, budgets, analytics
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [scanningEventId, setScanningEventId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: '', location: '', capacity: '', budget: ''
  });

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  const fetchAdminData = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/events`);
      setEvents(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [baseURL]);

  const generateCertificates = async (eventId) => {
    try {
      const response = await axios.post(`${baseURL}/api/certificates/events/${eventId}/generate`);
      alert(`Success! ${response.data.message}`);
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to generate certificates'}`);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${baseURL}/api/events`, {
        title: newEvent.title,
        description: newEvent.description,
        date: new Date(newEvent.date).toISOString(),
        location: newEvent.location,
        capacity: parseInt(newEvent.capacity),
        budget: parseInt(newEvent.budget) || 0
      });
      alert('Event scheduled successfully!');
      setShowCreateForm(false);
      setNewEvent({ title: '', description: '', date: '', location: '', capacity: '', budget: '' });
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to create event'}`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this program?")) return;
    try {
      await axios.delete(`${baseURL}/api/events/${eventId}`);
      alert("Event deleted successfully!");
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to delete event'}`);
    }
  };

  const handleApproveEvent = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve`);
      alert("Event approved successfully!");
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to approve event'}`);
    }
  };

  const handleApproveBudget = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-budget`);
      alert("Budget approved successfully!");
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to approve budget'}`);
    }
  };

  const handleExportRegistrations = (eventId) => {
    window.open(`${baseURL}/api/admin/events/${eventId}/export`, '_blank');
  };

  const handleUploadAttendance = async (eventId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${baseURL}/api/admin/events/${eventId}/upload-attendance`, formData);
      alert("Attendance file uploaded to Mentor successfully!");
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to upload attendance'}`);
    }
  };

  const startScanner = (eventId) => {
    setScanningEventId(eventId);
    // Needs a slight delay for the DOM to render the div
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render(async (decodedText) => {
        scanner.clear();
        setScanningEventId(null);
        try {
          const res = await axios.post(`${baseURL}/api/attendance/check-in`, { secure_token: decodedText });
          alert(`Check-in Successful! ${res.data.student_name}`);
          fetchAdminData();
        } catch (err) {
          alert(`Error: ${err.response?.data?.detail || 'Check-in failed'}`);
        }
      }, (error) => {
        // ignore continuous scan errors
      });
    }, 100);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <header className="glass-card animate-fade-in" style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.5rem 2rem', marginBottom: '1.5rem', borderTop: '4px solid var(--primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Brain size={48} color="var(--primary)" />
          <div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 800, margin: 0 }}>
              BRAINWARE <span style={{ color: 'var(--secondary)' }}>ADMIN PORTAL</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Welcome, {user.name} | Role: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{user.role}</span>
            </p>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}>Programs & Events</button>
        <button onClick={() => setActiveTab('budgets')} className={activeTab === 'budgets' ? 'btn-primary' : 'btn-secondary'}>Financial Budgeting</button>
        <button onClick={() => setActiveTab('analytics')} className={activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}>Analytics</button>
      </div>

      {activeTab === 'budgets' && <BudgetDashboard />}
      {activeTab === 'analytics' && <AnalyticsDashboard />}

      {activeTab === 'events' && (
      <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        
        {/* QR Scanner Modal */}
        {scanningEventId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="glass-card" style={{ background: 'white', padding: '2rem', width: '100%', maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ color: 'black' }}>Scan Attendee QR Code</h3>
                <button onClick={() => setScanningEventId(null)} className="btn-secondary">Close</button>
              </div>
              <div id="reader" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>
            {user.role === 'finance' ? 'Financial Budgeting & Overview' : 
             user.role === 'mentor' ? 'Advisory Event Overview' : 
             'Event Management & Analytics'}
          </h2>
          {['admin', 'coordinator'].includes(user.role) && (
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
              {showCreateForm ? 'Close Form' : '+ Schedule Program'}
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className="glass-card animate-fade-in" style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Schedule New Program</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Program Title</label>
                <input type="text" className="input-glass" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea className="input-glass" rows="3" required value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})}></textarea>
              </div>
              <div>
                <label>Date & Time</label>
                <input type="datetime-local" className="input-glass" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
              </div>
              <div>
                <label>Location</label>
                <input type="text" className="input-glass" required value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
              </div>
              <div>
                <label>Capacity</label>
                <input type="number" min="1" className="input-glass" required value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: e.target.value})} />
              </div>
              <div>
                <label>Allocated Budget (₹)</label>
                <input type="number" min="0" className="input-glass" required value={newEvent.budget} onChange={e => setNewEvent({...newEvent, budget: e.target.value})} />
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Program</button>
              </div>
            </form>
          </div>
        )}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading operations...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
            {events.map(event => (
              <div key={event.id} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                
                {['admin', 'coordinator', 'mentor'].includes(user.role) && (
                  <button 
                    onClick={() => handleDeleteEvent(event.id)} 
                    style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    title="Delete Program"
                  >
                    Delete
                  </button>
                )}

                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', paddingRight: '4rem' }}>
                  <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{event.title}</h3>
                </div>
                
                <span style={{ alignSelf: 'flex-start', marginBottom: '1rem' }} className={`badge ${event.state === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                  {event.state}
                </span>
                
                {/* FINANCE ROLE SPECIFIC UI */}
                {['admin', 'finance', 'coordinator'].includes(user.role) && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#047857' }}>💰 Financial Status</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      <span>Allocated Budget: ₹{(event.budget || 0).toLocaleString()}</span>
                      <span>Est. Expenses: ₹{(event.registered_count * 200).toLocaleString()}</span>
                    </div>
                    {/* FINANCE APPROVAL UI */}
                    {['finance', 'admin'].includes(user.role) && event.state === 'finance_review' && (
                      <button onClick={() => handleApproveBudget(event.id)} className="btn-primary" style={{ width: '100%', background: '#f59e0b', color: 'white', border: 'none' }}>
                        💰 Approve Budget for Mentor
                      </button>
                    )}
                  </div>
                )}

                {/* GENERAL ANALYTICS (All Roles) */}
                <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Performance Analytics</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>👥 Registrations: {event.registered_count} / {event.capacity}</span>
                    <span>📈 Feedback: {event.feedback_count}</span>
                  </div>
                  {event.feedback_count > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                        {Math.round((event.positive_feedback_count / event.feedback_count) * 100)}% Positive Sentiment
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {/* MENTOR UI */}
                  {['mentor', 'admin'].includes(user.role) && (
                    <>
                      {/* Mentor Approval */}
                      {event.state === 'faculty_review' && (
                        <button onClick={() => handleApproveEvent(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#3b82f6' }}>
                          ✅ Approve Program
                        </button>
                      )}
                      
                      {/* Mentor Certificate Generation */}
                      {event.state === 'completed' && (
                        <div style={{ marginTop: '0.5rem' }}>
                          {event.attendance_file_url && (
                            <a href={`${baseURL}${event.attendance_file_url}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ width: '100%', display: 'block', textAlign: 'center', marginBottom: '0.5rem', textDecoration: 'none' }}>
                              📥 Review Uploaded Attendance
                            </a>
                          )}
                          <button onClick={() => generateCertificates(event.id)} className="btn-primary" style={{ width: '100%', background: '#10b981' }}>
                            🎓 Mass-Generate Certificates
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* COORDINATOR UI */}
                  {['admin', 'coordinator'].includes(user.role) ? (
                    <>
                      <button onClick={() => startScanner(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        <QrCode size={18} /> Scan QRs (Check-in)
                      </button>
                      <button onClick={() => handleExportRegistrations(event.id)} className="btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }}>
                        📥 Export Registrations (CSV)
                      </button>
                      
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>📤 Upload Attendance to Mentor:</label>
                        <input type="file" accept=".csv, .xlsx" onChange={(e) => handleUploadAttendance(event.id, e.target.files[0])} style={{ fontSize: '0.8rem', width: '100%' }} />
                      </div>
                      
                      {event.state === 'completed' && (
                        <button onClick={() => generateCertificates(event.id)} className="btn-primary" style={{ width: '100%', background: '#10b981' }}>
                          🎓 Mass-Generate Certificates
                        </button>
                      )}
                    </>
                  ) : (
                    <button disabled className="btn-secondary" style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed', display: ['admin', 'coordinator', 'mentor'].includes(user.role) ? 'none' : 'block' }}>
                      Locked: Requires Coordinator Access
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default AdminDashboard;
