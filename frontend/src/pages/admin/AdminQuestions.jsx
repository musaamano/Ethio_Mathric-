/**
 * AdminQuestions.jsx
 * Question list with category (practice / past_year) and year filters.
 * Category is derived from questions.year: NULL = Practice, NOT NULL = Past Year.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import questionService from '../../services/questionService';
import subjectService  from '../../services/subjectService';
import { useToast }    from '../../components/common/Toast';
import useDebounce     from '../../hooks/useDebounce';
import Button          from '../../components/common/Button';
import SearchBar       from '../../components/common/SearchBar';
import Badge           from '../../components/common/Badge';
import Pagination      from '../../components/common/Pagination';
import ConfirmDialog   from '../../components/common/ConfirmDialog';
import LoadingSpinner  from '../../components/common/LoadingSpinner';
import EmptyState      from '../../components/common/EmptyState';
import { formatDifficulty } from '../../utils/helpers';

// Derive category label from year value
function categoryLabel(year) {
  return year ? `Past Year ${year}` : 'Practice';
}
function categoryBadgeClass(year) {
  return year
    ? 'bg-blue-50 text-blue-600 border border-blue-100'
    : 'bg-mint-light text-sage-700 border border-mint-dark/20';
}

export default function AdminQuestions() {
  const toast    = useToast();
  const navigate = useNavigate();

  const [questions,   setQuestions]   = useState([]);
  const [subjects,    setSubjects]    = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [pagination,  setPagination]  = useState({});
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [deleteItem,  setDeleteItem]  = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  // Filters
  const [search,      setSearch]      = useState('');
  const [subjectF,    setSubjectF]    = useState('');
  const [categoryF,   setCategoryF]   = useState('');   // '' | 'practice' | 'past_year'
  const [yearF,       setYearF]       = useState('');
  const [difficultyF, setDifficultyF] = useState('');
  const [typeF,       setTypeF]       = useState('');
  const debouncedSearch = useDebounce(search, 400);

  // Load subjects once
  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  // Load available years (for year filter dropdown)
  useEffect(() => {
    questionService.getAvailableYears({})
      .then(years => setYearOptions(Array.isArray(years) ? years : []))
      .catch(() => {});
  }, []);

  // Clear year filter when switching away from past_year
  useEffect(() => {
    if (categoryF !== 'past_year') setYearF('');
  }, [categoryF]);

  const load = useCallback(() => {
    setLoading(true);
    questionService.getQuestions({
      search:     debouncedSearch || undefined,
      subject_id: subjectF        || undefined,
      category:   categoryF       || undefined,
      year:       yearF           || undefined,
      difficulty: difficultyF     || undefined,
      type:       typeF           || undefined,
      page,
      limit: 20,
    })
      .then(res => { setQuestions(res.data); setPagination(res.pagination); })
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, subjectF, categoryF, yearF, difficultyF, typeF, page]);

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

  const clearFilters = () => {
    setSearch(''); setSubjectF(''); setCategoryF('');
    setYearF(''); setDifficultyF(''); setTypeF(''); setPage(1);
  };
  const hasFilters = search || subjectF || categoryF || yearF || difficultyF || typeF;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-gray-800">Questions</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {pagination.total?.toLocaleString() || 0} total questions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/questions/import-ai"
            className="btn-primary text-sm py-2.5 px-4 flex items-center gap-1.5">
            🤖 AI Import
          </Link>
          <Link to="/admin/questions/import"
            className="btn-outline text-sm py-2.5 px-4">
            📥 Excel Import
          </Link>
          <Link to="/admin/questions/new"
            className="btn-primary text-sm py-2.5 px-4">
            + Add Question
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="soft-card p-4 flex flex-wrap gap-3 items-center">
        <SearchBar
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search questions..."
          className="flex-1 min-w-[200px]"
          loading={loading}
        />

        {/* Subject */}
        <select className="input-field text-sm w-auto min-w-[150px]"
          value={subjectF} onChange={e => { setSubjectF(e.target.value); setPage(1); }}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Category */}
        <select className="input-field text-sm w-auto min-w-[150px]"
          value={categoryF} onChange={e => { setCategoryF(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          <option value="practice">Practice</option>
          <option value="past_year">Past Year</option>
        </select>

        {/* Year — only useful / shown for past_year or no filter */}
        {(categoryF === 'past_year' || categoryF === '') && yearOptions.length > 0 && (
          <select className="input-field text-sm w-auto min-w-[120px]"
            value={yearF} onChange={e => { setYearF(e.target.value); setPage(1); }}>
            <option value="">All Years</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}

        {/* Difficulty */}
        <select className="input-field text-sm w-auto"
          value={difficultyF} onChange={e => { setDifficultyF(e.target.value); setPage(1); }}>
          <option value="">All Levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {/* Type */}
        <select className="input-field text-sm w-auto"
          value={typeF} onChange={e => { setTypeF(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="multiple_choice">MCQ</option>
          <option value="true_false">True/False</option>
          <option value="fill_blank">Fill Blank</option>
          <option value="image_based">Image</option>
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
        )}
      </div>

      {/* ── List ── */}
      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : questions.length === 0 ? (
        <EmptyState preset="questions"
          action={{ label: 'Add Question', href: '/admin/questions/new' }} />
      ) : (
        <>
          <div className="soft-card overflow-hidden">
            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-surface
              border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-4">Question</div>
              <div className="col-span-2">Subject</div>
              <div className="col-span-2">Category</div>
              <div>Difficulty</div>
              <div>Type</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-50">
              {questions.map(q => {
                const diff = formatDifficulty(q.difficulty);
                const catLabel = q.year ? `Past Year ${q.year}` : 'Practice';
                const catClass = categoryBadgeClass(q.year);

                return (
                  <div key={q.id}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-surface transition-colors">

                    {/* ID + free badge */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
                      <span className="text-xs text-gray-300 font-mono">#{q.id}</span>
                      {q.is_free && (
                        <span className="text-[9px] font-bold text-sage-600 bg-mint-light px-1 rounded">
                          FREE
                        </span>
                      )}
                    </div>

                    {/* Question text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 line-clamp-2">{q.question_text}</p>
                      {/* Subject (mobile) */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap lg:hidden">
                        {q.subject_name && (
                          <span className="text-xs text-gray-400">{q.subject_name}</span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catClass}`}>
                          {catLabel}
                        </span>
                      </div>
                    </div>

                    {/* Subject (desktop) */}
                    <div className="hidden lg:block w-28 flex-shrink-0 text-xs text-gray-500 truncate">
                      {q.subject_name || '—'}
                    </div>

                    {/* Category badge (desktop) */}
                    <div className="hidden lg:block w-32 flex-shrink-0">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${catClass}`}>
                        {catLabel}
                      </span>
                    </div>

                    {/* Difficulty + Type badges */}
                    <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                      <Badge preset="difficulty" value={q.difficulty} />
                      <Badge preset="qtype"      value={q.type} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Link to={`/admin/questions/${q.id}/edit`}
                        className="p-1.5 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-all"
                        title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </Link>
                      <button onClick={() => setDeleteItem(q)}
                        className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                        title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
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
    </div>
  );
}
