import React, { useEffect, useState, useCallback } from 'react';
import userService from '../../services/userService';
import { useAuth }   from '../../hooks/useAuth';
import { useToast }  from '../../components/common/Toast';
import useDebounce   from '../../hooks/useDebounce';
import Button        from '../../components/common/Button';
import SearchBar     from '../../components/common/SearchBar';
import Badge         from '../../components/common/Badge';
import Pagination    from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal         from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState    from '../../components/common/EmptyState';
import {
  fullName, initials, formatDate, timeAgo, formatExpiry, formatDuration,
  formatScore, snakeToTitle, STREAM_LABELS,
} from '../../utils/helpers';

// ── Access type display map ───────────────────────────────────
const ACCESS_TYPE_LABELS = {
  free:         { label: 'Free',         color: 'blue' },
  not_selected: { label: 'Not Selected', color: 'gray' },
};

// ── Mode display map ──────────────────────────────────────────
const MODE_LABELS = {
  practice:  'Practice',
  past_year: 'Past-Year',
  random:    'Random',
};

// ── Format last login for table display ──────────────────────
// Shows: "Never" | "Today, 2:30 PM" | "Yesterday" | "Sep 15, 2026"
function formatLastLogin(dateStr) {
  if (!dateStr) return { text: 'Never', muted: true };
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return {
      text: `Today, ${d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}`,
      muted: false,
    };
  }
  if (diffDays === 1) return { text: 'Yesterday', muted: false };
  if (diffDays < 7)  return { text: `${diffDays}d ago`, muted: false };
  return { text: formatDate(dateStr, 'short'), muted: true };
}

// ── Icons ────────────────────────────────────────────────────
function IconEye() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
    </svg>
  );
}

// ── Sort indicator icon ───────────────────────────────────────
function SortIcon({ field, sortField, sortDir }) {
  const active = sortField === field;
  return (
    <span className={`inline-flex flex-col ml-1 gap-0 leading-none ${active ? 'text-primary-500' : 'text-gray-300'}`}>
      <svg className={`w-2.5 h-2.5 -mb-0.5 ${active && sortDir === 'asc' ? 'text-primary-500' : 'text-gray-300'}`}
        viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 0L10 6H0z"/>
      </svg>
      <svg className={`w-2.5 h-2.5 ${active && sortDir === 'desc' ? 'text-primary-500' : 'text-gray-300'}`}
        viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 6L0 0H10z"/>
      </svg>
    </span>
  );
}

// ── Sortable column header ────────────────────────────────────
function SortableHeader({ field, label, sortField, sortDir, onSort, className = '' }) {
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-0.5 text-left hover:text-primary-600 transition-colors ${className} ${sortField === field ? 'text-primary-600' : ''}`}
    >
      {label}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </button>
  );
}

// ── Small reusable stat card for the activity panel ───────────
function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="font-display font-extrabold text-2xl text-primary-700">{value ?? '—'}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ── Field row used inside detail modal sections ───────────────
function DetailField({ label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="w-36 flex-shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="flex-1 text-sm text-gray-700">
        {children || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-6 first:mt-0">
      {children}
    </h4>
  );
}

// ── Activity panel inside the modal ──────────────────────────
function ActivityPanel({ userId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    userService.getUserActivity(userId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Could not load activity data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <LoadingSpinner variant="dots" className="py-8" />;
  if (error)   return <div className="py-8 text-center"><p className="text-sm text-red-500">{error}</p></div>;

  const s = data?.stats;
  const hasActivity = parseInt(s?.total_attempts || 0) > 0;

  if (!hasActivity) return (
    <div className="py-8 text-center space-y-2">
      <div className="text-3xl">📭</div>
      <p className="text-sm font-semibold text-gray-500">No activity yet</p>
      <p className="text-xs text-gray-400">This student has not completed any practice sessions.</p>
    </div>
  );

  return (
    <div className="space-y-5 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Sessions"   value={s.total_attempts}   />
        <StatCard label="Questions"        value={s.total_questions}  />
        <StatCard label="Correct Answers"  value={s.total_correct}    />
        <StatCard label="Avg. Score"
          value={s.avg_score != null ? `${s.avg_score}%` : '—'}
          sub={s.highest_score != null ? `Best: ${s.highest_score}%` : null}
        />
        <StatCard label="Subjects Studied" value={s.subjects_studied} />
        <StatCard label="Study Time"
          value={s.total_study_secs > 0 ? formatDuration(s.total_study_secs) : '—'}
        />
      </div>

      {data.subjectStats?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">By Subject</p>
          <div className="space-y-1.5">
            {data.subjectStats.map((sub, i) => {
              const scoreInfo = formatScore(sub.avg_score);
              return (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color || '#52B788' }} />
                  <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">{sub.subject_name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{sub.attempts} session{sub.attempts !== 1 ? 's' : ''}</span>
                  <span className={`text-xs font-bold flex-shrink-0 ${scoreInfo.color}`}>
                    {sub.avg_score != null ? `${sub.avg_score}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.recentActivity?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Recent Sessions</p>
          <div className="space-y-1">
            {data.recentActivity.map((r) => {
              const scoreInfo = formatScore(r.score_percent);
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-surface transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {r.subject_name || 'Unknown Subject'}
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">{MODE_LABELS[r.mode] || r.mode}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.correct_answers}/{r.total_questions} correct
                      {r.time_taken_secs > 0 && ` · ${formatDuration(r.time_taken_secs)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className={`text-sm font-bold ${scoreInfo.color}`}>
                      {r.score_percent != null ? `${parseFloat(r.score_percent).toFixed(0)}%` : '—'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {r.completed_at ? timeAgo(r.completed_at) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── User Detail Modal ─────────────────────────────────────────
function UserDetailModal({
  user, isOpen, onClose, isSuperAdmin,
  onToggle, onForceLogout, onRoleChange, roleChanging,
  onDeleteRequest, onEmailVerifyRequest,
}) {
  const [selectedRole, setSelectedRole] = useState('');
  const [activeTab,    setActiveTab]    = useState('details');

  useEffect(() => {
    if (user) {
      const roleIdMap = { student: '1', admin: '2', super_admin: '3' };
      setSelectedRole(roleIdMap[user.role] || '1');
      setActiveTab('details');
    }
  }, [user?.id]);

  if (!user) return null;

  const expiryInfo = user.expires_at ? formatExpiry(user.expires_at) : null;
  const expiryColorMap = { expired: 'text-red-600', critical: 'text-red-500', warning: 'text-yellow-600', ok: 'text-gray-700' };
  const accessInfo = ACCESS_TYPE_LABELS[user.access_type] || { label: user.access_type, color: 'gray' };
  const loginInfo  = formatLastLogin(user.last_login);

  const handleRoleApply = () => {
    const roleIdMap = { student: '1', admin: '2', super_admin: '3' };
    const currentId = roleIdMap[user.role] || '1';
    if (selectedRole !== currentId) onRoleChange(user.id, selectedRole);
  };

  const tabClass = (tab) =>
    `px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
      activeTab === tab
        ? 'bg-primary-500 text-white shadow-glow-green'
        : 'text-gray-500 hover:bg-surface hover:text-primary-600'
    }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Details" size="lg">

      {/* User card header */}
      <div className="flex items-center gap-4 pb-4 mb-2 border-b border-gray-100">
        <div className="w-14 h-14 rounded-2xl bg-green-gradient flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-soft">
          {initials(fullName(user))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-lg text-gray-800 truncate">{fullName(user)}</p>
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge preset="role" value={user.role} size="xs" />
            <Badge color={user.is_active ? 'green' : 'red'} size="xs" dot>
              {user.is_active ? 'Active' : 'Disabled'}
            </Badge>
            {user.is_email_verified
              ? <span className="inline-flex items-center gap-1 text-sage-600 text-[10px] font-semibold bg-mint-light px-1.5 py-0.5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-sage-400 inline-block"/>Verified</span>
              : <span className="inline-flex items-center gap-1 text-yellow-700 text-[10px] font-semibold bg-yellow-50 px-1.5 py-0.5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"/>Unverified</span>
            }
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        <button className={tabClass('details')}  onClick={() => setActiveTab('details')}>Details</button>
        <button className={tabClass('activity')} onClick={() => setActiveTab('activity')}>Activity</button>
      </div>

      {/* ── DETAILS TAB ── */}
      {activeTab === 'details' && (
        <>
          {/* PROFILE */}
          <SectionHeading>Profile</SectionHeading>
          <DetailField label="Full Name">{fullName(user)}</DetailField>
          <DetailField label="Email">{user.email}</DetailField>
          <DetailField label="Phone">{user.phone}</DetailField>
          <DetailField label="Stream">
            {user.stream
              ? <span>{user.stream === 'natural_science' ? '🔬' : '📰'} {STREAM_LABELS[user.stream] || snakeToTitle(user.stream)}</span>
              : null}
          </DetailField>
          <DetailField label="School">{user.school}</DetailField>
          <DetailField label="Region">{user.region}</DetailField>
          <DetailField label="City">{user.city}</DetailField>
          <DetailField label="Access Type">
            {user.access_type ? <Badge color={accessInfo.color} size="xs">{accessInfo.label}</Badge> : null}
          </DetailField>

          {/* ACCOUNT */}
          <SectionHeading>Account</SectionHeading>
          <DetailField label="Role"><Badge preset="role" value={user.role} size="xs" /></DetailField>
          <DetailField label="Email Verified">
            <div className="flex items-center gap-3 flex-wrap">
              {user.is_email_verified ? (
                <span className="inline-flex items-center gap-1.5 text-sage-600 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-sage-400 inline-block"/>Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-yellow-600 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/>Not Verified
                </span>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => onEmailVerifyRequest(user, !user.is_email_verified)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all ${
                    user.is_email_verified
                      ? 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'
                      : 'border-sage-200 text-sage-600 hover:bg-mint-light'
                  }`}
                >
                  {user.is_email_verified ? 'Unverify Email' : 'Verify Email'}
                </button>
              )}
            </div>
          </DetailField>
          <DetailField label="Account Status">
            <Badge color={user.is_active ? 'green' : 'red'} size="xs" dot>
              {user.is_active ? 'Active' : 'Disabled'}
            </Badge>
          </DetailField>
          <DetailField label="Registered">{formatDate(user.created_at, 'long')}</DetailField>
          <DetailField label="Last Login">
            <span className={loginInfo.muted ? 'text-gray-400' : 'text-gray-700'}>
              {loginInfo.text}
            </span>
          </DetailField>

          {/* SUBSCRIPTION */}
          <SectionHeading>Subscription</SectionHeading>
          <DetailField label="Status">
            {user.subscription_status
              ? <Badge preset="subscription" value={user.subscription_status} size="xs" />
              : <span className="text-xs text-gray-400">No subscription</span>}
          </DetailField>
          <DetailField label="Expiry">
            {expiryInfo
              ? <span className={`text-sm font-medium ${expiryColorMap[expiryInfo.status] || 'text-gray-700'}`}>{expiryInfo.text}</span>
              : null}
          </DetailField>

          {/* CHANGE ROLE — super_admin only */}
          {isSuperAdmin && (
            <>
              <SectionHeading>Change Role</SectionHeading>
              <div className="flex items-center gap-2 py-2">
                <select className="input-field text-sm flex-1" value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}>
                  <option value="1">Student</option>
                  <option value="2">Admin</option>
                  <option value="3">Super Admin</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleRoleApply} loading={roleChanging} disabled={roleChanging}>
                  Apply
                </Button>
              </div>
            </>
          )}

          {/* ADMINISTRATIVE ACTIONS */}
          <SectionHeading>Administrative Actions</SectionHeading>
          <div className="flex flex-wrap gap-2 pt-1 pb-1">
            <Button size="sm" variant={user.is_active ? 'danger' : 'primary'} onClick={() => onToggle(user)}>
              {user.is_active ? 'Disable Account' : 'Enable Account'}
            </Button>
            <Button size="sm" variant="warm" onClick={() => onForceLogout(user)}>
              <IconLogout />Force Logout
            </Button>
            {isSuperAdmin && (
              <Button size="sm" variant="danger" onClick={() => onDeleteRequest(user)}>
                Delete User
              </Button>
            )}
          </div>
        </>
      )}

      {/* ── ACTIVITY TAB ── */}
      {activeTab === 'activity' && <ActivityPanel userId={user.id} />}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();

  const [users,       setUsers]       = useState([]);
  const [pagination,  setPagination]  = useState({});
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [exporting,   setExporting]   = useState(false);

  // Filters
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [subFilter,    setSubFilter]    = useState('');

  // Sorting
  const [sortField, setSortField] = useState('joined');  // default: joined date
  const [sortDir,   setSortDir]   = useState('desc');

  const [detailUser,  setDetailUser]  = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [actioning,   setActioning]   = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const hasFilters = search || roleFilter || activeFilter || streamFilter || subFilter;

  const clearFilters = () => {
    setSearch(''); setRoleFilter(''); setActiveFilter('');
    setStreamFilter(''); setSubFilter(''); setPage(1);
  };

  // Toggle sort: same field flips direction, new field defaults to desc
  const handleSort = useCallback((field) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDir('desc');
      return field;
    });
    setPage(1);
  }, []);

  // Build the params object shared by load() and handleExport()
  const buildParams = useCallback(() => ({
    search:       debouncedSearch || undefined,
    role_id:      roleFilter      || undefined,
    is_active:    activeFilter !== '' ? activeFilter : undefined,
    stream:       streamFilter   || undefined,
    subscription: subFilter      || undefined,
    sort_field:   sortField,
    sort_dir:     sortDir,
  }), [debouncedSearch, roleFilter, activeFilter, streamFilter, subFilter, sortField, sortDir]);

  const load = useCallback(() => {
    setLoading(true);
    userService.getAllUsers({ ...buildParams(), page, limit: 20 })
      .then(res => { setUsers(res.data); setPagination(res.pagination); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [buildParams, page]);

  useEffect(() => { load(); }, [load]);

  // ── Export CSV ────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await userService.exportUsers(buildParams());
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `ethio-matric-academy-users-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export downloaded successfully.');
    } catch {
      toast.error('Failed to export users. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Action handlers ───────────────────────────────────────
  const handleToggle = async () => {
    setActioning(true);
    try {
      await userService.toggleUserStatus(confirmItem.user.id);
      toast.success('User status updated');
      if (detailUser?.id === confirmItem.user.id) {
        setDetailUser(prev => prev ? { ...prev, is_active: !prev.is_active } : prev);
      }
      setConfirmItem(null);
      load();
    } catch { toast.error('Failed to update status'); }
    finally { setActioning(false); }
  };

  const handleForceLogout = async () => {
    setActioning(true);
    try {
      await userService.forceLogout(confirmItem.user.id);
      toast.success('User sessions terminated');
      setConfirmItem(null);
    } catch { toast.error('Failed to force logout'); }
    finally { setActioning(false); }
  };

  const handleDelete = async () => {
    setActioning(true);
    try {
      await userService.deleteUser(confirmItem.user.id);
      toast.success(`${fullName(confirmItem.user)}'s account has been deleted.`);
      setConfirmItem(null);
      setDetailUser(null);
      const remainingOnPage = users.length - 1;
      if (remainingOnPage === 0 && page > 1) setPage(p => p - 1);
      else load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete user. Please try again.');
    }
    finally { setActioning(false); }
  };

  const handleEmailVerify = async () => {
    setActioning(true);
    try {
      const { is_email_verified } = confirmItem.payload;
      await userService.updateEmailVerification(confirmItem.user.id, is_email_verified);
      toast.success(is_email_verified ? 'Email marked as verified' : 'Email marked as unverified');
      if (detailUser?.id === confirmItem.user.id) {
        setDetailUser(prev => prev ? { ...prev, is_email_verified } : prev);
      }
      setConfirmItem(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update email verification');
    }
    finally { setActioning(false); }
  };

  const handleRoleChange = async (userId, roleId) => {
    setRoleChanging(true);
    try {
      await userService.changeUserRole(userId, roleId);
      toast.success('Role updated');
      const roleNameMap = { '1': 'student', '2': 'admin', '3': 'super_admin' };
      if (detailUser?.id === userId) {
        setDetailUser(prev => prev ? { ...prev, role: roleNameMap[roleId] } : prev);
      }
      load();
    } catch { toast.error('Failed to update role'); }
    finally { setRoleChanging(false); }
  };

  const requestToggle      = (user) => setConfirmItem({ type: 'toggle',      user });
  const requestLogout      = (user) => setConfirmItem({ type: 'logout',      user });
  const requestDelete      = (user) => setConfirmItem({ type: 'delete',      user });
  const requestEmailVerify = (user, newVal) => setConfirmItem({ type: 'emailVerify', user, payload: { is_email_verified: newVal } });

  const confirmConfig = (() => {
    if (!confirmItem) return {};
    const u = confirmItem.user;
    if (confirmItem.type === 'toggle') return {
      onConfirm: handleToggle,
      title: `${u.is_active ? 'Disable' : 'Enable'} Account`,
      message: `This will ${u.is_active ? 'prevent' : 'allow'} ${fullName(u)} from accessing the platform.`,
      confirmLabel: u.is_active ? 'Disable' : 'Enable',
      variant: u.is_active ? 'danger' : 'warning',
    };
    if (confirmItem.type === 'logout') return {
      onConfirm: handleForceLogout,
      title: 'Force Logout',
      message: `All active sessions for ${fullName(u)} will be terminated immediately.`,
      confirmLabel: 'Force Logout',
      variant: 'warning',
    };
    if (confirmItem.type === 'delete') return {
      onConfirm: handleDelete,
      title: 'Delete User Permanently?',
      message: `You are about to permanently delete ${fullName(u)} (${u.email}). Their account, practice history, sessions, and subscription records will be removed. This action cannot be undone. Note: deletion is blocked if the user has payment records — use Disable instead in that case.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
    };
    if (confirmItem.type === 'emailVerify') {
      const verifying = confirmItem.payload?.is_email_verified;
      return {
        onConfirm: handleEmailVerify,
        title: verifying ? 'Verify Email Address?' : 'Unverify Email Address?',
        message: verifying
          ? `This will manually mark ${fullName(u)}'s email as verified.`
          : `This will mark ${fullName(u)}'s email as unverified. They will need to verify again before logging in.`,
        confirmLabel: verifying ? 'Verify Email' : 'Unverify Email',
        variant: verifying ? 'info' : 'warning',
      };
    }
    return {};
  })();

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* PAGE HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-gray-800">User Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage student and administrator accounts, access, and account status.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Total count badge */}
          {pagination.total > 0 && (
            <div className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-xl text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
              </svg>
              {pagination.total?.toLocaleString()} accounts
            </div>
          )}
          {/* Export button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            loading={exporting}
            disabled={exporting || loading}
            title="Export current filtered results as CSV"
          >
            <IconDownload />
            Export CSV
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="soft-card p-4 flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search name or email..." className="flex-1 min-w-[200px]" loading={loading} />
        <select className="input-field text-sm w-auto" value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="1">Students</option>
          <option value="2">Admins</option>
          <option value="3">Super Admins</option>
        </select>
        <select className="input-field text-sm w-auto" value={activeFilter}
          onChange={e => { setActiveFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select className="input-field text-sm w-auto" value={streamFilter}
          onChange={e => { setStreamFilter(e.target.value); setPage(1); }}>
          <option value="">All Streams</option>
          <option value="natural_science">🔬 Natural Science</option>
          <option value="social_science">📰 Social Science</option>
        </select>
        <select className="input-field text-sm w-auto" value={subFilter}
          onChange={e => { setSubFilter(e.target.value); setPage(1); }}>
          <option value="">All Subscriptions</option>
          <option value="active">Premium / Active</option>
          <option value="expired">Expired</option>
          <option value="free">Free Access</option>
          <option value="none">No Subscription</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
        )}
      </div>

      {/* USER TABLE */}
      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : users.length === 0 ? (
        <EmptyState preset="users" />
      ) : (
        <>
          <div className="soft-card overflow-hidden">
            {/* Desktop column headers — sortable */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-surface border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-3">
                <SortableHeader field="name" label="User" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </div>
              <div className="col-span-1">Role</div>
              <div className="col-span-1">Stream</div>
              <div className="col-span-1">Verified</div>
              <div className="col-span-2">Subscription</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">
                <SortableHeader field="joined" label="Joined" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </div>
              <div className="col-span-1 hidden xl:flex">
                <SortableHeader field="last_login" label="Last Login" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </div>
              <div className="col-span-1 xl:hidden text-right">Actions</div>
              <div className="hidden xl:flex col-span-0 text-right" style={{ display: 'none' }}>Actions</div>
            </div>

            {/* Mobile sort controls */}
            <div className="flex lg:hidden items-center gap-2 px-4 py-2 border-b border-gray-50 bg-surface">
              <span className="text-xs text-gray-400 font-medium">Sort:</span>
              <select
                className="input-field text-xs py-1 flex-1"
                value={`${sortField}_${sortDir}`}
                onChange={e => {
                  const [f, d] = e.target.value.split('_');
                  setSortField(f);
                  setSortDir(d);
                  setPage(1);
                }}
              >
                <option value="joined_desc">Joined (Newest)</option>
                <option value="joined_asc">Joined (Oldest)</option>
                <option value="name_asc">Name (A–Z)</option>
                <option value="name_desc">Name (Z–A)</option>
                <option value="email_asc">Email (A–Z)</option>
                <option value="last_login_desc">Last Login (Recent)</option>
                <option value="last_login_asc">Last Login (Oldest)</option>
              </select>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {users.map(u => {
                const loginInfo = formatLastLogin(u.last_login);
                return (
                  <div key={u.id}
                    className="lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center flex flex-wrap gap-2 px-5 py-3.5 hover:bg-surface transition-colors">

                    {/* User — col-span-3 */}
                    <div className="flex items-center gap-2 col-span-3 flex-1 lg:flex-none min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-green-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials(fullName(u))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{fullName(u)}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="col-span-1 hidden lg:flex items-center">
                      <Badge preset="role" value={u.role} size="xs" />
                    </div>

                    {/* Stream */}
                    <div className="col-span-1 hidden lg:flex items-center">
                      {u.stream
                        ? <span className="text-xs text-gray-600 flex items-center gap-1">
                            {u.stream === 'natural_science' ? '🔬' : '📰'}
                            <span className="hidden xl:inline">{STREAM_LABELS[u.stream]}</span>
                          </span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </div>

                    {/* Verified */}
                    <div className="col-span-1 hidden lg:flex items-center">
                      {u.is_email_verified
                        ? <span className="inline-flex items-center gap-1 text-sage-600 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-sage-400 flex-shrink-0"/>
                            <span className="hidden xl:inline">Verified</span>
                          </span>
                        : <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0"/>
                            <span className="hidden xl:inline">Unverified</span>
                          </span>}
                    </div>

                    {/* Subscription */}
                    <div className="col-span-2 hidden lg:flex items-center gap-1 flex-wrap">
                      {u.subscription_status
                        ? <>
                            <Badge preset="subscription" value={u.subscription_status} size="xs" />
                            {u.expires_at && (() => {
                              const e = formatExpiry(u.expires_at);
                              return <span className={`text-[10px] font-medium ${
                                e.status === 'expired' || e.status === 'critical' ? 'text-red-500'
                                : e.status === 'warning' ? 'text-yellow-600' : 'text-gray-400'
                              }`}>{e.text}</span>;
                            })()}
                          </>
                        : <span className="text-xs text-gray-300">—</span>}
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex items-center">
                      <Badge color={u.is_active ? 'green' : 'red'} size="xs" dot>
                        {u.is_active ? 'Active' : 'Off'}
                      </Badge>
                    </div>

                    {/* Joined */}
                    <div className="col-span-1 hidden lg:flex items-center">
                      <span className="text-xs text-gray-400">{formatDate(u.created_at)}</span>
                    </div>

                    {/* Last Login — xl+ only in the table; shown in detail for all */}
                    <div className="col-span-1 hidden xl:flex items-center">
                      <span className={`text-xs ${loginInfo.muted ? 'text-gray-300' : 'text-gray-500'}`}>
                        {loginInfo.text}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 ml-auto lg:ml-0 col-span-1">
                      <button onClick={() => setDetailUser(u)} title="View Details"
                        className="p-1.5 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-all">
                        <IconEye />
                      </button>
                      <button onClick={() => requestToggle(u)}
                        title={u.is_active ? 'Disable account' : 'Enable account'}
                        className={`p-1.5 rounded-xl transition-all text-xs font-semibold px-2 ${
                          u.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-mint-light text-sage-600 hover:bg-sage-100'
                        }`}>
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => requestLogout(u)} title="Force logout"
                        className="p-1.5 rounded-xl hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-all">
                        <IconLogout />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Pagination currentPage={page} totalPages={pagination.totalPages}
            onPageChange={setPage} totalItems={pagination.total} itemsPerPage={20} />
        </>
      )}

      {/* USER DETAIL MODAL */}
      <UserDetailModal
        user={detailUser}
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
        isSuperAdmin={isSuperAdmin}
        onToggle={requestToggle}
        onForceLogout={requestLogout}
        onRoleChange={handleRoleChange}
        roleChanging={roleChanging}
        onDeleteRequest={requestDelete}
        onEmailVerifyRequest={requestEmailVerify}
      />

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={confirmConfig.onConfirm}
        loading={actioning}
        title={confirmConfig.title || ''}
        message={confirmConfig.message || ''}
        confirmLabel={confirmConfig.confirmLabel || 'Confirm'}
        variant={confirmConfig.variant || 'danger'}
      />
    </div>
  );
}
