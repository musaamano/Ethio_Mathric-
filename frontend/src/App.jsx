import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import PublicLayout    from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminLayout     from './components/layout/AdminLayout';
import PrivateRoute    from './components/common/PrivateRoute';
import AdminRoute      from './components/common/AdminRoute';
import ErrorBoundary   from './components/common/ErrorBoundary';
import LoadingSpinner  from './components/common/LoadingSpinner';

// Eagerly loaded
import HomePage           from './pages/public/HomePage';
import LoginPage          from './pages/public/LoginPage';
import RegisterPage       from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage  from './pages/public/ResetPasswordPage';
import EmailVerifiedPage  from './pages/public/EmailVerifiedPage';
import NotFoundPage       from './pages/public/NotFoundPage';

// Public
const AboutPage    = lazy(() => import('./pages/public/AboutPage'));
const FAQPage      = lazy(() => import('./pages/public/FAQPage'));
const ContactPage  = lazy(() => import('./pages/public/ContactPage'));
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage'));
const PricingPage  = lazy(() => import('./pages/public/PricingPage'));
const PrivacyPage  = lazy(() => import('./pages/public/PrivacyPage'));
const TermsPage    = lazy(() => import('./pages/public/TermsPage'));

// Student
const DashboardHome    = lazy(() => import('./pages/student/DashboardHome'));
const SubjectsPage     = lazy(() => import('./pages/student/SubjectsPage'));
const PracticePage     = lazy(() => import('./pages/student/PracticePage'));
const PastYearPage     = lazy(() => import('./pages/student/PastYearPage'));
const AnalyticsPage    = lazy(() => import('./pages/student/AnalyticsPage'));
const BookmarksPage    = lazy(() => import('./pages/student/BookmarksPage'));
const HistoryPage      = lazy(() => import('./pages/student/HistoryPage'));
const LeaderboardPage  = lazy(() => import('./pages/student/LeaderboardPage'));
const SubscriptionPage = lazy(() => import('./pages/student/SubscriptionPage'));
const ProfilePage      = lazy(() => import('./pages/student/ProfilePage'));
const SettingsPage     = lazy(() => import('./pages/student/SettingsPage'));

// Admin
const AdminDashboard       = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminSubjects        = lazy(() => import('./pages/admin/AdminSubjects'));
const AdminQuestions       = lazy(() => import('./pages/admin/AdminQuestions'));
const AdminQuestionForm    = lazy(() => import('./pages/admin/AdminQuestionForm'));
const AdminImportQuestions = lazy(() => import('./pages/admin/AdminImportQuestions'));
const AdminImportAI        = lazy(() => import('./pages/admin/AdminImportAI'));
const AdminImportLogs      = lazy(() => import('./pages/admin/AdminImportLogs'));
const AdminUsers           = lazy(() => import('./pages/admin/AdminUsers'));
const AdminPayments        = lazy(() => import('./pages/admin/AdminPayments'));
const AdminAnnouncements   = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminReports         = lazy(() => import('./pages/admin/AdminReports'));
const AdminSettings        = lazy(() => import('./pages/admin/AdminSettings'));

const Spin = () => <LoadingSpinner variant="page" text="Loading..." />;

const Wrap = ({ children }) => (
  <PrivateRoute>
    <DashboardLayout>
      <ErrorBoundary>
        <Suspense fallback={<Spin />}>{children}</Suspense>
      </ErrorBoundary>
    </DashboardLayout>
  </PrivateRoute>
);

const AdminWrap = ({ children, superAdminOnly = false }) => (
  <AdminRoute superAdminOnly={superAdminOnly}>
    <AdminLayout>
      <ErrorBoundary>
        <Suspense fallback={<Spin />}>{children}</Suspense>
      </ErrorBoundary>
    </AdminLayout>
  </AdminRoute>
);

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"                    element={<HomePage />} />
      <Route path="/login"               element={<LoginPage />} />
      <Route path="/register"            element={<RegisterPage />} />
      <Route path="/forgot-password"     element={<ForgotPasswordPage />} />
      <Route path="/reset-password"      element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<EmailVerifiedPage />} />

      <Route path="/about"    element={<PublicLayout><Suspense fallback={<Spin />}><AboutPage /></Suspense></PublicLayout>} />
      <Route path="/features" element={<PublicLayout><Suspense fallback={<Spin />}><FeaturesPage /></Suspense></PublicLayout>} />
      <Route path="/pricing"  element={<PublicLayout><Suspense fallback={<Spin />}><PricingPage /></Suspense></PublicLayout>} />
      <Route path="/faq"      element={<PublicLayout><Suspense fallback={<Spin />}><FAQPage /></Suspense></PublicLayout>} />
      <Route path="/contact"  element={<PublicLayout><Suspense fallback={<Spin />}><ContactPage /></Suspense></PublicLayout>} />
      <Route path="/privacy"  element={<PublicLayout><Suspense fallback={<Spin />}><PrivacyPage /></Suspense></PublicLayout>} />
      <Route path="/terms"    element={<PublicLayout><Suspense fallback={<Spin />}><TermsPage /></Suspense></PublicLayout>} />

      {/* Student dashboard */}
      <Route path="/dashboard"                element={<Wrap><DashboardHome /></Wrap>} />
      <Route path="/dashboard/subjects"       element={<Wrap><SubjectsPage /></Wrap>} />
      <Route path="/dashboard/practice"       element={<Wrap><PracticePage /></Wrap>} />
      <Route path="/dashboard/past-year"      element={<Wrap><PastYearPage /></Wrap>} />
      <Route path="/dashboard/analytics"      element={<Wrap><AnalyticsPage /></Wrap>} />
      <Route path="/dashboard/bookmarks"      element={<Wrap><BookmarksPage /></Wrap>} />
      <Route path="/dashboard/history"        element={<Wrap><HistoryPage /></Wrap>} />
      <Route path="/dashboard/leaderboard"    element={<Wrap><LeaderboardPage /></Wrap>} />
      <Route path="/dashboard/subscription"   element={<Wrap><SubscriptionPage /></Wrap>} />
      <Route path="/dashboard/profile"        element={<Wrap><ProfilePage /></Wrap>} />
      <Route path="/dashboard/settings"       element={<Wrap><SettingsPage /></Wrap>} />

      {/* Admin */}
      <Route path="/admin"                        element={<AdminWrap><AdminDashboard /></AdminWrap>} />
      <Route path="/admin/subjects"               element={<AdminWrap><AdminSubjects /></AdminWrap>} />
      <Route path="/admin/questions"              element={<AdminWrap><AdminQuestions /></AdminWrap>} />
      <Route path="/admin/questions/new"          element={<AdminWrap><AdminQuestionForm /></AdminWrap>} />
      <Route path="/admin/questions/:id/edit"     element={<AdminWrap><AdminQuestionForm /></AdminWrap>} />
      <Route path="/admin/questions/import"       element={<AdminWrap><AdminImportQuestions /></AdminWrap>} />
      <Route path="/admin/questions/import-ai"    element={<AdminWrap><AdminImportAI /></AdminWrap>} />
      <Route path="/admin/questions/import-logs"  element={<AdminWrap><AdminImportLogs /></AdminWrap>} />
      <Route path="/admin/users"                  element={<AdminWrap><AdminUsers /></AdminWrap>} />
      <Route path="/admin/payments"               element={<AdminWrap><AdminPayments /></AdminWrap>} />
      <Route path="/admin/announcements"          element={<AdminWrap><AdminAnnouncements /></AdminWrap>} />
      <Route path="/admin/reports"                element={<AdminWrap><AdminReports /></AdminWrap>} />
      <Route path="/admin/analytics"              element={<AdminWrap><AdminDashboard /></AdminWrap>} />
      <Route path="/admin/settings"               element={<AdminWrap superAdminOnly><AdminSettings /></AdminWrap>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
