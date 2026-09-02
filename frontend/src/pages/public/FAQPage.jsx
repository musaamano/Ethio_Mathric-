import React, { useState } from 'react';

const FAQS = [
  {
    category: 'General',
    items: [
      { q: 'What is Ethio Matric Academy?', a: 'Ethio Matric Academy is an online exam preparation platform for Ethiopian Grade 12 students. It provides practice questions, mock exams, study notes, and detailed analytics to help students prepare for the National Matric Examination.' },
      { q: 'Is it free to use?', a: 'Yes! You can register for free and get access to 20 practice questions and sample notes. For full access to all 10,000+ questions, mock exams, and analytics, you need a premium subscription.' },
      { q: 'Which streams are supported?', a: 'Both Natural Science (Physics, Chemistry, Biology, Mathematics, English, ICT) and Social Science (Economics, History, Geography, Mathematics, English, Citizenship) are fully covered.' },
      { q: 'Can I use it on my phone?', a: 'Yes. The platform is fully responsive and works on all devices — phones, tablets, and computers. No app download required.' },
    ],
  },
  {
    category: 'Questions & Content',
    items: [
      { q: 'Where do the questions come from?', a: 'Our questions are curated from past national exam papers, regional mock exams, and original questions created by experienced Ethiopian teachers. All questions align with the national Grade 12 curriculum.' },
      { q: 'Does every question have an explanation?', a: 'Yes. Every single question has a detailed explanation including: why the correct answer is right, why each wrong option is wrong, a memory trick, and common mistakes students make.' },
      { q: 'Can I bookmark questions?', a: 'Yes. You can bookmark any question to save it for later review. Your bookmarks are stored in your account and accessible from your dashboard.' },
      { q: 'How do I report a wrong question?', a: 'There is a "Report" button on every question. Click it, select a reason (wrong answer, typo, unclear, etc.), and submit. Our team reviews all reports.' },
    ],
  },
  {
    category: 'Subscriptions & Payment',
    items: [
      { q: 'What payment methods are accepted?', a: 'We accept Chapa, Telebirr, and SantimPay. These cover most Ethiopian users. Manual bank transfer with admin approval is also available.' },
      { q: 'Can I cancel my subscription?', a: 'Yes. You can cancel anytime. Your access remains active until the end of your current billing period. No refunds for unused time.' },
      { q: 'Is there a family or group plan?', a: 'The 1-Year plan allows up to 2 devices simultaneously. Group/school plans are available — contact us at support@ethiomatric.com.' },
      { q: 'My payment was successful but subscription is not active?', a: 'If you paid via Chapa, activation is automatic. For Telebirr or SantimPay, activation may take up to 1 hour. If it takes longer, contact our support team with your transaction reference number.' },
    ],
  },
  {
    category: 'Technical',
    items: [
      { q: 'Can I use it offline?', a: 'Not currently. The platform requires an internet connection. However, study notes can be read at any time as long as you loaded the page first.' },
      { q: 'What if I log in from a new device?', a: 'For security, we only allow one active session per account. When you log in from a new device, your previous session is automatically terminated. This prevents account sharing.' },
      { q: 'I forgot my password. What do I do?', a: 'Go to the Login page and click "Forgot Password". Enter your email address and we will send you a reset link valid for 1 hour.' },
    ],
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${open ? 'border-primary-300 shadow-soft' : 'border-mint-dark/20'}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-surface transition-colors">
        <span className="font-semibold text-primary-700 text-sm pr-4">{item.q}</span>
        <svg className={`w-5 h-5 text-sage-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-mint-light/60">
          <p className="text-sm text-gray-600 leading-relaxed pt-3">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="bg-surface">
      {/* Hero */}
      <section className="py-20 bg-hero-gradient">
        <div className="section-container text-center">
          <h1 className="font-display font-extrabold text-5xl text-primary-700 mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">Everything you need to know about Ethio Matric Academy.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="section-container max-w-3xl">
          {FAQS.map(cat => (
            <div key={cat.category} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-0.5 w-6 bg-green-gradient rounded-full" />
                <h2 className="font-display font-bold text-primary-600 text-lg">{cat.category}</h2>
              </div>
              <div className="space-y-3">
                {cat.items.map(item => <FAQItem key={item.q} item={item} />)}
              </div>
            </div>
          ))}

          {/* Still have questions */}
          <div className="mt-12 soft-card p-8 text-center bg-primary-50 border border-primary-100">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-display font-bold text-xl text-primary-700 mb-2">Still have questions?</h3>
            <p className="text-gray-500 text-sm mb-5">Our team is happy to help.</p>
            <a href="/contact" className="btn-primary px-8 py-3 text-sm inline-flex">Contact Support</a>
          </div>
        </div>
      </section>
    </div>
  );
}
