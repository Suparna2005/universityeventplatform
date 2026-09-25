import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Search, Filter, Award, Upload } from 'lucide-react';
import { ConfirmModal, AlertModal } from '../../components/Modals';
import { useRef, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const UserManagement = ({ externalActiveTab }) => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [clubsList, setClubsList] = useState([]);
  const [systemDepartments, setSystemDepartments] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterClub, setFilterClub] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [activeTab, setActiveTab] = useState(externalActiveTab || 'coordinator');
  const baseURL = '';
  const [editingUserId, setEditingUserId] = useState(null);

  const canDelete = () => {
    if (user.role === 'admin') return true;
    if (user.permissions?.permissions?.users?.delete_users) return true;
    return false;
  };

  const canGenerate = () => {
    if (user.role === 'admin') return true;
    if (user.permissions?.permissions?.users?.generate_users) return true;
    return false;
  };
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: () => setConfirmModal({ isOpen: false }) });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [assignFacultyId, setAssignFacultyId] = useState('');
  const [assignUserSearch, setAssignUserSearch] = useState('');
  const [assignClubSearch, setAssignClubSearch] = useState('');
  const [assignClubId, setAssignClubId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const showAlert = (message, isError = false) => {
    setAlertModal({ isOpen: true, title: isError ? 'Error' : 'Success', message, isError });
  };

  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    } else {
      setActiveTab('coordinator');
    }
  }, [externalActiveTab]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setRequestsLoading(true);
    setRequestsError('');
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const [users, joins, leaves, clubs, sysDepts, sysRoles, approved] = await Promise.allSettled([
      axios.get(`${baseURL}/api/admin/users`, { headers }),
      axios.get(`${baseURL}/api/admin/club-requests`, { headers }),
      axios.get(`${baseURL}/api/admin/club-leave-requests`, { headers }),
      axios.get(`${baseURL}/api/clubs/list`),
      axios.get(`${baseURL}/api/admin/departments`, { headers }),
      axios.get(`${baseURL}/api/admin/roles`, { headers }),
      axios.get(`${baseURL}/api/admin/club-requests/approved`, { headers })
    ]);
    if (users.status === 'fulfilled') setUsersList(users.value.data);
    if (joins.status === 'fulfilled') setPendingRequests(joins.value.data);
    if (leaves.status === 'fulfilled') setPendingLeaveRequests(leaves.value.data);
    if (approved.status === 'fulfilled') setApprovedRequests(approved.value.data);
    if (clubs.status === 'fulfilled') setClubsList(clubs.value.data);
    const failedRequest = [joins, leaves].find(result => result.status === 'rejected');
    if (failedRequest) {
      setRequestsError(failedRequest.reason.response?.data?.detail || failedRequest.reason.message || 'Could not load pending requests');
    }
    [users, joins, leaves, clubs].forEach(result => {
      if (result.status === 'rejected') console.error('Failed to fetch admin data', result.reason);
    });
    if (sysDepts.status === 'fulfilled') setSystemDepartments(sysDepts.value.data);
    if (sysRoles.status === 'fulfilled') setSystemRoles(sysRoles.value.data);

    setRequestsLoading(false);
  };

  const handleClubRequest = async (id, type, action) => {
    try {
      const endpoint = type === 'leave' ? 'club-leave-requests' : 'club-requests';
      await axios.post(`${baseURL}/api/admin/${endpoint}/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showAlert(action === 'approve' ? 'Request approved' : 'Request rejected');
      fetchUsers();
    } catch (err) {
      showAlert(err.response?.data?.detail || `Failed to ${action} request`, true);
    }
  };

  const handleApproveRequest = (id, type = 'join') => handleClubRequest(id, type, 'approve');
  const handleRejectRequest = (id, type = 'join') => handleClubRequest(id, type, 'reject');

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || ''
    });
    setMessage('');
    setError('');
  };

  const handleDeleteClick = (userId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user?',
      confirmText: 'Delete',
      confirmColor: '#dc2626',
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${baseURL}/api/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setMessage('User deleted successfully.');
          fetchUsers();
        } catch (err) {
          setError(err.response?.data?.detail || 'Error deleting user');
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    const targetRole = formData.role.toLowerCase().trim();

    try {
      if (editingUserId) {
        await axios.put(`${baseURL}/api/admin/users/${editingUserId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage(`Successfully updated ${formData.name}!`);
        setEditingUserId(null);
      } else {
        await axios.post(`${baseURL}/api/admin/users`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage(`Successfully created credentials for ${formData.email}!`);
      }
      setFormData({ name: '', email: '', password: '', role: '', department: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error processing request');
    }
  };

  const handleAssignCoordinator = async (e) => {
    e.preventDefault();
    const isClubCoord = formData.role.toLowerCase().includes('club');
    if (!assignFacultyId || (!isClubCoord && !formData.department) || (isClubCoord && !assignClubId)) return;

    const targetUser = usersList.find(u => String(u.id) === String(assignFacultyId));
    if (!targetUser) return;

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isClubCoord) {
        await axios.post(`${baseURL}/api/admin/assign-club-coordinator`, {
          user_id: targetUser.id,
          club_id: Number(assignClubId)
        }, { headers });
        showAlert(`Assigned ${targetUser.name} as club coordinator.`);
      } else {
        await axios.post(`${baseURL}/api/admin/assign-department-coordinator`, {
          user_id: targetUser.id,
          department: formData.department
        }, { headers });
        showAlert(`Promoted ${targetUser.name} to Department Coordinator.`);
      }
      setAssignFacultyId('');
      setAssignUserSearch('');
      setAssignClubSearch('');
      setAssignClubId('');
      setFormData({ name: '', email: '', password: '', role: '', department: '' });
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not assign coordinator');
    }
  };

  // Filter users based on search and department/club dropdowns
  const searchedUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (u.clubs && u.clubs.some(c => c.club_name.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesDept = filterDepartment === 'All' || u.department === filterDepartment;
    const matchesClub = filterClub === 'All' || (u.clubs && u.clubs.some(c => c.club_name === filterClub));
    const matchesRole = filterRole === 'All' || u.role === filterRole;
    return matchesSearch && matchesDept && matchesClub && matchesRole;
  });

  // Derive sections
  const coordinators = searchedUsers.filter(u => u.role === 'coordinator');
  const clubCoordinators = searchedUsers.filter(u => u.role === 'club_coordinator');
  const finance = searchedUsers.filter(u => u.role === 'finance');
  const faculty = searchedUsers.filter(u => u.role === 'faculty');
  const students = searchedUsers.filter(u => u.role === 'student');
  const admins = searchedUsers.filter(u => u.role === 'admin');
  
  const handleExportCSV = () => {
    const csvRows = [];
    const headers = ['Name', 'Email', 'Role', 'Department', 'Generated By'];
    csvRows.push(headers.join(','));
    
    usersList.forEach(u => {
      const row = [
        `"${u.name}"`,
        `"${u.email}"`,
        `"${u.role}"`,
        `"${u.department || 'System'}"`,
        `"${u.created_by_role || 'System'}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'all_users_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const handleDownloadDemo = () => {
    const headers = ['Name', 'Email', 'Role', 'Department', 'Password'];
    const rows = [
      ['John Doe', 'john@univ.edu', 'faculty', 'CSE', ''],
      ['Jane Smith', 'jane@univ.edu', 'student', 'BCA', 'mypassword123'],
      ['Dr. Admin', 'admin@univ.edu', 'coordinator', 'ECE', '']
    ];
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo_users_upload.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${baseURL}/api/admin/users/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const { success_count, errors } = response.data;
      let msg = `Successfully created ${success_count} users.`;
      if (errors && errors.length > 0) {
        msg += `\n\nErrors encountered (${errors.length}):\n` + errors.slice(0, 5).join('\n');
        if (errors.length > 5) msg += '\n...and more.';
      }
      showAlert(msg, errors && errors.length > 0);
      fetchUsers();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to upload CSV', true);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getActiveList = () => {
    switch (activeTab) {
      case 'coordinator': return coordinators;
      case 'club_coordinator': return clubCoordinators;
      case 'finance': return finance;
      case 'faculty': return faculty;
      case 'student': return students;
      case 'admin': return admins;
      case 'requests_faculty': return [];
      case 'requests_student': return [];
      default: 
        if (!['coordinator', 'club_coordinator', 'finance', 'faculty', 'student', 'admin'].includes(activeTab)) {
          return searchedUsers.filter(u => u.role === activeTab);
        }
        return searchedUsers;
    }
  };

  const activeUsers = getActiveList();

  const renderTable = (users) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '1rem 0.5rem' }}>Name</th>
            <th style={{ padding: '1rem 0.5rem' }}>Email</th>
            <th style={{ padding: '1rem 0.5rem' }}>Role</th>
            <th style={{ padding: '1rem 0.5rem' }}>Department</th>
            <th style={{ padding: '1rem 0.5rem' }}>Clubs</th>
            <th style={{ padding: '1rem 0.5rem' }}>Generated By</th>
            <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{u.name}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
              <td style={{ padding: '1rem 0.5rem' }}>
                <span style={{ 
                  padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
                  background: u.role === 'admin' ? '#fee2e2' : u.role === 'coordinator' ? '#dbeafe' : '#f1f5f9',
                  color: u.role === 'admin' ? '#991b1b' : u.role === 'coordinator' ? '#1e40af' : '#475569'
                }}>
                  {u.role}
                </span>
              </td>
              <td style={{ padding: '1rem 0.5rem' }}>{u.department || '-'}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                {u.clubs && u.clubs.length > 0 ? (
                  <span style={{ fontSize: '0.85rem' }}>{u.clubs.map(c => c.club_name).join(', ')}</span>
                ) : '-'}
              </td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                {u.created_by_role ? (
                  <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{u.created_by_role}</span>
                ) : (
                  <span style={{ fontSize: '0.85rem', opacity: 0.5 }}>System</span>
                )}
              </td>
              <td style={{ padding: '1rem 0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleEditClick(u)} 
                  style={{ padding: '0.4rem 0.8rem', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Edit
                </button>
                {canDelete() && (
                  <button 
                    onClick={() => handleDeleteClick(u.id)} 
                    style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No users found in this section.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderStudentTableGrouped = (users) => {
    const depts = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
    const noDeptUsers = users.filter(u => !u.department);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {depts.map(dept => (
          <div key={dept}>
             <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', fontSize: '1.2rem' }}>{dept} Students</h4>
             {renderTable(users.filter(u => u.department === dept))}
          </div>
        ))}
        {noDeptUsers.length > 0 && (
          <div>
             <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', fontSize: '1.2rem' }}>Students (No Department)</h4>
             {renderTable(noDeptUsers)}
          </div>
        )}
      </div>
    );
  };

  const studentDepts = [...new Set(students.map(s => s.department).filter(Boolean))].sort();

  const facultyRequests = pendingRequests.filter(r => r.role && ['faculty', 'coordinator', 'club_coordinator'].includes(r.role.toLowerCase()));
  const studentRequests = pendingRequests.filter(r => r.role && r.role.toLowerCase() === 'student');
  const facultyLeaveRequests = pendingLeaveRequests.filter(r => r.role && ['faculty', 'coordinator', 'club_coordinator'].includes(r.role.toLowerCase()));
  const studentLeaveRequests = pendingLeaveRequests.filter(r => r.role && r.role.toLowerCase() === 'student');

  const customRoles = [...new Set(searchedUsers.map(u => u.role).filter(r => r && r.trim() !== '' && !['coordinator', 'club_coordinator', 'finance', 'faculty', 'student', 'admin'].includes(r)))].sort();
  const customTabs = customRoles.map(role => {
    const displayRole = role.trim();
    const label = displayRole.toLowerCase().endsWith('s') 
        ? displayRole.charAt(0).toUpperCase() + displayRole.slice(1).replace(/_/g, ' ')
        : displayRole.charAt(0).toUpperCase() + displayRole.slice(1).replace(/_/g, ' ') + 's';
    return {
      id: role,
      label: label,
      count: searchedUsers.filter(u => u.role === role).length
    };
  });

  const departments = [...new Set([
    ...usersList.map(user => user.department),
    ...clubsList.map(club => club.department)
  ].filter(Boolean))].sort();

  const isDeptCoordinator = formData.role.toLowerCase().includes('coordinator') && !formData.role.toLowerCase().includes('club');
  const isClubCoordinator = formData.role.toLowerCase().includes('coordinator') && formData.role.toLowerCase().includes('club');
  const isCoordinatorAssignment = !editingUserId && (isDeptCoordinator || isClubCoordinator);

  const assignmentUsers = usersList.filter(user => {
    const role = String(user.role).toLowerCase();
    const eligibleRole = isDeptCoordinator
      ? role === 'faculty'
      : ['student', 'faculty', 'coordinator'].includes(role) || role.includes('coordinator');
    const departmentMatches = isDeptCoordinator
      ? user.department === formData.department
      : !formData.department || user.department === formData.department;
    const search = assignUserSearch.trim().toLowerCase();
    const searchMatches = !search || `${user.name} ${user.email} ${user.role} ${user.department || ''}`.toLowerCase().includes(search);
    return eligibleRole && departmentMatches && searchMatches;
  });
  const assignmentClubs = clubsList.filter(club => {
    const departmentMatches = !formData.department || !club.department || club.department === formData.department;
    const search = assignClubSearch.trim().toLowerCase();
    const searchMatches = !search || `${club.name} ${club.department || ''}`.toLowerCase().includes(search);
    return departmentMatches && searchMatches;
  });

  const tabs = [
    { id: 'coordinator', label: 'Dept Coordinators', count: coordinators.length },
    { id: 'club_coordinator', label: 'Club Coordinators', count: clubCoordinators.length },
    { id: 'finance', label: 'Finance', count: finance.length },
    { id: 'faculty', label: 'Faculty', count: faculty.length },
    { id: 'student', label: 'All Dept Students', count: students.length },
    { id: 'admin', label: 'Admins', count: admins.length },
    ...customTabs,
    { id: 'requests_faculty', label: 'Faculty Requests', count: facultyRequests.length + facultyLeaveRequests.length },
    { id: 'requests_student', label: 'Student Requests', count: studentRequests.length + studentLeaveRequests.length },
    { id: 'requests_approved', label: 'Approved Join Requests', count: approvedRequests.length }
  ];

  const renderRequestsTable = (tabType) => {
    const isFaculty = tabType === 'requests_faculty';
    const isApprovedTab = tabType === 'requests_approved';
    let currentPendingJoin = isApprovedTab ? approvedRequests : (isFaculty ? facultyRequests : studentRequests);
    let currentPendingLeave = isApprovedTab ? [] : (isFaculty ? facultyLeaveRequests : studentLeaveRequests);

    if (filterDepartment !== 'All') {
      currentPendingJoin = currentPendingJoin.filter(r => r.department === filterDepartment);
      currentPendingLeave = currentPendingLeave.filter(r => r.department === filterDepartment);
    }
    if (filterClub !== 'All') {
      currentPendingJoin = currentPendingJoin.filter(r => r.club_name === filterClub);
      currentPendingLeave = currentPendingLeave.filter(r => r.club_name === filterClub);
    }
    if (filterRole !== 'All') {
      currentPendingJoin = currentPendingJoin.filter(r => r.role === filterRole);
      currentPendingLeave = currentPendingLeave.filter(r => r.role === filterRole);
    }
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      const matchSearch = (r) => (
        (r.user_name && r.user_name.toLowerCase().includes(lowerQuery)) ||
        (r.role && r.role.toLowerCase().includes(lowerQuery)) ||
        (r.department && r.department.toLowerCase().includes(lowerQuery)) ||
        (r.club_name && r.club_name.toLowerCase().includes(lowerQuery)) ||
        (r.message && r.message.toLowerCase().includes(lowerQuery))
      );
      currentPendingJoin = currentPendingJoin.filter(matchSearch);
      currentPendingLeave = currentPendingLeave.filter(matchSearch);
    }

    return (
    <div style={{ overflowX: 'auto' }}>
      {requestsError && <div role="alert" style={{ padding: '1rem', marginBottom: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>Could not load pending requests: {requestsError}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '1rem 0.5rem' }}>Type</th>
            <th style={{ padding: '1rem 0.5rem' }}>User Name</th>
            <th style={{ padding: '1rem 0.5rem' }}>System Role</th>
            <th style={{ padding: '1rem 0.5rem' }}>Department</th>
            <th style={{ padding: '1rem 0.5rem' }}>Club Name</th>
            <th style={{ padding: '1rem 0.5rem' }}>Message/Reason</th>
            <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentPendingJoin.map(r => (
            <tr key={`join-${r.id}`} style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: isApprovedTab ? '#0284c7' : '#059669' }}>
                {isApprovedTab ? 'Approved' : 'Join'}
              </td>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{r.user_name}</td>
              <td style={{ padding: '1rem 0.5rem', textTransform: 'capitalize' }}>{r.role || 'Unknown'}</td>
              <td style={{ padding: '1rem 0.5rem' }}>{r.department || '-'}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>{r.club_name}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'gray' }}>{r.message}</td>
              <td style={{ padding: '1rem 0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {!isApprovedTab ? (
                  <>
                    <button onClick={() => handleApproveRequest(r.id, 'join')} style={{ padding: '0.4rem 0.8rem', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                    <button onClick={() => handleRejectRequest(r.id, 'join')} style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                  </>
                ) : (
                  <span style={{ padding: '0.4rem 0.8rem', color: 'var(--text-muted)' }}>No Action</span>
                )}
              </td>
            </tr>
          ))}
          {currentPendingLeave.map(r => (
            <tr key={`leave-${r.id}`} style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#dc2626' }}>Leave</td>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{r.user_name}</td>
              <td style={{ padding: '1rem 0.5rem', textTransform: 'capitalize' }}>{r.role || 'Unknown'}</td>
              <td style={{ padding: '1rem 0.5rem' }}>{r.department || '-'}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>{r.club_name}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'gray' }}>{r.message}</td>
              <td style={{ padding: '1rem 0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button onClick={() => handleApproveRequest(r.id, 'leave')} style={{ padding: '0.4rem 0.8rem', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                <button onClick={() => handleRejectRequest(r.id, 'leave')} style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
              </td>
            </tr>
          ))}
          {!requestsError && requestsLoading && currentPendingJoin.length === 0 && currentPendingLeave.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>Loading requests...</td></tr>
          )}
          {!requestsError && !requestsLoading && currentPendingJoin.length === 0 && currentPendingLeave.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>No pending club requests in this category</td></tr>
          )}
        </tbody>
      </table>
    </div>
    );
  };

  return (
    <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '2rem' }}>
      <ConfirmModal {...confirmModal} />
      <AlertModal {...alertModal} onClose={() => setAlertModal({ ...alertModal, isOpen: false })} />
      {/* LEFT: Generation / Edit Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'sticky', top: '100px', height: 'fit-content' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <UserPlus size={28} color="var(--primary)" />
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>
            {editingUserId ? "Edit User" : "Generate User"}
          </h2>
        </div>
        
        {(!editingUserId && !canGenerate()) ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            You do not have permission to generate new users.
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {editingUserId 
                ? "Modify the selected user's details and roles." 
                : "Generate new user credentials for staff."}
            </p>

        {!editingUserId && (
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 500 }}>Bulk Generation</span>
              <button 
                onClick={handleDownloadDemo}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
              >
                Download Demo CSV
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Upload a CSV file to instantly generate multiple users.
            </p>
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn-secondary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              <Upload size={18} />
              {isUploading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </div>
        )}

        {message && <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '1rem' }}>{message}</div>}
        {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={isCoordinatorAssignment ? handleAssignCoordinator : handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>System Role</label>
            <select
              className="input-glass"
              required
              value={formData.role}
              onChange={e => {
                setFormData({ ...formData, role: e.target.value, department: editingUserId ? formData.department : '' });
                setAssignFacultyId('');
                setAssignUserSearch('');
                setAssignClubId('');
                setAssignClubSearch('');
              }}
            >
              <option value="" disabled>Select a role...</option>
              {systemRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Department</label>
            <select
              className="input-glass"
              required={formData.role.toLowerCase().includes('coordinator')}
              value={formData.department}
              onChange={e => {
                setFormData({ ...formData, department: e.target.value });
                setAssignFacultyId('');
              }}
            >
              <option value="">Select department...</option>
              {systemDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          {isCoordinatorAssignment ? (
            isDeptCoordinator ? (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Faculty in {formData.department || 'selected department'}</label>
                <select
                  className="input-glass"
                  value={assignFacultyId}
                  onChange={e => setAssignFacultyId(e.target.value)}
                  disabled={!formData.department}
                  required
                >
                  <option value="" disabled>{formData.department ? 'Choose faculty...' : 'Select department first'}</option>
                  {assignmentUsers.map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
                </select>
                {formData.department && assignmentUsers.length === 0 && <small>No faculty found in this department.</small>}
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Find eligible user</label>
                  <input
                    type="search"
                    className="input-glass"
                    placeholder="Search name, email, role, or department..."
                    value={assignUserSearch}
                    onChange={e => { setAssignUserSearch(e.target.value); setAssignFacultyId(''); }}
                  />
                  <select
                    className="input-glass"
                    style={{ marginTop: '0.5rem' }}
                    value={assignFacultyId}
                    onChange={e => setAssignFacultyId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a user...</option>
                    {assignmentUsers.map(user => <option key={user.id} value={user.id}>{user.name} - {user.role} - {user.department || 'No department'}</option>)}
                  </select>
                  {assignmentUsers.length === 0 && <small>No eligible users match these filters.</small>}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Assign to club</label>
                  <input
                    type="search"
                    className="input-glass"
                    placeholder="Search clubs by name or department..."
                    value={assignClubSearch}
                    onChange={e => { setAssignClubSearch(e.target.value); setAssignClubId(''); }}
                  />
                  <select
                    className="input-glass"
                    style={{ marginTop: '0.5rem' }}
                    value={assignClubId}
                    onChange={e => setAssignClubId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a club...</option>
                    {assignmentClubs.map(club => <option key={club.id} value={club.id}>{club.name}{club.department ? ` - ${club.department}` : ''}</option>)}
                  </select>
                  {assignmentClubs.length === 0 && <small>No clubs match this search and department.</small>}
                </div>
              </>
            )
          ) : (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
                <input type="text" className="input-glass" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>University Email</label>
                <input type="email" className="input-glass" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  {editingUserId ? "New Password (Optional)" : "Temporary Password"}
                </label>
                <input type="text" className="input-glass" required={!editingUserId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingUserId ? "Leave blank to keep same" : ""} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.8rem' }}>
              {isCoordinatorAssignment
                ? (formData.role === 'coordinator' ? "Assign Department Coordinator" : "Assign Club Coordinator")
                : (editingUserId ? "Update User" : "Generate User")}
            </button>
            {editingUserId && (
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1, padding: '0.8rem' }}
                onClick={() => {
                  setEditingUserId(null);
                  setFormData({ name: '', email: '', password: '', role: '', department: '' });
                  setMessage('');
                  setError('');
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
          </>
        )}

        </div>
      </div>

      {/* RIGHT: List of Users grouped by section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div className="glass-card" style={{ padding: '2rem', minHeight: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Users size={28} color="var(--primary)" />
              <h2 style={{ margin: 0, color: 'var(--primary)' }}>User Directory</h2>
            </div>
            <button 
              onClick={handleExportCSV} 
              style={{ padding: '0.6rem 1.2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Export All Users (CSV)
            </button>
          </div>
          
          {/* Tabs for Sections */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '2px solid var(--glass-border)', paddingBottom: '1rem' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {tab.label} <span style={{ opacity: 0.8, fontSize: '0.8rem' }}>({tab.count})</span>
                {tab.id.startsWith('requests') && tab.id !== 'requests_approved' && tab.count > 0 && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-2px', width: '12px', height: '12px', 
                    background: '#ef4444', borderRadius: '50%', border: '2px solid white', 
                    boxShadow: '0 0 5px rgba(239,68,68,0.5)'
                  }}></span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <Filter size={18} color="var(--text-muted)" />
              <select 
                value={filterRole} 
                onChange={e => setFilterRole(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: 'var(--text-primary)' }}
              >
                <option value="All">All Roles</option>
                {systemRoles.map(r => (
                  <option key={r.id} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1).replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <Filter size={18} color="var(--text-muted)" />
              <select 
                value={filterDepartment} 
                onChange={e => setFilterDepartment(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: 'var(--text-primary)' }}
              >
                  <option value="All">All Departments</option>
                  {[...new Set(["CSE", "ECE", "ME", "EE", "CE", "BBA", "BCA", ...usersList.map(u => u.department).filter(Boolean)])].sort().map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <Filter size={18} color="var(--text-muted)" />
                <select 
                  value={filterClub} 
                  onChange={e => setFilterClub(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: 'var(--text-primary)' }}
                >
                  <option value="All">All Clubs</option>
                  {[...new Set(usersList.flatMap(u => u.clubs?.map(c => c.club_name)).filter(Boolean))].sort().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', width: '300px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input 
                  type="text" 
                  placeholder="Search user or club..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.9rem' }}
                />
              </div>

          </div>

          {/* Table */}
          {activeTab.startsWith('requests') ? renderRequestsTable(activeTab) : activeTab === 'student' ? renderStudentTableGrouped(activeUsers) : renderTable(activeUsers)}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
