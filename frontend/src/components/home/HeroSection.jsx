import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ── Animated floating card component ── */
function FloatingCard({ className, children, delay = '0s' }) {
  return (
    <div
      className={`absolute glass-card px-4 py-3 shadow-glass animate-float ${className}`}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

/* ── Typing animation hook ── */
function useTyping(words, speed = 80, pause = 2000) {
  const [idx, setIdx]         = useState(0);
  const [text, setText]       = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[idx];
    let timeout;
    if (!deleting && text === word) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && text === '') {
      setDeleting(false);
      setIdx(i => (i + 1) % words.length);
    } else {
      timeout = setTimeout(() => {
        setText(prev => deleting ? prev.slice(0, -1) : word.slice(0, prev.length + 1));
      }, deleting ? speed / 2 : speed);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, idx, words, speed, pause]);

  return text;
}

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'History', 'Geography'];

export default function HeroSection() {
  const typedWord = useTyping(SUBJECTS, 90, 1800);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">

      {/* ── Background ── */}
      <div className="absolute inset-0 bg-hero-gradient" />

      {/* Decorative orbs */}
      <div className="orb w-[500px] h-[500px] bg-sage-300 top-[-100px] right-[-100px] opacity-40" />
      <div className="orb w-[350px] h-[350px] bg-mint-dark bottom-[-80px] left-[-80px] opacity-30" />
      <div className="orb w-[200px] h-[200px] bg-warm/40 top-1/3 right-1/4 opacity-25" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, #2D6A4F 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="section-container relative z-10 py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left: Text content ── */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-mint-dark/30 rounded-full text-sm font-semibold text-primary-600 mb-6 shadow-soft">
              <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse-green" />
              🇪🇹 #1 Matric Prep Platform in Ethiopia
            </div>

            {/* Headline */}
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-primary-700 leading-[1.1] mb-4">
              Master{' '}
              <span className="relative inline-block">
                <span className="gradient-text">{typedWord}</span>
                <span className="animate-pulse text-sage-500">|</span>
                {/* underline decoration */}
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M0 6 Q50 0 100 5 Q150 10 200 4" stroke="#52B788" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
              <br />
              for the Matric Exam
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
              Practice with <strong className="text-primary-600">10,000+ past exam questions</strong>, 
              take timed mock exams, track your progress, and join thousands of 
              Grade 12 students who aced their Matric.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/register"
                className="btn-primary text-base px-8 py-4 rounded-2xl animate-pulse-green"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Free Today
              </Link>
              <Link
                to="/features"
                className="btn-outline text-base px-8 py-4 rounded-2xl bg-white/70 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                See How It Works
              </Link>
            </div>

            {/* Social proof avatars */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['🧑🏾‍🎓','👩🏽‍🎓','🧑🏿‍🎓','👩🏾‍🎓','🧑🏽‍🎓'].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-white border-2 border-white shadow-soft flex items-center justify-center text-lg ring-2 ring-mint-light"
                    style={{ zIndex: 5 - i }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-3.5 h-3.5 text-warm fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Trusted by <strong className="text-primary-600">12,000+</strong> students
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: Illustration / Dashboard preview ── */}
          <div
            className={`relative h-[520px] lg:h-[600px] transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {/* Main dashboard card */}
            <div className="absolute inset-x-0 mx-auto lg:inset-auto lg:left-8 lg:right-0 lg:top-8 glass-card p-5 shadow-glass max-w-sm">
              {/* Mock card header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Your Progress</p>
                  <p className="font-display font-bold text-primary-600 text-lg">Physics</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-gradient flex items-center justify-center shadow-glow-green">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Completion</span>
                  <span className="font-semibold text-primary-600">72%</span>
                </div>
                <div className="h-2.5 bg-mint-light rounded-full overflow-hidden">
                  <div className="h-full w-[72%] bg-green-gradient rounded-full transition-all duration-1000" />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Correct',  value: '86%',  color: 'text-sage-600',   bg: 'bg-mint-light' },
                  { label: 'Questions', value: '124',  color: 'text-primary-600', bg: 'bg-primary-50' },
                  { label: 'Streak',   value: '7d',   color: 'text-warm-dark',   bg: 'bg-warm-light' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-2.5 text-center`}>
                    <p className={`font-display font-bold text-lg ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Mini bar chart */}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">This Week</p>
                <div className="flex items-end gap-1.5 h-14">
                  {[40, 65, 55, 80, 70, 90, 72].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          i === 6 ? 'bg-green-gradient shadow-glow-green' : 'bg-mint-dark/50'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[9px] text-gray-400">
                        {['M','T','W','T','F','S','S'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <FloatingCard className="top-4 -left-4 lg:-left-8" delay="0s">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-warm-light rounded-xl flex items-center justify-center text-lg">🏆</div>
                <div>
                  <p className="text-xs font-bold text-primary-700">Rank #12</p>
                  <p className="text-[10px] text-gray-400">National Leaderboard</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard className="bottom-24 -left-6 lg:-left-12" delay="1.5s">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-mint-light rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary-700">Correct Answer!</p>
                  <p className="text-[10px] text-gray-400">Newton's 2nd Law</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard className="bottom-4 right-0 lg:-right-4" delay="0.8s">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center text-base">🔥</div>
                <div>
                  <p className="text-xs font-bold text-primary-700">7-Day Streak</p>
                  <p className="text-[10px] text-gray-400">Keep it up!</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard className="top-1/2 -right-2 lg:-right-10 -translate-y-1/2" delay="2s">
              <div className="text-center px-1">
                <div className="text-2xl mb-0.5">📈</div>
                <p className="text-xs font-bold text-primary-700">+24%</p>
                <p className="text-[10px] text-gray-400">This month</p>
              </div>
            </FloatingCard>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full">
          <path d="M0 80V40C240 0 480 80 720 40S1200 0 1440 40V80H0Z" fill="#F0F7F4"/>
        </svg>
      </div>
    </section>
  );
}
