import React, { useState, useEffect, useRef } from 'react';

const TESTIMONIALS = [
  {
    name: 'Selam Bekele',
    location: 'Addis Ababa',
    stream: 'Natural Science',
    score: '96%',
    emoji: '👩🏽‍🎓',
    color: 'bg-mint-light border-sage-200',
    text: "I used Ethio Matric Academy every day for 3 months before my exam. The Physics and Chemistry explanations are incredible — I finally understood topics I had been struggling with for years. I scored 96% and got into my dream faculty!",
    subject: 'Physics & Chemistry',
  },
  {
    name: 'Dawit Tesfaye',
    location: 'Bahir Dar, Amhara',
    stream: 'Natural Science',
    score: '91%',
    emoji: '🧑🏿‍🎓',
    color: 'bg-primary-50 border-primary-100',
    text: "The mock exams felt exactly like the real thing. The countdown timer made me practice time management properly. My leaderboard rank motivated me every single day. I went from 60% to 91% in 2 months!",
    subject: 'Mathematics',
  },
  {
    name: 'Hana Girma',
    location: 'Hawassa, SNNPR',
    stream: 'Social Science',
    score: '88%',
    emoji: '👩🏾‍🎓',
    color: 'bg-warm-light border-warm/20',
    text: "The Economics and History questions with full explanations changed everything for me. I love how it tells you exactly why each wrong answer is wrong. The daily quiz kept me consistent throughout the exam season.",
    subject: 'Economics & History',
  },
  {
    name: 'Abel Mekonen',
    location: 'Mekelle, Tigray',
    stream: 'Natural Science',
    score: '93%',
    emoji: '🧑🏾‍🎓',
    color: 'bg-mint-light border-sage-200',
    text: "As a student from a rural area, I didn't have access to good tutors. Ethio Matric Academy was my tutor, my exam practice partner, and my motivation. The Biology notes are like a complete textbook!",
    subject: 'Biology',
  },
  {
    name: 'Tigist Alemu',
    location: 'Dire Dawa',
    stream: 'Social Science',
    score: '89%',
    emoji: '👩🏽‍🎓',
    color: 'bg-primary-50 border-primary-100',
    text: "I recommended this to all my classmates. The leaderboard competition was so motivating — I would study extra just to move up a rank! The progress charts showed me exactly where to focus each week.",
    subject: 'Geography',
  },
  {
    name: 'Kidus Haile',
    location: 'Adama, Oromia',
    stream: 'Natural Science',
    score: '94%',
    emoji: '🧑🏽‍🎓',
    color: 'bg-warm-light border-warm/20',
    text: "The 7-day streak system is genius. I never missed a daily quiz for 60 days straight! The memory tricks in the explanations helped me remember formulas during the actual exam. Absolutely worth every birr.",
    subject: 'Mathematics & ICT',
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused]   = useState(false);
  const ref = useRef(null);
  const [inView, setInView]   = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  // Visible on desktop: show 3 at a time
  const visible = [
    TESTIMONIALS[current % TESTIMONIALS.length],
    TESTIMONIALS[(current + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(current + 2) % TESTIMONIALS.length],
  ];

  return (
    <section ref={ref} className="py-24 bg-surface relative overflow-hidden">
      <div className="orb w-80 h-80 bg-sage-300/20 top-0 right-0" />

      <div className="section-container relative z-10">

        {/* Header */}
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="badge bg-mint-light text-primary-600 border border-sage-200 mb-4 mx-auto w-fit">
            💬 Student Stories
          </div>
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-primary-700 mb-4">
            Real Students, <span className="gradient-text">Real Results</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Thousands of Grade 12 students have already transformed their Matric preparation.
          </p>
        </div>

        {/* Cards — desktop shows 3, mobile shows 1 */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {visible.map((t, i) => (
            <div
              key={t.name + i}
              className={`soft-card border ${t.color} p-6 flex flex-col group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} className="w-4 h-4 text-warm fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-5 italic">"{t.text}"</p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-mint-dark/10">
                <div className="w-11 h-11 rounded-2xl bg-white border border-mint-dark/20 flex items-center justify-center text-2xl shadow-soft">
                  {t.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold text-primary-700 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.location} · {t.stream}</p>
                </div>
                <div className="text-right">
                  <div className="font-display font-extrabold text-sage-500 text-lg">{t.score}</div>
                  <div className="text-[10px] text-gray-400">Final Score</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dot navigation */}
        <div className="flex justify-center gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setPaused(true); }}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 h-2.5 bg-green-gradient'
                  : 'w-2.5 h-2.5 bg-mint-dark/30 hover:bg-sage-400'
              }`}
              aria-label={`View testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
