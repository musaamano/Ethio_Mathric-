/**
 * LoginPage.jsx
 * Full login with validation, device fingerprint, remember me,
 * password show/hide, and toast feedback.
 */
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import { getDeviceId, validators } from '../../utils/helpers';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';
import authService from '../../services/authService';

export default function LoginPage() {
  const { login }      = useAuth();
  const toast          = useToast();
  const navigate       = useNavigate();
  const location       = useLocation();
  const from           = location.state?.from?.pathname || '/dashboard';

  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '', remember_me: false } });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login({
        email:       data.email,
        password:    data.password,
        remember_me: data.remember_me,
        device_id:   getDeviceId(),
      });
      toast.success(`Welcome back, ${user.first_name}!`);
      // Route based on role
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email); // Use the outer form data email
        toast.error(errData.message || 'Email not verified. Please check your inbox.');
      } else {
        toast.error(errData?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      // Assuming we have resendVerification in authService (needs to be added)
      await authService.resendVerification(unverifiedEmail);
      toast.success('Verification link sent! Check your inbox.');
      setUnverifiedEmail(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend. Try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Orbs */}
      <div className="orb w-96 h-96 bg-sage-300/40 -top-20 -right-20" />
      <div className="orb w-64 h-64 bg-mint-dark/30 bottom-0 -left-16" />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage:'radial-gradient(circle,#2D6A4F 1px,transparent 1px)', backgroundSize:'32px 32px' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-4xl shadow-glass border border-white/80 p-8 sm:p-10">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-green-gradient flex items-center justify-center shadow-glow-green">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <div className="font-display font-bold text-primary-600 text-lg leading-tight">Ethio Matric</div>
                <div className="text-[10px] font-medium text-sage-500 tracking-widest uppercase">Academy</div>
              </div>
            </Link>
            <h1 className="font-display font-extrabold text-2xl text-primary-700 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500">Sign in to continue your preparation</p>
          </div>

          {/* Form */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
              {...register('email', {
                required: 'Email is required',
                validate: validators.email,
              })}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              error={errors.password?.message}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              {...register('password', { required: 'Password is required' })}
            />

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register('remember_me')}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-gradient transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-4" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-primary-600 hover:text-sage-500 transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Sign In
            </Button>
            
            {unverifiedEmail && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col items-center">
                <p className="text-sm text-orange-800 text-center mb-3">
                  Didn't receive the verification email?
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResend} 
                  loading={resending}
                  className="w-full max-w-[200px]"
                >
                  Resend Link
                </Button>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-mint-dark/20" />
            <span className="text-xs text-gray-400 font-medium">New to Ethio Matric?</span>
            <div className="flex-1 h-px bg-mint-dark/20" />
          </div>

          {/* Register link */}
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-2xl border-2 border-primary-200 text-primary-600 font-semibold text-sm hover:bg-primary-50 hover:border-primary-400 transition-all duration-200"
          >
            Create a Free Account
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          By signing in you agree to our{' '}
          <Link to="/terms" className="text-primary-600 hover:underline">Terms</Link> and{' '}
          <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
