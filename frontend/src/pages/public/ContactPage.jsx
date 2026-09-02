import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { validators } from '../../utils/helpers';
import api from '../../services/api';

const CONTACT_INFO = [
  { icon: '📧', label: 'Email',    value: 'support@ethiomatric.com', href: 'mailto:support@ethiomatric.com' },
  { icon: '📱', label: 'Phone',    value: '+251 911 000 000',         href: 'tel:+251911000000' },
  { icon: '🏢', label: 'Address',  value: 'Addis Ababa, Ethiopia',    href: null },
  { icon: '🕐', label: 'Hours',    value: 'Mon–Sat: 8 AM – 8 PM EAT', href: null },
];

export default function ContactPage() {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setSending(true);
    try {
      await api.post('/contact', data);
      toast.success('Message sent! We will respond within 24 hours.');
      setSent(true);
      reset();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-surface">
      {/* Hero */}
      <section className="py-20 bg-hero-gradient">
        <div className="section-container text-center">
          <h1 className="font-display font-extrabold text-5xl text-primary-700 mb-3">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">Have a question or issue? We respond within 24 hours.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="section-container">
          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">

            {/* Contact Info */}
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl text-primary-700 mb-5">Get in Touch</h2>
              {CONTACT_INFO.map(c => (
                <div key={c.label} className="soft-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-mint-light rounded-2xl flex items-center justify-center text-xl flex-shrink-0">{c.icon}</div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{c.label}</p>
                    {c.href ? (
                      <a href={c.href} className="text-sm font-semibold text-primary-600 hover:text-sage-500">{c.value}</a>
                    ) : (
                      <p className="text-sm font-semibold text-gray-700">{c.value}</p>
                    )}
                  </div>
                </div>
              ))}

              <div className="soft-card p-4 bg-primary-50 border border-primary-100">
                <p className="text-sm font-semibold text-primary-700 mb-1">💡 Quick Tip</p>
                <p className="text-xs text-gray-500">For subscription or payment issues, please include your Transaction Reference Number for faster resolution.</p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2 soft-card p-6">
              {sent ? (
                <div className="py-12 text-center space-y-4">
                  <div className="text-6xl">📬</div>
                  <h3 className="font-display font-bold text-xl text-primary-700">Message Sent!</h3>
                  <p className="text-gray-500 text-sm">We will get back to you within 24 hours.</p>
                  <Button onClick={() => setSent(false)} variant="outline">Send Another Message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <h2 className="font-display font-bold text-xl text-primary-700">Send us a message</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Your Name" name="name" required placeholder="Selam Bekele"
                      error={errors.name?.message}
                      {...register('name', { validate: validators.required })} />
                    <Input label="Email Address" name="email" type="email" required placeholder="you@example.com"
                      error={errors.email?.message}
                      {...register('email', { required: 'Email is required', validate: validators.email })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                    <select className="input-field text-sm" {...register('subject')}>
                      <option value="general">General Question</option>
                      <option value="payment">Payment / Subscription Issue</option>
                      <option value="technical">Technical Problem</option>
                      <option value="content">Content / Question Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                    <textarea rows={5} placeholder="Describe your question or issue in detail..."
                      className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
                      {...register('message', { required: 'Message is required', minLength: { value: 20, message: 'Please provide more detail' } })} />
                    {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
                  </div>
                  <Button type="submit" fullWidth size="lg" loading={sending}>
                    Send Message 📤
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
