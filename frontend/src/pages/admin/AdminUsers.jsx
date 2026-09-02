import React, { useEffect, useState, useCallback } from 'react';
import userService from '../../services/userService';
import { useToast } from '../../components/common/Toast';
import useDebounce  from '../../hooks/useDebounce';
import Button        from '../../components/common/Button';
import SearchBar     from '../../components/common/SearchBar';
import Badge         from '../../components/common/Badge';
import Pagination    from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState    from '../../components/common/EmptyState';
import { fullName, formatDate, snakeToTitle } from '../../utils/helpers';

export default function AdminUsers() {
  const toast = useToast();
  const [users,      setUsers]      = useState([]);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter,setActiveFilter] = useState('');
  const [confirmItem,  setConfirmItem]  = useState(null); // { type: 'toggle'|'logout', user }
  const [actioning,    setActioning]    = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(() => {
    setLoading(true);
    userService.getAllUsers({
      search:    debouncedSearch || undefined,
      role_id:   roleFilter     || undefined,
      is_active: activeFilter   !== '' ? activeFilter : undefined,
      page, limit: 20,
    })
      .then(res => { setUsers(res.data); setPagination(res.pagination); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, roleFilter, activeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => {
    setActioning(true);
    try {
      await userService.toggleUserStatus(confirmItem.user.id);
      toast.success('User status updated');
      setConfirmItem(null);
      load();
    } catch { toast.error('Failed'); }
    finally { setActioning(false); }
  };

  const handleForceLogout = async () => {
    setActioning(true);
    try {
      await userService.forceLogout(confirmItem.user.id);
      toast.success('User sessions terminated');
      setConfirmItem(null);
    } catch { toast.error('Failed'); }
    finally { setActioning(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-gray-800">Users</h2>
        <p className="text-sm text-gray-400 mt-0.5">{pagination.total?.toLocaleString() || 0} total accounts</p>
      </div>

      {/* Filters */}
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
        {(search || roleFilter || activeFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); setActiveFilter(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : users.length === 0 ? (
        <EmptyState preset="users" />
      ) : (
        <>
          <div className="soft-card overflow-hidden">
            {/* Header */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-surface border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-3">User</div>
              <div className="col-span-2">Email</div>
              <div>Role</div>
              <div>Subscription</div>
              <div>Status</div>
              <div>Joined</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface transition-colors">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-green-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {fullName(u).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{fullName(u)}</p>
                      <p className="text-xs text-gray-400 truncate hidden lg:block">{u.email}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge preset="role"         value={u.role} size="xs" />
                    {u.subscription_status && (
                      <Badge preset="subscription" value={u.subscription_status} size="xs" />
                    )}
                    <Badge color={u.is_active ? 'green' : 'red'} size="xs" dot>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-gray-400 flex-shrink-0 hidden md:block">
                    {formatDate(u.created_at)}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setConfirmItem({ type: 'toggle', user: u })}
                      title={u.is_active ? 'Deactivate' : 'Activate'}
                      className={`p-1.5 rounded-xl transition-all text-xs font-semibold px-2 ${u.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-mint-light text-sage-600 hover:bg-sage-100'}`}>
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => setConfirmItem({ type: 'logout', user: u })}
                      title="Force logout" className="p-1.5 rounded-xl hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Pagination currentPage={page} totalPages={pagination.totalPages}
            onPageChange={setPage} totalItems={pagination.total} itemsPerPage={20} />
        </>
      )}

      <ConfirmDialog
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={confirmItem?.type === 'toggle' ? handleToggle : handleForceLogout}
        loading={actioning}
        title={confirmItem?.type === 'toggle'
          ? `${confirmItem?.user?.is_active ? 'Disable' : 'Enable'} Account`
          : 'Force Logout'}
        message={confirmItem?.type === 'toggle'
          ? `This will ${confirmItem?.user?.is_active ? 'prevent' : 'allow'} ${fullName(confirmItem?.user)} from accessing the platform.`
          : `All active sessions for ${fullName(confirmItem?.user)} will be terminated immediately.`}
        confirmLabel={confirmItem?.type === 'toggle'
          ? (confirmItem?.user?.is_active ? 'Disable' : 'Enable')
          : 'Force Logout'}
        variant={confirmItem?.type === 'toggle' && confirmItem?.user?.is_active ? 'danger' : 'warning'}
      />
    </div>
  );
}
