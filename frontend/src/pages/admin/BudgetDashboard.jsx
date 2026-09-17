import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const BudgetDashboard = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [proposal, setProposal] = useState({ event_id: '', proposed_amount: '' });
  
  const { user } = useContext(AuthContext);
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  const fetchData = async () => {
    try {
      const [budgetsRes, eventsRes] = await Promise.all([
        axios.get(`${baseURL}/api/finance/budgets`),
        axios.get(`${baseURL}/api/admin/events`) // Assuming this returns events for the coordinator/admin
      ]);
      setBudgets(budgetsRes.data);
      setEvents(eventsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [baseURL]);

  const handlePropose = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${baseURL}/api/finance/budgets`, {
        event_id: parseInt(proposal.event_id),
        proposed_amount: parseFloat(proposal.proposed_amount)
      });
      alert('Budget proposed successfully!');
      setProposal({ event_id: '', proposed_amount: '' });
      fetchData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to propose budget'}`);
    }
  };

  const handleStatusChange = async (budgetId, status, amount) => {
    try {
      await axios.put(`${baseURL}/api/finance/budgets/${budgetId}/status`, {
        status: status,
        approved_amount: amount
      });
      alert(`Budget marked as ${status}`);
      fetchData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to update status'}`);
    }
  };

  if (loading) return <div>Loading budgets...</div>;

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Financial Budgeting</h2>

      {/* Coordinator Proposal Form */}
      {['coordinator', 'admin'].includes(user.role) && (
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Propose New Budget</h3>
          <form onSubmit={handlePropose} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label>Select Event</label>
              <select className="input-glass" required value={proposal.event_id} onChange={e => setProposal({...proposal, event_id: e.target.value})}>
                <option value="">-- Select Event --</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Proposed Amount (₹)</label>
              <input type="number" min="0" className="input-glass" required value={proposal.proposed_amount} onChange={e => setProposal({...proposal, proposed_amount: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.5rem' }}>Submit Proposal</button>
          </form>
        </div>
      )}

      {/* Budget List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {budgets.length === 0 ? (
          <p>No budgets found.</p>
        ) : (
          budgets.map(budget => {
            const ev = events.find(e => e.id === budget.event_id);
            return (
              <div key={budget.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{ev ? ev.title : `Event ID: ${budget.event_id}`}</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Proposed: ₹{budget.proposed_amount}</p>
                  <span className={`badge ${budget.status === 'approved' ? 'badge-success' : budget.status === 'rejected' ? 'badge-warning' : 'badge-primary'}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                    {budget.status.toUpperCase()}
                  </span>
                </div>

                {/* Finance Officer Actions */}
                {['finance', 'admin'].includes(user.role) && budget.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleStatusChange(budget.id, 'approved', budget.proposed_amount)} className="btn-primary" style={{ background: '#10b981' }}>Approve</button>
                    <button onClick={() => handleStatusChange(budget.id, 'rejected', 0)} className="btn-secondary" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>Reject</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BudgetDashboard;
