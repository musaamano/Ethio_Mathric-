import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function CTASection() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 bg-white relative overflow-hidden">
      <div className="section-container relative z-10">
        <div
          className={`relative rounded-4xl overflow-hidden bg-green-gradient p-10 lg:p-16 text-center shadow-glow-green transition-all duration-700 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          {/* Background orbs */}
          <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-sage-300/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-sm font-semibold text-white mb-6">
              <span className="w-2 h-2 bg-warm rounded-full animate-pulse" />
              The Matric Exam is Coming — Are You Ready?
            </div>

            <h2 className="font-display font-extrabold text-4xl lg:text-6xl text-white mb-5 leading-[1.1]">
              Start Practicing Today.
              <br />
              <span className="text-mint-light">Your Future Starts Here.</span>
            </h2>

            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Join over <strong className="text-white">12,000 Ethiopian students</strong> who use Ethio Matric Academy 
              to practice smarter, score higher, and build the future they deserve.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-primary-600 font-bold rounded-2xl text-base shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Create Free Account
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white/15 backdrop-blur-sm border-2 border-white/40 text-white font-semibold rounded-2xl text-base hover:bg-white/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                View Pricing Plans
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-mint-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
                Free to start
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-mint-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-mint-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
                Cancel anytime
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-mint-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
                10,000+ questions
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
