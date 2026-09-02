/**
 * RegisterPage.jsx
 * Full registration: name, email, password, stream, school, region.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import { validators, STREAM_OPTIONS, ETHIOPIAN_REGIONS } from '../../utils/helpers';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';

const STEPS = ['Account', 'Profile', 'Stream'];

export default function RegisterPage() {
  const { login }   = useAuth();
  const toast       = useToast();
  const navigate    = useNavigate();
  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [selectedStream, setSelectedStream] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const nextStep = async () => {
    let fields = [];
    if (step === 0) fields = ['first_name', 'last_name', 'email'];
    if (step === 1) fields = ['password', 'confirm_password'];
    const valid = await trigger(fields);
    if (valid) setStep(s => s + 1);
  };

  const onSubmit = async (data) => {
    if (!selectedStream) { toast.warning('Please select your stream'); return; }
    setLoading(true);
    try {
      // Import authService directly to call register first
      const { default: authService } = await import('../../services/authService');
      await authService.register({
        first_name: data.first_name,
        last_name:  data.last_name,
        email:      data.email,
        password:   data.password,
        phone:      data.phone || undefined,
        stream:     selectedStream,
        school:     data.school || undefined,
        region:     data.region || undefined,
      });

      // Auto-login after register
      await login({ email: data.email, password: data.password });
      toast.success('Account created! Welcome to Ethio Matric Academy 🎉');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
      setStep(0); // go back to email step on conflict
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-sage-300/40 -top-20 -right-20" />
      <div className="orb w-64 h-64 bg-mint-dark/30 bottom-0 -left-16" />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage:'radial-gradient(circle,#2D6A4F 1px,transparent 1px)', backgroundSize:'32px 32px' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-md rounded-4xl shadow-glass border border-white/80 p-8 sm:p-10">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-green-gradient flex items-center justify-center shadow-glow-green">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-display font-bold text-primary-600 text-lg">Ethio Matric Academy</span>
            </Link>
            <h1 className="font-display font-extrabold text-2xl text-primary-700 mb-1">Create your account</h1>
            <p className="text-sm text-gray-500">Free to start — no credit card needed</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-7">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? 'bg-green-gradient text-white' :
                    i === step ? 'bg-primary-500 text-white shadow-glow-green' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-primary-600' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full mx-1 transition-all ${i < step ? 'bg-green-gradient' : 'bg-gray-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* ── Step 0: Name + Email ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First Name" name="first_name" placeholder="Selam" required
                    error={errors.first_name?.message}
                    {...register('first_name', { validate: validators.required })} />
                  <Input label="Last Name" name="last_name" placeholder="Bekele" required
                    error={errors.last_name?.message}
                    {...register('last_name', { validate: validators.required })} />
                </div>
                <Input label="Email Address" name="email" type="email" placeholder="you@example.com" required
                  error={errors.email?.message}
                  leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
                  {...register('email', { required:'Email is required', validate: validators.email })} />
                <Input label="Phone (optional)" name="phone" type="tel" placeholder="09xxxxxxxx"
                  error={errors.phone?.message}
                  {...register('phone', { validate: validators.phone })} />
                <Button type="button" fullWidth size="lg" onClick={nextStep}>
                  Continue
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                  </svg>
                </Button>
              </div>
            )}

            {/* ── Step 1: Password ── */}
            {step === 1 && (
              <div className="space-y-4">
                <Input label="Password" name="password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" required
                  error={errors.password?.message}
                  leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
                  {...register('password', { required:'Password is required', validate: validators.strongPassword })} />
                <Input label="Confirm Password" name="confirm_password" type="password" placeholder="Re-enter your password" required
                  error={errors.confirm_password?.message}
                  {...register('confirm_password', {
                    required:'Please confirm your password',
                    validate: (v) => v === password || 'Passwords do not match',
                  })} />

                {/* Password strength hint */}
                <div className="p-3 bg-mint-light rounded-2xl text-xs text-sage-700 space-y-1">
                  {[
                    { test: password?.length >= 8,      text: 'At least 8 characters' },
                    { test: /[A-Z]/.test(password),     text: 'One uppercase letter' },
                    { test: /[0-9]/.test(password),     text: 'One number' },
                  ].map(r => (
                    <div key={r.text} className="flex items-center gap-2">
                      <span className={r.test ? 'text-sage-500' : 'text-gray-300'}>
                        {r.test ? '✓' : '○'}
                      </span>
                      {r.text}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" fullWidth onClick={() => setStep(0)}>Back</Button>
                  <Button type="button" fullWidth onClick={nextStep}>Continue</Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Stream + School + Region ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Stream <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {STREAM_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSelectedStream(opt.value); setValue('stream', opt.value); }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedStream === opt.value
                            ? 'border-primary-500 bg-primary-50 shadow-glow-green'
                            : 'border-mint-dark/30 bg-white hover:border-primary-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{opt.label.split(' ')[0]}</div>
                        <div className="text-xs font-bold text-primary-700">{opt.label.slice(3)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="School Name (optional)" name="school" placeholder="Your school name"
                  {...register('school')} />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Region (optional)
                  </label>
                  <select
                    {...register('region')}
                    className="input-field text-sm"
                  >
                    <option value="">Select your region...</option>
                    {ETHIOPIAN_REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" fullWidth onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" fullWidth size="lg" loading={loading}>
                    Create Account 🎉
                  </Button>
                </div>
              </div>
            )}
          </form>

          {step === 0 && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-mint-dark/20" />
                <span className="text-xs text-gray-400">Already have an account?</span>
                <div className="flex-1 h-px bg-mint-dark/20" />
              </div>
              <Link to="/login" className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-2xl border-2 border-primary-200 text-primary-600 font-semibold text-sm hover:bg-primary-50 transition-all">
                Sign In Instead
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
