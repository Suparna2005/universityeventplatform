import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Plus, Edit2, Trash2, X } from 'lucide-react';
import { ConfirmModal, AlertModal, PromptModal } from './Modals';
import RolePermissionsModal from './RolePermissionsModal';

const SystemSetupModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: () => setConfirmModal({ isOpen: false }) });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', placeholder: '', onConfirm: null, onCancel: () => setPromptModal({ isOpen: false }) });
  const [roleModal, setRoleModal] = useState({ isOpen: false, role: null });

  const baseURL = '';

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, roleRes] = await Promise.all([
        axios.get(`${baseURL}/api/admin/departments`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get(`${baseURL}/api/admin/roles`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setDepartments(deptRes.data);
      setRoles(roleRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, isError = false) => {
    setAlertModal({ isOpen: true, title: isError ? 'Error' : 'Success', message, isError });
  };

  const handleAdd = (type) => {
    if (type === 'roles') {
      setRoleModal({ isOpen: true, role: null });
      return;
    }
    setPromptModal({
      isOpen: true,
      title: `Add New ${type === 'departments' ? 'Department' : 'System Role'}`,
      message: `Enter the exact name. Duplicates are not allowed.`,
      defaultValue: '',
      placeholder: 'e.g. BCA',
      onConfirm: async (val) => {
        setPromptModal({ isOpen: false });
        if (!val.trim()) return;
        try {
          await axios.post(`${baseURL}/api/admin/${type}`, { name: val.trim() }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          fetchData();
          showAlert('Added successfully!');
        } catch (err) {
          showAlert(err.response?.data?.detail || 'Error adding entry', true);
        }
      },
      onCancel: () => setPromptModal({ isOpen: false })
    });
  };

  const handleEdit = (type, item) => {
    if (type === 'roles') {
      setRoleModal({ isOpen: true, role: item });
      return;
    }
    setPromptModal({
      isOpen: true,
      title: `Edit ${type === 'departments' ? 'Department' : 'System Role'}`,
      message: `Warning: Editing this will automatically update all users currently assigned to '${item.name}'.`,
      defaultValue: item.name,
      placeholder: '',
      onConfirm: async (val) => {
        setPromptModal({ isOpen: false });
        if (!val.trim() || val.trim() === item.name) return;
        try {
          await axios.put(`${baseURL}/api/admin/${type}/${item.id}`, { name: val.trim() }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          fetchData();
          showAlert('Updated successfully!');
        } catch (err) {
          showAlert(err.response?.data?.detail || 'Error updating entry', true);
        }
      },
      onCancel: () => setPromptModal({ isOpen: false })
    });
  };

  const handleDelete = (type, item) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${item.name}?`,
      message: `Are you entirely sure you want to delete '${item.name}'? ALERT: Any users assigned to this ${type === 'departments' ? 'department' : 'role'} will have their record cleared! This cannot be undone.`,
      confirmText: 'Delete & Clear Users',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          await axios.delete(`${baseURL}/api/admin/${type}/${item.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          fetchData();
          showAlert('Deleted successfully!');
        } catch (err) {
          showAlert(err.response?.data?.detail || 'Error deleting entry', true);
        }
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    });
  };

  const handleSaveRole = async (roleData) => {
    setRoleModal({ isOpen: false, role: null });
    try {
      if (roleModal.role) {
        await axios.put(`${baseURL}/api/admin/roles/${roleModal.role.id}`, roleData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        showAlert('Role updated successfully!');
      } else {
        await axios.post(`${baseURL}/api/admin/roles`, roleData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        showAlert('Role created successfully!');
      }
      fetchData();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Error saving role', true);
    }
  };

  if (!isOpen) return null;

  const currentList = activeTab === 'departments' ? departments : roles;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9990
    }}>
      <PromptModal {...promptModal} />
      <ConfirmModal {...confirmModal} />
      <AlertModal {...alertModal} onClose={() => setAlertModal({ ...alertModal, isOpen: false })} />
      <RolePermissionsModal 
        isOpen={roleModal.isOpen} 
        role={roleModal.role} 
        onClose={() => setRoleModal({ isOpen: false, role: null })}
        onSave={handleSaveRole}
      />

      <div className="glass-card animate-fade-in" style={{ 
        width: '100%', maxWidth: '600px', background: 'rgba(255,255,255,0.98)', 
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Settings size={24} color="var(--primary)" />
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>System Setup</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', padding: '0 2rem' }}>
          <button 
            onClick={() => setActiveTab('departments')}
            style={{ 
              padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === 'departments' ? 600 : 400,
              color: activeTab === 'departments' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'departments' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            Departments
          </button>
          <button 
            onClick={() => setActiveTab('roles')}
            style={{ 
              padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === 'roles' ? 600 : 400,
              color: activeTab === 'roles' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'roles' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            System Roles
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Manage {activeTab === 'departments' ? 'university departments' : 'administrative system roles'}.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={async () => {
                  try {
                    setLoading(true);
                    await axios.get(`${baseURL}/api/admin/migrate-setup`);
                    fetchData();
                    showAlert('Migration complete! All existing roles and departments have been populated.');
                  } catch (err) {
                    showAlert('Migration failed', true);
                    setLoading(false);
                  }
                }} 
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                title="Populate list with existing data"
              >
                Migrate Data
              </button>
              <button 
                onClick={() => handleAdd(activeTab)} 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
              >
                <Plus size={18} /> Add New
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {currentList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: '8px' }}>
                  No {activeTab} defined yet.
                </div>
              ) : (
                currentList.map(item => {
                  const isCoreRole = activeTab === 'roles' && ['student', 'faculty', 'coordinator', 'club_coordinator', 'finance', 'admin'].includes(item.name.toLowerCase());
                  
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 500, color: '#0f172a' }}>{item.name}</span>
                      {!isCoreRole ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEdit(activeTab, item)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1' }}>
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(activeTab, item)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>System Core</span>
                          <button onClick={() => handleEdit(activeTab, item)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1' }}>
                            <Edit2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSetupModal;
