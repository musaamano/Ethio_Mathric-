/**
 * DashboardHome.jsx — Stream → Subject → Question
 * Weak areas now subject-level from getStudentOverview().subjectStats
 * Topic/chapter/mock-exam references removed.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import analyticsService from '../../services/analyticsService';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AnnouncementBanner from '../../components/dashboard/AnnouncementBanner';
import { formatScore, snakeToTitle } from '../../utils/helpers';

function streamLabel(stream) {
  if (!stream) return 'Not set';
  if (stream === 'natural_science') return 'Natural Science';
  if (stream === 'social_science')  return 'Social Science';
  return snakeToTitle(stream);
}
function streamEmoji(stream) {
  if (stream === 'natural_science') return '🔬';
  if (stream === 'social_science')  return '📰';
  return '📚';
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ActionCard({ to, icon, title, description, primary }) {
  return (
    <Link to={to} className={`
      flex items-center gap-5 p-6 rounded-3xl border transition-all duration-200
      hover:shadow-card-hover hover:-translate-y-0.5 group
      ${primary ? 'bg-green-gradient text-white border-transparent shadow-glow-green'
                : 'bg-white text-primary-700 border-mint-light/60 hover:border-primary-200'}
    `}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0
        ${primary ? 'bg-white/20' : 'bg-primary-50'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-display font-bold text-lg leading-tight ${primary ? 'text-white' : 'text-primary-700'}`}>{title}</h3>
        <p className={`text-sm mt-0.5 ${primary ? 'text-white/80' : 'text-gray-500'}`}>{description}</p>
      </div>
      <svg className={`w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform ${primary ? 'text-white/80' : 'text-gray-300'}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const toast    = useToast();

  const [overview,      setOverview]      = useState(null);
  const [subjects,      setSubjects]      = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    analyticsService.getStudentOverview()
      .then(data => {
        setOverview(data?.overview || null);
        setSubjects(data?.subjectStats || []);
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));

    api.get('/announcements')
      .then(r => setAnnouncements(r.data?.data || []))
      .catch(() => {});
  }, []);

  if (loading) return <LoadingSpinner variant="page" text="Loading your dashboard..." />;

  const avgScore      = overview?.avg_score      ? parseFloat(overview.avg_score) : null;
  const totalCorrect  = overview?.total_correct  ? parseInt(overview.total_correct) : 0;
  const totalAttempts = overview?.total_attempts ? parseInt(overview.total_attempts) : 0;
  const scoreFormatted = avgScore !== null ? formatScore(avgScore) : null;

  // Subject-level weak areas: avg_score < 65, sorted ascending, max 4
  const weakSubjects = subjects
    .filter(s => s.avg_score !== null && parseFloat(s.avg_score) < 65)
    .sort((a, b) => parseFloat(a.avg_score) - parseFloat(b.avg_score))
    .slice(0, 4);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {announcements.length > 0 && <AnnouncementBanner announcements={announcements} />}

      {/* Greeting + stream */}
      <div className="soft-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-primary-700">
              {getGreeting()}, {user?.first_name}! 👋
            </h2>
            <p className="text-gray-500 text-sm mt-1">Ready for today's practice session?</p>
          </div>
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-2xl px-4 py-2 flex-shrink-0">
            <span className="text-lg">{streamEmoji(user?.stream)}</span>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Your Stream</p>
              <p className="text-sm font-bold text-primary-700 leading-tight">{streamLabel(user?.stream)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div>
        <h3 className="font-display font-bold text-base text-primary-700 mb-3 px-1">What do you want to practice?</h3>
        <div className="space-y-3">
          <ActionCard to="/dashboard/practice"  icon="📚" title="Practice Questions"   description="Practice questions by subject." primary={true} />
          <ActionCard to="/dashboard/past-year" icon="📅" title="Past-Year Questions"  description="Practice questions from previous years." primary={false} />
        </div>
      </div>

      {/* Progress */}
      <div className="soft-card p-6">
        <h3 className="font-display font-bold text-base text-primary-700 mb-4">Your Progress</h3>
        {totalAttempts === 0 ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-gray-400 text-sm">No practice sessions yet. Start practicing to see your progress here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Overall Score</p>
              {scoreFormatted
                ? <p className={`font-display font-extrabold text-2xl ${scoreFormatted.color}`}>{scoreFormatted.text}</p>
                : <p className="font-display font-extrabold text-2xl text-gray-400">—</p>}
            </div>
            <div className="bg-mint-light rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Questions Answered</p>
              <p className="font-display font-extrabold text-2xl text-sage-700">{totalCorrect.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Subject-level weak areas */}
      {weakSubjects.length > 0 && (
        <div className="soft-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base text-primary-700">Weak Areas</h3>
            <Link to="/dashboard/analytics" className="text-xs font-semibold text-primary-500 hover:text-sage-500 transition-colors">
              See full progress →
            </Link>
          </div>
          <div className="space-y-3">
            {weakSubjects.map(s => {
              const score = formatScore(parseFloat(s.avg_score));
              return (
                <div key={s.subject_name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color || '#EF4444' }} />
                    <span className="text-sm font-semibold text-gray-700 truncate">{s.subject_name}</span>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 px-2.5 py-0.5 rounded-full ${score.bg} ${score.color}`}>
                    {score.text}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4">Practice more questions in these subjects to improve your score.</p>
        </div>
      )}

    </div>
  );
}
