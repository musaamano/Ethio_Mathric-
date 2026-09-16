/**
 * AdminQuestionManagement.jsx
 * Wizard: Category → Stream → (Year) → Subject → Question List
 */
import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useParams, Navigate } from 'react-router-dom';
import subjectService from '../../../services/subjectService';
import questionService from '../../../services/questionService';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import AdminQuestionList from './AdminQuestionList';

function SelectCard({ icon, title, description }) {
  return (
    <div
      className="w-full text-left soft-card p-6 group hover:shadow-card-hover hover:-translate-y-1
        transition-all duration-200"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-display font-bold text-lg text-primary-700 group-hover:text-primary-600">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

function BackButton({ to, label = 'Back' }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400
        hover:text-primary-600 transition-colors mb-4"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
      </svg>
      {label}
    </Link>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="font-display font-extrabold text-2xl text-gray-800">{title}</h2>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function CategoryLanding() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Question Management"
        subtitle="What type of questions do you want to manage?"
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <Link to="/admin/questions/practice">
          <SelectCard
            icon="📝"
            title="Practice Questions"
            description="Manage normal practice questions by subject."
          />
        </Link>
        <Link to="/admin/questions/past-year">
          <SelectCard
            icon="📅"
            title="Past Year Questions"
            description="Manage previous exam questions by year and subject."
          />
        </Link>
      </div>
    </div>
  );
}

function StreamSelect({ category }) {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const base = category === 'practice' ? '/admin/questions/practice' : '/admin/questions/past-year';
  const categoryLabel = category === 'practice' ? 'Practice' : 'Past Year';

  useEffect(() => {
    subjectService.getStreams()
      .then(setStreams)
      .catch(() => setStreams([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner variant="page" text="Loading streams..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton to="/admin/questions" label="Back to Questions" />
      <PageHeader title="Select Stream" subtitle={`${categoryLabel} Questions`} />
      <div className="grid sm:grid-cols-2 gap-4">
        {streams.map(stream => (
          <Link key={stream.id} to={`${base}/${stream.slug}`}>
            <SelectCard
              icon={stream.slug?.includes('natural') ? '🔬' : '📰'}
              title={stream.name}
              description={stream.description}
            />
          </Link>
        ))}
      </div>
      {streams.length === 0 && (
        <EmptyState preset="empty" message="No streams found." />
      )}
    </div>
  );
}

function PracticeSubjectSelect() {
  const { streamSlug } = useParams();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectService.getStreams()
      .then(streams => {
        const found = streams.find(s => s.slug === streamSlug);
        setStream(found || null);
      })
      .finally(() => setLoading(false));
  }, [streamSlug]);

  if (loading) return <LoadingSpinner variant="page" text="Loading subjects..." />;
  if (!stream) return <Navigate to="/admin/questions/practice" replace />;

  const subjects = stream.subjects || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton to="/admin/questions/practice" label="Back to Streams" />
      <PageHeader title="Select Subject" subtitle={`Practice · ${stream.name}`} />
      <div className="grid sm:grid-cols-2 gap-4">
        {subjects.map(subject => (
          <Link key={subject.id} to={`/admin/questions/practice/${streamSlug}/${subject.id}`}>
            <SelectCard
              icon="📘"
              title={subject.name}
              description={subject.description?.slice(0, 60)}
            />
          </Link>
        ))}
      </div>
      {subjects.length === 0 && (
        <EmptyState preset="empty" message="No subjects in this stream." />
      )}
    </div>
  );
}

function PastYearSelect() {
  const { streamSlug } = useParams();
  const [stream, setStream] = useState(null);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const streams = await subjectService.getStreams();
        const found = streams.find(s => s.slug === streamSlug);
        if (!found) { setStream(null); return; }
        setStream(found);
        const subjectIds = (found.subjects || []).map(s => s.id).join(',');
        const yearsData = await questionService.getAvailableYears(
          subjectIds ? { subject_ids: subjectIds } : {}
        );
        setYears(Array.isArray(yearsData) ? yearsData : []);
      } catch {
        setYears([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [streamSlug]);

  if (loading) return <LoadingSpinner variant="page" text="Loading years..." />;
  if (!stream) return <Navigate to="/admin/questions/past-year" replace />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton to="/admin/questions/past-year" label="Back to Streams" />
      <PageHeader title="Select Year" subtitle={`Past Year · ${stream.name}`} />
      {years.length === 0 ? (
        <EmptyState preset="empty" message="No past-year questions found for this stream yet." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {years.map(yr => (
            <Link key={yr} to={`/admin/questions/past-year/${streamSlug}/${yr}`}>
              <SelectCard icon="📅" title={String(yr)} description="Ethiopian Exam" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PastYearSubjectSelect() {
  const { streamSlug, year } = useParams();
  const parsedYear = parseInt(year, 10);
  const [stream, setStream] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const streams = await subjectService.getStreams();
        const found = streams.find(s => s.slug === streamSlug);
        if (!found) return;
        setStream(found);
        const streamSubjects = found.subjects || [];
        const checks = await Promise.all(
          streamSubjects.map(async (s) => {
            const yrs = await questionService.getAvailableYears({ subject_ids: String(s.id) });
            return Array.isArray(yrs) && yrs.includes(parsedYear) ? s : null;
          })
        );
        setSubjects(checks.filter(Boolean));
      } finally {
        setLoading(false);
      }
    };
    if (!isNaN(parsedYear)) load();
    else setLoading(false);
  }, [streamSlug, year, parsedYear]);

  if (isNaN(parsedYear)) return <Navigate to={`/admin/questions/past-year/${streamSlug}`} replace />;
  if (loading) return <LoadingSpinner variant="page" text="Loading subjects..." />;
  if (!stream) return <Navigate to="/admin/questions/past-year" replace />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton to={`/admin/questions/past-year/${streamSlug}`} label="Back to Years" />
      <PageHeader title="Select Subject" subtitle={`Past Year · ${stream.name} · ${year}`} />
      {subjects.length === 0 ? (
        <EmptyState
          preset="empty"
          message={`No subjects have ${year} past-year questions in ${stream.name}.`}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {subjects.map(subject => (
            <Link key={subject.id} to={`/admin/questions/past-year/${streamSlug}/${year}/${subject.id}`}>
              <SelectCard
                icon="📘"
                title={subject.name}
                description={`${year} past-year questions`}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PracticeQuestionListRoute() {
  const { streamSlug, subjectId } = useParams();
  const [stream, setStream] = useState(null);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectService.getStreams()
      .then(streams => {
        const foundStream = streams.find(s => s.slug === streamSlug);
        if (!foundStream) return;
        setStream(foundStream);
        const foundSubject = (foundStream.subjects || []).find(
          s => String(s.id) === String(subjectId)
        );
        setSubject(foundSubject || null);
      })
      .finally(() => setLoading(false));
  }, [streamSlug, subjectId]);

  if (loading) return <LoadingSpinner variant="page" text="Loading..." />;
  if (!stream || !subject) return <Navigate to="/admin/questions/practice" replace />;

  const breadcrumbs = [
    { label: 'Questions', to: '/admin/questions' },
    { label: 'Practice', to: '/admin/questions/practice' },
    { label: stream.name, to: `/admin/questions/practice/${streamSlug}` },
    { label: subject.name },
  ];

  return (
    <AdminQuestionList
      category="practice"
      stream={stream}
      subject={subject}
      breadcrumbs={breadcrumbs}
    />
  );
}

function PastYearQuestionListRoute() {
  const { streamSlug, year, subjectId } = useParams();
  const parsedYear = parseInt(year, 10);
  const [stream, setStream] = useState(null);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectService.getStreams()
      .then(streams => {
        const foundStream = streams.find(s => s.slug === streamSlug);
        if (!foundStream) return;
        setStream(foundStream);
        const foundSubject = (foundStream.subjects || []).find(
          s => String(s.id) === String(subjectId)
        );
        setSubject(foundSubject || null);
      })
      .finally(() => setLoading(false));
  }, [streamSlug, subjectId]);

  if (loading) return <LoadingSpinner variant="page" text="Loading..." />;
  if (!stream || !subject || isNaN(parsedYear)) {
    return <Navigate to="/admin/questions/past-year" replace />;
  }

  const breadcrumbs = [
    { label: 'Questions', to: '/admin/questions' },
    { label: 'Past Year', to: '/admin/questions/past-year' },
    { label: stream.name, to: `/admin/questions/past-year/${streamSlug}` },
    { label: String(parsedYear), to: `/admin/questions/past-year/${streamSlug}/${parsedYear}` },
    { label: subject.name },
  ];

  return (
    <AdminQuestionList
      category="past_year"
      stream={stream}
      subject={subject}
      year={parsedYear}
      breadcrumbs={breadcrumbs}
    />
  );
}

export default function AdminQuestionManagement() {
  return (
    <Routes>
      <Route index element={<CategoryLanding />} />
      <Route path="practice" element={<StreamSelect category="practice" />} />
      <Route path="practice/:streamSlug" element={<PracticeSubjectSelect />} />
      <Route path="practice/:streamSlug/:subjectId" element={<PracticeQuestionListRoute />} />
      <Route path="past-year" element={<StreamSelect category="past_year" />} />
      <Route path="past-year/:streamSlug" element={<PastYearSelect />} />
      <Route path="past-year/:streamSlug/:year" element={<PastYearSubjectSelect />} />
      <Route path="past-year/:streamSlug/:year/:subjectId" element={<PastYearQuestionListRoute />} />
      <Route path="*" element={<Navigate to="/admin/questions" replace />} />
    </Routes>
  );
}
