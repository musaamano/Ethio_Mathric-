/**
 * PricingSection.jsx — Loads plans from the API. Falls back to defaults.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import paymentService from '../../services/paymentService';

// Visual config per plan (matched by sort_order / index)
const PLAN_UI = [
  { tag: null,         color: 'border-mint-dark/30 bg-white',          btnClass: 'btn-outline' },
  { tag: 'Popular',    color: 'border-sage-300 bg-white ring-2 ring-sage-300/40', btnClass: 'btn-primary' },
  { tag: 'Best Value', color: 'border-primary-200 bg-primary-50',       btnClass: 'btn-primary' },
  { tag: 'Max Savings',color: 'border-warm/30 bg-warm-light/40',        btnClass: 'btn-warm'    },
];

const PLAN_FEATURES = [
  ['All subjects','10,000+ practice questions','Past-year questions','Progress analytics','Leaderboard access','Bookmark questions'],
  ['Everything in 1 Month','Save 17% vs monthly','Priority support','Exam reminders','Progress reports'],
  ['Everything in 3 Months','Save 29% vs monthly','Personalised study plan','Performance prediction','Family sharing (2 devices)','Certificate of completion'],
  ['Everything in 6 Months','Save 37% vs monthly','3 devices','Early access to new features','Past-year archive','Dedicated student advisor'],
];

const FREE_FEATURES = [
  { text: 'Free registration',          ok: true  },
  { text: '20 free practice questions', ok: true  },
  { text: 'Leaderboard viewing',        ok: true  },
  { text: 'Full question bank',         ok: false },
  { text: 'Past-Year Questions',        ok: false },
  { text: 'Analytics & progress',       ok: false },
];

export default function PricingSection() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [plans, setPlans]   = useState([]);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Load real plans from API
  useEffect(() => {
    paymentService.getPlans().then(setPlans).catch(() => {});
  }, []);

  return (
    <section id="pricing" ref={ref} className="py-24 bg-white relative overflow-hidden">
      <div className="orb w-96 h-96 bg-mint-dark/15 -top-20 -right-20" />
      <div className="orb w-72 h-72 bg-sage-300/15 bottom-0 left-0" />

      <div className="section-container relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="badge bg-mint-light text-primary-600 border border-sage-200 mb-4 mx-auto w-fit">💳 Pricing</div>
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-primary-700 mb-4">
            Simple, <span className="gradient-text">Affordable</span> Plans
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            No hidden fees. Cancel anytime. Pay via Chapa, Telebirr, or SantimPay.
          </p>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {plans.map((plan, i) => {
            const ui       = PLAN_UI[i] || PLAN_UI[0];
            const features = PLAN_FEATURES[i] || PLAN_FEATURES[0];
            const monthly  = Math.round(plan.price_etb / (plan.duration_days / 30));
            return (
              <div key={plan.id}
                className={`relative rounded-3xl border-2 ${ui.color} p-6 flex flex-col group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}>
                {ui.tag && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white shadow-soft ${ui.btnClass === 'btn-warm' ? 'bg-warm-gradient' : 'bg-green-gradient'}`}>
                    {ui.tag}
                  </div>
                )}
                <h3 className="font-display font-bold text-primary-700 text-lg mb-3">{plan.name}</h3>
                <div className="mb-1">
                  <span className="font-display font-extrabold text-4xl text-primary-600">
                    {parseInt(plan.price_etb).toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm font-medium"> ETB</span>
                </div>
                <p className="text-xs text-sage-600 font-semibold mb-5">≈ {monthly} ETB / month</p>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`${ui.btnClass} w-full justify-center text-sm py-3`}>
                  Get Started
                </Link>
              </div>
            );
          })}

          {/* Show skeletons while loading */}
          {plans.length === 0 && [1,2,3,4].map(i => (
            <div key={i} className="rounded-3xl border-2 border-mint-dark/10 bg-white p-6 animate-pulse">
              <div className="h-5 bg-mint-light rounded-xl w-24 mb-4" />
              <div className="h-10 bg-mint-light rounded-xl w-32 mb-6" />
              <div className="space-y-2">
                {[1,2,3,4,5].map(j => <div key={j} className="h-3 bg-mint-light rounded-full" />)}
              </div>
            </div>
          ))}
        </div>

        {/* Free tier */}
        <div className={`soft-card border border-mint-dark/20 p-6 lg:p-8 transition-all duration-700 delay-400 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="badge bg-mint-light text-sage-600 border border-sage-200 mb-3 w-fit">🎁 Free Tier</div>
              <h3 className="font-display font-bold text-primary-700 text-xl mb-1">Start for Free — No Credit Card Required</h3>
              <p className="text-gray-500 text-sm">Create an account and get instant access to:</p>
            </div>
            <Link to="/register" className="btn-outline px-8 py-3 text-sm flex-shrink-0">Create Free Account</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-5">
            {FREE_FEATURES.map(f => (
              <div key={f.text} className={`px-3 py-2 rounded-xl text-xs font-medium text-center ${f.ok ? 'bg-mint-light text-sage-700' : 'bg-gray-50 text-gray-400'}`}>
                {f.ok ? '✅' : '❌'} {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className={`mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-sm text-gray-400 font-medium">Secure payment via:</p>
          <div className="flex items-center gap-3">
            {['🟡 Chapa','📱 Telebirr','💚 SantimPay'].map(p => (
              <span key={p} className="px-4 py-2 bg-white rounded-xl border border-mint-dark/20 text-xs font-semibold text-gray-600 shadow-soft">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
