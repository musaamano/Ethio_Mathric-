import React from 'react';
import { Link } from 'react-router-dom';
import useInView from '../../hooks/useInView';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Smart Practice Mode',
    color: 'bg-mint-light border-sage-200',
    iconBg: 'bg-green-gradient',
    tag: 'Core',
    points: [
      'Practice by subject',
      'Random mode for broad revision',
      'Past-Year Questions mode',
      'Weak subject identification',
    ],
    desc: 'Multiple practice modes let you focus exactly where you need it. Whether drilling a single subject or practicing past-year papers, every session is purposeful.',
  },
  {
    icon: '💡',
    title: 'Detailed Explanations',
    color: 'bg-warm-light border-warm/20',
    iconBg: 'bg-warm-gradient',
    tag: 'Unique',
    points: [
      'Why the correct answer is right',
      'Why each wrong option is wrong',
      'Memory tricks and mnemonics',
      'Common mistakes to avoid',
      'Textbook reference for each question',
    ],
    desc: 'We don\'t just tell you the answer. Every question has a multi-tab explanation so you actually understand the concept — not just memorise the answer.',
  },
  {
    icon: '📊',
    title: 'Progress Analytics',
    color: 'bg-primary-50 border-primary-100',
    iconBg: 'bg-green-gradient',
    tag: 'Insights',
    points: [
      'Average score across all subjects',
      'Strong vs weak subject breakdown',
      'Weekly and monthly score trend charts',
      'Study session history',
      'Total questions answered counter',
    ],
    desc: 'Detailed charts and breakdowns show you exactly where your time is best spent. Stop guessing — let data guide your study plan.',
  },
  {
    icon: '📊',
    title: 'Progress Analytics',
    color: 'bg-mint-light border-sage-200',
    iconBg: 'bg-green-gradient',
    tag: 'Analytics',
    points: [
      'Overall score and correct-answer count',
      'Subject performance breakdown',
      'Weak subject identification',
      'Weekly and monthly score trends',
      'Study history with scores and dates',
    ],
    desc: 'Detailed charts and breakdowns show you exactly where your time is best spent. Stop guessing — let data guide your study plan.',
  },
  {
    icon: '🏆',
    title: 'National Leaderboard',
    color: 'bg-purple-50 border-purple-100',
    iconBg: 'bg-green-gradient',
    tag: 'Competitive',
    points: [
      'Daily, weekly, monthly, all-time rankings',
      'Filter by stream (Natural/Social Science)',
      'See your rank vs students nationwide',
      'Top performers highlighted',
      'Motivational streak badges',
    ],
    desc: 'A little healthy competition goes a long way. The national leaderboard keeps you accountable and motivated to study harder every day.',
  },
  {
    icon: '🔖',
    title: 'Bookmarks',
    color: 'bg-primary-50 border-primary-100',
    iconBg: 'bg-green-gradient',
    tag: 'Personal',
    points: [
      'Save any question with one tap',
      'Organised bookmark library',
      'Review saved questions anytime',
      'Remove when mastered',
      'Works across all devices',
    ],
    desc: 'Build your personal bank of difficult questions. Revisit them before the exam for targeted revision instead of going through everything again.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    color: 'bg-warm-light border-warm/20',
    iconBg: 'bg-warm-gradient',
    tag: 'Security',
    points: [
      'JWT + Refresh Token authentication',
      'One active session per account',
      'Device tracking and alerts',
      'bcrypt password hashing',
      'No data sold to third parties',
    ],
    desc: 'Your account and study data are protected with industry-standard security. We never share your data and you can delete your account at any time.',
  },
];

const SUBJECTS = [
  { stream: 'Natural Science', subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'ICT'] },
  { stream: 'Social Science',  subjects: ['Mathematics', 'Economics', 'History', 'Geography', 'English', 'Citizenship'] },
];

function FeatureCard({ f, index }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`soft-card border ${f.color} p-6 transition-all duration-500 hover:shadow-card-hover hover:-translate-y-1 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${(index % 3) * 80}ms` }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center text-2xl shadow-soft flex-shrink-0`}>
          {f.icon}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-primary-700 text-base">{f.title}</h3>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
              {f.tag}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {f.points.map(p => (
          <li key={p} className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-sage-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
            </svg>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FeaturesPage() {
  const [heroRef, heroInView] = useInView(0.2);

  return (
    <div className="bg-surface">
      {/* Hero */}
      <section className="relative py-24 bg-hero-gradient overflow-hidden">
        <div className="orb w-96 h-96 bg-sage-300/40 -top-20 -right-20" />
        <div className="orb w-64 h-64 bg-mint-dark/20 bottom-0 -left-16" />
        <div className="section-container relative z-10 text-center">
          <div className="badge bg-white/70 border border-sage-200 text-primary-600 mb-5 mx-auto w-fit">
            ✨ Everything You Need
          </div>
          <h1 className="font-display font-extrabold text-5xl lg:text-6xl text-primary-700 mb-5 leading-tight">
            Features Built for<br />
            <span className="gradient-text">Matric Success</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Every tool, every question type, every subject — designed specifically 
            for Ethiopian Grade 12 students.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/register" className="btn-primary px-8 py-4 text-base">
              Start Free Today
            </Link>
            <Link to="/pricing" className="btn-outline px-8 py-4 text-base bg-white/70 backdrop-blur-sm">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 bg-white border-b border-mint-light/60">
        <div className="section-container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '10,000+', label: 'Practice Questions' },
              { value: '8',       label: 'Subjects Covered' },
              { value: '5',       label: 'Practice Modes' },
              { value: '100%',    label: 'Curriculum Aligned' },
            ].map(s => (
              <div key={s.label}>
                <p className="font-display font-extrabold text-3xl text-primary-600">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-20">
        <div className="section-container">
          <div className="text-center mb-14">
            <h2 className="font-display font-extrabold text-4xl text-primary-700 mb-3">
              All Features
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Everything you need from the first study session to exam day.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} f={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Subjects covered */}
      <section className="py-20 bg-white">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="font-display font-extrabold text-4xl text-primary-700 mb-3">
              All Subjects Covered
            </h2>
            <p className="text-gray-500">Both streams — Natural Science and Social Science.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {SUBJECTS.map(s => (
              <div key={s.stream} className="soft-card p-6">
                <h3 className="font-display font-bold text-primary-700 mb-4 flex items-center gap-2">
                  {s.stream === 'Natural Science' ? '🔬' : '📰'} {s.stream}
                </h3>
                <div className="space-y-2">
                  {s.subjects.map(sub => (
                    <div key={sub} className="flex items-center gap-2.5 py-1.5 border-b border-mint-light/60 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-green-gradient flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">{sub}</span>
                      <span className="ml-auto text-xs text-gray-400">Questions + Analytics</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-surface">
        <div className="section-container text-center">
          <div className="soft-card p-12 max-w-2xl mx-auto bg-green-gradient text-white rounded-4xl shadow-glow-green">
            <h2 className="font-display font-extrabold text-3xl mb-3">Ready to Get Started?</h2>
            <p className="text-white/80 mb-6">Join 12,000+ students already preparing smarter.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-600 font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-sm">
                Create Free Account
              </Link>
              <Link to="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/15 border-2 border-white/30 text-white font-semibold rounded-2xl hover:bg-white/25 transition-all text-sm">
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
