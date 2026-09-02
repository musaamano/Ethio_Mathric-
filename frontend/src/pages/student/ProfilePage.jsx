import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import userService from '../../services/userService';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge  from '../../components/common/Badge';
import { validators, STREAM_OPTIONS, ETHIOPIAN_REGIONS, fullName, initials, formatDate } from '../../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast   = useToast();
  const fileRef = useRef(null);

  const [tab,          setTab]          = useState('info');
  const [saving,       setSaving]       = useState(false);
  const [savingPwd,    setSavingPwd]    = useState(false);
  const [avatarPreview,setAvatarPreview]= useState(null);
  const [avatarFile,   setAvatarFile]   = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name:  user?.last_name  || '',
      phone:      user?.phone      || '',
      stream:     user?.stream     || '',
      school:     user?.school     || '',
      region:     user?.region     || '',
      city:       user?.city       || '',
    },
  });

  const { register: regPwd, handleSubmit: handlePwd, formState: { errors: pwdErrors }, watch: watchPwd, reset: resetPwd } = useForm();
  const newPwd = watchPwd('new_password');

  // Avatar change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Save profile
  const onSaveProfile = async (data) => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v || ''));
      if (avatarFile) formData.append('avatar', avatarFile);
      await userService.updateProfile(formData);
      await updateUser();
      toast.success('Profile updated successfully!');
      setAvatarFile(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const onChangePassword = async (data) => {
    setSavingPwd(true);
    try {
      await userService.changePassword(data.current_password, data.new_password);
      toast.success('Password changed successfully!');
      resetPwd();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="font-display font-extrabold text-2xl text-primary-700">My Profile</h2>

      {/* Profile summary card */}
      <div className="soft-card p-5 flex items-center gap-5">
        {/* Avatar */}
        <div className="relative group cursor-pointer flex-shrink-0" onClick={() => fileRef.current?.click()}>
          {(avatarPreview || user?.avatar_url) ? (
            <img src={avatarPreview || user.avatar_url} alt="avatar"
              className="w-20 h-20 rounded-3xl object-cover border-2 border-mint-dark/20" />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-green-gradient flex items-center justify-center text-white text-2xl font-bold shadow-glow-green">
              {initials(fullName(user))}
            </div>
          )}
          <div className="absolute inset-0 rounded-3xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-xl text-primary-700">{fullName(user)}</h3>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge preset="role" value={user?.role || 'student'} />
            {user?.stream && (
              <span className="text-xs font-medium text-gray-500 bg-surface px-2.5 py-1 rounded-xl border border-mint-light/60">
                {user.stream === 'natural_science' ? '🔬 Natural Science' : '📰 Social Science'}
              </span>
            )}
            {user?.is_email_verified ? (
              <span className="text-xs text-sage-600 font-semibold">✅ Verified</span>
            ) : (
              <span className="text-xs text-yellow-600 font-semibold">⚠️ Unverified</span>
            )}
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400">Member since</p>
          <p className="text-sm font-semibold text-primary-600">{formatDate(user?.created_at)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-soft border border-mint-light/60">
        {[{ id: 'info', label: '👤 Profile Info' }, { id: 'password', label: '🔒 Password' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-green-gradient text-white shadow-glow-green' : 'text-gray-500 hover:bg-mint-light'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Info Form */}
      {tab === 'info' && (
        <div className="soft-card p-6">
          <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="First Name" name="first_name" required error={errors.first_name?.message}
                {...register('first_name', { validate: validators.required })} />
              <Input label="Last Name" name="last_name" required error={errors.last_name?.message}
                {...register('last_name', { validate: validators.required })} />
            </div>
            <Input label="Phone Number" name="phone" type="tel" placeholder="09xxxxxxxx"
              error={errors.phone?.message}
              {...register('phone', { validate: validators.phone })} />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stream</label>
              <select className="input-field text-sm" {...register('stream')}>
                <option value="">Not set</option>
                {STREAM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <Input label="School Name" name="school" placeholder="Your school"
              {...register('school')} />

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Region</label>
                <select className="input-field text-sm" {...register('region')}>
                  <option value="">Select region...</option>
                  {ETHIOPIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <Input label="City" name="city" placeholder="Your city"
                {...register('city')} />
            </div>

            <Button type="submit" fullWidth size="lg" loading={saving}>
              Save Changes
            </Button>
          </form>
        </div>
      )}

      {/* Change Password Form */}
      {tab === 'password' && (
        <div className="soft-card p-6">
          <form onSubmit={handlePwd(onChangePassword)} className="space-y-4">
            <Input label="Current Password" name="current_password" type="password"
              required error={pwdErrors.current_password?.message}
              {...regPwd('current_password', { required: 'Current password is required' })} />
            <Input label="New Password" name="new_password" type="password"
              required error={pwdErrors.new_password?.message}
              helperText="Min 8 characters, 1 uppercase, 1 number"
              {...regPwd('new_password', { required: 'New password is required', validate: validators.strongPassword })} />
            <Input label="Confirm New Password" name="confirm_password" type="password"
              required error={pwdErrors.confirm_password?.message}
              {...regPwd('confirm_password', {
                required: 'Please confirm your password',
                validate: v => v === newPwd || 'Passwords do not match',
              })} />

            {/* Strength bar */}
            <div className="flex gap-1">
              {[newPwd?.length >= 8, /[A-Z]/.test(newPwd), /[0-9]/.test(newPwd), newPwd?.length >= 12].map((ok, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${ok ? 'bg-green-gradient' : 'bg-gray-100'}`} />
              ))}
            </div>

            <Button type="submit" fullWidth size="lg" loading={savingPwd}>
              Change Password
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
