import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import paymentService from '../../services/paymentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PLAN_UI = [
  { tag: null,          highlight: false },
  { tag: 'Most Popular', highlight: true  },
  { tag: 'Best Value',  highlight: false },
  { tag: 'Max Savings', highlight: false },
];

const PLAN_FEATURES = [
  ['All subjects','10,000+ practice questions','Practice & Past-Year modes','Detailed explanations','Progress analytics','Leaderboard access','Bookmark questions','Email support'],
  ['Everything in 1 Month','Save 17% vs monthly','Priority support','Exam reminders','Detailed progress reports','Performance trends','2 devices'],
  ['Everything in 3 Months','Save 29% vs monthly','Personalised study plan','Performance prediction','Exam importance filter','Early access features','Certificate of completion','3 devices'],
  ['Everything in 6 Months','Save 37% vs monthly','Dedicated student advisor','Past-year question archive','Priority queue support','Custom study schedule','Family plan (3 devices)','All future features free'],
];

const COMPARE = [
  { feature: 'Practice Questions',    free: '20 only',     premium: '✅ 10,000+' },
  { feature: 'Past-Year Questions',   free: '❌',           premium: '✅ All years' },
  { feature: 'Detailed Explanations', free: '❌',           premium: '✅ All questions' },
  { feature: 'Progress Analytics',    free: '❌',           premium: '✅ Full charts' },
  { feature: 'Leaderboard',           free: 'View only',    premium: '✅ Participate' },
  { feature: 'Bookmarks',             free: '❌',           premium: '✅ Unlimited' },
  { feature: 'Weak Subject Alerts',   free: '❌',           premium: '✅ Subject-level' },
  { feature: 'All Subjects',          free: '❌',           premium: '✅ Both streams' },
  { feature: 'Support',               free: 'Community',    premium: '✅ Priority email' },
];

export default function PricingPage() {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentService.getPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface">
      {/* Hero */}
      <section className="py-20 bg-hero-gradient relative overflow-hidden">
        <div className="orb w-96 h-96 bg-sage-300/40 -top-20 -right-20" />
        <div className="section-container relative z-10 text-center">
          <div className="badge bg-white/70 border border-sage-200 text-primary-600 mb-4 mx-auto w-fit">💳 Simple Pricing</div>
          <h1 className="font-display font-extrabold text-5xl text-primary-700 mb-4">
            Affordable Plans for<br /><span className="gradient-text">Every Student</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            No hidden fees. Cancel anytime. Pay with Chapa, Telebirr, or SantimPay.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20">
        <div className="section-container">
          {loading ? (
            <LoadingSpinner variant="dots" text="Loading plans..." className="py-20" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
              {plans.map((plan, i) => {
                const ui       = PLAN_UI[i] || PLAN_UI[0];
                const features = PLAN_FEATURES[i] || PLAN_FEATURES[0];
                const monthly  = Math.round(plan.price_etb / (plan.duration_days / 30));
                return (
                  <div key={plan.id}
                    className={`relative rounded-3xl border-2 p-6 flex flex-col hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 ${
                      ui.highlight
                        ? 'border-primary-500 bg-white ring-4 ring-primary-100 shadow-glow-green'
                        : 'border-mint-dark/20 bg-white'
                    }`}>
                    {ui.tag && (
                      <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white shadow-soft whitespace-nowrap ${ui.highlight ? 'bg-green-gradient' : 'bg-warm'}`}>
                        {ui.tag}
                      </div>
                    )}
                    <h3 className="font-display font-bold text-primary-700 text-lg mb-3">{plan.name}</h3>
                    <div className="mb-1">
                      <span className="font-display font-extrabold text-4xl text-primary-600">
                        {parseInt(plan.price_etb).toLocaleString()}
                      </span>
                      <span className="text-gray-400 text-sm"> ETB / {plan.duration_days === 30 ? 'month' : plan.duration_days === 90 ? '3 months' : plan.duration_days === 180 ? '6 months' : 'year'}</span>
                    </div>
                    <p className="text-xs text-sage-600 font-semibold mb-5">≈ {monthly} ETB per month</p>
                    <ul className="space-y-2 flex-1 mb-6">
                      {features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/register"
                      className={`w-full text-center py-3 rounded-2xl font-semibold text-sm transition-all ${
                        ui.highlight
                          ? 'bg-green-gradient text-white shadow-glow-green hover:shadow-card-hover hover:scale-[1.02]'
                          : 'border-2 border-primary-400 text-primary-600 hover:bg-primary-50 hover:scale-[1.01]'
                      }`}>
                      Get Started
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Free tier */}
          <div className="soft-card p-7 border border-mint-dark/20 mb-16">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <div className="badge bg-mint-light text-sage-600 border border-sage-200 mb-2 w-fit">🎁 Free Forever</div>
                <h3 className="font-display font-bold text-xl text-primary-700">Try before you subscribe</h3>
                <p className="text-sm text-gray-500 mt-1">No credit card required. Access free features instantly.</p>
              </div>
              <Link to="/register" className="btn-outline flex-shrink-0 px-8 py-3 text-sm">Create Free Account →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {['✅ Register & login','✅ 20 free questions','✅ Sample notes','✅ Leaderboard viewing'].map(f => (
                <div key={f} className="bg-mint-light rounded-2xl px-3 py-2.5 text-xs font-medium text-sage-700">{f}</div>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          <div>
            <h2 className="font-display font-extrabold text-3xl text-primary-700 text-center mb-8">Free vs Premium</h2>
            <div className="soft-card overflow-hidden">
              <div className="grid grid-cols-3 px-5 py-3 bg-surface border-b border-mint-light/60 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div>Feature</div>
                <div className="text-center">Free</div>
                <div className="text-center text-primary-600">Premium</div>
              </div>
              {COMPARE.map((row, i) => (
                <div key={row.feature}
                  className={`grid grid-cols-3 px-5 py-3.5 text-sm items-center ${i % 2 === 0 ? 'bg-white' : 'bg-surface/50'}`}>
                  <div className="font-medium text-gray-700">{row.feature}</div>
                  <div className="text-center text-gray-400">{row.free}</div>
                  <div className="text-center font-semibold text-sage-600">{row.premium}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Payment methods */}
      <section className="py-12 bg-white border-t border-mint-light/60">
        <div className="section-container text-center">
          <p className="text-sm text-gray-400 font-medium mb-4">Secure payment accepted via</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {['🟡 Chapa','📱 Telebirr','💚 SantimPay'].map(p => (
              <span key={p} className="px-5 py-2.5 bg-surface rounded-2xl border border-mint-dark/20 text-sm font-semibold text-gray-600 shadow-soft">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ link */}
      <section className="py-16 bg-surface">
        <div className="section-container text-center">
          <h2 className="font-display font-bold text-2xl text-primary-700 mb-2">Have questions about pricing?</h2>
          <p className="text-gray-500 text-sm mb-5">Check our FAQ or contact us directly.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/faq"     className="btn-outline text-sm px-6 py-2.5">View FAQ</Link>
            <Link to="/contact" className="btn-primary text-sm px-6 py-2.5">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
