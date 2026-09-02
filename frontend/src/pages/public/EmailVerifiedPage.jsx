import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import authService from '../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function EmailVerifiedPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-md rounded-4xl shadow-glass border border-white/80 p-10 max-w-sm w-full text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-green-gradient flex items-center justify-center shadow-glow-green">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-display font-bold text-primary-600 text-base">Ethio Matric Academy</span>
        </Link>

        {status === 'loading' && (
          <LoadingSpinner size="lg" text="Verifying your email..." className="py-6" />
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-mint-light rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 animate-bounce-soft">✅</div>
            <h1 className="font-display font-extrabold text-2xl text-primary-700 mb-2">Email Verified!</h1>
            <p className="text-sm text-gray-500 mb-6">Your email has been confirmed. You can now log in to your account.</p>
            <Link to="/login" className="btn-primary w-full justify-center py-3 text-sm">
              Go to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5">❌</div>
            <h1 className="font-display font-extrabold text-2xl text-red-600 mb-2">Verification Failed</h1>
            <p className="text-sm text-gray-500 mb-6">This link is invalid or has already expired. Please request a new one.</p>
            <div className="space-y-3">
              <Link to="/login" className="btn-primary w-full justify-center py-3 text-sm block text-center">
                Go to Login
              </Link>
              <Link to="/register" className="btn-outline w-full justify-center py-3 text-sm block text-center">
                Create New Account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
