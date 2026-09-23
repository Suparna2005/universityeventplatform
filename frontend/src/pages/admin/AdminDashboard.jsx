import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, UserCircle, QrCode } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import BudgetDashboard from './BudgetDashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import ClubManagement from './ClubManagement';
import ClubsDashboard from '../student/ClubsDashboard';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('events'); // legacy tab
  const [activeMenu, setActiveMenu] = useState('Events');
  const [activeSubMenu, setActiveSubMenu] = useState('events_all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [scanningEventId, setScanningEventId] = useState(null);
  
  const [aiPrompts, setAiPrompts] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: '', end_date: '', location: '', capacity: '', budget: '',
    accessories_req: '', guests_req: '', gifts_req: '', prizes_req: '', club_id: ''
  });
  const [editEventId, setEditEventId] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [searchClubQuery, setSearchClubQuery] = useState('');
  const [editingClubId, setEditingClubId] = useState(null);
  const [editClubForm, setEditClubForm] = useState({ name: '', description: '' });
  
  // Feedback Viewing State
  const [viewFeedbackEventId, setViewFeedbackEventId] = useState(null);
  const [eventFeedback, setEventFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [aiRecommendReqLoading, setAiRecommendReqLoading] = useState(false);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = '';

  const handleAIRecommendReq = async (reqType, fieldName) => {
    if (!newEvent.title) {
      alert("Please enter a Program Title first so the AI knows what to recommend!");
      return;
    }
    setAiRecommendReqLoading(reqType);
    try {
      const res = await axios.get(`${baseURL}/api/admin/ai-recommend-requirements`, {
        params: { title: newEvent.title, description: newEvent.description, req_type: reqType }
      });
      setNewEvent(prev => ({ ...prev, [fieldName]: res.data.recommendation }));
    } catch (err) {
      alert("AI recommendation failed.");
    }
    setAiRecommendReqLoading(false);
  };

  const fetchAdminData = async () => {
    const [eventsResult, clubsResult] = await Promise.allSettled([
      axios.get(`${baseURL}/api/admin/programs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }),
      axios.get(`${baseURL}/api/clubs/list`)
    ]);
    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data);
    } else {
      console.error('Failed to load events:', eventsResult.reason);
      alert(`Failed to load events: ${eventsResult.reason.response?.data?.detail || eventsResult.reason.message}`);
    }
    if (clubsResult.status === 'fulfilled') {
      setClubs(clubsResult.value.data);
    } else {
      console.error('Failed to load clubs:', clubsResult.reason);
    }
    setLoading(false);
  };

  const handleViewFeedback = async (eventId) => {
    setViewFeedbackEventId(eventId);
    setLoadingFeedback(true);
    setEventFeedback([]);
    try {
      const response = await axios.get(`${baseURL}/api/admin/events/${eventId}/feedback`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEventFeedback(response.data);
    } catch (err) {
      alert(`Error fetching feedback: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoadingFeedback(false);
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
      const payload = {
        title: newEvent.title,
        description: newEvent.description,
        date: new Date(newEvent.date).toISOString(),
        end_date: newEvent.end_date ? new Date(newEvent.end_date).toISOString() : null,
        location: newEvent.location,
        capacity: parseInt(newEvent.capacity) || 0,
        budget: parseInt(newEvent.budget) || 0,
        accessories_req: newEvent.accessories_req,
        guests_req: newEvent.guests_req,
        gifts_req: newEvent.gifts_req,
        prizes_req: newEvent.prizes_req,
        club_id: newEvent.club_id ? parseInt(newEvent.club_id) : null
      };

      if (editEventId) {
        await axios.put(`${baseURL}/api/events/${editEventId}`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        alert('Event updated successfully!');
      } else {
        await axios.post(`${baseURL}/api/events`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        alert('Event scheduled successfully! Sent to Admin for initial approval.');
      }
      
      setShowCreateForm(false);
      setEditEventId(null);
      
      // Instantly inject the event into the local state so it appears without network delay
      const tempEvent = {
        id: editEventId || Date.now(),
        title: newEvent.title,
        date: newEvent.date,
        state: editEventId ? 'pending_admin_initial' : 'pending_admin_initial'
      };
      
      if (editEventId) {
        setEvents(prev => prev.map(e => e.id === editEventId ? {...e, ...tempEvent} : e));
      } else {
        setEvents(prev => [tempEvent, ...prev]);
      }
      
      setNewEvent({ title: '', description: '', date: '', end_date: '', location: '', capacity: '', budget: '', accessories_req: '', guests_req: '', gifts_req: '', prizes_req: '', club_id: '' });
      
      // Auto-redirect to the appropriate events directory so they can see their new event
      if (user.role === 'admin') {
        setActiveSubMenu('admin_events_pending');
      } else {
        setActiveSubMenu('events_submitted');
      }
      
      await fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to save event'}`);
    }
  };

  const [newClubName, setNewClubName] = useState('');
  const handleCreateClub = async (e) => {
    e.preventDefault();
    if (!newClubName.trim()) return;
    try {
      const res = await axios.post(`${baseURL}/api/clubs/`, {
        name: newClubName,
        description: "Official University Club"
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert('Club added successfully! Redirecting to Schedule Program...');
      setNewClubName('');
      
      // Instantly update local state to ensure it's in the dropdown immediately
      setClubs(prev => [...prev, { id: res.data.id, name: res.data.name }]);
      
      // Auto-select and redirect to Schedule Program
      setNewEvent(prev => ({...prev, club_id: res.data.id}));
      setActiveMenu('Events');
      setActiveSubMenu('events_create');
      
      await fetchAdminData(); // Refresh the rest of the data
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to create club'}`);
    }
  };

  const handleUpdateClub = async (e, clubId) => {
    e.preventDefault();
    try {
      await axios.put(`${baseURL}/api/clubs/${clubId}`, editClubForm, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert('Club updated successfully!');
      setEditingClubId(null);
      await fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to update club'}`);
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (!window.confirm("Are you sure you want to delete this club? Events associated with it may cause deletion to fail.")) return;
    try {
      await axios.delete(`${baseURL}/api/clubs/${clubId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert("Club deleted successfully!");
      await fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to delete club'}`);
    }
  };

  const handleEditClick = (event) => {
    setEditEventId(event.id);
    setNewEvent({
      title: event.title || '',
      description: event.description || '',
      date: event.date ? event.date.split('T')[0] : '',
      end_date: event.end_date ? event.end_date.split('T')[0] : '',
      location: event.location || '',
      capacity: event.capacity || '',
      budget: event.budget || '',
      accessories_req: event.accessories_req || '',
      guests_req: event.guests_req || '',
      gifts_req: event.gifts_req || '',
      prizes_req: event.prizes_req || '',
      club_id: event.club_id || ''
    });
    // Redirect to the Schedule Program view to show the form
    setActiveMenu('Events');
    setActiveSubMenu('events_create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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


  const handleRequestChanges = async (eventId) => {
    const reason = window.prompt("Enter the reason for requesting changes (this will be sent to the Coordinator):");
    if (!reason) return;
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/request-changes`, { reason }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert("Changes requested! Event sent back to Coordinator.");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handleRejectEvent = async (eventId) => {
    const reason = window.prompt("Enter the reason for permanent rejection:");
    if (!reason) return;
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/reject`, { reason }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert("Event rejected permanently.");
      fetchAdminData();
    } catch (err) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const handleVerifyExpenses = async (eventId) => {
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/verify-expenses`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert("Expenses verified! Sent to Admin for final completion.");
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
      alert("Final approval sent to Coordinator!");
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
    const expenses = window.prompt("Enter the actual total expenses (in ₹) for this event:");
    if (expenses === null || isNaN(parseInt(expenses))) {
      alert("Invalid expense amount. Please enter a valid number.");
      return;
    }
    try {
      await axios.put(`${baseURL}/api/admin/events/${eventId}/close`, { actual_expenses: parseInt(expenses) }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert("Event closed successfully! Expense report sent to Finance.");
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
      alert("Attendance file uploaded to Admin successfully!");
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

  const getMenuStructure = () => {
    if (user.role === 'admin') {
      return [
        {
          category: 'Approvals',
          items: [
            { id: 'admin_events_pending', label: 'Pending Initial Review' },
            { id: 'admin_appr_final', label: 'Pending Final Approval' },
          ]
        },
        {
          category: 'Events',
          items: [
            { id: 'admin_dash_events', label: 'All Events Overview' },
            { id: 'admin_events_published', label: 'Published Events' },
            { id: 'admin_events_completed', label: 'Completed Events' },
          ]
        },
        {
          category: 'Clubs & Users',
          items: [
            { id: 'admin_clubs_all', label: 'Manage Clubs' },
            { id: 'admin_clubs_browse', label: 'Browse Clubs Directory' },
            { id: 'admin_users_students', label: 'Manage Users' },
          ]
        },
        {
          category: 'Account',
          items: [
            { id: 'account_signout', label: 'Sign Out' },
          ]
        }
      ];
    } else if (user.role === 'finance') {
      return [
        {
          category: 'Finance Portal',
          items: [
            { id: 'pending_finance', label: 'Pending Budgets & Expenses' },
          ]
        },
        {
          category: 'Account',
          items: [
            { id: 'account_signout', label: 'Sign Out' },
          ]
        }
      ];
    } else {
      // Coordinator Menu
      return [
        {
          category: 'Events',
          items: [
            { id: 'events_create', label: 'Schedule Program' },
            { id: 'events_submitted', label: 'Submitted Events' },
            { id: 'events_approved', label: 'Approved (Ready to Publish)' },
            { id: 'events_published', label: 'Published Events' },
            { id: 'events_completed', label: 'Completed Events' },
          ]
        },
        {
          category: 'Event Operations',
          items: [
            { id: 'attendance_scanner', label: 'QR Code Scanner' },
            { id: 'participants_list', label: 'Registration List' },
          ]
        },
        {
          category: 'Clubs',
          items: [
            { id: 'clubs_manage', label: 'Manage Clubs' },
            { id: 'admin_clubs_browse', label: 'Browse Clubs Directory' },
          ]
        },
        {
          category: 'Account',
          items: [
            { id: 'account_signout', label: 'Sign Out' },
          ]
        }
      ];
    }
  };

  const menuStructure = getMenuStructure();

  const handleSidebarClick = (menu, subMenu) => {
    setActiveMenu(menu);
    setActiveSubMenu(subMenu);
    
    // Legacy Tab mapping to reuse existing components
    if (menu === 'Reports') setActiveTab('analytics');
    else if (subMenu === 'pending_finance') setActiveTab('budgets');
    else setActiveTab('events');
    
    if (subMenu === 'account_signout') {
      logout();
      navigate('/login');
    }
  };

  const eventGridSubMenus = [
    'total_events', 'draft_events', 'pending_admin', 'pending_finance', 'upcoming_events', 
    'events_all', 'events_draft', 'events_submitted', 'events_approved', 'events_published', 'events_completed', 'events_cancelled',
    'attendance_scanner', 
    'admin_dash_events', 'admin_dash_approvals', 'admin_dash_upcoming', 
    'admin_events_all', 'admin_events_pending', 'admin_events_approved', 'admin_events_published', 'admin_events_completed', 'admin_events_rejected', 'admin_events_cancelled',
    'admin_appr_finance', 'admin_appr_final', 'admin_appr_approve', 'admin_appr_changes', 'admin_appr_reject', 'admin_appr_history',
    'admin_att_event', 'admin_cert_templates'
  ];

  const getFilteredEvents = () => {
    let filtered = [...events];
    switch(activeSubMenu) {
      case 'draft_events':
      case 'events_draft':
        return filtered.filter(e => e.state === 'draft');
      case 'events_submitted':
        return filtered.filter(e => e.state === 'pending_admin_initial');
      case 'pending_admin':
        return filtered.filter(e => e.state === 'pending_admin_initial' || e.state === 'pending_admin_final');
      case 'pending_finance':
      case 'admin_appr_finance':
        return filtered.filter(e => e.state === 'pending_finance' || e.state === 'finance_review');
      case 'events_approved':
        return filtered.filter(e => e.state === 'pending_coordinator_publish');
      case 'events_published':
      case 'admin_events_published':
      case 'attendance_scanner':
        return filtered.filter(e => e.state === 'published');
      case 'events_completed':
      case 'admin_events_completed':
        return filtered.filter(e => e.state === 'completed');
      case 'events_cancelled':
      case 'admin_events_cancelled':
        return filtered.filter(e => e.state === 'cancelled');
      case 'upcoming_events':
      case 'admin_dash_upcoming':
        return filtered.filter(e => new Date(e.date) > new Date());
      case 'admin_dash_approvals':
      case 'admin_events_pending':
        return filtered.filter(e => e.state === 'pending_admin_initial');
      case 'admin_appr_final':
        return filtered.filter(e => e.state === 'pending_admin_final' || e.state === 'pending_completion');
      case 'admin_events_approved':
        return filtered.filter(e => e.state === 'pending_coordinator_publish' || e.state === 'published' || e.state === 'completed');
      case 'admin_events_rejected':
      case 'admin_appr_reject':
        return filtered.filter(e => e.state === 'rejected');
      default:
        return filtered;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{ width: '280px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <Brain size={28} /> BRAINWARE
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '2.25rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
            {user.role} Portal
          </span>
        </div>
        
        <nav style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          {menuStructure.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em', paddingLeft: '0.5rem' }}>
                {section.category}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.items.map(item => (
                  <li key={item.id}>
                    <button 
                      onClick={() => handleSidebarClick(section.category, item.id)}
                      style={{ 
                        width: '100%', textAlign: 'left', padding: '0.5rem 1rem', borderRadius: '6px',
                        background: activeSubMenu === item.id ? 'var(--primary)' : 'transparent',
                        color: activeSubMenu === item.id ? 'white' : '#334155',
                        border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        marginBottom: '0.1rem'
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        
        {/* Top Header */}
        <header style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, color: '#0f172a' }}>
              {menuStructure.flatMap(s => s.items).find(i => i.id === activeSubMenu)?.label || 'Dashboard'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Welcome, {user.name}</span>
            <button onClick={() => navigate('/profile')} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCircle size={18} /> Profile
            </button>
          </div>
        </header>

        {/* Dynamic Content Wrapper */}
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* We hide the legacy tabs, but keep them rendering if needed or just use activeTab */}
          
          {/* Show Placeholder for unimplemented sidebar items */}
          {(!eventGridSubMenus.includes(activeSubMenu) && !['events_create', 'account_signout', 'admin_analytics', 'club_profile', 'admin_clubs_all', 'admin_clubs_add', 'clubs_manage', 'admin_clubs_browse'].includes(activeSubMenu) && activeMenu !== 'Reports') && (
            <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.8)', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <h2 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.5rem' }}>✨ Coming Soon</h2>
              <p style={{ color: '#64748b' }}>The "{menuStructure.flatMap(s => s.items).find(i => i.id === activeSubMenu)?.label}" module is currently under development.</p>
              <button onClick={() => handleSidebarClick('Events', 'events_all')} className="btn-primary" style={{ marginTop: '1.5rem' }}>Return to All Events</button>
            </div>
          )}

          {/* Club Management View */}
          {(activeSubMenu === 'admin_clubs_all' || activeSubMenu === 'clubs_manage') && (
            <ClubManagement />
          )}

          {/* Club Directory View */}
          {activeSubMenu === 'admin_clubs_browse' && (
            <ClubsDashboard />
          )}

          {/* Legacy Rendering Logic for implemented views */}
          {(eventGridSubMenus.includes(activeSubMenu) || activeSubMenu === 'events_create') && (
            <>
              {activeTab === 'budgets' && <BudgetDashboard />}

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

        {/* Legacy Header Removed for Sidebar Layout */}

        {activeSubMenu === 'events_create' && (
          <div className="glass-card animate-fade-in" style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--secondary)' }}>{editEventId ? 'Edit Program' : 'Schedule New Program'}</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Program Title</label>
                <input type="text" className="input-glass" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Hosting Club</label>
                <select className="input-glass" required value={newEvent.club_id} onChange={e => setNewEvent({...newEvent, club_id: e.target.value})}>
                  <option value="">Select a Club...</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>Accessories Needed</label>
                  <button type="button" onClick={() => handleAIRecommendReq('accessories', 'accessories_req')} className="btn-secondary" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                    {aiRecommendReqLoading === 'accessories' ? '⏳...' : '✨ AI Recommend'}
                  </button>
                </div>
                <textarea className="input-glass" rows="2" value={newEvent.accessories_req || ''} onChange={e => setNewEvent({...newEvent, accessories_req: e.target.value})} placeholder="e.g. Projector, Sound system..."></textarea>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>Guests Coming</label>
                  <button type="button" onClick={() => handleAIRecommendReq('guests', 'guests_req')} className="btn-secondary" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                    {aiRecommendReqLoading === 'guests' ? '⏳...' : '✨ AI Recommend'}
                  </button>
                </div>
                <textarea className="input-glass" rows="2" value={newEvent.guests_req || ''} onChange={e => setNewEvent({...newEvent, guests_req: e.target.value})} placeholder="e.g. Chief Guest Mr. XYZ..."></textarea>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>Gifts for Guests</label>
                  <button type="button" onClick={() => handleAIRecommendReq('gifts', 'gifts_req')} className="btn-secondary" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                    {aiRecommendReqLoading === 'gifts' ? '⏳...' : '✨ AI Recommend'}
                  </button>
                </div>
                <textarea className="input-glass" rows="2" value={newEvent.gifts_req || ''} onChange={e => setNewEvent({...newEvent, gifts_req: e.target.value})} placeholder="e.g. Mementos, Bouquets..."></textarea>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>Prizes for Students</label>
                  <button type="button" onClick={() => handleAIRecommendReq('prizes', 'prizes_req')} className="btn-secondary" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                    {aiRecommendReqLoading === 'prizes' ? '⏳...' : '✨ AI Recommend'}
                  </button>
                </div>
                <textarea className="input-glass" rows="2" value={newEvent.prizes_req || ''} onChange={e => setNewEvent({...newEvent, prizes_req: e.target.value})} placeholder="e.g. 1st Prize ₹5000, Trophies..."></textarea>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                  {editEventId ? '💾 Save Changes' : '📤 Submit Program Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading operations...</div>
        ) : eventGridSubMenus.includes(activeSubMenu) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
            {getFilteredEvents().length === 0 ? (
              <p style={{ color: '#64748b' }}>No events found for this filter.</p>
            ) : (
              getFilteredEvents().map(event => (
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

                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', paddingRight: '4rem' }}>
                  <span className="badge badge-secondary" style={{ alignSelf: 'flex-start', marginBottom: '0.5rem', fontSize: '0.8rem', background: '#f1f5f9', color: 'var(--primary)' }}>
                    📅 {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{event.title}</h3>
                </div>
                
                {event.rejection_reason && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', fontWeight: 'bold' }}>⚠️ Notes from Admin/Finance:</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c' }}>{event.rejection_reason}</p>
                  </div>
                )}
                
                <span style={{ alignSelf: 'flex-start', marginBottom: '1rem' }} className={`badge ${['completed', 'published'].includes(event.state) ? 'badge-success' : 'badge-warning'}`}>
                  {event.state === 'pending_admin_initial' ? 'Sent to Admin' :
                   event.state === 'pending_finance' ? 'Budget Sent to Finance' :
                   event.state === 'pending_admin_final' ? 'Finance Approved (At Admin)' :
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
                      <>
                        <button onClick={() => handleApproveAdminInitial(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#3b82f6' }}>
                          ✅ Send Budget to Finance
                        </button>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleRequestChanges(event.id)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fffbeb', color: '#d97706', borderColor: '#d97706' }}>
                            ⚠️ Request Changes
                          </button>
                          <button onClick={() => handleRejectEvent(event.id)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}>
                            ❌ Reject
                          </button>
                        </div>
                      </>
                    )}
                    {event.state === 'pending_admin_final' && (
                      <>
                        <button onClick={() => handleApproveAdminFinal(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#3b82f6' }}>
                          ✅ Send Final Approval to Coordinator
                        </button>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleRequestChanges(event.id)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fffbeb', color: '#d97706', borderColor: '#d97706' }}>
                            ⚠️ Request Changes
                          </button>
                          <button onClick={() => handleRejectEvent(event.id)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}>
                            ❌ Reject
                          </button>
                        </div>
                      </>
                    )}
                    {event.state === 'pending_completion' && (
                      <button onClick={() => handleApproveCompletion(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#10b981' }}>
                        ✅ Approve Final Completion (Mark Completed)
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
                      <>
                        <button onClick={() => handleApproveBudget(event.id)} className="btn-primary" style={{ width: '100%', background: '#f59e0b', color: 'white', border: 'none', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                          💰 Approve Budget (Back to Admin)
                        </button>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleRequestChanges(event.id)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fffbeb', color: '#d97706', borderColor: '#d97706' }}>
                            ⚠️ Request Changes
                          </button>
                          <button onClick={() => handleRejectEvent(event.id)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}>
                            ❌ Reject
                          </button>
                        </div>
                      </>
                    )}
                    {event.state === 'finance_review' && (
                      <>
                        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem', marginBottom: '0.5rem', color: '#166534', fontSize: '0.85rem' }}>
                          <strong>Submitted Actual Expenses:</strong> ₹{event.actual_expenses?.toLocaleString()}
                        </div>
                        <button onClick={() => handleVerifyExpenses(event.id)} className="btn-primary" style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', marginBottom: '0.5rem' }}>
                          ✅ Verify Expenses (Send to Admin)
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* GENERAL ANALYTICS (All Roles) */}
                <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Performance Analytics</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <span>👥 Registrations: {event.registered_count} / {event.capacity}</span>
                    <span>📈 Feedback: {event.feedback_count}</span>
                  </div>
                  {event.feedback_count > 0 && (
                    <button onClick={() => handleViewFeedback(event.id)} className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.25rem' }}>
                      🔍 View AI Feedback Analysis
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {/* ADMIN UI */}
                  {user.role === 'admin' && (
                    <>
                      {/* Admin Completion Approval */}
                      {event.state === 'pending_completion' && (
                        <button onClick={() => handleApproveCompletion(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#8b5cf6' }}>
                          ✅ Approve Event Completion
                        </button>
                      )}
                      
                      {/* Review Uploaded CSV */}
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
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>✨ OR 2) Generate Template with Free AI:</label>
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
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '0.5rem', fontWeight: 'bold' }}>✓ Custom Template Active</div>
                            <img src={`${baseURL}${event.certificate_template_url}`} alt="Certificate Template Preview" style={{ maxWidth: '100%', maxHeight: '150px', border: '1px solid #ccc', borderRadius: '4px' }} />
                          </div>
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
                      {user.role === 'coordinator' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <button onClick={() => handleEditClick(event)} className="btn-secondary" style={{ flex: 1, padding: '0.25rem', fontSize: '0.8rem' }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDeleteEvent(event.id)} className="btn-secondary" style={{ flex: 1, background: '#ef4444', padding: '0.25rem', fontSize: '0.8rem' }}>
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                      {user.role === 'coordinator' && event.state === 'pending_coordinator_publish' && (
                        <button onClick={() => handlePublishEvent(event.id)} className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#10b981' }}>
                          📢 Publish Event to Students
                        </button>
                      )}

                      {/* Close Event Button */}
                      {event.state === 'published' && (
                        <button onClick={() => handleCloseEvent(event.id)} className="btn-secondary" style={{ width: '100%', marginBottom: '0.5rem', color: '#dc2626', borderColor: '#dc2626' }}>
                          🛑 Submit Expense Report & Close (Send to Finance)
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
                      {['published', 'finance_review', 'pending_completion'].includes(event.state) && (
                        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>📤 Upload Final Results (CSV) for Admin:</label>
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
            ))
            )}
          </div>
        )}
      </div>
      )}
      {/* Feedback Viewing Modal */}
      {viewFeedbackEventId && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', background: 'rgba(255,255,255,0.95)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>AI Sentiment Analysis & Feedback</h3>
              <button onClick={() => setViewFeedbackEventId(null)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>Close</button>
            </div>
            
            {loadingFeedback ? (
              <p>Loading AI Analysis...</p>
            ) : eventFeedback.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No feedback submitted yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {eventFeedback.map(fb => (
                  <div key={fb.id} style={{ padding: '1rem', background: 'white', borderRadius: '8px', borderLeft: `4px solid ${fb.sentiment === 'Positive' ? '#10b981' : fb.sentiment === 'Negative' ? '#dc2626' : '#f59e0b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>Rating: {fb.rating}/5</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: fb.sentiment === 'Positive' ? '#10b981' : fb.sentiment === 'Negative' ? '#dc2626' : '#f59e0b' }}>
                        AI Tag: {fb.sentiment}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>"{fb.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
            </>
          )}

          {/* Club Profile & Management View */}
          {['club_profile', 'admin_clubs_all', 'admin_clubs_add', 'clubs_manage'].includes(activeSubMenu) && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--secondary)' }}>Add New Club</h3>
                <form onSubmit={handleCreateClub} style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    className="input-glass" 
                    placeholder="Enter New Club Name (e.g., Robotics Club)" 
                    value={newClubName} 
                    onChange={e => setNewClubName(e.target.value)} 
                    required 
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>+ Create Club</button>
                </form>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a' }}>Active Clubs Directory</h2>
                  <input 
                    type="text" 
                    className="input-glass" 
                    placeholder="Search clubs by name..." 
                    value={searchClubQuery} 
                    onChange={e => setSearchClubQuery(e.target.value)} 
                    style={{ width: '300px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {clubs.filter(c => c.name.toLowerCase().includes(searchClubQuery.toLowerCase())).length === 0 ? (
                    <p style={{ color: '#64748b' }}>No clubs found.</p>
                  ) : (
                    clubs.filter(c => c.name.toLowerCase().includes(searchClubQuery.toLowerCase())).map(club => (
                      <div key={club.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        {editingClubId === club.id ? (
                          <form onSubmit={(e) => handleUpdateClub(e, club.id)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <input 
                              className="input-glass" 
                              value={editClubForm.name} 
                              onChange={e => setEditClubForm({...editClubForm, name: e.target.value})} 
                              required 
                            />
                            <textarea 
                              className="input-glass" 
                              value={editClubForm.description} 
                              onChange={e => setEditClubForm({...editClubForm, description: e.target.value})} 
                              rows="3" 
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                              <button type="submit" className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', flex: 1 }}>Save</button>
                              <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', flex: 1 }} onClick={() => setEditingClubId(null)}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '1.25rem' }}>{club.name}</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>{club.description || 'No description provided.'}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="badge" style={{ background: '#e0e7ff', color: '#4f46e5' }}>Active</span>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                                  setEditingClubId(club.id);
                                  setEditClubForm({ name: club.name, description: club.description || '' });
                                }}>Edit</button>
                                <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDeleteClub(club.id)}>Delete</button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Admin Analytics View */}
          {activeSubMenu === 'admin_analytics' && (
             <div className="animate-fade-in">
                <AnalyticsDashboard />
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
