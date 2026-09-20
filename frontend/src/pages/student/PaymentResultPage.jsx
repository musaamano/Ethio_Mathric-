import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatDate } from '../../utils/helpers';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 90000;

function ResultIcon({ status }) {
    if (status === 'completed') return <span className="text-5xl">✅</span>;
    if (status === 'failed' || status === 'cancelled') return <span className="text-5xl">❌</span>;
    return <span className="text-5xl">⏳</span>;
}

function ResultCopy({ status, cancelled, timedOut, hasReference }) {
    if (cancelled) {
        return {
            title: 'Payment Cancelled',
            message: 'The payment was cancelled. No payment was marked as completed.',
            tone: 'border-gray-300 bg-gray-50',
            titleTone: 'text-gray-700',
            bodyTone: 'text-gray-500',
        };
    }

    if (status === 'completed') {
        return {
            title: 'Payment Successful',
            message: 'Your payment has been verified and your subscription is active.',
            tone: 'border-sage-400 bg-mint-light/30',
            titleTone: 'text-sage-700',
            bodyTone: 'text-sage-600',
        };
    }

    if (status === 'failed' || status === 'refunded') {
        return {
            title: 'Payment Failed',
            message: 'The payment was not completed. Please try again or contact support.',
            tone: 'border-red-300 bg-red-50',
            titleTone: 'text-red-700',
            bodyTone: 'text-red-600',
        };
    }

    return {
        title: timedOut ? 'Payment Processing' : 'Payment Processing',
        message: timedOut
            ? 'Payment verification is taking longer than expected. You can check your subscription later from the dashboard.'
            : hasReference
                ? 'Payment verification is still being completed. This page will update automatically.'
                : 'We could not verify the payment yet because no transaction reference was returned.',
        tone: 'border-primary-300 bg-primary-50',
        titleTone: 'text-primary-700',
        bodyTone: 'text-gray-600',
    };
}

export default function PaymentResultPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const txRef = searchParams.get('tx_ref')?.trim() || '';
    const cancelled = searchParams.get('payment') === 'cancelled';
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(Boolean(txRef));
    const [timedOut, setTimedOut] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!txRef) {
            setLoading(false);
            return undefined;
        }

        let active = true;
        let intervalId;
        let timeoutId;

        const checkStatus = async () => {
            try {
                const result = await paymentService.getPaymentStatus(txRef);
                if (!active) return;
                setPayment(result);
                setLoading(false);
                if (result.status === 'completed' || result.status === 'failed' || result.status === 'refunded') {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                }
            } catch (err) {
                if (!active) return;
                setLoading(false);
                if (err?.response?.status === 404) {
                    setError('Payment record not found. Please return to the subscription page or contact support.');
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                }
            }
        };

        checkStatus();
        intervalId = setInterval(checkStatus, POLL_INTERVAL_MS);
        timeoutId = setTimeout(() => {
            if (!active) return;
            clearInterval(intervalId);
            setTimedOut(true);
        }, POLL_TIMEOUT_MS);

        return () => {
            active = false;
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [txRef]);

    const status = payment?.status || 'pending';
    const copy = ResultCopy({
        status,
        cancelled,
        timedOut,
        hasReference: Boolean(txRef),
    });

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="font-display font-extrabold text-2xl text-primary-700">Payment Result</h2>
                <p className="text-sm text-gray-500 mt-0.5">Review your payment status before returning to your dashboard.</p>
            </div>

            {loading ? (
                <div className="soft-card p-8 flex flex-col items-center gap-4">
                    <LoadingSpinner variant="dots" />
                    <p className="text-sm text-gray-500">Checking your payment status...</p>
                </div>
            ) : (
                <div className={`soft-card p-6 border-2 ${copy.tone}`}>
                    <div className="flex items-start gap-4">
                        <ResultIcon status={cancelled ? 'cancelled' : status} />
                        <div className="min-w-0 flex-1">
                            <h3 className={`font-display font-bold text-xl ${copy.titleTone}`}>{copy.title}</h3>
                            <p className={`text-sm mt-1 ${copy.bodyTone}`}>{copy.message}</p>
                        </div>
                    </div>

                    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                    <div className="mt-6 space-y-3 border-t border-black/5 pt-4">
                        {txRef && (
                            <div className="flex items-start justify-between gap-4 text-sm">
                                <span className="text-gray-500">Transaction Reference</span>
                                <span className="font-mono text-right text-gray-700 break-all">{txRef}</span>
                            </div>
                        )}
                        {payment?.amount_etb != null && (
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-gray-500">Amount</span>
                                <span className="font-semibold text-gray-700">{formatCurrency(payment.amount_etb)}</span>
                            </div>
                        )}
                        {payment?.currency && (
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-gray-500">Currency</span>
                                <span className="text-gray-700">{payment.currency}</span>
                            </div>
                        )}
                        {payment?.gateway && (
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-gray-500">Payment Method</span>
                                <span className="capitalize text-gray-700">{payment.gateway}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-500">Status</span>
                            <Badge preset="subscription" value={cancelled ? 'cancelled' : status} size="xs" dot />
                        </div>
                        {payment?.created_at && (
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-gray-500">Payment Date</span>
                                <span className="text-right text-gray-700">{formatDate(payment.created_at, 'long')}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                {(cancelled || status === 'failed' || status === 'refunded' || error) && (
                    <Button variant="outline" onClick={() => navigate('/dashboard/subscription')}>
                        Try Again
                    </Button>
                )}
                <Button onClick={() => navigate('/dashboard')}>
                    Go to Dashboard →
                </Button>
            </div>
        </div>
    );
}
