/**
 * AdminImportLogs.jsx
 * Shows history of all AI import jobs with status and report download.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import importService from '../../services/importService';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, formatCurrency } from '../../utils/helpers';

const STATUS_COLOR = { processing: 'yellow', completed: 'green', failed: 'red' };

export default function AdminImportLogs() {
  const [logs,       setLogs]       = useState([]);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    importService.getLogs({ page, limit: 20 })
      .then(res => { setLogs(res.data || []); setPagination(res.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-gray-800">Import History</h2>
          <p className="text-sm text-gray-400 mt-0.5">All AI import jobs and their results.</p>
        </div>
        <Link to="/admin/questions/import-ai" className="btn-primary text-sm px-5 py-2.5">
          🤖 New AI Import
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : logs.length === 0 ? (
        <EmptyState icon="📥" title="No imports yet"
          message="Start your first AI import to see history here."
          action={{ label: '🤖 Start AI Import', href: '/admin/questions/import-ai' }} />
      ) : (
        <>
          <div className="soft-card overflow-hidden">
            <div className="hidden md:grid grid-cols-8 gap-4 px-5 py-3 bg-surface border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">File</div>
              <div className="text-center">Found</div>
              <div className="text-center">Imported</div>
              <div className="text-center">Duplicates</div>
              <div className="text-center">Failed</div>
              <div>Status</div>
              <div>Date</div>
            </div>

            <div className="divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-surface transition-colors">
                  {/* File name */}
                  <div className="flex-1 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {log.file_type === 'pdf'  ? '📄' :
                         log.file_type === 'xlsx' ? '📊' :
                         log.file_type === 'csv'  ? '📋' : '📝'}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 truncate max-w-[180px]" title={log.file_name}>
                          {log.file_name}
                        </p>
                        <p className="text-xs text-gray-400">{log.file_size_kb} KB · .{log.file_type}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-600">{log.total_found || 0}</p>
                      <p className="text-[10px] text-gray-400">Found</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-sage-600">{log.total_imported || 0}</p>
                      <p className="text-[10px] text-gray-400">Imported</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-yellow-600">{log.total_duplicates || 0}</p>
                      <p className="text-[10px] text-gray-400">Dupes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-red-500">{log.total_errors || 0}</p>
                      <p className="text-[10px] text-gray-400">Failed</p>
                    </div>
                  </div>

                  {/* Status + Date */}
                  <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                    <Badge color={STATUS_COLOR[log.status] || 'gray'} size="xs" dot>
                      {log.status}
                    </Badge>
                    <span className="text-xs text-gray-400">{formatDate(log.started_at, 'short')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Pagination currentPage={page} totalPages={pagination.totalPages}
            onPageChange={setPage} totalItems={pagination.total} itemsPerPage={20} />
        </>
      )}
    </div>
  );
}
