import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import userService from '../../services/userService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ChooseAccessPage() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.role && user.role !== 'student') {
            navigate(user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/dashboard', { replace: true });
            return;
        }

        if (user?.access_type === 'free' || user?.subscription_status === 'active' || user?.has_active_subscription) {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate, user]);

    const startFree = async () => {
        setSaving(true);
        try {
            await userService.updateAccessType('free');
            await updateUser();
            navigate('/dashboard', { replace: true });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Could not save your access choice. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const choosePremium = () => {
        navigate('/dashboard/subscription');
    };

    if (user?.access_type === 'free' || user?.subscription_status === 'active' || user?.has_active_subscription) {
        return <LoadingSpinner variant="page" text="Loading your dashboard..." />;
    }

    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
            <div className="orb w-80 h-80 bg-sage-300/40 -top-20 -right-20" />
            <div className="orb w-56 h-56 bg-mint-dark/30 bottom-0 -left-10" />

            <main className="relative z-10 w-full max-w-3xl">
                <div className="text-center mb-8">
                    <p className="text-sm font-semibold text-primary-600 mb-2">Ethio Matric Academy</p>
                    <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-primary-700 mb-3">
                        Choose Your Access
                    </h1>
                    <p className="text-gray-600 text-base sm:text-lg">
                        How would you like to use Ethio Matric Academy?
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <section className="soft-card p-6 sm:p-7 flex flex-col border-2 border-mint-dark/20">
                        <div className="text-4xl mb-4" aria-hidden="true">🆓</div>
                        <h2 className="font-display font-bold text-xl text-primary-700">Start Free</h2>
                        <p className="text-sm text-gray-500 mt-2 flex-1">
                            Try Ethio Matric Academy with limited access.
                        </p>
                        <Button
                            type="button"
                            fullWidth
                            className="mt-6"
                            onClick={startFree}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Start Free'}
                        </Button>
                    </section>

                    <section className="soft-card p-6 sm:p-7 flex flex-col border-2 border-primary-200">
                        <div className="text-4xl mb-4" aria-hidden="true">⭐</div>
                        <h2 className="font-display font-bold text-xl text-primary-700">Premium</h2>
                        <p className="text-sm text-gray-500 mt-2 flex-1">
                            Unlock full access to Ethio Matric Academy.
                        </p>
                        <Button
                            type="button"
                            fullWidth
                            className="mt-6"
                            onClick={choosePremium}
                        >
                            Get Premium
                        </Button>
                    </section>
                </div>
            </main>
        </div>
    );
}
