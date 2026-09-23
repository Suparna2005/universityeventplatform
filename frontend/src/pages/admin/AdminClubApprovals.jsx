import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';

const AdminClubApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseURL = '';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/admin/club-requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch admin club requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reqId) => {
    try {
      await axios.post(`${baseURL}/api/clubs/requests/${reqId}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Club membership generated successfully!');
      fetchRequests();
    } catch (err) {
      alert(`Error approving request: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleReject = async (reqId) => {
    try {
      await axios.post(`${baseURL}/api/clubs/requests/${reqId}/reject`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Request rejected.');
      fetchRequests();
    } catch (err) {
      alert(`Error rejecting request: ${err.response?.data?.detail || err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Requests...</div>;

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <ShieldCheck size={32} color="var(--primary)" />
        <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)' }}>Final Club Membership Approvals</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        These join requests have been vetted and forwarded by the Club Coordinators. As an Admin, you have the final authority to accept them and generate their official Club Membership.
      </p>

      {requests.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
          No pending forwarded requests at this time.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <strong style={{ fontSize: '1.1rem' }}>{req.user_name}</strong> <span style={{ color: 'var(--text-muted)' }}>({req.user_email})</span>
                <div style={{ marginTop: '0.25rem', color: '#0369a1', fontWeight: 600 }}>Requesting to join: {req.club_name}</div>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#4b5563', fontStyle: 'italic' }}>"{req.message}"</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button onClick={() => handleApprove(req.id)} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Accept & Generate</button>
                <button onClick={() => handleReject(req.id)} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClubApprovals;
