import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

const RolePermissionsModal = ({ isOpen, role, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [permissions, setPermissions] = useState({
    users: { view_directory: false, generate_users: false, delete_users: false, assign_coordinators: false, manage_club_requests: false },
    events: { view_events: false, approve_events: false, delete_events: false, scanner: false, registration_list: false, upload_attendance: false, manage_certificates: false },
    clubs: { view_clubs: false, manage_gallery: false, delete_clubs: false },
    finance: { view_expenses: false, verify_expenses: false },
    system_setup: { manage_departments: false, manage_roles: false },
    student_portal: { view_events: false, register_events: false, view_recommendations: false, view_certificates: false, submit_feedback: false, view_clubs: false, join_clubs_direct: false, join_clubs_via_coordinator: false }
  });

  useEffect(() => {
    if (isOpen) {
      setName(role ? role.name : '');
      const defaultPerms = {
        users: { view_directory: false, generate_users: false, delete_users: false, assign_coordinators: false, manage_club_requests: false },
        events: { view_events: false, approve_events: false, delete_events: false, scanner: false, registration_list: false, upload_attendance: false, manage_certificates: false },
        clubs: { view_clubs: false, manage_gallery: false, delete_clubs: false },
        finance: { view_expenses: false, verify_expenses: false },
        system_setup: { manage_departments: false, manage_roles: false },
        student_portal: { view_events: false, register_events: false, view_recommendations: false, view_certificates: false, submit_feedback: false, view_clubs: false, join_clubs_direct: false, join_clubs_via_coordinator: false }
      };
      
      const rolePerms = (role && role.permissions) || {};
      
      // Merge with defaults to ensure all keys exist
      const mergedPerms = { ...defaultPerms };
      if (rolePerms.permissions) {
        Object.keys(defaultPerms).forEach(cat => {
          if (rolePerms.permissions[cat]) {
            mergedPerms[cat] = { ...defaultPerms[cat], ...rolePerms.permissions[cat] };
          }
        });
      }
      setPermissions(mergedPerms);
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

  const handleCheckboxChange = (category, field) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      permissions: {
        permissions: permissions
      }
    });
  };

  const renderCheckbox = (category, field, label, disableOverride = false) => {
    if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase())) return null;
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
        <input 
          type="checkbox" 
          checked={permissions[category][field]}
          onChange={() => handleCheckboxChange(category, field)}
          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
          disabled={disableOverride || role?.name === 'admin'}
        />
        <span style={{ fontSize: '0.9rem', color: (disableOverride || role?.name === 'admin') ? 'gray' : '#334155' }}>{label}</span>
      </label>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999
    }}>
      <div className="glass-card animate-fade-in" style={{ 
        width: '100%', maxWidth: '700px', background: 'rgba(255,255,255,0.98)', 
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>{role ? 'Edit System Role' : 'Create Custom Role'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ overflowY: 'auto', flex: 1, padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Role Name</label>
            <input 
              type="text" 
              className="input-glass" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Event Coordinator"
              required
              style={{ width: '100%', fontSize: '1.1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Search Permissions</label>
            <input 
              type="text" 
              className="input-glass" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search features..."
              style={{ width: '100%' }}
            />
          </div>

          {role?.name === 'admin' && (
            <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              The base 'admin' role is read-only to prevent locking administrators out of the system.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', animation: 'fadeIn 0.3s' }}>
            
            {/* Backend Permissions */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Backend Management</h4>
              {renderCheckbox('users', 'view_directory', 'Manage Users (View Directory)')}
              {renderCheckbox('users', 'generate_users', 'Generate / Bulk Upload Users')}
              {renderCheckbox('users', 'delete_users', 'Delete Users')}
              {renderCheckbox('users', 'assign_coordinators', 'Assign Coordinators')}
              {renderCheckbox('users', 'manage_club_requests', 'Manage Club Requests')}
              
              <h4 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--primary)' }}>System Setup</h4>
              {renderCheckbox('system_setup', 'manage_departments', 'Manage Departments')}
              {renderCheckbox('system_setup', 'manage_roles', 'Manage Roles')}
              
              <h4 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--primary)' }}>Finance Management</h4>
              {renderCheckbox('finance', 'view_expenses', 'View Expenses')}
              {renderCheckbox('finance', 'verify_expenses', 'Verify Expenses')}
            </div>
            
            {/* Frontend / Public Permissions */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Event & Club Actions</h4>
              
              {renderCheckbox('events', 'view_events', 'View All Events')}
              {renderCheckbox('events', 'approve_events', 'Approve / Reject Events')}
              {renderCheckbox('events', 'delete_events', 'Delete Events')}
              
              {renderCheckbox('clubs', 'view_clubs', 'View Clubs')}
              {renderCheckbox('clubs', 'manage_gallery', 'Manage Gallery')}
              {renderCheckbox('clubs', 'delete_clubs', 'Delete Clubs')}

              <h5 style={{ margin: '1rem 0 0.5rem 0', color: 'var(--text-muted)' }}>Event Operations</h5>
              {renderCheckbox('events', 'scanner', 'QR Code Scanner')}
              {renderCheckbox('events', 'registration_list', 'Registration List')}
              {renderCheckbox('events', 'upload_attendance', 'Upload Attendance CSV')}
              {renderCheckbox('events', 'manage_certificates', 'Generate & Publish Certificates')}
              {renderCheckbox('events', 'manage_events', 'Manage Programs (Edit & Publish)')}

              <h4 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--primary)' }}>Public Portal Access</h4>
              {renderCheckbox('student_portal', 'view_events', 'View Event Discover List')}
              {renderCheckbox('student_portal', 'view_clubs', 'View Clubs Directory')}
              {renderCheckbox('student_portal', 'view_recommendations', 'View AI Recommendations')}
              {renderCheckbox('student_portal', 'view_certificates', 'View "My Certificates"')}
              {renderCheckbox('student_portal', 'register_events', 'Register for Events')}
              {renderCheckbox('student_portal', 'join_clubs_direct', 'Request to Join Clubs (Direct to Admin)')}
              {renderCheckbox('student_portal', 'join_clubs_via_coordinator', 'Request to Join Clubs (Via Dept Coordinator)')}
              {renderCheckbox('student_portal', 'submit_feedback', 'Submit AI Feedback')}
            </div>
            
          </div>
        </form>

        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc' }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" style={{ padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={18} /> Save Role
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsModal;
