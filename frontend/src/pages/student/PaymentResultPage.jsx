import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatDate } from '../../utils/helpers';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 180000;

function ResultIcon({ status }) {
    if (status === 'completed') return <span className="text-5xl">✅</span>;
    if (status === 'failed' || status === 'cancelled') return <span className="text-5xl">❌</span>;
    return <span className="text-5xl">⏳</span>;
}

function getResultCopy({ status, cancelled, timedOut, hasReference, error }) {
    if (cancelled) return { title: 'Payment Cancelled', message: 'The payment was cancelled. No payment was marked as completed.', tone: 'border-gray-300 bg-gray-50', titleTone: 'text-gray-700', bodyTone: 'text-gray-500' };
    if (status === 'completed') return { title: 'Payment Successful', message: 'Your payment has been verified and your subscription is active.', tone: 'border-sage-400 bg-mint-light/30', titleTone: 'text-sage-700', bodyTone: 'text-sage-600' };
    if (status === 'failed' || status === 'refunded') return { title: 'Payment Failed', message: 'The payment was not completed. Please try again or contact support.', tone: 'border-red-300 bg-red-50', titleTone: 'text-red-700', bodyTone: 'text-red-600' };
    return {
        title: timedOut ? 'Payment Pending' : error ? 'Status Check Unavailable' : 'Payment Processing',
        message: timedOut ? 'Payment verification is taking longer than expected. Refresh when you are ready to check again.' : error || (hasReference ? 'Payment verification is still being completed. This page will update automatically.' : 'We could not verify the payment yet because no transaction reference was returned.'),
        tone: error ? 'border-amber-300 bg-amber-50' : 'border-primary-300 bg-primary-50',
        titleTone: error ? 'text-amber-800' : 'text-primary-700',
        bodyTone: error ? 'text-amber-700' : 'text-gray-600',
    };
}

export default function PaymentResultPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const txRef = searchParams.get('tx_ref')?.trim() || '';
    const cancelled = searchParams.get('payment') === 'cancelled';
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(Boolean(txRef) && !cancelled);
    const [refreshing, setRefreshing] = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    const [error, setError] = useState(null);
    const [finished, setFinished] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!txRef || cancelled) {
            setLoading(false);
            return undefined;
        }

        let active = true;
        let intervalId;
        let timeoutId;
        const stopPolling = () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };

        const checkStatus = async () => {
            try {
                const result = await paymentService.getPaymentStatus(txRef);
                if (!active) return;
                setPayment(result);
                setLoading(false);
                setRefreshing(false);
                setError(null);
                const terminal = result.status === 'failed' || result.status === 'refunded' || (result.status === 'completed' && result.subscription_status === 'active');
                if (terminal) stopPolling();
            } catch (err) {
                if (!active) return;
                setLoading(false);
                setRefreshing(false);
                if (err?.response?.status === 404) {
                    setError('Payment record not found. Please return to the subscription page or contact support.');
                    stopPolling();
                } else {
                    setError('We could not reach the payment status service. Please try again.');
                }
            }
        };

        checkStatus();
        intervalId = setInterval(checkStatus, POLL_INTERVAL_MS);
        timeoutId = setTimeout(() => {
            if (!active) return;
            clearInterval(intervalId);
            setRefreshing(false);
            setTimedOut(true);
        }, POLL_TIMEOUT_MS);

        return () => {
            active = false;
            stopPolling();
        };
    }, [cancelled, refreshKey, txRef]);

    const status = payment?.status || 'pending';
    const completed = status === 'completed' && payment?.subscription_status === 'active';
    const notFound = Boolean(error && error.includes('not found'));
    const copy = getResultCopy({ status: completed ? 'completed' : status, cancelled, timedOut, hasReference: Boolean(txRef), error: notFound ? null : error });

    const refreshStatus = () => {
        setError(null);
        setTimedOut(false);
        setRefreshing(true);
        setLoading(true);
        setRefreshKey(value => value + 1);
    };

    if (finished) {
        return (
            <div className="max-w-2xl">
                <div className="soft-card p-8 text-center">
                    <div className="text-5xl">✅</div>
                    <h2 className="mt-4 font-display font-extrabold text-2xl text-primary-700">Payment Complete</h2>
                    <p className="mt-2 text-sm text-gray-600">Your payment is complete and your subscription is active.</p>
                    <Button className="mt-6" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="font-display font-extrabold text-2xl text-primary-700">Payment Result</h2>
                <p className="text-sm text-gray-500 mt-0.5">Review your payment status before finishing.</p>
            </div>

            {loading ? (
                <div className="soft-card p-8 flex flex-col items-center gap-4">
                    <LoadingSpinner variant="dots" />
                    <p className="text-sm text-gray-500">Checking your payment status...</p>
                </div>
            ) : (
                <div className={`soft-card overflow-hidden border-2 ${copy.tone}`}>
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <ResultIcon status={cancelled ? 'cancelled' : completed ? 'completed' : status} />
                            <div className="min-w-0 flex-1">
                                <h3 className={`font-display font-bold text-xl ${copy.titleTone}`}>{copy.title}</h3>
                                <p className={`text-sm mt-1 ${copy.bodyTone}`}>{copy.message}</p>
                            </div>
                        </div>
                        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                        <div className="mt-6 border-t border-black/5 pt-4 space-y-3">
                            {payment?.gateway_ref && <div className="flex items-start justify-between gap-4 text-sm"><span className="text-gray-500">Transaction Reference</span><span className="font-mono text-right text-gray-700 break-all">{payment.gateway_ref}</span></div>}
                            {payment?.amount_etb != null && <div className="flex items-center justify-between gap-4 text-sm"><span className="text-gray-500">Amount</span><span className="font-semibold text-gray-700">{formatCurrency(payment.amount_etb)}</span></div>}
                            {payment?.currency && <div className="flex items-center justify-between gap-4 text-sm"><span className="text-gray-500">Currency</span><span className="text-gray-700">{payment.currency}</span></div>}
                            {payment?.gateway && <div className="flex items-center justify-between gap-4 text-sm"><span className="text-gray-500">Payment Gateway</span><span className="capitalize text-gray-700">{payment.gateway}</span></div>}
                            {payment?.gateway_tx_id && <div className="flex items-start justify-between gap-4 text-sm"><span className="text-gray-500">Chapa Transaction ID</span><span className="font-mono text-right text-gray-700 break-all">{payment.gateway_tx_id}</span></div>}
                            <div className="flex items-center justify-between gap-4 text-sm"><span className="text-gray-500">Payment Status</span><Badge preset="subscription" value={cancelled ? 'cancelled' : completed ? 'completed' : status} size="xs" dot /></div>
                            {payment?.subscription_status && <div className="flex items-center justify-between gap-4 text-sm"><span className="text-gray-500">Subscription Status</span><span className="capitalize text-gray-700">{payment.subscription_status}</span></div>}
                            {payment?.created_at && <div className="flex items-center justify-between gap-4 text-sm"><span className="text-gray-500">Payment Date</span><span className="text-right text-gray-700">{formatDate(payment.created_at, 'long')}</span></div>}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                {!cancelled && !completed && txRef && <Button variant="outline" loading={refreshing} onClick={refreshStatus}>Refresh Status</Button>}
                {(cancelled || status === 'failed' || status === 'refunded' || notFound) && <Button variant="outline" onClick={() => navigate('/dashboard/subscription')}>Try Again</Button>}
                {completed && <Button onClick={() => setFinished(true)}>Finish</Button>}
            </div>
        </div>
    );
}
