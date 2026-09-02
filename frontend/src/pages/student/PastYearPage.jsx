/**
 * PastYearPage.jsx — Phase 3
 *
 * Workflow:
 *   /dashboard/past-year
 *     → Step 1: Year picker  (years that have questions for this student's stream)
 *     → Step 2: Subject picker (subjects in student's stream for the chosen year)
 *     → Navigate to /dashboard/practice?subject_id=X&year=Y&mode=past_year&count=100
 *
 * The actual question session reuses PracticePage entirely — no duplication.
 * Student stream is read from auth context — never shown as a selector.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import questionService from '../../services/questionService';
import subjectService from '../../services/subjectService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { snakeToTitle } from '../../utils/helpers';

// ── Subject icon map (same as SubjectsPage) ──────────────────
const SUBJECT_ICONS = {
  'math-natural':    '📐',
  'math-social':     '📐',
  'physics':         '⚛️',
  'chemistry':       '🧪',
  'biology':         '🧬',
  'english-natural': '📖',
  'english-social':  '📖',
  'ict':             '💻',
  'economics':       '📊',
  'history':         '🏛️',
  'geography':       '🌍',
  'citizenship':     '⚖️',
};

// ── Breadcrumb ───────────────────────────────────────────────
function Breadcrumb({ year, onReset, onBackToYears }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <button
        onClick={onReset}
        className="hover:text-primary-600 transition-colors font-medium"
      >
        Past-Year Questions
      </button>
      {year && (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
          </svg>
          <button
            onClick={onBackToYears}
            className="hover:text-primary-600 transition-colors font-medium"
          >
            {year}
          </button>
        </>
      )}
    </div>
  );
}

// ── Year card ────────────────────────────────────────────────
function YearCard({ year, onSelect }) {
  return (
    <button
      onClick={() => onSelect(year)}
      className="
        w-full soft-card p-5 group text-center
        hover:shadow-card-hover hover:-translate-y-1
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
      "
    >
      <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3
        group-hover:bg-green-gradient group-hover:shadow-glow-green transition-all duration-200">
        <span className="text-xl group-hover:hidden">📅</span>
        <svg className="w-5 h-5 text-white hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
        </svg>
      </div>
      <p className="font-display font-extrabold text-2xl text-primary-700 group-hover:text-primary-600">
        {year}
      </p>
      <p className="text-xs text-gray-400 mt-1">Ethiopian Exam</p>
    </button>
  );
}

// ── Subject card ─────────────────────────────────────────────
function SubjectCard({ subject, year, onSelect }) {
  const icon  = SUBJECT_ICONS[subject.slug] || '📘';
  const color = subject.color || '#52B788';

  return (
    <button
      onClick={() => onSelect(subject)}
      className="
        w-full text-left soft-card p-5 group
        hover:shadow-card-hover hover:-translate-y-1
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
      "
    >
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0
            shadow-soft group-hover:scale-110 transition-transform"
          style={{ backgroundColor: color + '20' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-primary-700 truncate">{subject.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{year} Past-Year Questions</p>
        </div>
        <svg
          className="w-4 h-4 text-gray-300 group-hover:text-primary-400 group-hover:translate-x-1
            transition-all flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-gray-400 group-hover:text-primary-500 transition-colors">
          Tap to start practice
        </span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function PastYearPage() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const toast        = useToast();

  // step: 'years' | 'subjects'
  const [step,          setStep]     = useState('years');
  const [selectedYear,  setYear]     = useState(null);

  const [years,         setYears]    = useState([]);
  const [subjects,      setSubjects] = useState([]);   // all subjects for student's stream
  const [filteredSubs,  setFiltered] = useState([]);   // subjects that have questions for selected year

  const [loadingYears,  setLoadingYears]    = useState(true);
  const [loadingSubs,   setLoadingSubs]     = useState(false);

  // ── 1. Load stream subjects + available years on mount ────
  useEffect(() => {
    const loadInitial = async () => {
      try {
        // Get all streams to find this student's stream subjects
        const streams = await subjectService.getStreams();
        const userStream = user?.stream;

        let streamSubjects = [];
        if (userStream && streams?.length) {
          const matched = streams.find(s => {
            const slug = s.slug?.replace(/-/g, '_');
            const name = s.name?.toLowerCase().replace(/\s+/g, '_');
            return slug === userStream || name === userStream;
          });
          streamSubjects = matched?.subjects || streams[0]?.subjects || [];
        } else if (streams?.length) {
          streamSubjects = streams[0]?.subjects || [];
        }

        setSubjects(streamSubjects);

        // Fetch years, filtered to this stream's subject IDs
        const subjectIds = streamSubjects.map(s => s.id).join(',');
        const yearsData  = await questionService.getAvailableYears(
          subjectIds ? { subject_ids: subjectIds } : {}
        );
        setYears(Array.isArray(yearsData) ? yearsData : []);
      } catch (err) {
        toast.error('Failed to load past-year data');
      } finally {
        setLoadingYears(false);
      }
    };

    loadInitial();
  }, [user?.stream]);

  // ── 2. When a year is selected, find subjects with questions ─
  const handleYearSelect = useCallback(async (year) => {
    setLoadingSubs(true);
    setYear(year);

    try {
      // Fetch years per subject to find which subjects have questions for this year
      const checks = await Promise.all(
        subjects.map(async (s) => {
          const years = await questionService.getAvailableYears({
            subject_ids: String(s.id),
          });
          return { subject: s, hasYear: Array.isArray(years) && years.includes(year) };
        })
      );
      const withQuestions = checks.filter(c => c.hasYear).map(c => c.subject);
      setFiltered(withQuestions);
    } catch {
      // Fallback: show all stream subjects if check fails
      setFiltered(subjects);
      toast.warning('Could not verify subject availability — showing all subjects.');
    } finally {
      setLoadingSubs(false);
      setStep('subjects');
    }
  }, [subjects]);

  // ── 3. Subject selected → navigate to PracticePage ────────
  const handleSubjectSelect = (subject) => {
    // PracticePage already handles year param — reuses all question/answer logic
    navigate(
      `/dashboard/practice?subject_id=${subject.id}&year=${selectedYear}&mode=past_year&count=100`
    );
  };

  // ── Helpers ───────────────────────────────────────────────
  const handleReset     = () => { setStep('years'); setYear(null); };
  const handleBackYears = () => { setStep('years'); };

  const streamLabel = () => {
    if (!user?.stream) return '';
    if (user.stream === 'natural_science') return '🔬 Natural Science';
    if (user.stream === 'social_science')  return '📰 Social Science';
    return snakeToTitle(user.stream);
  };

  // ── Render: loading initial data ─────────────────────────
  if (loadingYears) return <LoadingSpinner variant="page" text="Loading past-year data..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Page header ────────────────────────────────────── */}
      <div>
        {/* Breadcrumb */}
        <Breadcrumb
          year={step === 'subjects' ? selectedYear : null}
          onReset={handleReset}
          onBackToYears={handleBackYears}
        />

        <h2 className="font-display font-extrabold text-2xl text-primary-700 mt-2">
          {step === 'years' ? 'Past-Year Questions' : `${selectedYear} Past-Year Questions`}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {step === 'years'
            ? 'Practice questions from previous Ethiopian examinations.'
            : 'Choose a subject to start practicing.'
          }
        </p>

        {/* Stream badge — read only, never a selector */}
        {user?.stream && (
          <div className="inline-flex items-center gap-2 mt-3 bg-primary-50 border border-primary-100
            rounded-xl px-3 py-1.5">
            <span className="text-sm">{user.stream === 'natural_science' ? '🔬' : '📰'}</span>
            <span className="text-xs font-semibold text-primary-600">
              {user.stream === 'natural_science' ? 'Natural Science' : 'Social Science'}
            </span>
          </div>
        )}
      </div>

      {/* ── Step 1: Year picker ─────────────────────────────── */}
      {step === 'years' && (
        <>
          {years.length === 0 ? (
            <EmptyState
              preset="empty"
              message="No past-year questions are available yet. Check back later or ask your administrator to import past-year questions."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {years.map(year => (
                <YearCard key={year} year={year} onSelect={handleYearSelect} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Step 2: Subject picker ──────────────────────────── */}
      {step === 'subjects' && (
        <>
          {/* Back button */}
          <button
            onClick={handleBackYears}
            className="flex items-center gap-2 text-sm font-semibold text-gray-400
              hover:text-primary-600 transition-colors -mt-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
            </svg>
            Back to years
          </button>

          {loadingSubs ? (
            <LoadingSpinner variant="dots" text="Loading subjects..." className="py-12" />
          ) : filteredSubs.length === 0 ? (
            <div className="soft-card p-8 text-center space-y-3">
              <p className="text-4xl">📭</p>
              <p className="font-display font-bold text-primary-700">
                No subjects found for {selectedYear}
              </p>
              <p className="text-gray-400 text-sm">
                No past-year questions have been added for {selectedYear} yet.
              </p>
              <button
                onClick={handleBackYears}
                className="text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors"
              >
                Try a different year
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredSubs.map(s => (
                <SubjectCard
                  key={s.id}
                  subject={s}
                  year={selectedYear}
                  onSelect={handleSubjectSelect}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
