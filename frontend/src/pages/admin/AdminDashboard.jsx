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
  
  // AI Template Generation State
  const [aiPrompts, setAiPrompts] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: '', end_date: '', location: '', capacity: '', budget: '',
    accessories_req: '', guests_req: '', gifts_req: '', prizes_req: ''
  });

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

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

  const handleGenerateAITemplate = async (eventId) => {
    const prompt = aiPrompts[eventId];
    if (!prompt) {
      alert("Please enter a style or colors for the AI!");
      return;
    }
    
    setAiLoading({...aiLoading, [eventId]: true});
    try {
      await axios.post(`${baseURL}/api/admin/events/${eventId}/generate-ai-template`, { prompt });
      alert("AI successfully generated and applied the new custom background!");
      setAiPrompts({...aiPrompts, [eventId]: ''});
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to generate AI template'}`);
    } finally {
      setAiLoading({...aiLoading, [eventId]: false});
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
        end_date: newEvent.end_date ? new Date(newEvent.end_date).toISOString() : null,
        location: newEvent.location,
        capacity: parseInt(newEvent.capacity),
        budget: parseInt(newEvent.budget) || 0,
        accessories_req: newEvent.accessories_req,
        guests_req: newEvent.guests_req,
        gifts_req: newEvent.gifts_req,
        prizes_req: newEvent.prizes_req
      });
      alert('Event scheduled successfully! Sent to mentor for initial approval.');
      setShowCreateForm(false);
      setNewEvent({ title: '', description: '', date: '', end_date: '', location: '', capacity: '', budget: '', accessories_req: '', guests_req: '', gifts_req: '', prizes_req: '' });
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

  const handleApproveMentorInitial = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-mentor-initial`);
      alert("Sent to Admin successfully!");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handleApproveAdminInitial = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-admin-initial`);
      alert("Budget request sent to Finance successfully!");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handleApproveBudget = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-budget`);
      alert("Budget approved! Sent back to Admin.");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handleApproveAdminFinal = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-admin-final`);
      alert("Final approval sent to Mentor!");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handleApproveMentorFinal = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-mentor-final`);
      alert("Approval sent to Coordinator!");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handlePublishEvent = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/publish`);
      alert("Event published to Students successfully!");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handleCloseEvent = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/close`);
      alert("Event closed successfully! Sent to mentor for completion approval.");
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to close event'}`);
    }
  };

  const handleApproveCompletion = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-completion`);
      alert("Event completion approved successfully!");
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to approve event completion'}`);
    }
  };

  const handlePublishCertificates = async (eventId) => {
    try {
      const response = await axios.put(`${baseURL}/api/certificates/events/${eventId}/publish`);
      alert(response.data.message);
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to publish certificates'}`);
    }
  };

  const handleExportRegistrations = async (eventId) => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/events/${eventId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${eventId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(`Error downloading CSV: ${err.response?.data?.detail || err.message}`);
    }
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
          {user.role === 'coordinator' && (
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
                <label>Start Date & Time</label>
                <input type="datetime-local" className="input-glass" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
              </div>
              <div>
                <label>End Date & Time</label>
                <input type="datetime-local" className="input-glass" value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} />
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
              
              <div style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', marginTop: '1rem' }}>Requirements Segmentation</h4>
              </div>
              
              <div>
                <label>Accessories Needed</label>
                <textarea className="input-glass" rows="2" value={newEvent.accessories_req || ''} onChange={e => setNewEvent({...newEvent, accessories_req: e.target.value})} placeholder="e.g. Projector, Sound system..."></textarea>
              </div>
              <div>
                <label>Guests Coming</label>
                <textarea className="input-glass" rows="2" value={newEvent.guests_req || ''} onChange={e => setNewEvent({...newEvent, guests_req: e.target.value})} placeholder="e.g. Chief Guest Mr. XYZ..."></textarea>
              </div>
              <div>
                <label>Gifts for Guests</label>
                <textarea className="input-glass" rows="2" value={newEvent.gifts_req || ''} onChange={e => setNewEvent({...newEvent, gifts_req: e.target.value})} placeholder="e.g. Mementos, Bouquets..."></textarea>
              </div>
              <div>
                <label>Prizes for Students</label>
                <textarea className="input-glass" rows="2" value={newEvent.prizes_req || ''} onChange={e => setNewEvent({...newEvent, prizes_req: e.target.value})} placeholder="e.g. 1st Prize ₹5000, Trophies..."></textarea>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Program (Send to Mentor)</button>
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
                
                <span style={{ alignSelf: 'flex-start', marginBottom: '1rem' }} className={`badge ${['completed', 'published'].includes(event.state) ? 'badge-success' : 'badge-warning'}`}>
                  {event.state === 'pending_mentor_initial' ? 'Sent to Mentor' :
                   event.state === 'pending_admin_initial' ? 'Sent to Admin' :
                   event.state === 'pending_finance' ? 'Budget Sent to Finance' :
                   event.state === 'pending_admin_final' ? 'Finance Approved (At Admin)' :
                   event.state === 'pending_mentor_final' ? 'Admin Approved (At Mentor)' :
                   event.state === 'pending_coordinator_publish' ? 'Approved (Ready to Publish)' :
                   event.state === 'published' ? 'Approved & Published' :
                   event.state === 'pending_completion' ? 'Pending Completion' :
                   event.state === 'completed' ? 'Completed' : 
                   event.state}
                </span>
                
                {/* ADMIN UI (Event Approval Flow) */}
                {user.role === 'admin' && (
                  <div style={{ marginTop: 'auto' }}>
                    {event.state === 'pending_admin_initial' && (
                      <button onClick={() => handleApproveAdminInitial(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#3b82f6' }}>
                        ✅ Send Budget to Finance
                      </button>
                    )}
                    {event.state === 'pending_admin_final' && (
                      <button onClick={() => handleApproveAdminFinal(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#3b82f6' }}>
                        ✅ Send Final Approval to Mentor
                      </button>
                    )}
                  </div>
                )}

                {/* FINANCE ROLE SPECIFIC UI */}
                {['admin', 'finance'].includes(user.role) && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#047857' }}>💰 Financial Status & Estimations</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <span>Allocated Budget: ₹{(event.budget || 0).toLocaleString()}</span>
                      <span>Est. Expenses: ₹{(event.registered_count * 200).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#065f46', marginTop: '0.5rem' }}>
                      {event.accessories_req && <div style={{ marginBottom: '0.25rem' }}><strong>Accessories:</strong> {event.accessories_req}</div>}
                      {event.guests_req && <div style={{ marginBottom: '0.25rem' }}><strong>Guests:</strong> {event.guests_req}</div>}
                      {event.gifts_req && <div style={{ marginBottom: '0.25rem' }}><strong>Gifts:</strong> {event.gifts_req}</div>}
                      {event.prizes_req && <div style={{ marginBottom: '0.25rem' }}><strong>Prizes:</strong> {event.prizes_req}</div>}
                    </div>
                    {/* FINANCE APPROVAL UI */}
                    {event.state === 'pending_finance' && (
                      <button onClick={() => handleApproveBudget(event.id)} className="btn-primary" style={{ width: '100%', background: '#f59e0b', color: 'white', border: 'none', marginTop: '0.5rem' }}>
                        💰 Approve Budget (Back to Admin)
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
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {/* MENTOR UI */}
                  {['mentor', 'admin'].includes(user.role) && (
                    <>
                      {/* Mentor Approval */}
                      {event.state === 'pending_mentor_initial' && (
                        <button onClick={() => handleApproveMentorInitial(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#3b82f6' }}>
                          ✅ Forward to Admin
                        </button>
                      )}
                      
                      {event.state === 'pending_mentor_final' && (
                        <button onClick={() => handleApproveMentorFinal(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#10b981' }}>
                          ✅ Send Approval to Coordinator
                        </button>
                      )}

                      {/* Mentor Completion Approval */}
                      {event.state === 'pending_completion' && (
                        <button onClick={() => handleApproveCompletion(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#8b5cf6' }}>
                          ✅ Approve Event Completion
                        </button>
                      )}
                      
                      {/* Review Uploaded CSV (Mentor/Admin) */}
                      {['pending_completion', 'completed'].includes(event.state) && event.attendance_file_url && (
                        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                          <a href={`${baseURL}${event.attendance_file_url}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none', color: '#047857', borderColor: '#047857' }}>
                            📥 Review Uploaded Results (CSV)
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {/* Admin Certificate Generation & Template Upload */}
                  {user.role === 'admin' && event.state === 'completed' && (
                    <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px' }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#10b981', fontSize: '0.9rem' }}>🎓 Certificate Management</p>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>🖼️ 1) Manual Upload (PNG/JPG):</label>
                        <input 
                          type="file" 
                          accept=".png,.jpg,.jpeg"
                          onChange={async (e) => {
                            if (!e.target.files[0]) return;
                            const formData = new FormData();
                            formData.append("file", e.target.files[0]);
                            try {
                              await axios.post(`${baseURL}/api/admin/events/${event.id}/upload-certificate-template`, formData);
                              alert("Custom template uploaded successfully!");
                              fetchAdminData();
                            } catch (err) {
                              alert(`Error: ${err.response?.data?.detail || 'Failed to upload template'}`);
                            }
                          }}
                          className="input-glass"
                          style={{ padding: '0.5rem', fontSize: '0.8rem', width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>✨ OR 2) Generate with Free AI (Hugging Face):</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            className="input-glass" 
                            placeholder="e.g. Dark red and gold colors..." 
                            value={aiPrompts[event.id] || ''}
                            onChange={(e) => setAiPrompts({...aiPrompts, [event.id]: e.target.value})}
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                            disabled={aiLoading[event.id]}
                          />
                          <button 
                            onClick={() => handleGenerateAITemplate(event.id)} 
                            className="btn-primary" 
                            style={{ background: '#3b82f6', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                            disabled={aiLoading[event.id]}
                          >
                            {aiLoading[event.id] ? '⏳ Generating...' : 'Generate AI'}
                          </button>
                        </div>
                        {aiLoading[event.id] && <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>This might take 15-30 seconds. Please wait...</p>}
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        {event.certificate_template_url && (
                          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem' }}>✓ Custom Template Active</div>
                        )}
                      </div>

                      <button onClick={() => generateCertificates(event.id)} className="btn-primary" style={{ width: '100%', background: '#10b981' }}>
                        ⚡ Generate & Publish Certificates to Students
                      </button>
                    </div>
                  )}

                  {/* COORDINATOR UI */}
                  {user.role === 'coordinator' ? (
                    <>
                      {/* Publish is strictly Coordinator only */}
                      {user.role === 'coordinator' && event.state === 'pending_coordinator_publish' && (
                        <button onClick={() => handlePublishEvent(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#10b981' }}>
                          📢 Publish Event to Students
                        </button>
                      )}

                      {/* Close Event Button */}
                      {event.state === 'published' && (
                        <button onClick={() => handleCloseEvent(event.id)} className="btn-secondary" style={{ width: '100%', marginBottom: '0.5rem', color: '#dc2626', borderColor: '#dc2626' }}>
                          🛑 Close Event (Send to Mentor)
                        </button>
                      )}

                      {event.state === 'published' && (
                        <button onClick={() => startScanner(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                          <QrCode size={18} /> Scan QRs (Check-in)
                        </button>
                      )}

                      {/* Export Attendance Button */}
                      {['published', 'pending_completion', 'completed'].includes(event.state) && (
                        <button onClick={() => handleExportRegistrations(event.id)} className="btn-secondary" style={{ width: '100%', marginBottom: '0.5rem', color: '#047857', borderColor: '#047857' }}>
                          📊 Download Attendance CSV
                        </button>
                      )}

                      {/* Upload Attendance File */}
                      {['published', 'pending_completion'].includes(event.state) && (
                        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>📤 Upload Final Results (CSV) for Mentor/Admin:</label>
                          <input 
                            type="file" 
                            accept=".csv"
                            onChange={(e) => handleUploadAttendance(event.id, e.target.files[0])}
                            className="input-glass"
                            style={{ padding: '0.5rem', fontSize: '0.8rem', width: '100%' }}
                          />
                        </div>
                      )}

                    </>
                  ) : (
                    <button disabled className="btn-secondary" style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed', display: ['admin', 'finance', 'mentor'].includes(user.role) ? 'none' : 'block' }}>
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
