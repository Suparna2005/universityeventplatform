import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, Building2, CalendarDays, Users, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorState, LoadingState, MetricCard, PageHeader } from '../../components/UI';

const CHART_COLORS = ['#1475e8', '#0b9964', '#f0a126', '#7a59d1', '#2c9eaa'];
const sumValues = (rows = []) => rows.reduce((total, row) => total + (Number(row.value) || 0), 0);

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${baseURL}/api/analytics/participation`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analytics could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <LoadingState label="Loading participation analytics…" />;
  if (error) return <ErrorState title="Analytics unavailable" description={error} action={<button type="button" onClick={fetchAnalytics} className="btn-secondary">Try again</button>} />;
  if (!data) return <EmptyState icon={BarChart3} title="No analytics available" description="There is no participation data to show yet." />;

  const genderRows = Array.isArray(data.gender) ? data.gender : [];
  const departmentRows = Array.isArray(data.department) ? data.department : [];
  const dailyRows = Array.isArray(data.time?.daily) ? data.time.daily : [];
  const dailyTotal = dailyRows.reduce((total, row) => total + (Number(row.participants) || 0), 0);
  const peakDay = dailyRows.reduce((peak, row) => Number(row.participants) > Number(peak?.participants || 0) ? row : peak, null);

  return (
    <div className="animate-fade-in analytics-workspace">
      <PageHeader eyebrow="Reports and insights" title="Participation analytics" description="Explore event participation across the university." icon={BarChart3} />
      <div className="ui-metrics-grid">
        <MetricCard icon={Users} label="Recorded participants" value={sumValues(genderRows)} detail="Across gender categories" tone="blue" />
        <MetricCard icon={Building2} label="Departments represented" value={departmentRows.length} detail="With recorded participation" tone="purple" />
        <MetricCard icon={CalendarDays} label="Days in report" value={dailyRows.length} detail="Daily trend data points" tone="orange" />
        <MetricCard icon={TrendingUp} label="Peak participation" value={Number(peakDay?.participants || 0)} detail={peakDay?.date || 'No peak day yet'} tone="green" />
      </div>

      <div className="analytics-chart-grid">
        <section className="glass-card analytics-chart-card">
          <div className="analytics-chart-heading"><h2>Participation by gender</h2><p>Distribution of recorded participants</p></div>
          {genderRows.length ? <div className="analytics-chart-canvas"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={genderRows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="72%" innerRadius="42%" paddingAngle={3}>
              {genderRows.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
            </Pie><Tooltip /><Legend />
          </PieChart></ResponsiveContainer></div> : <EmptyState title="No gender data" description="This chart will appear when participation records are available." />}
        </section>

        <section className="glass-card analytics-chart-card">
          <div className="analytics-chart-heading"><h2>Participation by department</h2><p>Compare activity across departments</p></div>
          {departmentRows.length ? <div className="analytics-chart-canvas"><ResponsiveContainer width="100%" height="100%"><BarChart data={departmentRows} margin={{ top: 8, right: 12, left: -14, bottom: 8 }}>
            <CartesianGrid stroke="#e8edf4" vertical={false} /><XAxis dataKey="name" tick={{ fill: '#65748b', fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: '#65748b', fontSize: 11 }} /><Tooltip /><Bar dataKey="value" name="Participants" fill="#1475e8" radius={[5, 5, 0, 0]} />
          </BarChart></ResponsiveContainer></div> : <EmptyState title="No department data" description="There are no department participation records to compare." />}
        </section>

        <section className="glass-card analytics-chart-card analytics-trend-card">
          <div className="analytics-chart-heading"><h2>Daily participation</h2><p>{dailyTotal.toLocaleString()} participant check-ins in the selected period</p></div>
          {dailyRows.length ? <div className="analytics-chart-canvas analytics-trend-canvas"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyRows} margin={{ top: 12, right: 18, left: -12, bottom: 5 }}>
            <CartesianGrid stroke="#e8edf4" strokeDasharray="4 4" /><XAxis dataKey="date" tick={{ fill: '#65748b', fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: '#65748b', fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="participants" name="Participants" stroke="#1475e8" strokeWidth={3} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart></ResponsiveContainer></div> : <EmptyState title="No daily activity" description="Daily participation trends will appear after event check-ins." />}
        </section>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
