import React from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: 'By creating an account on Ethio Matric Academy ("the Platform"), you agree to these Terms of Service. If you do not agree, do not use the Platform. We may update these terms at any time — continued use after updates means acceptance.',
  },
  {
    title: '2. Eligibility',
    content: 'The Platform is intended for Ethiopian Grade 12 students aged 15 and above. By registering, you confirm that you are at least 15 years old. Parents or guardians may register on behalf of younger students.',
  },
  {
    title: '3. Account Responsibility',
    content: 'You are responsible for maintaining the confidentiality of your password and for all activities under your account. You agree to notify us immediately of any unauthorised use. We allow one active session per account to prevent sharing — logging in from a new device terminates previous sessions.',
  },
  {
    title: '4. Subscription & Payments',
    content: 'Premium features require an active subscription. Prices are listed in Ethiopian Birr (ETB). Subscriptions are non-refundable once activated, except where required by Ethiopian consumer protection law. We reserve the right to change pricing with 30 days notice. Free users receive access to 20 practice questions and sample notes only.',
  },
  {
    title: '5. Acceptable Use',
    content: 'You agree not to: share your account credentials with others, attempt to extract or scrape our question bank, reverse-engineer the Platform, use the Platform for commercial purposes, upload malicious content, or attempt to gain unauthorised access to our systems. Violations may result in immediate account termination without refund.',
  },
  {
    title: '6. Content Ownership',
    content: 'All questions, explanations, study notes, and content on the Platform are owned by Ethio Matric Academy and protected by copyright. You may use content for personal study only. Reproducing, distributing, or selling our content in any form is strictly prohibited.',
  },
  {
    title: '7. User-Generated Content',
    content: 'By submitting question reports or feedback, you grant us a non-exclusive, royalty-free licence to use that content to improve the Platform. You retain ownership of your own data.',
  },
  {
    title: '8. Availability & Uptime',
    content: 'We strive for 99% uptime but do not guarantee uninterrupted service. We may perform maintenance, which we will announce in advance when possible. We are not liable for losses resulting from downtime.',
  },
  {
    title: '9. Disclaimers',
    content: 'The Platform is provided "as is." While we make every effort to ensure accuracy, we do not guarantee that our content is error-free or that using our Platform will result in specific exam scores. We are not affiliated with the Ethiopian Ministry of Education.',
  },
  {
    title: '10. Limitation of Liability',
    content: 'Ethio Matric Academy shall not be liable for any indirect, incidental, or consequential damages arising from use of the Platform, including exam results. Our total liability to you shall not exceed the amount you paid in the 3 months prior to any claim.',
  },
  {
    title: '11. Termination',
    content: 'We may terminate or suspend your account for violations of these Terms. You may delete your account at any time from the Settings page. Upon termination, your right to access the Platform ceases immediately.',
  },
  {
    title: '12. Governing Law',
    content: 'These Terms are governed by the laws of the Federal Democratic Republic of Ethiopia. Disputes shall be resolved in the courts of Addis Ababa.',
  },
  {
    title: '13. Contact',
    content: 'For questions about these Terms, contact legal@ethiomatric.com.',
  },
];

export default function TermsPage() {
  return (
    <div className="bg-surface">
      <section className="py-16 bg-hero-gradient">
        <div className="section-container text-center">
          <h1 className="font-display font-extrabold text-4xl text-primary-700 mb-3">Terms of Service</h1>
          <p className="text-gray-500">Last updated: January 2025</p>
        </div>
      </section>

      <section className="py-16">
        <div className="section-container max-w-3xl">
          <div className="soft-card p-6 mb-8 border border-warm/20 bg-warm-light/40">
            <p className="text-sm text-warm-dark leading-relaxed">
              <strong>⚠️ Important:</strong> Please read these terms carefully before using Ethio Matric Academy.
              By creating an account, you agree to these terms.
            </p>
          </div>

          <div className="space-y-8">
            {SECTIONS.map(s => (
              <div key={s.title}>
                <h2 className="font-display font-bold text-lg text-primary-700 mb-3">{s.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-3">
            <Link to="/privacy" className="btn-outline text-sm px-6 py-3 text-center">Privacy Policy</Link>
            <Link to="/contact" className="btn-primary text-sm px-6 py-3 text-center">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
