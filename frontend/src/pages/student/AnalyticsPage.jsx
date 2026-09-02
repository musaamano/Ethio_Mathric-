/**
 * AnalyticsPage.jsx — My Progress
 * Topic/chapter/mock-exam analytics removed.
 * Subject-level analytics only.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import analyticsService from '../../services/analyticsService';
import { useToast } from '../../components/common/Toast';
import SubjectProgressBar from '../../components/dashboard/SubjectProgressBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatScore, formatDuration } from '../../utils/helpers';

const WEAK_THRESHOLD      = 60;
const IMPROVING_THRESHOLD = 75;

function StatPill({ label, value, sub, colorClass }) {
  return (
    <div className="soft-card p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`font-display font-extrabold text-2xl leading-tight ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const toast = useToast();
  const [overview,  setOverview]  = useState(null);
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    analyticsService.getStudentOverview()
      .then(data => {
        setOverview(data?.overview || null);
        setSubjects(data?.subjectStats || []);
      })
      .catch(() => toast.error('Failed to load progress data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner variant="page" text="Loading your progress..." />;

  const hasData       = overview && parseInt(overview.total_attempts || 0) > 0;
  const avgScore      = overview?.avg_score ? parseFloat(overview.avg_score) : null;
  const totalCorrect  = parseInt(overview?.total_correct  || 0);
  const studyTime     = parseInt(overview?.total_study_secs || 0);
  const scoreFormatted = avgScore !== null ? formatScore(avgScore) : null;

  const subjectsSorted = [...subjects].sort((a, b) => parseFloat(a.avg_score) - parseFloat(b.avg_score));

  const weakSubjects      = subjectsSorted.filter(s => parseFloat(s.avg_score) < WEAK_THRESHOLD);
  const improvingSubjects = subjectsSorted.filter(s => {
    const a = parseFloat(s.avg_score);
    return a >= WEAK_THRESHOLD && a < IMPROVING_THRESHOLD;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-primary-700">My Progress</h2>
        <p className="text-gray-500 text-sm mt-1">A summary of your practice performance.</p>
      </div>

      {!hasData ? (
        <div className="soft-card p-8 text-center space-y-3">
          <p className="text-4xl">📭</p>
          <p className="font-display font-bold text-primary-700">No data yet</p>
          <p className="text-gray-400 text-sm">Complete some practice sessions to see your progress here.</p>
          <Link to="/dashboard/practice" className="inline-block mt-2 btn-primary text-sm px-5 py-2.5">
            Start Practicing ⚡
          </Link>
        </div>
      ) : (
        <>
          {/* Overall */}
          <div>
            <h3 className="font-display font-bold text-base text-primary-700 mb-3 px-1">Overall Performance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatPill label="Overall Score"    value={scoreFormatted ? scoreFormatted.text : '—'} colorClass={scoreFormatted ? scoreFormatted.color : 'text-gray-400'} />
              <StatPill label="Correct Answers"  value={totalCorrect.toLocaleString()} colorClass="text-sage-700" />
              <StatPill label="Study Time"       value={formatDuration(studyTime)} sub="total" colorClass="text-primary-600" />
            </div>
          </div>

          {/* Subject performance */}
          {subjectsSorted.length > 0 && (
            <div className="soft-card p-6">
              <h3 className="font-display font-bold text-base text-primary-700 mb-5">Subject Performance</h3>
              <div className="space-y-4">
                {subjectsSorted.map(s => {
                  const barColor =
                    parseFloat(s.avg_score) < WEAK_THRESHOLD      ? '#EF4444' :
                    parseFloat(s.avg_score) < IMPROVING_THRESHOLD ? '#F59E0B' : '#52B788';
                  return (
                    <SubjectProgressBar key={s.subject_name} name={s.subject_name}
                      score={parseFloat(s.avg_score)} attempts={parseInt(s.attempts)} color={barColor} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Weak subjects */}
          {subjects.length === 0 ? (
            <div className="soft-card p-6 text-center space-y-2">
              <p className="text-2xl">✅</p>
              <p className="font-semibold text-primary-700 text-sm">No weak areas yet</p>
              <p className="text-gray-400 text-xs">Practice more questions to see your performance by subject.</p>
            </div>
          ) : (
            <>
              {weakSubjects.length > 0 && (
                <div className="soft-card p-6 border-l-4 border-red-400">
                  <h3 className="font-display font-bold text-base text-red-600 mb-1">🔴 Weak Subjects</h3>
                  <p className="text-xs text-gray-400 mb-4">Subjects where your score is below 60%.</p>
                  <div className="space-y-4">
                    {weakSubjects.map(s => (
                      <SubjectProgressBar key={s.subject_name} name={s.subject_name}
                        score={parseFloat(s.avg_score)} attempts={parseInt(s.attempts)} color="#EF4444" />
                    ))}
                  </div>
                </div>
              )}
              {improvingSubjects.length > 0 && (
                <div className="soft-card p-6 border-l-4 border-yellow-400">
                  <h3 className="font-display font-bold text-base text-yellow-600 mb-1">🟡 Needs Improvement</h3>
                  <p className="text-xs text-gray-400 mb-4">Subjects where your score is between 60–74%.</p>
                  <div className="space-y-4">
                    {improvingSubjects.map(s => (
                      <SubjectProgressBar key={s.subject_name} name={s.subject_name}
                        score={parseFloat(s.avg_score)} attempts={parseInt(s.attempts)} color="#F59E0B" />
                    ))}
                  </div>
                </div>
              )}
              {weakSubjects.length === 0 && improvingSubjects.length === 0 && (
                <div className="soft-card p-6 text-center space-y-2">
                  <p className="text-2xl">🎉</p>
                  <p className="font-semibold text-sage-700 text-sm">Great work — no weak subjects!</p>
                  <p className="text-gray-400 text-xs">All your practiced subjects are scoring 75% or above.</p>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/dashboard/practice"  className="btn-primary text-sm px-5 py-2.5 text-center">Practice Questions ⚡</Link>
            <Link to="/dashboard/past-year" className="btn-outline text-sm px-5 py-2.5 text-center">Past-Year Questions 📅</Link>
          </div>
        </>
      )}
    </div>
  );
}
