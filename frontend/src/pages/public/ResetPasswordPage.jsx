import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useToast } from '../../components/common/Toast';
import { validators } from '../../utils/helpers';
import authService from '../../services/authService';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ResetPasswordPage() {
  const toast            = useToast();
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const token            = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  // Token missing
  if (!token) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-4xl shadow-glass p-10 text-center max-w-sm">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="font-display font-bold text-xl text-red-600 mb-2">Invalid Reset Link</h2>
          <p className="text-sm text-gray-500 mb-6">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-primary">Request a new link</Link>
        </div>
      </div>
    );
  }

  const onSubmit = async ({ password: newPassword }) => {
    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reset failed. The link may have expired.');
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

            {success ? (
              <>
                <div className="w-14 h-14 bg-mint-light rounded-3xl flex items-center justify-center text-3xl mb-4 animate-bounce-soft">✅</div>
                <h1 className="font-display font-extrabold text-2xl text-primary-700 mb-1">Password Reset!</h1>
                <p className="text-sm text-gray-500 text-center">
                  Your password has been updated. Redirecting to login...
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-mint-light rounded-3xl flex items-center justify-center text-3xl mb-4">🔒</div>
                <h1 className="font-display font-extrabold text-2xl text-primary-700 mb-1">Set New Password</h1>
                <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
              </>
            )}
          </div>

          {!success && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <Input
                label="New Password"
                name="password"
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required
                error={errors.password?.message}
                {...register('password', { required:'Required', validate: validators.strongPassword })}
              />
              <Input
                label="Confirm New Password"
                name="confirm_password"
                type="password"
                placeholder="Re-enter your password"
                required
                error={errors.confirm_password?.message}
                {...register('confirm_password', {
                  required:'Required',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />

              {/* Strength indicator */}
              <div className="flex gap-1">
                {[
                  password?.length >= 8,
                  /[A-Z]/.test(password),
                  /[0-9]/.test(password),
                  password?.length >= 12,
                ].map((ok, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${ok ? 'bg-green-gradient' : 'bg-gray-100'}`} />
                ))}
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading}>
                Reset Password
              </Button>
            </form>
          )}

          {success && (
            <Link to="/login" className="flex items-center justify-center gap-2 btn-primary w-full justify-center py-3 text-sm">
              Go to Login
            </Link>
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
