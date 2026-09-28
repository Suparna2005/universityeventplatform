import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserCircle, QrCode, Settings, CalendarDays, Users, CheckCircle2, BarChart3, MessageSquare, Download, Upload, Award, Sparkles, Pencil, Trash2, FileText, Building2, LogOut, Wallet, MapPin, UserCheck, ThumbsUp, User, Lock, Paperclip, Info, MoreVertical } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import BudgetDashboard from './BudgetDashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import ClubManagement from './ClubManagement';
import ClubsDashboard from '../student/ClubsDashboard';
import UserManagement from './UserManagement';
import AdminClubApprovals from './AdminClubApprovals';
import StudentManagement from './StudentManagement';
import ChangePasswordModal from '../ChangePasswordModal';
import { PromptModal, ConfirmModal, AlertModal } from '../../components/Modals';
import SystemSetupModal from '../../components/SystemSetupModal';
import PortalBrand from '../../components/PortalBrand';
import { EmptyState, LoadingState } from '../../components/UI';

const MENU_ICONS = {
  admin_dash_events: BarChart3,
  admin_events_published: CalendarDays,
  admin_events_completed: CheckCircle2,
  admin_events_pending: CheckCircle2,
  admin_clubs_all: Building2,
  admin_clubs_browse: Users,
  admin_users_students: Users,
  admin_req_faculty: UserCircle,
  admin_req_student: UserCircle,
  events_create: CalendarDays,
  events_submitted: FileText,
  events_approved: CheckCircle2,
  events_published: CalendarDays,
  events_completed: Award,
  attendance_scanner: QrCode,
  participants_list: Users,
  pending_finance: Wallet,
  coordinator_students: Users,
  account_password: Settings,
  account_signout: LogOut
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('events'); // legacy tab
  const [activeMenu, setActiveMenu] = useState('Events');
  const [activeSubMenu, setActiveSubMenu] = useState('events_all');
  const [sidebarTick, setSidebarTick] = useState(0);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanningEventId, setScanningEventId] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const [aiPrompts, setAiPrompts] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [isSystemSetupOpen, setIsSystemSetupOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: '', end_date: '', location: '', capacity: '', budget: '',
    accessories_req: '', guests_req: '', gifts_req: '', prizes_req: '', club_id: ''
  });
  const [editEventId, setEditEventId] = useState(null);
  const [clubs, setClubs] = useState([]);
  
  // Feedback Viewing State
  const [viewFeedbackEventId, setViewFeedbackEventId] = useState(null);
  const [eventFeedback, setEventFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [aiRecommendReqLoading, setAiRecommendReqLoading] = useState(false);

  const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', placeholder: '', onConfirm: null, onCancel: () => setPromptModal({ isOpen: false }) });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: () => setConfirmModal({ isOpen: false }) });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [pendingReqCounts, setPendingReqCounts] = useState({ faculty: 0, student: 0 });
  const [clubJoinRequests, setClubJoinRequests] = useState([]);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = '';

  const notify = (message) => {
    const isError = /error|failed|could not|unable|unavailable/i.test(String(message));
    setAlertModal({ isOpen: true, title: isError ? 'Action could not be completed' : 'Update complete', message: String(message), isError });
  };

  const handleAIRecommendReq = async (reqType, fieldName) => {
    if (!newEvent.title) {
      notify("Please enter a Program Title first so the AI knows what to recommend!");
      return;
    }
    setAiRecommendReqLoading(reqType);
    try {
      const res = await axios.get(`${baseURL}/api/admin/ai-recommend-requirements`, {
        params: { title: newEvent.title, description: newEvent.description, req_type: reqType }
      });
      setNewEvent(prev => ({ ...prev, [fieldName]: res.data.recommendation }));
    } catch (err) {
      notify("AI recommendation failed.");
    }
    setAiRecommendReqLoading(false);
  };

  
  const fetchClubJoinRequests = async () => {
    try {
      const endpoint = user.role === 'admin' ? '/api/clubs/admin-requests' : '/api/clubs/department-requests';
      const res = await axios.get(`${baseURL}${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClubJoinRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeSubMenu === 'coordinator_club_reqs' || activeSubMenu === 'admin_club_reqs') {
      fetchClubJoinRequests();
    }
  }, [activeSubMenu]);

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
      notify(`Failed to load events: ${eventsResult.reason.response?.data?.detail || eventsResult.reason.message}`);
    }
    if (clubsResult.status === 'fulfilled') {
      setClubs(clubsResult.value.data);
    } else {
      console.error('Failed to load clubs:', clubsResult.reason);
    }
    
    if (user.role === 'admin') {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        const [joinRes, leaveRes] = await Promise.all([
          axios.get(`${baseURL}/api/admin/club-requests`, { headers }),
          axios.get(`${baseURL}/api/admin/club-leave-requests`, { headers })
        ]);
        const facultyCount = joinRes.data.filter(r => r.role && ['faculty', 'coordinator', 'club_coordinator'].includes(r.role.toLowerCase())).length + leaveRes.data.filter(r => r.role && ['faculty', 'coordinator', 'club_coordinator'].includes(r.role.toLowerCase())).length;
        const studentCount = joinRes.data.filter(r => r.role && r.role.toLowerCase() === 'student').length + leaveRes.data.filter(r => r.role && r.role.toLowerCase() === 'student').length;
        setPendingReqCounts({ faculty: facultyCount, student: studentCount });
      } catch (err) {
        console.error("Failed to fetch pending requests counts");
      }
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
      setAlertModal({ isOpen: true, title: 'Could not load feedback', message: err.response?.data?.detail || err.message, isError: true });
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleGenerateAITemplate = async (eventId) => {
    const prompt = aiPrompts[eventId];
    if (!prompt) {
      notify("Please enter a style or colors for the AI!");
      return;
    }
    
    setAiLoading({...aiLoading, [eventId]: true});
    try {
      await axios.post(`${baseURL}/api/admin/events/${eventId}/generate-ai-template`, { prompt });
      setAlertModal({ isOpen: true, title: 'Certificate design generated', message: 'Your AI generated certificate template is ready to preview.', isError: false });
      setAiPrompts({...aiPrompts, [eventId]: ''});
      fetchAdminData();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not generate certificate design', message: err.response?.data?.detail || 'Please try again.', isError: true });
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
      setAlertModal({ isOpen: true, title: 'Certificates published', message: response.data.message, isError: false });
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not publish certificates', message: err.response?.data?.detail || 'Please try again.', isError: true });
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
        setAlertModal({ isOpen: true, title: 'Event updated', message: 'Your event details were saved successfully.', isError: false });
      } else {
        await axios.post(`${baseURL}/api/events`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setAlertModal({ isOpen: true, title: 'Event scheduled', message: 'Your event has been sent to Admin for initial approval.', isError: false });
      }
      
      setEditEventId(null);
      
      // Instantly inject the event into the local state so it appears without network delay
      const tempEvent = {
        id: editEventId || Date.now(),
        title: newEvent.title,
        date: newEvent.date,
        state: 'pending_finance'
      };
      
      if (editEventId) {
        setEvents(prev => prev.map(e => e.id === editEventId ? {...e, ...tempEvent} : e));
      } else {
        setEvents(prev => [tempEvent, ...prev]);
      }
      
      setNewEvent({ title: '', description: '', date: '', end_date: '', location: '', capacity: '', budget: '', accessories_req: '', guests_req: '', gifts_req: '', prizes_req: '', club_id: '' });
      
      // Auto-redirect to the appropriate events directory so they can see their new event
      if (user.role === 'admin') {
        setActiveSubMenu('admin_dash_events');
      } else {
        setActiveSubMenu('events_submitted');
      }
      
      await fetchAdminData();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not save event', message: err.response?.data?.detail || 'Please try again.', isError: true });
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

  const handleDeleteEvent = (eventId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Event',
      message: 'Are you sure you want to delete this program?',
      confirmText: 'Delete',
      confirmColor: '#dc2626',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${baseURL}/api/events/${eventId}`);
          setAlertModal({ isOpen: true, title: 'Event deleted', message: 'The event was removed successfully.', isError: false });
          fetchAdminData();
        } catch (err) {
          setAlertModal({ isOpen: true, title: 'Could not delete event', message: err.response?.data?.detail || 'Please try again.', isError: true });
        }
      }
    });
  };


  const handleRequestChanges = (eventId) => {
    setPromptModal({
      isOpen: true,
      title: 'Request Changes',
      message: 'Enter the reason for requesting changes (this will be sent to the Coordinator):',
      placeholder: 'Reason for changes...',
      defaultValue: '',
      onCancel: () => setPromptModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async (reason) => {
        setPromptModal(prev => ({ ...prev, isOpen: false }));
        if (!reason) return;
        try {
          await axios.put(`${baseURL}/api/admin/events/${eventId}/request-changes`, { reason }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          notify("Changes requested! Event sent back to Coordinator.");
          fetchAdminData();
        } catch (err) { notify(`Error: ${err.response?.data?.detail}`); }
      }
    });
  };

  const handleRejectEvent = (eventId) => {
    setPromptModal({
      isOpen: true,
      title: 'Reject Event',
      message: 'Enter the reason for permanent rejection:',
      placeholder: 'Reason for rejection...',
      defaultValue: '',
      onCancel: () => setPromptModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async (reason) => {
        setPromptModal(prev => ({ ...prev, isOpen: false }));
        if (!reason) return;
        try {
          await axios.put(`${baseURL}/api/admin/events/${eventId}/reject`, { reason }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          notify("Event rejected permanently.");
          fetchAdminData();
        } catch (err) { notify(`Error: ${err.response?.data?.detail}`); }
      }
    });
  };

  const handleVerifyExpenses = (eventId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Verify Expenses',
      message: 'Are you sure you want to verify these expenses? This will complete the event workflow.',
      confirmText: 'Verify',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await axios.put(`${baseURL}/api/admin/events/${eventId}/verify-expenses`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          notify(response.data.message || "Expenses verified! Event is now completed.");
          fetchAdminData();
        } catch (err) { notify(`Error: ${err.response?.data?.detail}`); }
      }
    });
  };

  const handleApproveAdminInitial = (eventId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve & Send to Finance',
      message: 'Are you sure you want to forward this budget request to the Finance team?',
      confirmText: 'Approve',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-admin-initial`);
          notify("Budget request sent to Finance successfully!");
          fetchAdminData();
        } catch (err) { notify(`Error: ${err.response?.data?.detail}`); }
      }
    });
  };

  const handleApproveBudget = (eventId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Budget',
      message: 'Are you sure you want to approve this budget?',
      confirmText: 'Approve',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-budget`);
          notify("Budget approved! Sent back to Admin.");
          fetchAdminData();
        } catch (err) { notify(`Error: ${err.response?.data?.detail}`); }
      }
    });
  };

  const handleApproveAdminFinal = (eventId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Final Approval',
      message: 'Are you sure you want to give final approval for this event?',
      confirmText: 'Approve',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-admin-final`);
          notify("Final approval sent to Coordinator!");
          fetchAdminData();
        } catch (err) { notify(`Error: ${err.response?.data?.detail}`); }
      }
    });
  };


  const handlePublishEvent = (eventId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Publish Event',
      message: 'Are you sure you want to publish this event for all students to see?',
      confirmText: 'Publish',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.put(`${baseURL}/api/admin/events/${eventId}/publish`);
          notify("Event published to Students successfully!");
          fetchAdminData();
        } catch (err) { notify(`Error: ${err.response?.data?.detail}`); }
      }
    });
  };

  const handleCloseEvent = (event) => {
    if (!event.expenses_file_url || event.actual_expenses == null) {
      setAlertModal({ isOpen: true, title: 'Valid expense CSV required', message: 'Upload a valid expense CSV with item descriptions and amounts before submitting this event to Finance.', isError: true });
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Submit expense report',
      message: 'The uploaded expense CSV and its calculated total will be sent to Finance. Submit and close this event?',
      confirmText: 'Submit to Finance',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.put(`${baseURL}/api/admin/events/${event.id}/close`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          setAlertModal({ isOpen: true, title: 'Expense report submitted', message: 'The event and its expense CSV have been sent to Finance for review.', isError: false });
          fetchAdminData();
        } catch (err) {
          setAlertModal({ isOpen: true, title: 'Could not submit expense report', message: err.response?.data?.detail || 'Please try again.', isError: true });
        }
      }
    });
  };

  const handleApproveCompletion = (eventId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Completion',
      message: 'Are you sure you want to approve this event\'s completion?',
      confirmText: 'Approve',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.put(`${baseURL}/api/admin/events/${eventId}/approve-completion`);
          notify("Event completion approved successfully!");
          fetchAdminData();
        } catch (err) {
          notify(`Error: ${err.response?.data?.detail || 'Failed to approve event completion'}`);
        }
      }
    });
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
      notify(`Error downloading CSV: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleUploadAttendance = async (eventId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${baseURL}/api/admin/events/${eventId}/upload-attendance`, formData);
      setAlertModal({ isOpen: true, title: 'Results uploaded', message: 'The final results CSV is ready for certificate processing.', isError: false });
      fetchAdminData();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not upload results', message: err.response?.data?.detail || 'Please try again.', isError: true });
    }
  };

  const handleUploadExpenses = async (eventId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post(`${baseURL}/api/admin/events/${eventId}/upload-expenses`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setAlertModal({ isOpen: true, title: 'Expense CSV uploaded', message: `The report is ready to submit to Finance. Calculated total: INR ${Number(response.data.actual_expenses || 0).toLocaleString()}.`, isError: false });
      fetchAdminData();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not upload expense CSV', message: err.response?.data?.detail || err.message, isError: true });
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
          notify(`Check-in Successful! ${res.data.student_name}`);
          fetchAdminData();
        } catch (err) {
          notify(`Error: ${err.response?.data?.detail || 'Check-in failed'}`);
        }
      }, (_error) => {
        // ignore continuous scan errors
      });
    }, 100);
  };

  const getMenuStructure = () => {
    if (user.role === 'admin') {
      return [
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
            { id: 'admin_clubs_browse', label: 'Active Clubs Directory' },
            { id: 'coordinator_club_reqs', label: 'Club Join Requests' },
            { id: 'admin_users_students', label: 'Manage Users' },
          ]
        },
        {
          category: 'Pending Requests',
          items: [
            { id: 'admin_club_reqs', label: 'Club Join Requests' },
            { id: 'admin_req_faculty', label: 'Faculty Requests', badge: pendingReqCounts.faculty > 0 },
            { id: 'admin_req_student', label: 'Student Requests', badge: pendingReqCounts.student > 0 }
          ]
        },
        {
          category: 'Account',
          items: [
            { id: 'account_password', label: 'Change Password' },
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
            { id: 'account_password', label: 'Change Password' },
            { id: 'account_signout', label: 'Sign Out' },
          ]
        }
      ];
    } else if (user.permissions && user.permissions.dashboard_type === 'admin') {
      const perms = user.permissions.permissions || {};
      const customMenu = [];
      
      if (perms.events?.view_events || perms.events?.approve_events) {
        customMenu.push({
          category: 'Events',
          items: [
            ...(perms.events?.view_events ? [
              { id: 'admin_dash_events', label: 'All Events Overview' },
              { id: 'admin_events_published', label: 'Published Events' },
              { id: 'admin_events_completed', label: 'Completed Events' }
            ] : []),
            ...(perms.events?.approve_events ? [{ id: 'admin_events_pending', label: 'Pending Approvals' }] : [])
          ]
        });
      }

      if (perms.events?.scanner || perms.events?.registration_list || perms.events?.upload_attendance || perms.events?.manage_certificates) {
        customMenu.push({
          category: 'Event Operations',
          items: [
            ...(perms.events?.scanner ? [{ id: 'attendance_scanner', label: 'QR Code Scanner' }] : []),
            ...(perms.events?.registration_list ? [{ id: 'participants_list', label: 'Registration List' }] : []),
          ]
        });
      }

      if (perms.users?.view_directory || perms.clubs?.view_clubs) {
        customMenu.push({
          category: 'Clubs & Users',
          items: [
            ...(perms.clubs?.view_clubs ? [
              { id: 'admin_clubs_all', label: 'Manage Clubs' },
              { id: 'admin_clubs_browse', label: 'Active Clubs Directory' }
            ] : []),
            ...(perms.users?.view_directory ? [{ id: 'admin_users_students', label: 'Manage Users' }] : [])
          ]
        });
      }

      if (perms.finance?.view_expenses || perms.finance?.verify_expenses) {
        customMenu.push({
          category: 'Finance Portal',
          items: [
            { id: 'pending_finance', label: 'Pending Budgets & Expenses' },
          ]
        });
      }

      customMenu.push({
        category: 'Account',
        items: [
          { id: 'account_password', label: 'Change Password' },
          { id: 'account_signout', label: 'Sign Out' },
        ]
      });

      return customMenu;
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
            { id: 'admin_clubs_browse', label: 'Active Clubs Directory' },
          ]
        },
        {
          category: 'Students',
          items: [
            { id: 'coordinator_students', label: 'Manage Students' },
          ]
        },
        {
          category: 'Account',
          items: [
            { id: 'account_password', label: 'Change Password' },
            { id: 'account_signout', label: 'Sign Out' },
          ]
        }
      ];
    }
  };

  const menuStructure = getMenuStructure();

  const handleSidebarClick = (menu, subMenu) => {
    if (subMenu === 'account_password') {
      setShowChangePassword(true);
      return;
    }

    setActiveMenu(menu);
    setActiveSubMenu(subMenu);
    setSidebarTick(prev => prev + 1);
    
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
        return filtered.filter(e => ['pending_finance', 'draft'].includes(e.state));
      case 'pending_admin':
        return filtered.filter(e => e.state === 'pending_finance');
      case 'pending_finance':
      case 'admin_appr_finance':
        return filtered.filter(e => e.state === 'pending_finance' || e.state === 'finance_review');
      case 'events_approved':
        return filtered.filter(e => ['pending_coordinator_publish', 'pending_admin_final'].includes(e.state));
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
        return filtered.filter(e => e.state === 'pending_finance');
      case 'admin_appr_final':
        return filtered.filter(e => e.state === 'pending_completion');
      case 'admin_events_approved':
        return filtered.filter(e => e.state === 'pending_coordinator_publish' || e.state === 'published' || e.state === 'completed');
      case 'admin_events_rejected':
      case 'admin_appr_reject':
        return filtered.filter(e => e.state === 'rejected');
      default:
        return filtered;
    }
  };

  const canScan = () => user.role === 'coordinator' || user.permissions?.permissions?.events?.scanner;
  const canUploadCSV = () => user.role === 'coordinator' || user.permissions?.permissions?.events?.upload_attendance;
  const canManageCerts = () => ['admin', 'coordinator'].includes(user.role) || user.permissions?.permissions?.events?.manage_certificates;
  const canViewRegistrationList = () => user.role === 'coordinator' || user.permissions?.permissions?.events?.registration_list;
  const completedEventsView = ['events_completed', 'admin_events_completed'].includes(activeSubMenu);

  const renderCompletedEventCard = (event) => {
    const registrations = Number(event.registered_count || 0);
    const attended = Number(event.attended_count || 0);
    const absent = Math.max(registrations - attended, 0);
    const attendanceRate = registrations ? Math.round((attended / registrations) * 100) : 0;
    const canEditEvent = user.role.includes('coordinator') || user.permissions?.permissions?.events?.manage_events;
    const canDeleteEvent = ['admin', 'mentor'].includes(user.role) || user.role.includes('coordinator') || user.permissions?.permissions?.events?.delete_events;

    return (
      <article className="completed-event-card" key={event.id}>
        <header className="completed-event-hero">
          <div className="completed-event-mark"><CalendarDays size={30} /></div>
          <div className="completed-event-heading">
            <span className="completed-event-status"><CheckCircle2 size={16} /> Completed</span>
            <h2>{event.title}</h2>
            <div className="completed-event-meta">
              <span><CalendarDays size={16} />{new Date(event.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <i />
              <span><Users size={16} />{event.club_name || 'University event'}</span>
            </div>
          </div>
          <div className="completed-event-actions">
            {canEditEvent && <button className="completed-edit-button" onClick={() => handleEditClick(event)}><Pencil size={16} /> Edit event</button>}
            {canDeleteEvent && <button className="completed-delete-button" onClick={() => handleDeleteEvent(event.id)} title="Delete event" aria-label="Delete event"><Trash2 size={18} /></button>}
          </div>
        </header>

        <section className="completed-event-metrics" aria-label="Event results summary">
          <div className="completed-metric metric-purple"><span className="completed-metric-icon"><Users size={23} /></span><div><span>Registrations</span><strong>{registrations}</strong></div></div>
          <div className="completed-metric metric-green"><span className="completed-metric-icon"><CheckCircle2 size={23} /></span><div><span>Attended</span><strong>{attended}</strong></div></div>
          <div className="completed-metric metric-orange"><span className="completed-metric-icon"><BarChart3 size={23} /></span><div><span>Attendance rate</span><strong>{attendanceRate}%</strong></div></div>
          <div className="completed-metric metric-blue"><span className="completed-metric-icon"><MessageSquare size={23} /></span><div><span>Feedback</span><strong>{event.feedback_count || 0}</strong></div></div>
        </section>

        <div className="completed-event-workspace">
          <section className="completed-work-panel">
            <div className="completed-panel-heading">
              <span className="completed-panel-icon blue-panel-icon"><Users size={22} /></span>
              <div><h3>Attendance &amp; results</h3><p>Review attendee details and manage result reports.</p></div>
            </div>
            <div className="completed-attendance-summary">
              <div><strong>{registrations}</strong><span>Registered</span></div>
              <div><strong className="green-number">{attended}</strong><span>Attended</span></div>
              <div><strong className="red-number">{absent}</strong><span>Absent</span></div>
              <div><strong>{attendanceRate}%</strong><span>Attendance rate</span></div>
            </div>
            {canViewRegistrationList() && (
              <button onClick={() => handleExportRegistrations(event.id)} className="completed-download-button"><Download size={18} /> Download attendance CSV</button>
            )}
            {event.attendance_file_url && (
              <a href={`${baseURL}${event.attendance_file_url}`} target="_blank" rel="noreferrer" className="completed-file-link"><FileText size={17} /> Review uploaded results</a>
            )}
            {canUploadCSV() && (
              <div className="completed-upload-area">
                <div className="completed-upload-heading"><strong><FileText size={17} /> Upload final results (CSV for certificates)</strong><a href={`${baseURL}/api/admin/events/csv/template/attendance`} target="_blank" rel="noreferrer">Download template</a></div>
                <label className="completed-file-picker"><Upload size={19} /><span>Choose a CSV file</span><input type="file" accept=".csv" onChange={e => handleUploadAttendance(event.id, e.target.files[0])} /></label>
                <small>Include student details and certificate eligibility in the CSV.</small>
              </div>
            )}
            {event.feedback_count > 0 && <button onClick={() => handleViewFeedback(event.id)} className="completed-feedback-button"><MessageSquare size={17} /> View feedback analysis</button>}
          </section>

          <section className="completed-work-panel">
            <div className="completed-panel-heading">
              <span className="completed-panel-icon blue-panel-icon"><Award size={22} /></span>
              <div><h3>Certificates</h3><p>Choose a design, preview it, and publish certificates to eligible students.</p></div>
            </div>
            {canManageCerts() ? (
              <div className="completed-certificate-flow">
                <div className="completed-certificate-steps">
                  <div className="completed-certificate-step"><span>1</span><div><strong>Choose a template</strong><small>Upload your design or create one with AI.</small></div></div>
                  <div className="completed-template-options">
                    <label className="completed-template-option"><Upload size={20} /><strong>Upload design</strong><small>PNG or JPG recommended</small><input type="file" accept=".png,.jpg,.jpeg" onChange={async e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        await axios.post(`${baseURL}/api/admin/events/${event.id}/upload-certificate-template`, formData);
                        setAlertModal({ isOpen: true, title: 'Certificate design uploaded', message: 'Your custom certificate template is ready to preview.', isError: false });
                        fetchAdminData();
                      } catch (err) {
                        setAlertModal({ isOpen: true, title: 'Could not upload certificate design', message: err.response?.data?.detail || 'Please try again.', isError: true });
                      }
                    }} /></label>
                    <div className="completed-template-option ai-template-option"><Sparkles size={20} /><strong>Generate with AI</strong><small>Create a design from your description.</small><div className="completed-ai-controls"><input type="text" value={aiPrompts[event.id] || ''} onChange={e => setAiPrompts({ ...aiPrompts, [event.id]: e.target.value })} placeholder="Describe colors or style" disabled={aiLoading[event.id]} /><button onClick={() => handleGenerateAITemplate(event.id)} disabled={aiLoading[event.id] || !aiPrompts[event.id]?.trim()}>{aiLoading[event.id] ? 'Generating…' : 'Generate'}</button></div></div>
                  </div>
                  <div className="completed-certificate-step"><span>2</span><div><strong>Preview certificate</strong><small>Review the design before publishing.</small></div></div>
                  {event.certificate_template_url ? <img className="completed-certificate-preview" src={`${baseURL}${event.certificate_template_url}`} alt={`${event.title} certificate preview`} /> : <div className="completed-certificate-placeholder"><Award size={30} /><span>Your certificate preview will appear here.</span></div>}
                  <div className="completed-certificate-step"><span>3</span><div><strong>Publish certificates</strong><small>{attended} attendees recorded for this event.</small></div></div>
                </div>
                <div className="completed-eligible-count"><Users size={18} /><strong>{attended}</strong> attendees recorded</div>
                <button onClick={() => generateCertificates(event.id)} className="completed-publish-certificates"><Sparkles size={18} /> Publish certificates</button>
              </div>
            ) : (
              <div className="completed-certificate-placeholder"><Award size={30} /><span>Certificate publishing is managed by the event coordinator.</span></div>
            )}
          </section>
        </div>

        <details className="completed-event-details">
          <summary>Event details</summary>
          <div><p><strong>Location:</strong> {event.location || 'Not specified'}</p><p><strong>About:</strong> {event.description || 'No description provided.'}</p><p><strong>Club:</strong> {event.club_name || 'University event'}</p>{user.role === 'finance' && <p><strong>Actual expenses:</strong> INR {Number(event.actual_expenses || 0).toLocaleString()} {event.expenses_file_url && <a href={`${baseURL}${event.expenses_file_url}`} target="_blank" rel="noreferrer">View expense report</a>}</p>}</div>
        </details>
      </article>
    );
  };

  return (
    <div className="corporate-theme app-dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-gradient)' }}>
      <AlertModal {...alertModal} onClose={() => setAlertModal(previous => ({ ...previous, isOpen: false }))} />
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
      
      {/* Sidebar Navigation */}
      <aside className="app-dashboard-sidebar" style={{ width: '280px', background: 'var(--glass-bg)', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
        <div className="app-sidebar-brand-wrap">
          <PortalBrand portal={`${user.role.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())} Portal`} />
        </div>
        
        <nav aria-label={`${user.role} navigation`} style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          {menuStructure.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em', paddingLeft: '0.5rem' }}>
                {section.category}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.items.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={activeSubMenu === item.id ? 'page' : undefined}
                      onClick={() => handleSidebarClick(section.category, item.id)}
                      style={{ 
                        width: '100%', textAlign: 'left', padding: '0.5rem 1rem', borderRadius: '6px',
                        background: activeSubMenu === item.id ? 'var(--primary)' : 'transparent',
                        color: activeSubMenu === item.id ? 'white' : '#334155',
                        border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        marginBottom: '0.1rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <span className="admin-nav-button-content">
                        {React.createElement(MENU_ICONS[item.id] || FileText, { size: 17, 'aria-hidden': true })}
                        <span>{item.label}</span>
                      </span>
                      {item.badge && (
                        <span style={{
                          display: 'inline-block', width: '8px', height: '8px',
                          background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 5px rgba(239,68,68,0.5)',
                          animation: 'pulse 2s infinite'
                        }}></span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="app-sidebar-user">
          <span className="app-sidebar-avatar">{(user.name || 'U').slice(0, 1).toUpperCase()}</span>
          <span><strong>{user.name}</strong><small>{user.role.replaceAll('_', ' ')}</small></span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-dashboard-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <PromptModal {...promptModal} />
        <ConfirmModal {...confirmModal} />
        <SystemSetupModal isOpen={isSystemSetupOpen} onClose={() => setIsSystemSetupOpen(false)} />
        
        {/* Top Header */}
        <header className="app-dashboard-topbar" style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, color: '#0f172a' }}>
              {menuStructure.flatMap(s => s.items).find(i => i.id === activeSubMenu)?.label || 'Dashboard'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Welcome, {user.name}</span>
            {(user.role === 'admin' || user.permissions?.permissions?.system_setup?.manage_departments || user.permissions?.permissions?.system_setup?.manage_roles) && (
              <button onClick={() => setIsSystemSetupOpen(true)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc' }}>
                <Settings size={18} /> System Setup
              </button>
            )}
            <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Main Dashboard
            </button>
            <button onClick={() => navigate('/profile')} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCircle size={18} /> Profile
            </button>
          </div>
        </header>

        {/* Dynamic Content Wrapper */}
        <div className="app-dashboard-content" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
          
          {/* We hide the legacy tabs, but keep them rendering if needed or just use activeTab */}
          
          {/* Show Placeholder for unimplemented sidebar items */}
          {(!eventGridSubMenus.includes(activeSubMenu) && !['events_create', 'account_signout', 'admin_analytics', 'club_profile', 'admin_clubs_all', 'admin_clubs_add', 'clubs_manage', 'admin_clubs_browse', 'admin_users_students', 'admin_req_faculty', 'admin_req_student', 'coordinator_students', 'admin_club_approvals'].includes(activeSubMenu) && activeMenu !== 'Reports') && (
            <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.8)', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <h2 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.5rem' }}>✨ Coming Soon</h2>
              <p style={{ color: '#64748b' }}>The &quot;{menuStructure.flatMap(s => s.items).find(i => i.id === activeSubMenu)?.label}&quot; module is currently under development.</p>
              <button onClick={() => handleSidebarClick('Events', 'events_all')} className="btn-primary" style={{ marginTop: '1.5rem' }}>Return to All Events</button>
            </div>
          )}

          {/* User Management View */}
          {['admin_users_students', 'admin_req_faculty', 'admin_req_student'].includes(activeSubMenu) && (
            <UserManagement 
              key={`${activeSubMenu}-${sidebarTick}`} 
              externalActiveTab={activeSubMenu === 'admin_req_faculty' ? 'requests_faculty' : activeSubMenu === 'admin_req_student' ? 'requests_student' : null} 
            />
          )}

          {/* Admin Club Approvals View */}
          {activeSubMenu === 'admin_club_approvals' && (
            <AdminClubApprovals />
          )}

          {/* Coordinator Student Management View */}
          {activeSubMenu === 'coordinator_students' && (
            <StudentManagement />
          )}

          {/* Club Management View */}
          {['club_profile', 'admin_clubs_all', 'admin_clubs_add', 'clubs_manage'].includes(activeSubMenu) && (
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
                  {editEventId ? '💾 Save Changes' : '📤 Submit Program Request to Finance'}
                </button>
              </div>
            </form>
          </div>
        )}
        
          {loading ? (
          <LoadingState label="Loading event operations…" />
        ) : eventGridSubMenus.includes(activeSubMenu) && (
          <div className={`admin-event-list-grid${completedEventsView ? ' completed-events-grid' : ''}`} style={{ display: 'grid', gridTemplateColumns: completedEventsView ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: completedEventsView ? '1.25rem' : '2rem' }}>
            {getFilteredEvents().length === 0 ? (
              <EmptyState icon={CalendarDays} title="No events in this view" description="Events matching this workflow will appear here." />
            ) : (
              getFilteredEvents().map(event => completedEventsView && event.state === 'completed' ? renderCompletedEventCard(event) : (
                <div key={event.id} className="event-detail-card admin-event-card">
                  {/* TOP HEADER ROW */}
                  <div className="event-header-row">
                    <div className="event-header-left">
                      <div className="event-title-line">
                        <h3>{event.title}</h3>
                        <span className={`event-status-badge ${event.state === 'published' || event.state === 'completed' ? 'published' : ''}`}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: event.state === 'published' ? '#22c55e' : 'currentColor', display: 'inline-block' }} />
                          {event.state === 'pending_admin_initial' || event.state === 'pending_finance' ? 'Pending Finance Approval' :
                           event.state === 'pending_admin_final' ? 'Finance Approved (Coordinator to Publish)' :
                           event.state === 'pending_coordinator_publish' ? 'Approved (Ready to Publish)' :
                           event.state === 'published' ? 'Published' :
                           event.state === 'pending_completion' ? 'Pending Completion' :
                           event.state === 'completed' ? 'Completed' : 
                           event.state}
                        </span>
                      </div>
                      <div className="event-meta-line">
                        <span className="event-meta-item">
                          <CalendarDays size={16} /> 
                          {new Date(event.date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {event.end_date ? ` – ${new Date(event.end_date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                        </span>
                        <div className="event-meta-divider" />
                        <span className="event-meta-item">
                          <MapPin size={16} /> {event.location || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    <div className="event-header-actions">
                      {(user.role === 'coordinator' || user.permissions?.permissions?.events?.manage_events) && (
                        <button className="edit-btn" onClick={() => handleEditClick(event)} title="Edit Event">
                          <Pencil size={16} /> Edit
                        </button>
                      )}
                      {['admin', 'coordinator', 'mentor'].includes(user.role) && (
                        <button className="danger-btn" onClick={() => handleDeleteEvent(event.id)} title="Delete Event">
                          <Trash2 size={16} /> Delete
                        </button>
                      )}
                      <button title="More options"><MoreVertical size={16} /></button>
                    </div>
                  </div>

                  {event.rejection_reason && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '6px' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', fontWeight: 'bold' }}>⚠️ Notes from Admin/Finance:</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c' }}>{event.rejection_reason}</p>
                    </div>
                  )}

                  {/* METRICS ROW */}
                  <div className="event-metrics-row">
                    <div className="event-metric-card">
                      <div className="event-metric-icon blue"><Users size={24} /></div>
                      <div className="event-metric-info">
                        <small>Registered</small>
                        <strong>{event.registered_count || 0} <span>/ {event.capacity || '—'}</span></strong>
                      </div>
                    </div>
                    <div className="event-metric-card">
                      <div className="event-metric-icon green"><UserCheck size={24} /></div>
                      <div className="event-metric-info">
                        <small>Checked in</small>
                        <strong>{event.attended_count || 0}</strong>
                      </div>
                    </div>
                    <div className="event-metric-card">
                      <div className="event-metric-icon purple"><MessageSquare size={24} /></div>
                      <div className="event-metric-info">
                        <small>Feedback</small>
                        <strong>{event.feedback_count || 0}</strong>
                        {event.feedback_count > 0 && (
                          <a href="#" onClick={(e) => { e.preventDefault(); handleViewFeedback(event.id); }} style={{ fontSize: '0.75rem', color: '#8b5cf6', textDecoration: 'none' }}>View Analysis</a>
                        )}
                      </div>
                    </div>
                    <div className="event-metric-card">
                      <div className="event-metric-icon teal"><ThumbsUp size={24} /></div>
                      <div className="event-metric-info">
                        <small>Positive feedback</small>
                        <strong>{event.positive_feedback_count || 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM SPLIT LAYOUT */}
                  <div className="event-split-layout">
                    {/* LEFT COLUMN: Details */}
                    <div className="event-details-col">
                      <div>
                        <div className="event-section-title"><FileText size={20} /> Event details</div>
                        <h4 style={{ fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.5rem' }}>About</h4>
                        <p className="event-about-text">{event.description || 'No description provided.'}</p>
                      </div>

                      <div>
                        <div className="event-section-title" style={{ marginTop: '0.5rem' }}><Building2 size={20} /> Event organization</div>
                        <div className="event-org-list">
                          <div className="event-org-item">
                            <CalendarDays size={18} />
                            <span className="label">Department</span>
                            <span className="value">{event.department || 'University Wide'}</span>
                          </div>
                          <div className="event-org-item">
                            <User size={18} />
                            <span className="label">Department coordinator</span>
                            <span className="value">{event.dept_coordinator_name || 'None Assigned'}</span>
                          </div>
                          <div className="event-org-item">
                            <Lock size={18} />
                            <span className="label">Club name</span>
                            <span className="value">{event.club_name || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="event-section-title" style={{ marginTop: '0.5rem' }}><Users size={20} /> Club event team</div>
                        {event.organizers?.length ? (
                          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.25rem', color: '#475569', fontSize: '0.9rem' }}>
                            {event.organizers.map((organizer, index) => (
                              <li key={`${organizer.role}-${organizer.name}-${index}`}>
                                {organizer.name} ({organizer.role.replaceAll('_', ' ')})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="event-team-box warning">
                            <Info size={18} /> No club coordinator, president, head, or core member is assigned.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Operations */}
                    <div className="event-ops-col">
                      
                      {user.role !== 'admin' && user.role !== 'finance' && (
                        <>
                          <div className="event-section-title"><Settings size={20} /> Event operations</div>


                      {/* PUBLISH ACTION */}
                      {(user.role.includes('coordinator') || user.permissions?.permissions?.events?.manage_events) && event.state === 'pending_coordinator_publish' && (
                        <div className="event-op-step">
                          <div className="event-op-number" style={{ background: '#dcfce7', color: '#16a34a' }}><Sparkles size={16} /></div>
                          <div className="event-op-content">
                            <div className="event-op-header">
                              <h4>Publish Event</h4>
                              <p>Event is approved by finance and ready.</p>
                            </div>
                            <div className="event-op-actions" style={{ gridTemplateColumns: '1fr' }}>
                              <button onClick={() => handlePublishEvent(event.id)} className="event-op-btn primary" style={{ background: '#10b981' }}>
                                📢 Publish Event to Students
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 1: Expense Report */}
                      {event.state === 'published' && !activeSubMenu.startsWith('admin_') && (
                        <div className="event-op-step">
                          <div className="event-op-number">1</div>
                          <div className="event-op-content">
                            <div className="event-op-header">
                              <div>
                                <h4>Expense report (Required)</h4>
                                <p>Upload expense CSV for Finance.</p>
                              </div>
                              <a href={`${baseURL}/api/admin/events/csv/template/expenses`} target="_blank" rel="noreferrer">
                                <Download size={14} /> Download Template
                              </a>
                            </div>
                            
                            <div className="event-op-file-input">
                              <label htmlFor={`expense-upload-${event.id}`}>
                                <Paperclip size={16} /> Choose File
                              </label>
                              <span>{event.expenses_file_url ? 'expense_report.csv' : 'No file chosen'}</span>
                              <input 
                                id={`expense-upload-${event.id}`}
                                type="file" 
                                accept=".csv"
                                onChange={(e) => handleUploadExpenses(event.id, e.target.files[0])}
                              />
                            </div>
                            {event.expenses_file_url && <small style={{ color: '#047857', marginTop: '0.25rem', display: 'block' }}>Total (INR): {Number(event.actual_expenses || 0).toLocaleString()}</small>}

                            <div className="event-op-actions" style={{ gridTemplateColumns: '1fr' }}>
                              <button 
                                onClick={() => handleCloseEvent(event)} 
                                disabled={!event.expenses_file_url || event.actual_expenses == null} 
                                className={`event-op-btn ${event.expenses_file_url ? 'primary' : 'disabled'}`}
                              >
                                {event.expenses_file_url ? 'Submit CSV to Finance' : 'Upload Expense CSV to Continue'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: Attendance */}
                      {['published', 'pending_completion', 'completed'].includes(event.state) && (canScan() || canViewRegistrationList()) && (
                        <div className="event-op-step">
                          <div className="event-op-number">2</div>
                          <div className="event-op-content">
                            <div className="event-op-header">
                              <div>
                                <h4>Attendance</h4>
                                <p>Use QR code scanning for check-in and download attendance records.</p>
                              </div>
                            </div>
                            <div className="event-op-actions">
                              {event.state === 'published' && canScan() && (
                                <button onClick={() => startScanner(event.id)} className="event-op-btn primary">
                                  <QrCode size={18} /> Scan QRs (Check-in)
                                </button>
                              )}
                              {canViewRegistrationList() && (
                                <button onClick={() => handleExportRegistrations(event.id)} className="event-op-btn secondary">
                                  <FileText size={18} /> Download Attendance CSV
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: Final Results */}
                      {['published', 'finance_review', 'pending_completion', 'completed'].includes(event.state) && canUploadCSV() && !activeSubMenu.startsWith('admin_') && (
                        <div className="event-op-step">
                          <div className="event-op-number">3</div>
                          <div className="event-op-content">
                            <div className="event-op-header">
                              <div>
                                <h4>Final results</h4>
                                <p>Upload final results CSV for certificates.</p>
                              </div>
                              <a href={`${baseURL}/api/admin/events/csv/template/attendance`} target="_blank" rel="noreferrer">
                                <Download size={14} /> Download Template
                              </a>
                            </div>
                            <div className="event-op-file-input">
                              <label htmlFor={`results-upload-${event.id}`}>
                                <Paperclip size={16} /> Choose File
                              </label>
                              <span>{event.attendance_file_url ? 'final_results.csv' : 'No file chosen'}</span>
                              <input 
                                id={`results-upload-${event.id}`}
                                type="file" 
                                accept=".csv"
                                onChange={(e) => handleUploadAttendance(event.id, e.target.files[0])}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      
                        </>
                      )}
                      
                      {/* STEP 4: Certificate Generation */}
                      {canManageCerts() && event.state === 'completed' && (
                        <div className="event-op-step">
                          <div className="event-op-number">4</div>
                          <div className="event-op-content">
                            <div className="event-op-header">
                              <div>
                                <h4>Certificate Generation</h4>
                                <p>Upload or generate an AI template for certificates.</p>
                              </div>
                            </div>
                            
                            <div className="event-op-file-input" style={{ marginBottom: '0.75rem' }}>
                              <label htmlFor={`cert-upload-${event.id}`}>
                                <Paperclip size={16} /> Upload Manual (PNG/JPG)
                              </label>
                              <span>{event.certificate_template_url ? 'template_active.png' : 'No file chosen'}</span>
                              <input 
                                id={`cert-upload-${event.id}`}
                                type="file" 
                                accept=".png,.jpg,.jpeg"
                                onChange={async (e) => {
                                  if (!e.target.files[0]) return;
                                  const formData = new FormData();
                                  formData.append("file", e.target.files[0]);
                                  try {
                                    await axios.post(`${baseURL}/api/admin/events/${event.id}/upload-certificate-template`, formData);
                                    notify("Custom template uploaded successfully!");
                                    fetchAdminData();
                                  } catch (err) {
                                    notify(`Error: ${err.response?.data?.detail || 'Failed to upload template'}`);
                                  }
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <input 
                                type="text" 
                                className="input-glass" 
                                placeholder="Generate AI Template (e.g. Dark red colors...)" 
                                value={aiPrompts[event.id] || ''}
                                onChange={(e) => setAiPrompts({...aiPrompts, [event.id]: e.target.value})}
                                disabled={aiLoading[event.id]}
                                style={{ height: '42px', flex: 1 }}
                              />
                              <button 
                                onClick={() => handleGenerateAITemplate(event.id)} 
                                className="event-op-btn secondary"
                                disabled={aiLoading[event.id]}
                                style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
                              >
                                {aiLoading[event.id] ? '⏳...' : 'Generate AI'}
                              </button>
                            </div>
                            
                            {event.certificate_template_url && (
                              <img src={`${baseURL}${event.certificate_template_url}`} alt="Template" style={{ maxWidth: '100%', maxHeight: '120px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '0.75rem', objectFit: 'contain' }} />
                            )}

                            <div className="event-op-actions" style={{ gridTemplateColumns: '1fr' }}>
                              <button onClick={() => generateCertificates(event.id)} className="event-op-btn primary" style={{ background: '#10b981' }}>
                                ⚡ Publish Certificates
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ADMIN / FINANCE UI */}
                      {user.role === 'admin' && (
                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: 'auto' }}>
                          <h4 style={{ color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.5rem' }}>🛡️ Admin Actions</h4>
                          
                          {(event.expenses_file_url || event.attendance_file_url) && (
                            <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                               {event.expenses_file_url && (
                                  <a href={`${baseURL}${event.expenses_file_url}`} target="_blank" rel="noreferrer" className="event-op-btn secondary" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'center' }}>
                                    📥 Download Expense CSV
                                  </a>
                               )}
                               {event.attendance_file_url && (
                                  <a href={`${baseURL}${event.attendance_file_url}`} target="_blank" rel="noreferrer" className="event-op-btn secondary" style={{ display: 'block', textAlign: 'center' }}>
                                    📥 Download Final Results CSV
                                  </a>
                               )}
                            </div>
                          )}
                          {event.state === 'pending_admin_initial' && (
                            <button onClick={() => handleApproveAdminInitial(event.id)} className="event-op-btn primary" style={{ width: '100%', marginBottom: '0.5rem' }}>✅ Send Budget to Finance</button>
                          )}
                          {event.state === 'pending_admin_final' && (
                            <button onClick={() => handleApproveAdminFinal(event.id)} className="event-op-btn primary" style={{ width: '100%', marginBottom: '0.5rem' }}>✅ Send Final Approval</button>
                          )}
                          {event.state === 'pending_completion' && (
                            <button onClick={() => handleApproveCompletion(event.id)} className="event-op-btn primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#8b5cf6' }}>✅ Approve Final Completion</button>
                          )}
                          {['pending_admin_initial', 'pending_admin_final'].includes(event.state) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <button onClick={() => handleRequestChanges(event.id)} className="event-op-btn" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fef08a' }}>⚠️ Revise</button>
                              <button onClick={() => handleRejectEvent(event.id)} className="event-op-btn" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>❌ Reject</button>
                            </div>
                          )}
                        </div>
                      )}

                      {user.role === 'finance' && (
                        <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: 'auto' }}>
                          <h4 style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '0.5rem' }}>💰 Finance Actions</h4>
                          <div style={{ fontSize: '0.85rem', color: '#166534', marginBottom: '0.75rem' }}>
                            <div>Budget: ₹{(event.budget || 0).toLocaleString()}</div>
                            <div>Est. Expenses: ₹{(event.registered_count * 200).toLocaleString()}</div>
                          </div>
                          
                          {event.state === 'pending_finance' && (
                            <button onClick={() => handleApproveBudget(event.id)} className="event-op-btn primary" style={{ width: '100%', background: '#f59e0b', marginBottom: '0.5rem' }}>💰 Approve Budget</button>
                          )}
                          {event.state === 'finance_review' && (
                            <button onClick={() => handleVerifyExpenses(event.id)} className="event-op-btn primary" style={{ width: '100%', background: '#10b981', marginBottom: '0.5rem' }}>✅ Verify Expenses</button>
                          )}
                          {['finance_review', 'completed'].includes(event.state) && event.expenses_file_url && (
                             <a href={`${baseURL}${event.expenses_file_url}`} target="_blank" rel="noreferrer" style={{ color: '#047857', fontSize: '0.8rem', textDecoration: 'underline', display: 'block', marginBottom: '0.5rem' }}>📄 Download Expense CSV (₹{event.actual_expenses?.toLocaleString()})</a>
                          )}
                          {event.state === 'pending_finance' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button onClick={() => handleRequestChanges(event.id)} className="event-op-btn" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fef08a' }}>⚠️ Revise</button>
                              <button onClick={() => handleRejectEvent(event.id)} className="event-op-btn" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>❌ Reject</button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
            ))
            )}
          </div>
        )}
      </div>
      )}
      
          {['coordinator_club_reqs', 'admin_club_reqs'].includes(activeSubMenu) && (
            <div className="animate-fade-in" style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
              <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                {activeSubMenu === 'admin_club_reqs' ? 'Pending Admin Approvals' : 'Pending Department Requests'}
              </h2>
              {clubJoinRequests.length === 0 ? (
                <p>No pending requests.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {clubJoinRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div>
                        <strong>{req.user_name}</strong> ({req.user_email}) <br />
                        <span style={{ fontSize: '0.85rem', color: 'gray' }}>Department: {req.user_department || 'N/A'}</span> <br />
                        <span style={{ fontSize: '0.85rem', color: 'gray' }}>Club: {req.club_name}</span> <br />
                        <span style={{ fontSize: '0.85rem', color: 'gray' }}>Message: {req.message || 'No message'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {activeSubMenu === 'admin_club_reqs' ? (
                          <>
                            <button onClick={async () => {
                              await axios.post(`${baseURL}/api/clubs/requests/${req.id}/approve`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                              notify('Request approved!');
                              fetchClubJoinRequests();
                            }} className="btn-primary" style={{ background: '#10b981' }}>Approve</button>
                            <button onClick={async () => {
                              await axios.post(`${baseURL}/api/clubs/requests/${req.id}/reject`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                              notify('Request rejected!');
                              fetchClubJoinRequests();
                            }} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}>Reject</button>
                          </>
                        ) : (
                          <>
                            <button onClick={async () => {
                              await axios.put(`${baseURL}/api/clubs/requests/${req.id}/forward`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                              notify('Forwarded to Admin!');
                              fetchClubJoinRequests();
                            }} className="btn-primary" style={{ background: '#3b82f6' }}>Forward to Admin</button>
                            <button onClick={async () => {
                              await axios.post(`${baseURL}/api/clubs/requests/${req.id}/reject`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                              notify('Request rejected!');
                              fetchClubJoinRequests();
                            }} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}>Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
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
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>&quot;{fb.comment}&quot;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
            </>
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
