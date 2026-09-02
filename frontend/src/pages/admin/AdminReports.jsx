import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/common/Toast';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, snakeToTitle } from '../../utils/helpers';

const STATUS_COLOR = { pending:'yellow', reviewed:'blue', resolved:'green', dismissed:'gray' };

const TABS = [
  { id: 'reports',  label: '⚠️ Question Reports' },
  { id: 'contacts', label: '📬 Contact Messages' },
];

export default function AdminReports() {
  const toast = useToast();
  const [tab,        setTab]        = useState('reports');
  const [reports,    setReports]    = useState([]);
  const [contacts,   setContacts]   = useState([]);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [statusF,    setStatusF]    = useState('pending');
  const [loading,    setLoading]    = useState(true);
  const [actioning,  setActioning]  = useState(null);

  const load = () => {
    setLoading(true);
    if (tab === 'reports') {
      api.get('/reports', { params: { status: statusF || undefined, page, limit: 15 } })
        .then(r => { setReports(r.data.data || []); setPagination(r.data.pagination || {}); })
        .finally(() => setLoading(false));
    } else {
      api.get('/contact/messages', { params: { page, limit: 15 } })
        .then(r => { setContacts(r.data.data || []); setPagination(r.data.pagination || {}); })
        .catch(() => { setContacts([]); })
        .finally(() => setLoading(false));
    }
  };
  useEffect(() => { setPage(1); }, [tab, statusF]);
  useEffect(load, [tab, statusF, page]);

  const updateStatus = async (id, status) => {
    setActioning(id);
    try {
      await api.put(`/reports/${id}`, { status });
      toast.success(`Report marked as ${status}`);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setActioning(null); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-gray-800">Reports & Messages ⚠️</h2>
        <p className="text-sm text-gray-400 mt-0.5">Review reported questions and contact messages.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-soft border border-gray-100 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-surface'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Question Reports Tab */}
      {tab === 'reports' && (<>
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-soft border border-gray-100 w-fit">
          {['pending','reviewed','resolved','dismissed',''].map(s => (
            <button key={s} onClick={() => { setStatusF(s); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusF === s ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-surface'
              }`}>
              {s ? snakeToTitle(s) : 'All'}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner variant="dots" className="py-16" /> :
        reports.length === 0 ? (
          <EmptyState icon="✅" title="No reports" message={statusF === 'pending' ? 'No pending reports!' : 'Nothing here.'} />
        ) : (
          <>
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="soft-card p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="p-3 bg-surface rounded-2xl mb-3">
                        <p className="text-xs font-bold text-gray-400 mb-1">REPORTED QUESTION #{r.question_id}</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{r.question_text || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge color="warm" size="xs">{snakeToTitle(r.reason)}</Badge>
                        <Badge color={STATUS_COLOR[r.status] || 'gray'} size="xs" dot>{r.status}</Badge>
                        <span className="text-xs text-gray-400">by {r.reporter_name || 'Student'} · {formatDate(r.created_at)}</span>
                      </div>
                      {r.description && <p className="text-sm text-gray-500 italic">"{r.description}"</p>}
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button size="sm" variant="secondary" loading={actioning === r.id}
                          onClick={() => updateStatus(r.id, 'resolved')}>✅ Resolved</Button>
                        <Button size="sm" variant="white" loading={actioning === r.id}
                          onClick={() => updateStatus(r.id, 'dismissed')}>Dismiss</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={pagination?.totalPages}
              onPageChange={setPage} totalItems={pagination?.total} itemsPerPage={15} />
          </>
        )}
      </>)}

      {/* Contact Messages Tab */}
      {tab === 'contacts' && (<>
        {loading ? <LoadingSpinner variant="dots" className="py-16" /> :
        contacts.length === 0 ? (
          <EmptyState icon="📭" title="No messages yet" message="Contact form submissions will appear here." />
        ) : (
          <>
            <div className="soft-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-5 gap-4 px-5 py-3 bg-surface border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div>Name</div><div className="col-span-2">Message</div><div>Subject</div><div>Date</div>
              </div>
              <div className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-start gap-4 px-5 py-4 hover:bg-surface">
                    <div className="min-w-0 flex-shrink-0 w-32">
                      <p className="text-sm font-semibold text-gray-700 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    </div>
                    <p className="flex-1 text-sm text-gray-600 line-clamp-2">{c.message}</p>
                    <Badge color="blue" size="xs">{c.subject || 'general'}</Badge>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(c.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
            <Pagination currentPage={page} totalPages={pagination?.totalPages}
              onPageChange={setPage} totalItems={pagination?.total} itemsPerPage={15} />
          </>
        )}
      </>)}
    </div>
  );
}
