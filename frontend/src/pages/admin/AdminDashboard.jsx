import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import analyticsService from '../../services/analyticsService';
import { BarChart, LineChart } from '../../components/dashboard/ProgressChart';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate, formatNumber } from '../../utils/helpers';

function AdminStatCard({ icon, label, value, sub, color = 'green', to }) {
  const colors = {
    green:  'bg-mint-light text-sage-700   border-sage-200',
    blue:   'bg-primary-50 text-primary-700 border-primary-100',
    warm:   'bg-warm-light text-warm-dark   border-warm/20',
    purple: 'bg-purple-50 text-purple-700   border-purple-100',
  };
  const card = (
    <div className={`soft-card border p-5 flex items-center gap-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ${colors[color]}`}>
      <div className="text-3xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-0.5">{label}</p>
        <p className="font-display font-extrabold text-2xl leading-tight">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getAdminAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner variant="page" text="Loading admin analytics..." />;
  if (!data)   return null;

  const { users, questions, revenue, subscriptions, signupsLast7 = [] } = data;

  const signupLabels = signupsLast7.map(d => new Date(d.day).toLocaleDateString('en-ET', { weekday: 'short' }));
  const signupCounts = signupsLast7.map(d => d.count);

  const QUICK_LINKS = [
    { label: 'Add Question',     to: '/admin/questions/new', icon: '➕', color: 'bg-primary-50 text-primary-700 border-primary-100' },
    { label: 'Manage Users',     to: '/admin/users',         icon: '👥', color: 'bg-mint-light text-sage-700 border-sage-200' },
    { label: 'Review Payments',  to: '/admin/payments',      icon: '💳', color: 'bg-warm-light text-warm-dark border-warm/20' },
    { label: 'Announcements',    to: '/admin/announcements', icon: '📢', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-gray-800">Admin Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5">Site overview and key metrics.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard icon="👥" label="Total Students" value={formatNumber(users?.students || 0)}
          sub={`${users?.new_today || 0} joined today`} color="blue" to="/admin/users" />
        <AdminStatCard icon="📚" label="Questions"      value={formatNumber(questions?.total || 0)}
          sub={`${questions?.free_count || 0} free`}    color="green" to="/admin/questions" />
        <AdminStatCard icon="💳" label="Revenue"        value={formatCurrency(revenue?.total_revenue || 0)}
          sub={`${revenue?.successful || 0} payments`}  color="warm"  to="/admin/payments" />
        <AdminStatCard icon="⭐" label="Subscriptions"  value={subscriptions?.active || 0}
          sub={`${subscriptions?.expired || 0} expired`} color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="soft-card p-5">
          <h3 className="font-display font-bold text-base text-gray-800 mb-4">New Signups (Last 7 Days)</h3>
          {signupCounts.length > 0
            ? <BarChart labels={signupLabels} data={signupCounts} label="Signups" height={200} />
            : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No signup data</div>
          }
        </div>

        <div className="soft-card p-5">
          <h3 className="font-display font-bold text-base text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(q => (
              <Link key={q.to} to={q.to}
                className={`flex items-center gap-3 p-3 rounded-2xl border font-semibold text-sm hover:scale-[1.02] hover:shadow-soft transition-all duration-200 ${q.color}`}>
                <span className="text-xl">{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>

          {/* Extra stats */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface rounded-2xl text-center">
              <p className="font-display font-bold text-xl text-primary-600">{users?.active_users || 0}</p>
              <p className="text-xs text-gray-400">Active Users</p>
            </div>
            <div className="p-3 bg-surface rounded-2xl text-center">
              <p className="font-display font-bold text-xl text-sage-600">{revenue?.total_payments || 0}</p>
              <p className="text-xs text-gray-400">Total Payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent reported questions */}
      <div className="soft-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base text-gray-800">Pending Reports</h3>
          <Link to="/admin/reports" className="text-xs font-semibold text-primary-500 hover:text-sage-500">View all →</Link>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">
          Go to <Link to="/admin/reports" className="text-primary-500 hover:underline">Reports</Link> to review flagged questions.
        </p>
      </div>
    </div>
  );
}
