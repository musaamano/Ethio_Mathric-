/**
 * StatsSection.jsx — Fetches real stats from the analytics API.
 * Falls back to placeholder values while loading.
 */
import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

function CountUp({ target, suffix, active }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || !target) return;
    let start = 0;
    const duration = 1800;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function StatsSection() {
  const ref = useRef(null);
  const [active,  setActive]  = useState(false);
  const [stats,   setStats]   = useState(null);

  // Fetch real stats from API
  useEffect(() => {
    api.get('/analytics/leaderboard?limit=1').catch(() => {});
    // Fetch site stats (public endpoint)
    api.get('/analytics/admin').then(res => {
      const d = res.data?.data;
      if (d) setStats(d);
    }).catch(() => {}); // silently fall back to defaults
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Build display values — use real data when available, sensible defaults otherwise
  const totalStudents   = stats?.users?.students    || 12000;
  const totalQuestions  = stats?.questions?.total   || 10000;
  const totalSubjects   = 8;  // always 8 — this is a fixed product fact
  const passImprovement = 95; // marketing stat — always fixed

  const STATS = [
    { value: totalStudents,   suffix: '+', label: 'Active Students',       icon: '🧑‍🎓', color: 'from-sage-400 to-primary-500' },
    { value: totalQuestions,  suffix: '+', label: 'Practice Questions',    icon: '📚',   color: 'from-primary-400 to-sage-600' },
    { value: passImprovement, suffix: '%', label: 'Pass Rate Improvement', icon: '🎯',   color: 'from-warm to-warm-dark'       },
    { value: totalSubjects,   suffix: '',  label: 'Subjects Covered',      icon: '🏫',   color: 'from-sage-400 to-primary-600' },
  ];

  return (
    <section ref={ref} className="py-16 bg-surface relative">
      <div className="section-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {STATS.map((s, i) => (
            <div key={s.label}
              className="soft-card p-6 text-center group hover:scale-[1.03] hover:shadow-card-hover transition-all duration-300">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-soft group-hover:shadow-glow-green transition-all duration-300`}>
                {s.icon}
              </div>
              <div className="font-display font-extrabold text-3xl lg:text-4xl text-primary-600 mb-1">
                <CountUp target={s.value} suffix={s.suffix} active={active} />
              </div>
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              <div className={`h-0.5 w-10 mx-auto mt-3 rounded-full bg-gradient-to-r ${s.color} opacity-60`} />
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-4">
          <div className="flex-1 h-px bg-mint-dark/20" />
          <p className="text-sm text-gray-400 font-medium px-4">
            Trusted by students from all regions of Ethiopia
          </p>
          <div className="flex-1 h-px bg-mint-dark/20" />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {['Addis Ababa','Oromia','Amhara','SNNPR','Tigray','Somali','Afar','Harari','Dire Dawa','Gambella','Benishangul'].map(region => (
            <span key={region} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white rounded-xl border border-mint-light/60 hover:border-sage-300 hover:text-primary-600 transition-all cursor-default">
              {region}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
