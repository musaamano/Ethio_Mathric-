import React, { useRef, useEffect, useState } from 'react';

const STEPS = [
  {
    step: '01',
    icon: '📝',
    title: 'Create a Free Account',
    desc: 'Sign up in 60 seconds. Choose your stream — Natural Science or Social Science — and start immediately.',
    color: 'bg-mint-light',
    iconBg: 'bg-green-gradient',
    accent: 'text-sage-600',
  },
  {
    step: '02',
    icon: '📚',
    title: 'Choose Your Subject',
    desc: 'Browse all Grade 12 subjects organised by stream. Choose a subject and start practicing immediately.',
    color: 'bg-primary-50',
    iconBg: 'bg-green-gradient',
    accent: 'text-primary-600',
  },
  {
    step: '03',
    icon: '⚡',
    title: 'Practice & Learn',
    desc: 'Answer questions, get instant feedback with full explanations, memory tricks, and common mistake alerts.',
    color: 'bg-warm-light',
    iconBg: 'bg-warm-gradient',
    accent: 'text-warm-dark',
  },
  {
    step: '04',
    icon: '🎓',
    title: 'Track & Ace the Exam',
    desc: 'Monitor your progress with detailed analytics. Identify your weak subjects and improve with targeted practice.',
    color: 'bg-mint-light',
    iconBg: 'bg-green-gradient',
    accent: 'text-sage-600',
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 bg-white relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #2D6A4F 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />

      <div className="section-container relative z-10">

        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="badge bg-primary-50 text-primary-600 border border-primary-100 mb-4 mx-auto w-fit">
            🗺️ Your Journey
          </div>
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-primary-700 mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Four simple steps from sign-up to exam day success.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">

          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-sage-300 via-primary-300 to-sage-300 z-0" />

          {STEPS.map((s, i) => (
            <div
              key={s.step}
              className={`relative z-10 flex flex-col items-center text-center group transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Step circle */}
              <div className="relative mb-5">
                <div className={`w-20 h-20 rounded-3xl ${s.color} flex items-center justify-center text-4xl border-2 border-white shadow-card group-hover:scale-110 group-hover:shadow-glow-green transition-all duration-300`}>
                  {s.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-green-gradient text-white text-xs font-bold flex items-center justify-center shadow-glow-green">
                  {s.step}
                </div>
              </div>

              <h3 className={`font-display font-bold text-lg ${s.accent} mb-2`}>{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-14 transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <a href="/register" className="btn-primary px-10 py-4 text-base">
            Start Your Journey — It's Free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
