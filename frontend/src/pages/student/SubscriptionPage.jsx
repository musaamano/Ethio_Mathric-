/**
 * SubscriptionPage.jsx — Phase 4
 *
 * Handles:
 * 1. Normal plan selection + payment initiation
 * 2. Return from Chapa checkout (?payment=success|cancelled|failed or ?tx_ref=EMA-...)
 *    → shows status banner, polls /payments/my-subscription until active or timeout
 * 3. Duplicate payment prevention (existing active subscription shown clearly)
 * 4. ETB only — no foreign currencies
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import paymentService from '../../services/paymentService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import { formatDate, formatCurrency, formatExpiry } from '../../utils/helpers';

const GATEWAY_OPTIONS = [
  { id: 'chapa',     label: 'Chapa',     icon: '🟡', available: true  },
  { id: 'telebirr',  label: 'Telebirr',  icon: '📱', available: false },
  { id: 'santimpay', label: 'SantimPay', icon: '💚', available: false },
];

// How long to poll (ms) and interval between polls (ms)
const POLL_TIMEOUT_MS  = 90_000;  // 90 seconds
const POLL_INTERVAL_MS =  5_000;  // every 5 seconds (reduced from 3s to ease DB load)

// ── Payment return status banner ────────────────────────────
function ReturnBanner({ status, polling, subscription }) {
  if (status === 'success' && subscription?.status === 'active') {
    return (
      <div className="soft-card p-5 border-2 border-sage-400 bg-mint-light/30 flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">✅</span>
        <div>
          <p className="font-display font-bold text-sage-700 text-lg">Payment successful!</p>
          <p className="text-sm text-sage-600 mt-0.5">
            Your <strong>{subscription.plan_name}</strong> subscription is now active.
            {subscription.expires_at && (
              <> Valid until {formatDate(subscription.expires_at, 'long')}.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success' && polling) {
    return (
      <div className="soft-card p-5 border-2 border-primary-300 bg-primary-50 flex items-start gap-4">
        <LoadingSpinner variant="dots" className="mt-1 flex-shrink-0" />
        <div>
          <p className="font-display font-bold text-primary-700 text-base">
            Payment received. Confirming your subscription...
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            This usually takes a few seconds. Please wait.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success' && !polling) {
    // Polling ended without activation — Chapa webhook may be delayed
    return (
      <div className="soft-card p-5 border-2 border-yellow-400 bg-yellow-50 flex items-start gap-4">
        <span className="text-2xl flex-shrink-0">⏳</span>
        <div>
          <p className="font-display font-bold text-yellow-700 text-base">
            Payment processing
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            Your payment was received. Subscription activation may take a minute.
            If it does not activate within 5 minutes, contact support with your
            transaction reference.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="soft-card p-5 border-2 border-gray-300 bg-gray-50 flex items-start gap-4">
        <span className="text-2xl flex-shrink-0">↩️</span>
        <div>
          <p className="font-display font-bold text-gray-700 text-base">Payment cancelled</p>
          <p className="text-sm text-gray-500 mt-0.5">
            You cancelled the payment. No charge was made. Choose a plan below to try again.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="soft-card p-5 border-2 border-red-300 bg-red-50 flex items-start gap-4">
        <span className="text-2xl flex-shrink-0">❌</span>
        <div>
          <p className="font-display font-bold text-red-700 text-base">Payment failed</p>
          <p className="text-sm text-red-600 mt-0.5">
            Your payment could not be completed. No charge was made.
            Please try again or contact support.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const toast         = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [plans,        setPlans]        = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [gateway,      setGateway]      = useState('chapa');
  const [paying,       setPaying]       = useState(false);

  // Return-from-Chapa state
  const [returnStatus, setReturnStatus] = useState(null); // 'success' | 'cancelled' | 'failed' | null
  const [polling,      setPolling]      = useState(false);

  const pollTimerRef   = useRef(null);
  const pollTimeoutRef = useRef(null);

  // ── Stop polling cleanly ─────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current)   clearInterval(pollTimerRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    pollTimerRef.current   = null;
    pollTimeoutRef.current = null;
    setPolling(false);
  }, []);

  // ── Poll /payments/my-subscription until active ──────────
  const startPolling = useCallback(() => {
    setPolling(true);

    pollTimerRef.current = setInterval(async () => {
      try {
        const sub = await paymentService.getMySubscription();
        if (sub?.status === 'active') {
          setSubscription(sub);
          stopPolling();
        }
      } catch {
        // Silently ignore poll errors — timeout will stop polling
      }
    }, POLL_INTERVAL_MS);

    // Hard timeout — stop polling after 90 seconds regardless
    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
    }, POLL_TIMEOUT_MS);
  }, [stopPolling]);

  // ── Detect return from Chapa on mount ────────────────────
  useEffect(() => {
    const paymentParam = searchParams.get('payment');   // 'success' | 'cancelled' | 'failed'
    const txRef        = searchParams.get('tx_ref');    // present if Chapa appends it

    if (paymentParam === 'success' || txRef) {
      setReturnStatus('success');
      // Clean URL — remove query params without triggering a reload
      setSearchParams({}, { replace: true });
    } else if (paymentParam === 'cancelled') {
      setReturnStatus('cancelled');
      setSearchParams({}, { replace: true });
    } else if (paymentParam === 'failed') {
      setReturnStatus('failed');
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load plans + subscription on mount ──────────────────
  useEffect(() => {
    Promise.all([paymentService.getPlans(), paymentService.getMySubscription()])
      .then(([p, s]) => {
        setPlans(p);
        setSubscription(s);
      })
      .catch(() => toast.error('Failed to load subscription info'))
      .finally(() => setLoading(false));
  }, []);

  // ── Start polling after return-from-Chapa if not yet active
  useEffect(() => {
    if (returnStatus === 'success' && !loading && subscription?.status !== 'active') {
      startPolling();
    }
    return stopPolling; // cleanup on unmount
  }, [returnStatus, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initiate payment ─────────────────────────────────────
  const handlePayment = async () => {
    if (!selectedPlan) { toast.warning('Please select a plan'); return; }

    // Prevent initiating if already active
    if (subscription?.status === 'active') {
      toast.info('You already have an active subscription.');
      return;
    }

    setPaying(true);
    try {
      const res = await paymentService.initiatePayment({ plan_id: selectedPlan, gateway });

      if (gateway === 'chapa') {
        if (res.checkout_url) {
          // Redirect the current tab to Chapa checkout.
          // Chapa will redirect back to CHAPA_RETURN_URL which includes /dashboard/subscription.
          window.location.href = res.checkout_url;
        } else {
          toast.error('Could not get a checkout link. Please try again.');
        }
      } else {
        // Telebirr / SantimPay placeholders
        toast.info(res.instructions || `Reference: ${res.tx_ref}. ${res.instructions}`);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Payment initiation failed. Please try again.';
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <LoadingSpinner variant="dots" className="py-20" />;

  const expiry        = subscription?.expires_at ? formatExpiry(subscription.expires_at) : null;
  const isActive      = subscription?.status === 'active';
  const alreadyActive = isActive && returnStatus !== 'success'; // don't block UI on the return banner

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-primary-700">Subscription 💳</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your plan and unlock full access.</p>
      </div>

      {/* Return-from-Chapa banner */}
      {returnStatus && (
        <ReturnBanner
          status={returnStatus}
          polling={polling}
          subscription={subscription}
        />
      )}

      {/* Current subscription */}
      {subscription && (
        <div className={`soft-card p-5 border-2 ${expiry?.status === 'ok' ? 'border-sage-300' : 'border-red-300'}`}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">CURRENT PLAN</p>
              <h3 className="font-display font-bold text-xl text-primary-700">{subscription.plan_name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatCurrency(subscription.price_etb)} · {subscription.duration_days} days
              </p>
            </div>
            <Badge preset="subscription" value={subscription.status} size="md" dot />
          </div>
          {expiry && (
            <div className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${
              expiry.status === 'ok'      ? 'text-sage-600'    :
              expiry.status === 'warning' ? 'text-yellow-600'  : 'text-red-500'
            }`}>
              {expiry.status !== 'ok' && '⚠️'} {expiry.text}
            </div>
          )}
        </div>
      )}

      {/* Plan selector — hide while polling for activation */}
      {!polling && (
        <>
          <div>
            <h3 className="font-display font-bold text-lg text-primary-700 mb-4">
              {isActive ? 'Renew or Upgrade' : 'Choose a Plan'}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-5 rounded-3xl border-2 text-left transition-all hover:-translate-y-1 hover:shadow-card ${
                    selectedPlan === plan.id
                      ? 'border-primary-500 bg-primary-50 shadow-glow-green'
                      : 'border-mint-dark/20 bg-white hover:border-primary-300'
                  }`}
                >
                  {plan.name === '3 Months' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-gradient text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                      Popular
                    </div>
                  )}
                  {plan.name === '1 Year' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warm text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                      Best Value
                    </div>
                  )}
                  <p className="font-display font-bold text-primary-700 mb-2">{plan.name}</p>
                  <p className="font-display font-extrabold text-2xl text-primary-600">
                    {parseInt(plan.price_etb).toLocaleString()}
                    <span className="text-sm font-normal text-gray-400"> ETB</span>
                  </p>
                  <p className="text-xs text-sage-600 font-semibold mt-0.5">
                    ≈ {Math.round(plan.price_etb / (plan.duration_days / 30))} ETB/mo
                  </p>
                  {selectedPlan === plan.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method + checkout */}
          {selectedPlan && (
            <div className="soft-card p-5 space-y-4">
              <h3 className="font-display font-bold text-base text-primary-700">Payment Method</h3>

              <div className="flex gap-3 flex-wrap">
                {GATEWAY_OPTIONS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => g.available && setGateway(g.id)}
                    disabled={!g.available}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all ${
                      !g.available
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : gateway === g.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-mint-dark/20 text-gray-500 hover:border-primary-200'
                    }`}
                  >
                    <span>{g.icon}</span>
                    {g.label}
                    {!g.available && (
                      <span className="text-[9px] font-bold bg-gray-200 text-gray-400 px-1.5 py-0.5 rounded-full ml-1">
                        SOON
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ETB notice */}
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span>🇪🇹</span>
                Payments are processed in Ethiopian Birr (ETB) only.
              </p>

              <div className="flex items-center justify-between p-4 bg-surface rounded-2xl">
                <div>
                  <p className="text-sm text-gray-500">Selected Plan</p>
                  <p className="font-display font-bold text-primary-700">
                    {plans.find(p => p.id === selectedPlan)?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-display font-extrabold text-xl text-primary-600">
                    {formatCurrency(plans.find(p => p.id === selectedPlan)?.price_etb || 0)}
                  </p>
                </div>
              </div>

              <Button fullWidth size="lg" onClick={handlePayment} loading={paying}>
                Pay with {GATEWAY_OPTIONS.find(g => g.id === gateway)?.label} →
              </Button>

              <p className="text-xs text-gray-400 text-center">
                Secure payment via Chapa. Your subscription activates immediately after
                payment is confirmed by the payment gateway.
              </p>
            </div>
          )}
        </>
      )}

      {/* Features list */}
      <div className="soft-card p-5">
        <h3 className="font-display font-bold text-base text-primary-700 mb-4">What's Included 🎁</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            '✅ All subjects',
            '✅ 10,000+ practice questions',
            '✅ Past-year question bank',
            '✅ Detailed explanations',
            '✅ Progress analytics',
            '✅ Leaderboard access',
            '✅ Bookmark questions',
            '✅ Priority support',
          ].map(f => (
            <div key={f} className="text-sm text-gray-600">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
