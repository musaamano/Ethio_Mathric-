import React, { useRef, useState, useEffect } from 'react';

const FEATURES = [
  {
    icon: '🎯',
    title: 'Smart Practice Mode',
    desc: 'Practice by subject. Our system identifies your weak areas and focuses practice there automatically.',
    tag: 'Adaptive',
    color: 'bg-mint-light border-sage-200',
    iconBg: 'bg-green-gradient',
  },
  {
    icon: '📅',
    title: 'Past-Year Questions',
    desc: 'Practice questions from previous Ethiopian Matric examinations, organised by year and subject.',
    tag: 'Past-Year',
    color: 'bg-primary-50 border-primary-100',
    iconBg: 'bg-green-gradient',
  },
  {
    icon: '💡',
    title: 'Detailed Explanations',
    desc: 'Every question comes with a full explanation: why the answer is correct, why each wrong option fails, and helpful tricks.',
    tag: 'In-depth',
    color: 'bg-warm-light border-warm/20',
    iconBg: 'bg-warm-gradient',
  },
  {
    icon: '📊',
    title: 'Progress Analytics',
    desc: 'Track your average score, strong and weak subjects, and monthly improvement with detailed charts.',
    tag: 'Insights',
    color: 'bg-mint-light border-sage-200',
    iconBg: 'bg-green-gradient',
  },
  {
    icon: '🏆',
    title: 'Live Leaderboard',
    desc: 'Compete with students nationwide. Daily, weekly, and monthly rankings keep you motivated and on track.',
    tag: 'Competitive',
    color: 'bg-primary-50 border-primary-100',
    iconBg: 'bg-green-gradient',
  },
  {
    icon: '🔖',
    title: 'Bookmarks & Reviews',
    desc: 'Save difficult questions and revisit them anytime for focused revision.',
    tag: 'Personal',
    color: 'bg-warm-light border-warm/20',
    iconBg: 'bg-warm-gradient',
  },
  {
    icon: '📊',
    title: 'Progress Analytics',
    desc: 'Track your scores by subject, see weak areas, and monitor improvement over time.',
    tag: 'Insights',
    color: 'bg-primary-50 border-primary-100',
    iconBg: 'bg-green-gradient',
  },
];

function useInView(threshold = 0.1) {
  const ref  = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

export default function FeaturesSection() {
  const [ref, inView] = useInView(0.1);

  return (
    <section id="features" ref={ref} className="py-24 bg-surface relative overflow-hidden">
      {/* Background decoration */}
      <div className="orb w-96 h-96 bg-mint-dark/20 top-0 -right-32" />
      <div className="orb w-64 h-64 bg-sage-300/20 bottom-0 -left-16" />

      <div className="section-container relative z-10">

        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="badge bg-mint-light text-primary-600 border border-sage-200 mb-4 mx-auto w-fit">
            ✨ Everything You Need
          </div>
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-primary-700 mb-4">
            Features Built for
            <span className="gradient-text"> Matric Success</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            From smart practice to detailed analytics — every tool you need to walk into 
            the Matric exam with confidence.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`soft-card p-5 border group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 ${f.color} ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center text-2xl shadow-soft group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <span className="badge bg-white/80 text-primary-500 border border-mint-dark/20 text-[10px]">
                  {f.tag}
                </span>
              </div>

              <h3 className="font-display font-bold text-primary-700 text-base mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>

              {/* Arrow */}
              <div className="mt-4 flex items-center text-sage-500 text-sm font-semibold group-hover:gap-2 gap-1 transition-all duration-200">
                <span>Learn more</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
