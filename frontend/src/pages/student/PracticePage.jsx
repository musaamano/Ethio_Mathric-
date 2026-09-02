/**
 * PracticePage.jsx — Stream → Subject → Question
 * chapter_id, topic, mock_exam, daily_quiz removed.
 * Modes: practice | past_year | random
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import questionService from '../../services/questionService';
import { useToast }    from '../../components/common/Toast';
import useTimer        from '../../hooks/useTimer';
import SubjectPicker   from './SubjectsPage';
import QuestionCard    from '../../components/questions/QuestionCard';
import OptionButton    from '../../components/questions/OptionButton';
import ExplanationBox  from '../../components/questions/ExplanationBox';
import BookmarkButton  from '../../components/questions/BookmarkButton';
import ReportModal     from '../../components/questions/ReportModal';
import TimerBar        from '../../components/questions/TimerBar';
import LoadingSpinner  from '../../components/common/LoadingSpinner';
import Button          from '../../components/common/Button';
import { formatScore, formatDuration } from '../../utils/helpers';

const SECS_PER_Q  = 90;
const SESSION_KEY = 'ema_practice_session';
const norm = (s) => (s ? s.toString().trim().toUpperCase() : '');

// ── Header bar ────────────────────────────────────────────────
function HeaderBar({ currentIdx, total, correct, wrong, timer }) {
  const accuracy = currentIdx > 0 ? Math.round((correct / (correct + wrong || 1)) * 100) : 0;
  return (
    <div className="soft-card p-4 space-y-3">
      <div className="flex items-center justify-between text-xs font-medium text-gray-500 flex-wrap gap-2">
        <span>Question <span className="font-bold text-primary-600">{currentIdx + 1}</span> of {total}</span>
        <div className="flex items-center gap-4">
          <span className="text-sage-600">✓ {correct}</span>
          <span className="text-red-500">✗ {wrong}</span>
          <span className="text-gray-400">{accuracy}% accuracy</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-gradient rounded-full transition-all duration-500"
          style={{ width: `${(currentIdx / total) * 100}%` }} />
      </div>
      <TimerBar formatted={timer.formatted} percentLeft={timer.percentLeft} isExpired={timer.isExpired} />
    </div>
  );
}

// ── Finish screen ─────────────────────────────────────────────
function FinishScreen({ result, timeTaken, onReset }) {
  const navigate = useNavigate();
  const score = formatScore(result.score_percent);
  return (
    <div className="max-w-2xl mx-auto space-y-5 py-6">
      <div className="soft-card p-8 text-center">
        <div className="text-6xl mb-4">
          {result.score_percent >= 80 ? '🎉' : result.score_percent >= 60 ? '👍' : '💪'}
        </div>
        <h2 className="font-display font-extrabold text-3xl text-primary-700 mb-1">Practice Complete!</h2>
        <div className={`text-5xl font-extrabold font-display my-4 ${score.color}`}>{score.text}</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Correct',  value: result.correct,          color: 'bg-mint-light text-sage-700'  },
            { label: 'Wrong',    value: result.wrong,            color: 'bg-red-50 text-red-600'       },
            { label: 'Skipped',  value: result.skipped,          color: 'bg-gray-100 text-gray-500'   },
            { label: 'Time',     value: formatDuration(timeTaken), color: 'bg-blue-50 text-blue-600'  },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-3`}>
              <div className="font-display font-bold text-xl">{s.value}</div>
              <div className="text-xs font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Button fullWidth onClick={onReset}>Practice Again ⚡</Button>
        <Button fullWidth variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast    = useToast();

  const subject_id = searchParams.get('subject_id');
  const year       = searchParams.get('year');
  const rawMode    = searchParams.get('mode') || 'practice';
  // Normalise to valid backend modes only
  const VALID_MODES = new Set(['practice', 'past_year', 'random']);
  const mode = VALID_MODES.has(rawMode) ? rawMode : 'practice';
  const count = Math.min(100, Math.max(1, parseInt(searchParams.get('count') || '20')));

  // ── ALL hooks must be called unconditionally — no early return before this line ──
  const [questions,  setQuestions]  = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished,   setFinished]   = useState(false);
  const [result,     setResult]     = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [answers,    setAnswers]    = useState({});

  const startTimeRef  = useRef(Date.now());
  const submitAllRef  = useRef(null);

  const handleTimerExpire = useCallback(() => {
    toast.warning('⏰ Time is up! Submitting…');
    setTimeout(() => submitAllRef.current?.(), 800);
  }, []);

  const totalSecs = count * SECS_PER_Q;
  const timer = useTimer(totalSecs, handleTimerExpire);

  const SESSION_ID = `${subject_id}_${year || ''}_${count}_${mode}`;

  const saveSession = useCallback((qs, ans, idx) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId: SESSION_ID, questions: qs, answers: ans,
        currentIdx: idx, startTime: startTimeRef.current,
      }));
    } catch { /* full */ }
  }, [SESSION_ID]);

  const clearSession = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch {} };

  useEffect(() => {
    // Guard: do nothing if subject_id is absent — SubjectPicker is shown instead.
    if (!subject_id) return;

    setLoading(true); setLoadError(null);
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (saved?.sessionId === SESSION_ID && saved.questions?.length) {
        setQuestions(saved.questions);
        setAnswers(saved.answers || {});
        setCurrentIdx(saved.currentIdx || 0);
        startTimeRef.current = saved.startTime || Date.now();
        setLoading(false);
        toast.info('Session restored.');
        return;
      }
    } catch {}

    const params = { subject_id, mode, count };
    if (year) params.year = year;

    questionService.getPracticeQuestions(params)
      .then(qs => {
        if (!qs?.length) { setLoadError('No questions found for this subject.'); return; }
        setQuestions(qs);
        startTimeRef.current = Date.now();
        saveSession(qs, {}, 0);
      })
      .catch(err => {
        const msg = err?.response?.data?.message || 'Failed to load questions.';
        setLoadError(msg); toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [subject_id, year, mode, count]);

  const question      = questions[currentIdx];
  const totalQ        = questions.length;
  const questionState = question ? (answers[question.id] || null) : null;
  const isAnswered    = !!questionState;
  const isRead        = !isAnswered ? false : (!question?.explanation || questionState.isRead);

  const { correct, wrong } = useMemo(() => {
    let c = 0, w = 0;
    Object.values(answers).forEach(a => { if (a.selected) { if (a.isCorrect) c++; else w++; } });
    return { correct: c, wrong: w };
  }, [answers]);

  const selectAnswer = useCallback((optionLabel) => {
    if (!question || isAnswered) return;
    const selected   = norm(optionLabel);
    const correctAns = norm(question.correct_answer);
    const newAnswers = {
      ...answers,
      [question.id]: { selected, correct: correctAns, isCorrect: selected === correctAns, isRead: !question.explanation },
    };
    setAnswers(newAnswers);
    saveSession(questions, newAnswers, currentIdx);
  }, [question, isAnswered, answers, questions, currentIdx, saveSession]);

  const markRead = useCallback(() => {
    if (!question) return;
    const newAnswers = { ...answers, [question.id]: { ...answers[question.id], isRead: true } };
    setAnswers(newAnswers);
    saveSession(questions, newAnswers, currentIdx);
  }, [question, answers, questions, currentIdx, saveSession]);

  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= totalQ) return;
    setCurrentIdx(idx);
    saveSession(questions, answers, idx);
  }, [totalQ, questions, answers, saveSession]);

  const submitAll = async () => {
    if (submitting || finished) return;
    setSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      const res = await questionService.submitAnswers({
        answers: questions.map(q => ({ question_id: q.id, selected_option: answers[q.id]?.selected || null })),
        subject_id, mode, time_taken_secs: timeTaken,
      });
      setResult({ ...res, time_taken_secs: timeTaken });
      setFinished(true);
      clearSession();
      toast.success(`✅ Score: ${res.score_percent}%`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit.');
    } finally { setSubmitting(false); }
  };
  submitAllRef.current = submitAll;

  const getOptionState = useCallback((optionLabel) => {
    if (!isAnswered) return 'idle';
    const label = norm(optionLabel);
    if (label === questionState.correct) return 'correct';
    if (label === questionState.selected) return 'wrong';
    return 'idle';
  }, [isAnswered, questionState]);

  const handleReset = () => {
    clearSession(); setQuestions([]); setAnswers({});
    setCurrentIdx(0); setFinished(false); setResult(null);
    setLoading(true); setLoadError(null); timer.reset(totalSecs);
    const params = { subject_id, mode, count };
    if (year) params.year = year;
    questionService.getPracticeQuestions(params)
      .then(qs => { setQuestions(qs); startTimeRef.current = Date.now(); saveSession(qs, {}, 0); })
      .catch(() => toast.error('Failed to reload questions'))
      .finally(() => setLoading(false));
  };

  // ── Conditional renders — ALL hooks have been called above this line ──

  // No subject selected: show subject picker
  if (!subject_id) return <SubjectPicker />;

  if (loading) return <LoadingSpinner variant="page" text="Loading questions..." />;

  if (loadError) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-3xl">❌</div>
      <h2 className="font-display font-bold text-xl text-red-600">Could not load questions</h2>
      <p className="text-gray-500 text-sm max-w-sm">{loadError}</p>
      <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
    </div>
  );

  if (!questions.length) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="text-5xl">📭</div>
      <h2 className="font-display font-bold text-xl text-primary-700">No questions available</h2>
      <p className="text-gray-400 text-sm">No questions found for this subject. Try subscribing for full access.</p>
      <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
    </div>
  );

  if (finished && result) return <FinishScreen result={result} timeTaken={result.time_taken_secs} onReset={handleReset} />;

  const answeredCount = Object.keys(answers).length;
  const canFinish     = currentIdx === totalQ - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <HeaderBar currentIdx={currentIdx} total={totalQ} correct={correct} wrong={wrong} timer={timer} />

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/practice')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
            </svg>
            Subjects
          </button>
          <span className="text-xs text-gray-400 font-medium">{answeredCount} of {totalQ} answered</span>
        </div>
        <div className="flex items-center gap-2">
          {question && <BookmarkButton questionId={question.id} key={question.id} />}
          <button onClick={() => setReportOpen(true)}
            className="p-2.5 rounded-xl bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Report a problem">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </button>
        </div>
      </div>

      <QuestionCard question={question} number={currentIdx + 1} total={totalQ}>
        <div className="space-y-3">
          {question?.options?.map(opt => (
            <OptionButton
              key={opt.id || opt.option_label}
              label={opt.option_label} text={opt.option_text}
              state={getOptionState(opt.option_label)}
              onClick={() => selectAnswer(opt.option_label)}
              disabled={isAnswered}
            />
          ))}
        </div>
      </QuestionCard>

      {isAnswered && question?.explanation && (
        <div className="animate-fade-up">
          <ExplanationBox explanation={question.explanation} question={question}
            isCorrect={questionState.isCorrect} correctOption={questionState.correct}
            onReadComplete={markRead} />
        </div>
      )}

      {isAnswered && !question?.explanation && (
        <div className="soft-card p-4 flex items-center gap-3 text-sm text-gray-500">
          <span className="text-xl">{questionState.isCorrect ? '✅' : '❌'}</span>
          <span>{questionState.isCorrect ? 'Correct!' : `Incorrect. The correct answer is ${questionState.correct}.`}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="white" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
          Previous
        </Button>

        <div className="flex gap-1 flex-wrap justify-center max-w-xs">
          {questions.map((q, i) => {
            const a = answers[q.id];
            return (
              <button key={q.id} onClick={() => goTo(i)} title={`Question ${i + 1}`}
                className={`w-5 h-5 rounded-full text-[9px] font-bold transition-all ${
                  i === currentIdx ? 'bg-primary-500 text-white scale-125 shadow-glow-green'
                    : a ? (a.isCorrect ? 'bg-sage-400 text-white' : a.selected ? 'bg-red-400 text-white' : 'bg-gray-300 text-gray-500')
                    : 'bg-gray-200 text-gray-500'
                }`}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {canFinish ? (
          <Button onClick={submitAll} loading={submitting} variant="warm"
            disabled={!isAnswered || !isRead || submitting}>
            Finish 🎯
          </Button>
        ) : (
          <Button onClick={() => goTo(currentIdx + 1)} disabled={!isAnswered || !isRead}>
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
            </svg>
          </Button>
        )}
      </div>

      <ReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} questionId={question?.id} />
    </div>
  );
}
