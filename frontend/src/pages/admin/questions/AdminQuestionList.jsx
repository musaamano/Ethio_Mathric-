/**
 * AdminQuestionList.jsx
 * Question list scoped to a fixed category + stream + subject (+ year for past_year).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import questionService from '../../../services/questionService';
import { useToast } from '../../../components/common/Toast';
import useDebounce from '../../../hooks/useDebounce';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import Badge from '../../../components/common/Badge';
import Pagination from '../../../components/common/Pagination';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

function categoryBadgeClass(year) {
  return year
    ? 'bg-blue-50 text-blue-600 border border-blue-100'
    : 'bg-mint-light text-sage-700 border border-mint-dark/20';
}

export default function AdminQuestionList({
  category,
  stream,
  subject,
  year = null,
  breadcrumbs = [],
}) {
  const toast = useToast();

  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [difficultyF, setDifficultyF] = useState('');
  const [typeF, setTypeF] = useState('');
  const [statusF, setStatusF] = useState('');
  const [reactivateItem, setReactivateItem] = useState(null);
  const [reactivating, setReactivating] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const categoryLabel = category === 'past_year' ? 'Past Year Questions' : 'Practice Questions';

  const listPath = category === 'past_year'
    ? `/admin/questions/past-year/${stream.slug}/${year}/${subject.id}`
    : `/admin/questions/practice/${stream.slug}/${subject.id}`;

  const addQuestionPath = `/admin/questions/new?${new URLSearchParams({
    subject_id: String(subject.id),
    category,
    ...(category === 'past_year' && year ? { year: String(year) } : {}),
    return: listPath,
  }).toString()}`;

  const load = useCallback(() => {
    setLoading(true);
    questionService.getQuestions({
      search: debouncedSearch || undefined,
      subject_id: subject.id,
      category,
      year: category === 'past_year' ? year : undefined,
      difficulty: difficultyF || undefined,
      type: typeF || undefined,
      is_active: statusF || undefined,
      page,
      limit: 20,
    })
      .then(res => { setQuestions(res.data); setPagination(res.pagination); })
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, subject.id, category, year, difficultyF, typeF, statusF, page, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await questionService.deleteQuestion(deleteItem.id);
      toast.success('Question deactivated');
      setDeleteItem(null);
      load();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await questionService.toggleQuestionStatus(reactivateItem.id);
      toast.success('Question reactivated');
      setReactivateItem(null);
      load();
    } catch {
      toast.error('Failed to reactivate');
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.label}>
            {i > 0 && (
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            )}
            {crumb.to ? (
              <Link to={crumb.to} className="hover:text-primary-600 font-medium transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-600 font-semibold">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="soft-card p-5 space-y-2">
        <h2 className="font-display font-extrabold text-2xl text-gray-800">Question Management</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-semibold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            {stream.name}
          </span>
          <span className="font-semibold text-sage-700 bg-mint-light px-3 py-1 rounded-full">
            {subject.name}
          </span>
          <span className={`font-semibold px-3 py-1 rounded-full ${
            category === 'past_year'
              ? 'text-blue-600 bg-blue-50'
              : 'text-sage-700 bg-mint-light'
          }`}>
            {categoryLabel}
          </span>
          {category === 'past_year' && year && (
            <span className="font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {year}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Total Questions: <strong>{pagination.total?.toLocaleString() ?? '—'}</strong>
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/questions/import-ai" className="btn-primary text-sm py-2.5 px-4 flex items-center gap-1.5">
            🤖 AI Import
          </Link>
          <Link to="/admin/questions/import" className="btn-outline text-sm py-2.5 px-4">
            📥 Excel Import
          </Link>
          <Link to={addQuestionPath} className="btn-primary text-sm py-2.5 px-4">
            + Add Question
          </Link>
        </div>
      </div>

      <div className="soft-card p-4 flex flex-wrap gap-3 items-center">
        <SearchBar
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search questions..."
          className="flex-1 min-w-[200px]"
          loading={loading}
        />
        <select
          className="input-field text-sm w-auto"
          value={statusF}
          onChange={e => { setStatusF(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          className="input-field text-sm w-auto"
          value={difficultyF}
          onChange={e => { setDifficultyF(e.target.value); setPage(1); }}
        >
          <option value="">All Levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          className="input-field text-sm w-auto"
          value={typeF}
          onChange={e => { setTypeF(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="multiple_choice">MCQ</option>
          <option value="true_false">True/False</option>
          <option value="fill_blank">Fill Blank</option>
          <option value="image_based">Image</option>
        </select>
        {(search || difficultyF || typeF || statusF) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDifficultyF(''); setTypeF(''); setStatusF(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : questions.length === 0 ? (
        <EmptyState
          preset="questions"
          message={`No ${category === 'past_year' ? `${year} past-year` : 'practice'} questions found for ${subject.name}.`}
          action={{ label: 'Add Question', href: addQuestionPath }}
        />
      ) : (
        <>
          <div className="soft-card overflow-hidden">
            <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-surface
              border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-5">Question</div>
              <div className="col-span-2">Category</div>
              <div>Difficulty</div>
              <div>Type</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-50">
              {questions.map(q => {
                const catLabel = q.year ? `Past Year ${q.year}` : 'Practice';
                const catClass = categoryBadgeClass(q.year);
                const isInactive = !q.is_active;
                return (
                  <div key={q.id} className="flex items-start gap-3 px-5 py-4 hover:bg-surface transition-colors">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
                      <span className="text-xs text-gray-300 font-mono">#{q.id}</span>
                      {q.is_free && (
                        <span className="text-[9px] font-bold text-sage-600 bg-mint-light px-1 rounded">FREE</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 line-clamp-2">{q.question_text}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap lg:hidden">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catClass}`}>
                          {catLabel}
                        </span>
                        <Badge color={isInactive ? 'red' : 'green'} size="xs" dot>
                          {isInactive ? 'Inactive' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                    <div className="hidden lg:block w-32 flex-shrink-0">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${catClass}`}>
                        {catLabel}
                      </span>
                    </div>
                    <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                      <Badge preset="difficulty" value={q.difficulty} />
                      <Badge preset="qtype" value={q.type} />
                      <Badge color={isInactive ? 'red' : 'green'} size="xs" dot>
                        {isInactive ? 'Inactive' : 'Active'}
                      </Badge>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 ml-auto">
                      <Link
                        to={`/admin/questions/${q.id}/edit?return=${encodeURIComponent(listPath)}&is_active=${isInactive ? 'false' : 'true'}`}
                        className="p-1.5 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-all"
                        title="View / Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </Link>
                      <Link
                        to={`/admin/questions/${q.id}/edit?return=${encodeURIComponent(listPath)}&is_active=${isInactive ? 'false' : 'true'}`}
                        className="p-1.5 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-all"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </Link>
                      {isInactive ? (
                        <button
                          onClick={() => setReactivateItem(q)}
                          className="p-1.5 rounded-xl hover:bg-mint-light text-gray-400 hover:text-sage-600 transition-all"
                          title="Reactivate"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteItem(q)}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            totalItems={pagination.total}
            itemsPerPage={20}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Question"
        message="This question will be hidden from students. This action is reversible from the database."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!reactivateItem}
        onClose={() => setReactivateItem(null)}
        onConfirm={handleReactivate}
        loading={reactivating}
        title="Reactivate Question"
        message="Reactivate this question? It will become available to students again."
        confirmLabel="Reactivate"
        variant="warning"
      />
    </div>
  );
}
