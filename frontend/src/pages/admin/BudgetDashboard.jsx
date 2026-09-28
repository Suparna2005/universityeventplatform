import React, { useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { BadgeIndianRupee, Download, FileSpreadsheet, Wallet } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { AlertModal, ConfirmModal } from '../../components/Modals';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/UI';

const BudgetDashboard = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [events, setEvents] = useState([]);
  const [proposal, setProposal] = useState({ event_id: '', proposed_amount: '' });
  const [downloadError, setDownloadError] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const { user } = useContext(AuthContext);
  const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [budgetsRes, eventsRes] = await Promise.all([
        axios.get(`${baseURL}/api/finance/budgets`),
        axios.get(`${baseURL}/api/admin/events`)
      ]);
      setBudgets(budgetsRes.data);
      setEvents(eventsRes.data);
    } catch (err) {
      setLoadError(err.response?.data?.detail || 'Budget data could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePropose = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${baseURL}/api/finance/budgets`, {
        event_id: parseInt(proposal.event_id, 10),
        proposed_amount: parseFloat(proposal.proposed_amount)
      });
      setAlertModal({ isOpen: true, title: 'Budget proposal submitted', message: 'The event budget was sent for review.', isError: false });
      setProposal({ event_id: '', proposed_amount: '' });
      fetchData();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not submit proposal', message: err.response?.data?.detail || 'Failed to propose budget.', isError: true });
    }
  };

  const handleStatusChange = async (budgetId, status, amount) => {
    try {
      await axios.put(`${baseURL}/api/finance/budgets/${budgetId}/status`, { status, approved_amount: amount });
      setAlertModal({ isOpen: true, title: 'Budget updated', message: `The proposal was marked as ${status}.`, isError: false });
      fetchData();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not update budget', message: err.response?.data?.detail || 'Failed to update status.', isError: true });
    }
  };

  const downloadBudgetCsv = async (path, filename) => {
    setDownloadError('');
    try {
      const response = await axios.get(`${baseURL}${path}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err.response?.data?.detail || 'Could not download the budget CSV.');
    }
  };

  if (loading) return <LoadingState label="Loading budget proposals…" />;
  if (loadError) return <ErrorState title="Budget data unavailable" description={loadError} action={<button type="button" className="btn-secondary" onClick={fetchData}>Try again</button>} />;

  return (
    <div className="animate-fade-in budget-workspace">
      <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal((previous) => ({ ...previous, isOpen: false }))} />
      <AlertModal {...alertModal} onClose={() => setAlertModal((previous) => ({ ...previous, isOpen: false }))} />
      <PageHeader
        eyebrow="Finance and event operations"
        title="Financial budgeting"
        description="Review event budget proposals and expense reports."
        icon={Wallet}
        actions={['coordinator', 'finance', 'admin'].includes(user.role) && <>
          <button onClick={() => downloadBudgetCsv('/api/finance/budgets/export', 'event_budgets.csv')} className="btn-primary"><Download size={16} /> Download budget CSV</button>
          <button onClick={() => downloadBudgetCsv('/api/finance/budgets/csv/template', 'event_budgets_template.csv')} className="btn-secondary"><FileSpreadsheet size={16} /> CSV format</button>
        </>}
      />
      <p className="budget-csv-format"><strong>CSV format:</strong> Event ID, Event Title, Event Date, Hosting Club, Department, Proposed Budget (INR), Approved Budget (INR), Actual Expenses (INR), Budget Status, Event Status, Submitted By.</p>
      {downloadError && <ErrorState title="CSV download failed" description={downloadError} />}

      {['coordinator', 'admin'].includes(user.role) && (
        <section className="glass-card budget-proposal-card">
          <div className="budget-proposal-heading"><span className="ui-page-icon"><BadgeIndianRupee size={20} /></span><div><h2>Propose a budget</h2><p>Select an event and submit the amount for finance review.</p></div></div>
          <form onSubmit={handlePropose} className="budget-proposal-form">
            <div className="ui-form-field budget-event-field">
              <label htmlFor="budget-event">Event</label>
              <select id="budget-event" className="input-glass" required value={proposal.event_id} onChange={(event) => setProposal((previous) => ({ ...previous, event_id: event.target.value }))}>
                <option value="">Select an event</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </div>
            <div className="ui-form-field">
              <label htmlFor="budget-amount">Proposed amount (₹)</label>
              <input id="budget-amount" type="number" min="0" className="input-glass" required value={proposal.proposed_amount} onChange={(event) => setProposal((previous) => ({ ...previous, proposed_amount: event.target.value }))} />
            </div>
            <button type="submit" className="btn-primary">Submit proposal</button>
          </form>
        </section>
      )}

      <section className="budget-list-section" aria-label="Budget proposals">
        <div className="budget-list-heading"><h2>Budget proposals</h2><span>{budgets.length} {budgets.length === 1 ? 'proposal' : 'proposals'}</span></div>
        {budgets.length === 0 ? (
          <EmptyState icon={BadgeIndianRupee} title="No budget proposals yet" description="Submitted event budgets will appear here for review." />
        ) : (
          <div className="budget-list">
            {budgets.map((budget) => {
              const event = events.find((item) => item.id === budget.event_id);
              return (
                <article key={budget.id} className="glass-card budget-proposal-row">
                  <div className="budget-proposal-details">
                    <h3>{event ? event.title : `Event ID: ${budget.event_id}`}</h3>
                    <p>Proposed amount <strong>₹{Number(budget.proposed_amount || 0).toLocaleString('en-IN')}</strong></p>
                    {event && <small>{event.club_name || 'University event'}{event.date ? ` · ${new Date(event.date).toLocaleDateString()}` : ''}</small>}
                    <StatusBadge status={budget.status} />
                  </div>
                  {['finance', 'admin'].includes(user.role) && budget.status === 'pending' && (
                    <div className="budget-proposal-actions">
                      <button onClick={() => handleStatusChange(budget.id, 'approved', budget.proposed_amount)} className="btn-primary">Approve</button>
                      <button onClick={() => setConfirmModal({ isOpen: true, title: 'Reject budget proposal?', message: 'This will mark the current proposal as rejected.', confirmText: 'Reject proposal', onConfirm: () => { setConfirmModal((previous) => ({ ...previous, isOpen: false })); handleStatusChange(budget.id, 'rejected', 0); } })} className="btn-secondary danger-button">Reject</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default BudgetDashboard;
