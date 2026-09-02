/**
 * Payment Controller
 * Phase 2: Real Chapa transaction initialization
 * Phase 3: Server-side Chapa verification + idempotency + amount/currency checks
 * Phase 4: HMAC webhook signature verification
 * Phase 5: Subscription expiry job
 * Phase 6: Atomic locking, transactional activation, input validation, timeouts
 * PostgreSQL version
 */
const { pool, getClient } = require('../config/db');
const R        = require('../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');
const logger   = require('../utils/logger');
const crypto   = require('crypto');

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const CHAPA_TIMEOUT_MS = 10_000; // 10 seconds
// Reuse pending Chapa payment if created within this window (avoids spam)
const PENDING_REUSE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ─────────────────────────────────────────────
// CHAPA HELPER — webhook HMAC signature check
// ─────────────────────────────────────────────

function verifyWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[Chapa Webhook] CHAPA_WEBHOOK_SECRET is not set in production — rejecting');
      throw new Error('Webhook secret not configured');
    }
    logger.warn('[Chapa Webhook] CHAPA_WEBHOOK_SECRET not set — skipping check (dev mode)');
    return true;
  }

  if (!signature) {
    logger.warn('[Chapa Webhook] x-chapa-signature header missing');
    throw new Error('Missing webhook signature');
  }

  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody || '', 'utf8');

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyBuffer)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expBuffer = Buffer.from(expected,  'utf8');

  if (sigBuffer.length !== expBuffer.length) {
    logger.warn('[Chapa Webhook] Signature length mismatch — potential spoofing attempt');
    throw new Error('Invalid webhook signature');
  }

  if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    logger.warn('[Chapa Webhook] HMAC mismatch — rejecting');
    throw new Error('Invalid webhook signature');
  }

  return true;
}

// ─────────────────────────────────────────────
// SHARED HELPER — fetch with timeout
// ─────────────────────────────────────────────

/**
 * fetch() wrapper with AbortController timeout.
 * Throws a controlled Error on timeout — never hangs indefinitely.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = CHAPA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────
// SHARED HELPER — activate a subscription
// Called ONLY from inside an existing transaction client.
// Both UPDATEs are part of the same BEGIN/COMMIT block — atomic.
//
// @param {object} client   - pg transaction client (already in BEGIN)
// @param {object} payment  - Payment row (already atomically claimed)
// @param {object} plan     - Subscription plan row
// @param {object} [approvedBy] - { adminId } for manual approval
// ─────────────────────────────────────────────

async function activateSubscriptionTx(client, payment, plan, approvedBy = null) {
  const startsAt  = new Date();
  const expiresAt = new Date(startsAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

  if (approvedBy?.adminId) {
    await client.query(
      `UPDATE payments
       SET status = 'completed', admin_approved_by = $1, admin_approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [approvedBy.adminId, payment.id]
    );
  } else {
    await client.query(
      `UPDATE payments
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1`,
      [payment.id]
    );
  }

  await client.query(
    `UPDATE subscriptions
     SET status = 'active', starts_at = $1, expires_at = $2, updated_at = NOW()
     WHERE id = $3`,
    [startsAt, expiresAt, payment.subscription_id]
  );

  logger.info(
    `[Payment] Subscription activated: user=${payment.user_id} ` +
    `plan="${plan.name}" expires=${expiresAt.toISOString()} ` +
    (approvedBy ? `by admin=${approvedBy.adminId}` : 'via Chapa webhook')
  );
}

// ─────────────────────────────────────────────
// CHAPA HELPER — server-side transaction init
// ─────────────────────────────────────────────

async function chapaInitialize({ amount, email, first_name, last_name, tx_ref }) {
  const secretKey   = process.env.CHAPA_SECRET_KEY;
  const callbackUrl = process.env.CHAPA_CALLBACK_URL;
  const returnUrl   = process.env.CHAPA_RETURN_URL;

  if (!secretKey) {
    logger.error('[Chapa] CHAPA_SECRET_KEY is not set');
    throw new Error('Payment gateway is not configured. Please contact support.');
  }

  const payload = {
    amount:       String(parseFloat(amount).toFixed(2)),
    currency:     'ETB',
    email,
    first_name,
    last_name,
    tx_ref,
    callback_url: callbackUrl || '',
    return_url:   returnUrl   || '',
    customization: {
      title:       'Ethio Matric Academy',
      description: 'Subscription payment',
    },
  };

  let response;
  try {
    response = await fetchWithTimeout(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (networkErr) {
    logger.error('[Chapa] Initialize error:', networkErr.message);
    if (networkErr.message.includes('timed out')) {
      throw new Error('Payment gateway timed out. Please try again.');
    }
    throw new Error('Could not reach the payment gateway. Please try again.');
  }

  let body;
  try { body = await response.json(); }
  catch { throw new Error('Unexpected response from payment gateway. Please try again.'); }

  if (!response.ok || body.status !== 'success') {
    logger.error('[Chapa] Initialize failed:', JSON.stringify({
      httpStatus: response.status, chapStatus: body.status, message: body.message,
    }));
    const safeMsg = (body.message && typeof body.message === 'string')
      ? body.message.slice(0, 120)
      : 'Payment initialization failed. Please try again.';
    throw new Error(safeMsg);
  }

  const checkoutUrl = body.data?.checkout_url;
  if (!checkoutUrl) throw new Error('Payment gateway did not return a checkout URL. Please try again.');

  return { checkout_url: checkoutUrl };
}

// ─────────────────────────────────────────────
// CHAPA HELPER — server-side transaction verify
// ─────────────────────────────────────────────

async function chapaVerify(txRef) {
  const secretKey = process.env.CHAPA_SECRET_KEY;
  if (!secretKey) throw new Error('Payment gateway is not configured.');

  let response;
  try {
    response = await fetchWithTimeout(
      `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`,
      { method: 'GET', headers: { 'Authorization': `Bearer ${secretKey}` } }
    );
  } catch (networkErr) {
    logger.error('[Chapa] Verify error:', networkErr.message);
    if (networkErr.message.includes('timed out')) {
      throw new Error('Payment verification timed out.');
    }
    throw new Error('Could not reach the payment gateway for verification.');
  }

  let body;
  try { body = await response.json(); }
  catch { throw new Error('Unexpected response during payment verification.'); }

  if (!response.ok) {
    logger.error('[Chapa] Verify HTTP error:', JSON.stringify({
      httpStatus: response.status, chapStatus: body.status, message: body.message,
    }));
    throw new Error('Payment verification request failed.');
  }

  return body.data || {};
}

// ─────────────────────────────────────────────
// GET SUBSCRIPTION PLANS
// ─────────────────────────────────────────────
const getPlans = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY sort_order'
    );
    return R.success(res, rows);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// GET MY SUBSCRIPTION — Priority 3
// Returns the active subscription if one exists,
// otherwise the most recently created one.
// Prevents a newer pending/failed sub from hiding
// an existing active subscription.
// ─────────────────────────────────────────────
const getMySubscription = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, p.name AS plan_name, p.price_etb, p.duration_days
       FROM subscriptions s
       JOIN subscription_plans p ON p.id = s.plan_id
       WHERE s.user_id = $1
       ORDER BY
         CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
         s.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    return R.success(res, rows[0] || null);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// INITIATE PAYMENT — Priority 4 + 6
// Validates input, blocks duplicate active-subscription
// payments, reuses recent pending Chapa payments to
// prevent DB spam from repeated button clicks.
// ─────────────────────────────────────────────
const initiatePayment = async (req, res, next) => {
  let payId = null;

  try {
    const { plan_id, gateway = 'chapa' } = req.body;

    // ── Input validation (Priority 6) ─────────────────────
    const parsedPlanId = parseInt(plan_id, 10);
    if (!parsedPlanId || parsedPlanId < 1 || isNaN(parsedPlanId)) {
      return R.badRequest(res, 'plan_id must be a positive integer');
    }
    const SUPPORTED_GATEWAYS = ['chapa', 'telebirr', 'santimpay'];
    if (!SUPPORTED_GATEWAYS.includes(gateway)) {
      return R.badRequest(res, `Unsupported gateway. Choose one of: ${SUPPORTED_GATEWAYS.join(', ')}`);
    }

    // ── Block placeholder gateways (Priority 9) ────────────
    if (gateway === 'telebirr' || gateway === 'santimpay') {
      return res.status(501).json({
        success: false,
        message: `${gateway === 'telebirr' ? 'Telebirr' : 'SantimPay'} integration is not yet available. Please use Chapa.`,
      });
    }

    // ── Validate plan ──────────────────────────────────────
    const { rows: plans } = await pool.query(
      'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = TRUE',
      [parsedPlanId]
    );
    if (!plans.length) return R.notFound(res, 'Subscription plan not found');
    const plan = plans[0];

    // ── Block if student already has an active subscription ─
    const { rows: activeSubs } = await pool.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
       LIMIT 1`,
      [req.user.id]
    );
    if (activeSubs.length) {
      return res.status(409).json({
        success: false,
        code:    'ALREADY_SUBSCRIBED',
        message: 'You already have an active subscription. It will expire before you can purchase a new one.',
      });
    }

    // ── Reuse recent pending Chapa payment (Priority 4) ────
    // If the student abandoned a checkout in the last 30 minutes,
    // reuse the existing tx_ref instead of creating another record.
    const reuseCutoff = new Date(Date.now() - PENDING_REUSE_WINDOW_MS);
    const { rows: existingPending } = await pool.query(
      `SELECT p.*, s.id AS sub_id
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       WHERE p.user_id   = $1
         AND p.plan_id   = $2
         AND p.gateway   = 'chapa'
         AND p.status    = 'pending'
         AND p.created_at > $3
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [req.user.id, parsedPlanId, reuseCutoff]
    );

    if (existingPending.length) {
      // Reuse: just get a fresh checkout URL from Chapa for the same tx_ref
      const existing = existingPending[0];
      logger.info(`[Payment] Reusing pending tx_ref=${existing.gateway_ref} for user=${req.user.id}`);
      try {
        const { checkout_url } = await chapaInitialize({
          amount:     plan.price_etb,
          email:      req.user.email,
          first_name: req.user.first_name,
          last_name:  req.user.last_name,
          tx_ref:     existing.gateway_ref,
        });
        return R.success(res, {
          checkout_url,
          tx_ref:   existing.gateway_ref,
          amount:   plan.price_etb,
          currency: 'ETB',
          gateway:  'chapa',
          instructions: 'Complete payment on Chapa.',
        }, 'Payment initiated (existing session resumed)');
      } catch (reuseErr) {
        // If reuse fails, fall through to create a fresh payment
        logger.warn(`[Payment] Could not reuse tx_ref=${existing.gateway_ref}: ${reuseErr.message}`);
      }
    }

    // ── Create fresh PENDING subscription + payment ────────
    const txRef = `EMA-${uuidv4().slice(0, 8).toUpperCase()}`;

    const { rows: subResult } = await pool.query(
      'INSERT INTO subscriptions (user_id, plan_id, status) VALUES ($1,$2,$3) RETURNING id',
      [req.user.id, parsedPlanId, 'pending']
    );
    const subId = subResult[0].id;

    const { rows: payResult } = await pool.query(
      `INSERT INTO payments
         (user_id, subscription_id, plan_id, amount_etb, gateway, gateway_ref, status)
       VALUES ($1,$2,$3,$4,'chapa',$5,'pending')
       RETURNING id`,
      [req.user.id, subId, parsedPlanId, plan.price_etb, txRef]
    );
    payId = payResult[0].id;

    // ── Call Chapa initialize ──────────────────────────────
    const { checkout_url } = await chapaInitialize({
      amount:     plan.price_etb,
      email:      req.user.email,
      first_name: req.user.first_name,
      last_name:  req.user.last_name,
      tx_ref:     txRef,
    });

    logger.info(`[Payment] Chapa checkout created for user=${req.user.id} tx_ref=${txRef}`);

    return R.success(res, {
      checkout_url,
      tx_ref:   txRef,
      amount:   plan.price_etb,
      currency: 'ETB',
      gateway:  'chapa',
      instructions: 'Complete payment on Chapa. You will be redirected back after payment.',
    }, 'Payment initiated');

  } catch (err) {
    if (payId) {
      pool.query("UPDATE payments SET status = 'failed' WHERE id = $1", [payId])
        .catch(e => logger.error('[Payment] Could not mark payment failed:', e.message));
    }
    if (err.message && (
      err.message.includes('payment gateway') ||
      err.message.includes('Payment') ||
      err.message.includes('Could not reach') ||
      err.message.includes('timed out')
    )) {
      return res.status(502).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// CHAPA WEBHOOK CALLBACK — Phase 6 (race-safe)
//
// Race-condition protection strategy (Priority 1):
//   Uses SELECT ... FOR UPDATE SKIP LOCKED inside a
//   transaction to atomically claim a pending payment row.
//   If another request already holds the lock, SKIP LOCKED
//   returns 0 rows → this request immediately returns 200
//   without processing, preventing double-activation.
//
// This is a true database-level lock — no two concurrent
// requests can claim the same payment row simultaneously.
//
// Activation is transactional (Priority 2):
//   BEGIN → UPDATE payments → UPDATE subscriptions → COMMIT
//   On any failure → ROLLBACK.
//   Database is never left in an inconsistent state.
// ─────────────────────────────────────────────
const chapaCallback = async (req, res, next) => {
  const ackOk = (msg) => {
    logger.info(`[Chapa Webhook] ACK: ${msg}`);
    return res.status(200).json({ success: true, message: msg });
  };

  try {
    // ── 0. HMAC signature verification ────────────────────
    const chapaSignature = req.headers['x-chapa-signature'] || '';
    try {
      verifyWebhookSignature(req.rawBody, chapaSignature);
    } catch (sigErr) {
      logger.warn(`[Chapa Webhook] Signature verification failed: ${sigErr.message}`);
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // ── 1. tx_ref must be present ──────────────────────────
    const { tx_ref } = req.body;
    if (!tx_ref || typeof tx_ref !== 'string' || tx_ref.trim() === '') {
      logger.warn('[Chapa Webhook] Missing or invalid tx_ref');
      return res.status(400).json({ success: false, message: 'Missing tx_ref' });
    }

    const safeTxRef = tx_ref.trim();
    logger.info(`[Chapa Webhook] Received for tx_ref=${safeTxRef}`);

    // ── 2. Quick lookup — does this tx_ref exist at all? ───
    const { rows: existing } = await pool.query(
      'SELECT id, status FROM payments WHERE gateway_ref = $1',
      [safeTxRef]
    );
    if (!existing.length) {
      logger.warn(`[Chapa Webhook] Unknown tx_ref=${safeTxRef}`);
      return ackOk('Unknown transaction — no action taken');
    }
    // Already completed — early exit without acquiring a lock
    if (existing[0].status === 'completed') {
      logger.info(`[Chapa Webhook] Already completed tx_ref=${safeTxRef}`);
      return ackOk('Already processed — no duplicate action taken');
    }
    if (existing[0].status === 'failed') {
      logger.warn(`[Chapa Webhook] Previously failed tx_ref=${safeTxRef}`);
      return ackOk('Payment was previously failed — no action taken');
    }

    // ── 3. Chapa server-side verification ──────────────────
    // Do this BEFORE acquiring the DB lock so the lock is held
    // for the shortest possible time (reduces contention).
    let verifiedTx;
    try {
      verifiedTx = await chapaVerify(safeTxRef);
    } catch (verifyErr) {
      logger.error(`[Chapa Webhook] Verify failed tx_ref=${safeTxRef}: ${verifyErr.message}`);
      return ackOk('Verification temporarily unavailable — will retry');
    }

    // ── 4. Validate Chapa response fields ──────────────────
    const chapaStatus   = (verifiedTx.status   || '').toLowerCase();
    const chapaCurrency = (verifiedTx.currency  || '').toUpperCase();
    const chapaAmount   = parseFloat(verifiedTx.amount || 0);
    const chapaTxRef    = (verifiedTx.tx_ref    || '').trim();

    if (chapaStatus !== 'success') {
      logger.warn(`[Chapa Webhook] Non-success status="${chapaStatus}" tx_ref=${safeTxRef}`);
      // Mark failed outside any lock — safe, idempotent
      await pool.query(
        "UPDATE payments SET status = 'failed', updated_at = NOW() WHERE gateway_ref = $1 AND status = 'pending'",
        [safeTxRef]
      );
      return ackOk(`Payment status is "${chapaStatus}" — not activating`);
    }
    if (chapaCurrency !== 'ETB') {
      logger.error(`[Chapa Webhook] Currency mismatch expected ETB got "${chapaCurrency}" tx_ref=${safeTxRef}`);
      await pool.query(
        "UPDATE payments SET status = 'failed', updated_at = NOW() WHERE gateway_ref = $1 AND status = 'pending'",
        [safeTxRef]
      );
      return ackOk('Currency mismatch — not activating');
    }
    if (chapaTxRef && chapaTxRef !== safeTxRef) {
      logger.error(`[Chapa Webhook] tx_ref mismatch sent="${safeTxRef}" got="${chapaTxRef}"`);
      await pool.query(
        "UPDATE payments SET status = 'failed', updated_at = NOW() WHERE gateway_ref = $1 AND status = 'pending'",
        [safeTxRef]
      );
      return ackOk('tx_ref mismatch — not activating');
    }

    // ── 5. Atomic claim + transactional activation ─────────
    // Priority 1 (race condition fix): SELECT FOR UPDATE SKIP LOCKED
    //   atomically claims the payment row. If another concurrent
    //   request already holds the lock, SKIP LOCKED returns 0 rows
    //   and we return immediately — safe, no double activation.
    //
    // Priority 2 (atomic activation): both UPDATEs are inside
    //   the same BEGIN/COMMIT — either both succeed or neither does.
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Atomically claim the pending payment row
      const { rows: claimedPayments } = await client.query(
        `SELECT p.*, sp.price_etb AS plan_price_etb, sp.duration_days, sp.name AS plan_name
         FROM payments p
         JOIN subscription_plans sp ON sp.id = p.plan_id
         WHERE p.gateway_ref = $1
           AND p.status      = 'pending'
         FOR UPDATE SKIP LOCKED`,
        [safeTxRef]
      );

      if (!claimedPayments.length) {
        // Another concurrent request already claimed this row — safe to ignore
        await client.query('ROLLBACK');
        logger.info(`[Chapa Webhook] Row already claimed by concurrent request tx_ref=${safeTxRef}`);
        return ackOk('Concurrent request handled — no duplicate action');
      }

      const payment = claimedPayments[0];

      // Re-check status inside the lock (defence-in-depth)
      if (payment.status !== 'pending') {
        await client.query('ROLLBACK');
        logger.info(`[Chapa Webhook] Status changed while waiting for lock: ${payment.status}`);
        return ackOk('Already processed inside lock — no action taken');
      }

      // Amount check — compare against DB value (never trust client)
      const expectedAmount = parseFloat(payment.amount_etb || 0);
      const TOLERANCE      = 0.01;
      if (Math.abs(chapaAmount - expectedAmount) > TOLERANCE) {
        await client.query(
          "UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1",
          [payment.id]
        );
        await client.query('COMMIT');
        logger.error(`[Chapa Webhook] Amount mismatch expected=${expectedAmount} got=${chapaAmount} tx_ref=${safeTxRef}`);
        return ackOk('Amount mismatch — not activating');
      }

      // Build plan object for activateSubscriptionTx
      const plan = {
        name:          payment.plan_name,
        duration_days: payment.duration_days,
      };

      // Transactional activation — both UPDATEs inside BEGIN/COMMIT
      await activateSubscriptionTx(client, payment, plan);

      await client.query('COMMIT');

      // Store Chapa gateway_tx_id (non-critical, outside transaction)
      if (verifiedTx.id) {
        pool.query('UPDATE payments SET gateway_tx_id = $1 WHERE id = $2', [String(verifiedTx.id), payment.id])
          .catch(e => logger.warn('[Chapa Webhook] Could not store gateway_tx_id:', e.message));
      }

      return ackOk('Subscription activated successfully');

    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error(`[Chapa Webhook] Transaction rolled back for tx_ref=${safeTxRef}: ${txErr.message}`);
      // Return 200 so Chapa retries — our data is safe (ROLLBACK happened)
      return ackOk('Internal error — will retry');
    } finally {
      client.release();
    }

  } catch (err) {
    logger.error('[Chapa Webhook] Unexpected error:', err.message);
    return res.status(200).json({ success: false, message: 'Internal error' });
  }
};

// ─────────────────────────────────────────────
// ADMIN: GET ALL PAYMENTS
// ─────────────────────────────────────────────
const getAllPayments = async (req, res, next) => {
  try {
    const { status, gateway, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = [], params = [];

    if (status)  { params.push(status);  where.push(`p.status = $${params.length}`); }
    if (gateway) { params.push(gateway); where.push(`p.gateway = $${params.length}`); }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows: total } = await pool.query(
      `SELECT COUNT(*) AS c FROM payments p ${whereStr}`, params
    );
    params.push(parseInt(limit));
    params.push(offset);
    const { rows } = await pool.query(
      `SELECT p.*, u.first_name, u.last_name, u.email, sp.name AS plan_name
       FROM payments p
       JOIN users u ON u.id = p.user_id
       JOIN subscription_plans sp ON sp.id = p.plan_id
       ${whereStr}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return R.paginated(res, rows, parseInt(total[0].c), page, limit);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN: MANUALLY APPROVE PAYMENT
// Transactional + atomic (Priority 2).
// Idempotent — safe if called twice.
// ─────────────────────────────────────────────
const approvePayment = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Atomically claim the payment row — prevents double-approval
    const { rows: payments } = await client.query(
      `SELECT p.*, sp.duration_days, sp.name AS plan_name
       FROM payments p
       JOIN subscription_plans sp ON sp.id = p.plan_id
       WHERE p.id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    if (!payments.length) {
      await client.query('ROLLBACK');
      return R.notFound(res, 'Payment not found');
    }

    const payment = payments[0];

    if (payment.status === 'completed') {
      await client.query('ROLLBACK');
      return R.success(res, {}, 'Payment was already approved — no change made');
    }

    const plan = { name: payment.plan_name, duration_days: payment.duration_days };
    await activateSubscriptionTx(client, payment, plan, { adminId: req.user.id });

    await client.query('COMMIT');
    return R.success(res, {}, 'Payment approved and subscription activated');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getPlans, getMySubscription, initiatePayment,
  chapaCallback, getAllPayments, approvePayment,
};
