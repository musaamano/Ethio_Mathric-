import React from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `When you register, we collect: your full name, email address, phone number (optional), school name (optional), and region. We also collect usage data such as practice session results, exam scores, and study time to power your analytics. We do not collect sensitive personal information such as national ID numbers or financial details beyond what payment gateways require.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use your information to: provide and improve our services, personalise your study experience, show your progress and analytics, display you on the leaderboard (you can opt out), send important notifications about your subscription, and respond to your support requests. We never sell your personal data to third parties.`,
  },
  {
    title: '3. Data Storage & Security',
    content: `Your data is stored on secure servers. Passwords are hashed using bcrypt — we never store plain-text passwords. Access tokens are short-lived (15 minutes). We use HTTPS for all data transmission. We implement rate limiting, input sanitisation, and SQL injection protection throughout the platform.`,
  },
  {
    title: '4. Cookies & Local Storage',
    content: `We use browser local storage to store your authentication token and user preferences (theme, notification settings). We use HttpOnly cookies for refresh tokens. We do not use advertising cookies or tracking pixels. You can clear your browser storage at any time, which will log you out.`,
  },
  {
    title: '5. Leaderboard & Public Information',
    content: `If you participate in the leaderboard, your display name, stream, and exam scores will be visible to other users. You can opt out of the leaderboard in your Settings page at any time. Your email address, phone number, and school name are never shown publicly.`,
  },
  {
    title: '6. Third-Party Services',
    content: `We use Chapa, Telebirr, and SantimPay for payment processing. These services handle your payment information directly — we only receive a transaction reference number and status. We use Google Fonts for typography. These services have their own privacy policies.`,
  },
  {
    title: '7. Data Retention',
    content: `We retain your account data as long as your account is active. If you delete your account, we remove your personal information within 30 days. Anonymised analytics data (aggregated scores with no personal identifiers) may be retained for platform improvement purposes.`,
  },
  {
    title: '8. Your Rights',
    content: `You have the right to: access your personal data (available in your Profile page), correct inaccurate data, delete your account and all associated data, opt out of the leaderboard, and request a copy of your data. To exercise these rights, contact us at privacy@ethiomatric.com.`,
  },
  {
    title: '9. Children\'s Privacy',
    content: `Our service is intended for students aged 15 and above (Grade 12). We do not knowingly collect data from children under 13. If you believe a child under 13 has registered, please contact us immediately.`,
  },
  {
    title: '10. Changes to This Policy',
    content: `We may update this policy from time to time. We will notify you of significant changes via email or an in-app announcement. Continued use of the platform after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact Us',
    content: `For privacy-related questions, contact us at: privacy@ethiomatric.com or through our Contact page. We will respond within 5 business days.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-surface">
      <section className="py-16 bg-hero-gradient">
        <div className="section-container text-center">
          <h1 className="font-display font-extrabold text-4xl text-primary-700 mb-3">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: January 2025</p>
        </div>
      </section>

      <section className="py-16">
        <div className="section-container max-w-3xl">
          <div className="soft-card p-6 mb-8 border border-primary-100 bg-primary-50">
            <p className="text-sm text-primary-700 leading-relaxed">
              <strong>Summary:</strong> We collect only what we need to run the platform. We never sell your data.
              Your passwords are always encrypted. You can delete your account at any time.
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
            <Link to="/terms"   className="btn-outline text-sm px-6 py-3 text-center">Terms of Service</Link>
            <Link to="/contact" className="btn-primary text-sm px-6 py-3 text-center">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
