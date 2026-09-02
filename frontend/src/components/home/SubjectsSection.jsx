/**
 * SubjectsSection.jsx — Loads real subjects from the API.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import subjectService from '../../services/subjectService';

// Fallback icon/color map when DB doesn't have them
const SUBJECT_META = {
  Mathematics:  { icon: '📐', color: '#3B82F6' },
  Physics:      { icon: '⚛️', color: '#14B8A6' },
  Chemistry:    { icon: '🧪', color: '#8B5CF6' },
  Biology:      { icon: '🧬', color: '#22C55E' },
  English:      { icon: '📖', color: '#F59E0B' },
  ICT:          { icon: '💻', color: '#EC4899' },
  Economics:    { icon: '💹', color: '#14B8A6' },
  History:      { icon: '🏛️', color: '#F59E0B' },
  Geography:    { icon: '🌍', color: '#22C55E' },
  Citizenship:  { icon: '⚖️', color: '#F97316' },
};

export default function SubjectsSection() {
  const [streams,  setStreams]  = useState([]);
  const [active,   setActive]  = useState(0); // stream index
  const [loading,  setLoading] = useState(true);
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    subjectService.getStreams()
      .then(data => { setStreams(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentStream = streams[active];
  const subjects = currentStream?.subjects || [];

  return (
    <section ref={ref} className="py-24 bg-surface relative overflow-hidden">
      <div className="orb w-80 h-80 bg-sage-300/20 -top-20 -left-20" />
      <div className="section-container relative z-10">

        <div className={`text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="badge bg-mint-light text-primary-600 border border-sage-200 mb-4 mx-auto w-fit">📚 Subjects</div>
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-primary-700 mb-4">
            All Matric Subjects <span className="gradient-text">Covered</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Both streams fully covered with thousands of questions for each subject.
          </p>
        </div>

        {/* Stream toggle */}
        <div className={`flex justify-center mb-10 transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex bg-white rounded-2xl p-1.5 shadow-soft border border-mint-light/60 gap-1">
            {streams.map((stream, i) => (
              <button key={stream.id} onClick={() => setActive(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  active === i
                    ? 'bg-green-gradient text-white shadow-glow-green scale-[1.02]'
                    : 'text-gray-500 hover:text-primary-600 hover:bg-mint-light'
                }`}>
                {stream.name === 'Natural Science' ? '🔬' : '📰'} {stream.name}
              </button>
            ))}
            {/* Skeleton if loading */}
            {loading && [1,2].map(i => (
              <div key={i} className="w-36 h-10 bg-mint-light/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Subject cards */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="soft-card p-5 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-mint-light rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-mint-light rounded w-24" />
                    <div className="h-3 bg-mint-light rounded w-32" />
                  </div>
                </div>
                <div className="h-2 bg-mint-light rounded-full w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((s, i) => {
              const meta = SUBJECT_META[s.name] || { icon: '📘', color: s.color || '#52B788' };
              const icon  = s.icon  || meta.icon;
              const color = s.color || meta.color;
              return (
                <Link key={s.id} to={`/dashboard/subjects/${s.slug}`}
                  className={`soft-card border border-mint-light/60 p-5 group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-soft group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: color + '20' }}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-primary-700 text-base">{s.name}</h3>
                      <p className="text-xs text-gray-400 font-medium">
                        {s.description?.slice(0, 50) || 'Practice questions'}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: '65%', backgroundColor: color }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-mint-light/60 text-gray-600">Past Exams</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-mint-light/60 text-gray-600">Mock Tests</span>
                    </div>
                    <svg className="w-4 h-4 text-sage-400 group-hover:translate-x-1 group-hover:text-primary-500 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom link */}
        <div className={`text-center mt-10 transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <Link to="/dashboard/subjects" className="btn-outline inline-flex items-center gap-2 px-8 py-3 text-sm">
            Explore All Subjects
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
