import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useToast } from '../../components/common/Toast';
import { validators } from '../../utils/helpers';
import authService from '../../services/authService';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="orb w-80 h-80 bg-sage-300/40 -top-20 -right-20" />
      <div className="orb w-56 h-56 bg-mint-dark/30 bottom-0 -left-10" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-md rounded-4xl shadow-glass border border-white/80 p-8 sm:p-10">

          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="mb-5">
              <div className="w-11 h-11 rounded-2xl bg-green-gradient flex items-center justify-center shadow-glow-green">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </Link>

            {!sent ? (
              <>
                <div className="w-14 h-14 bg-mint-light rounded-3xl flex items-center justify-center text-3xl mb-4">🔑</div>
                <h1 className="font-display font-extrabold text-2xl text-primary-700 mb-1">Forgot Password?</h1>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-mint-light rounded-3xl flex items-center justify-center text-3xl mb-4">📬</div>
                <h1 className="font-display font-extrabold text-2xl text-primary-700 mb-1">Check your email</h1>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                  If your email is registered, you'll receive a password reset link within a few minutes.
                </p>
              </>
            )}
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                error={errors.email?.message}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                }
                {...register('email', { required:'Email is required', validate: validators.email })}
              />
              <Button type="submit" fullWidth size="lg" loading={loading}>
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-mint-light rounded-2xl text-sm text-sage-700 text-center">
                Didn't receive it? Check your spam folder or wait a few minutes.
              </div>
              <Button variant="outline" fullWidth onClick={() => setSent(false)}>
                Try a different email
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-sage-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
              </svg>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
