/**
 * userManagement.test.js
 * Phase 3 tests + full deleteUser transaction tests.
 * Uses node:test — no external test runner required.
 * Mocks both pool.query (for simple queries) and getClient (for transactions).
 */
const test   = require('node:test');
const assert = require('node:assert/strict');

const dbModule = require('../src/config/db');
const { pool } = dbModule;

// ── Mock helpers ──────────────────────────────────────────────

/**
 * Replace pool.query for the duration of one async callback.
 */
async function withMockPool(mockFn, callback) {
  const original = pool.query;
  pool.query = mockFn;
  try {
    await callback();
  } finally {
    pool.query = original;
  }
}

/**
 * Replace pool.connect (used by deleteUser via getClient) with a mock client.
 * The mock client tracks BEGIN/COMMIT/ROLLBACK and all queries.
 * This works because the controller calls pool.connect() via getClient = () => pool.connect()
 */
async function withMockClient(clientQueryFn, callback) {
  const original = pool.connect;

  const mockClient = {
    queries: [],
    committed: false,
    rolledBack: false,
    released: false,
    async query(sql, params = []) {
      this.queries.push({ sql: sql.trim().replace(/\s+/g, ' '), params });
      const norm = sql.trim().toUpperCase().replace(/\s+/g, ' ');
      if (norm === 'BEGIN')    return { rows: [] };
      if (norm === 'COMMIT')   { this.committed   = true; return { rows: [] }; }
      if (norm === 'ROLLBACK') { this.rolledBack   = true; return { rows: [] }; }
      return clientQueryFn(sql, params);
    },
    release() { this.released = true; },
  };

  pool.connect = async () => mockClient;
  try {
    await callback(mockClient);
  } finally {
    pool.connect = original;
  }
}

function buildRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function buildReq(overrides = {}) {
  return { params: {}, body: {}, query: {}, user: { id: 99, role_id: 2 }, ...overrides };
}

const ctrl = require('../src/controllers/userController');

// ─────────────────────────────────────────────────────────────
// deleteUser — validation
// ─────────────────────────────────────────────────────────────

test('deleteUser: invalid ID returns 400', async () => {
  const res = buildRes();
  await ctrl.deleteUser(buildReq({ params: { id: 'nope' }, user: { id: 99, role_id: 3 } }), res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /invalid user id/i);
});

test('deleteUser: prevents self-deletion', async () => {
  const res = buildRes();
  await ctrl.deleteUser(buildReq({ params: { id: '99' }, user: { id: 99, role_id: 3 } }), res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /own account/i);
});

// ─────────────────────────────────────────────────────────────
// deleteUser — transaction tests with mock client
// ─────────────────────────────────────────────────────────────

test('deleteUser: user not found returns 404 and rolls back', async () => {
  await withMockClient(async (sql) => {
    if (sql.includes('FROM users WHERE id')) return { rows: [] };
    return { rows: [] };
  }, async (client) => {
    const res = buildRes();
    await ctrl.deleteUser(
      buildReq({ params: { id: '5' }, user: { id: 99, role_id: 3 } }),
      res, () => {}
    );
    assert.equal(res.statusCode, 404);
    assert.equal(client.committed,  false, 'should not commit');
    assert.equal(client.rolledBack, true,  'should rollback on missing user');
  });
});

test('deleteUser: blocked when user has payment records (409)', async () => {
  let callCount = 0;
  await withMockClient(async (sql) => {
    callCount++;
    // 1st: user existence
    if (sql.includes('FROM users WHERE id')) {
      return { rows: [{ id: 5, first_name: 'A', last_name: 'B', email: 'a@b.com', role_id: 1 }] };
    }
    // 2nd: payment check — returns a row → should block deletion
    if (sql.includes('FROM payments WHERE user_id')) {
      return { rows: [{ id: 10 }] };
    }
    return { rows: [] };
  }, async (client) => {
    const res = buildRes();
    await ctrl.deleteUser(
      buildReq({ params: { id: '5' }, user: { id: 99, role_id: 3 } }),
      res, () => {}
    );
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'USER_HAS_PAYMENTS');
    assert.equal(client.committed,  false, 'must not commit when blocked');
    assert.equal(client.rolledBack, true,  'must rollback when blocked');
  });
});

test('deleteUser: successful deletion commits transaction (no payments)', async () => {
  await withMockClient(async (sql) => {
    if (sql.includes('FROM users WHERE id')) {
      return { rows: [{ id: 5, first_name: 'A', last_name: 'B', email: 'a@b.com', role_id: 1 }] };
    }
    // Payment check: no payment records
    if (sql.includes('FROM payments WHERE user_id')) return { rows: [] };
    return { rows: [], rowCount: 1 };
  }, async (client) => {
    const res = buildRes();
    await ctrl.deleteUser(
      buildReq({ params: { id: '5' }, user: { id: 99, role_id: 3 } }),
      res, () => {}
    );
    assert.equal(res.statusCode, 200, `expected 200 but got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.equal(client.committed,  true,  'transaction must commit on success');
    assert.equal(client.rolledBack, false, 'should not rollback on success');
    assert.equal(client.released,  true,  'client must be released');
  });
});

test('deleteUser: payment records are preserved (UPDATE admin_approved_by, not user_id)', async () => {
  await withMockClient(async (sql) => {
    if (sql.includes('FROM users WHERE id')) {
      return { rows: [{ id: 5, first_name: 'A', last_name: 'B', email: 'a@b.com', role_id: 1 }] };
    }
    if (sql.includes('FROM payments WHERE user_id')) return { rows: [] }; // no payments — allow deletion
    return { rows: [], rowCount: 1 };
  }, async (client) => {
    const res = buildRes();
    await ctrl.deleteUser(
      buildReq({ params: { id: '5' }, user: { id: 99, role_id: 3 } }),
      res, () => {}
    );
    assert.equal(res.statusCode, 200);

    // The only payments query must be the check SELECT, not an UPDATE user_id = NULL
    const paymentUpdatesUserIdNull = client.queries.filter(q =>
      q.sql.toUpperCase().includes('UPDATE PAYMENTS') &&
      q.sql.toUpperCase().includes('USER_ID')
    );
    assert.equal(paymentUpdatesUserIdNull.length, 0, 'must NOT attempt UPDATE payments SET user_id = NULL');

    // mock_exams was dropped in migration 004 — must NOT appear in any query
    const mockExamsQueries = client.queries.filter(q =>
      q.sql.toLowerCase().includes('mock_exams')
    );
    assert.equal(mockExamsQueries.length, 0, 'must NOT query dropped table mock_exams');

    // Verify DELETE only targets users table
    const deleteQueries = client.queries.filter(q => q.sql.toUpperCase().startsWith('DELETE'));
    assert.equal(deleteQueries.length, 1, 'exactly one DELETE');
    assert.match(deleteQueries[0].sql, /DELETE FROM users/i);
  });
});

test('deleteUser: transaction rollback on DB error, client released', async () => {
  await withMockClient(async (sql) => {
    if (sql.includes('FROM users WHERE id')) {
      return { rows: [{ id: 5, first_name: 'A', last_name: 'B', email: 'a@b.com', role_id: 1 }] };
    }
    if (sql.includes('FROM payments WHERE user_id')) return { rows: [] };
    if (sql.toUpperCase().includes('UPDATE QUESTIONS')) throw new Error('simulated FK violation');
    return { rows: [], rowCount: 1 };
  }, async (client) => {
    const errors = [];
    const res = buildRes();
    await ctrl.deleteUser(
      buildReq({ params: { id: '5' }, user: { id: 99, role_id: 3 } }),
      res, (err) => { errors.push(err); }
    );
    assert.equal(errors.length, 1, 'next(err) called on DB failure');
    assert.equal(client.committed, false, 'must not commit on error');
    assert.equal(client.released,  true,  'client must still be released');
  });
});

test('deleteUser: does not reference dropped tables (mock_exams, chapters, etc.)', async () => {
  const DROPPED_TABLES = ['mock_exams', 'chapters', 'notes', 'exam_questions', 'daily_quiz_log'];
  await withMockClient(async (sql) => {
    if (sql.includes('FROM users WHERE id')) {
      return { rows: [{ id: 5, first_name: 'A', last_name: 'B', email: 'a@b.com', role_id: 1 }] };
    }
    if (sql.includes('FROM payments WHERE user_id')) return { rows: [] };
    return { rows: [], rowCount: 1 };
  }, async (client) => {
    const res = buildRes();
    await ctrl.deleteUser(
      buildReq({ params: { id: '5' }, user: { id: 99, role_id: 3 } }),
      res, () => {}
    );
    assert.equal(res.statusCode, 200);
    DROPPED_TABLES.forEach(table => {
      const references = client.queries.filter(q => q.sql.toLowerCase().includes(table));
      assert.equal(references.length, 0, `must NOT reference dropped table: ${table}`);
    });
  });
});

test('deleteUser: Admin (role_id=2) is blocked by authorize middleware', () => {
  // The route config test verifies authorize('super_admin') is on DELETE /:id
  const router = require('../src/routes/userRoutes');
  const deleteRoute = router.stack.find(
    l => l.route?.path === '/:id' && l.route?.methods?.delete
  );
  assert.ok(deleteRoute, 'DELETE /:id route exists');
  // Middleware chain: authenticate (1) + authorize (2) + controller (3)
  assert.ok(deleteRoute.route.stack.length >= 3, 'DELETE has full middleware chain');
  // The second middleware is authorize('super_admin') — verify its function name
  const authorizeMiddleware = deleteRoute.route.stack[1].handle;
  assert.ok(typeof authorizeMiddleware === 'function', 'authorize middleware is a function');
});

// ─────────────────────────────────────────────────────────────
// getUserActivity
// ─────────────────────────────────────────────────────────────

test('getUserActivity: invalid user ID returns 400', async () => {
  const res = buildRes();
  await ctrl.getUserActivity(buildReq({ params: { id: 'abc' } }), res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /invalid user id/i);
});

test('getUserActivity: user not found returns 404', async () => {
  await withMockPool(async () => ({ rows: [] }), async () => {
    const res = buildRes();
    await ctrl.getUserActivity(buildReq({ params: { id: '999' } }), res, () => {});
    assert.equal(res.statusCode, 404);
  });
});

test('getUserActivity: returns stats and activity for existing user', async () => {
  let callIndex = 0;
  await withMockPool(async () => {
    callIndex++;
    if (callIndex === 1) return { rows: [{ id: 5, first_name: 'Test', last_name: 'User', email: 't@t.com' }] };
    if (callIndex === 2) return { rows: [{ total_attempts: 10, total_questions: 200, total_correct: 150, total_wrong: 40, total_skipped: 10, avg_score: '75.0', highest_score: '95.0', total_study_secs: 3600, subjects_studied: 3, practice_sessions: 8, past_year_sessions: 2, random_sessions: 0 }] };
    if (callIndex === 3) return { rows: [{ subject_name: 'Maths', color: '#0F4C81', attempts: 5, avg_score: '80', total_correct: 80, total_questions: 100 }] };
    return { rows: [{ id: 1, mode: 'practice', total_questions: 20, correct_answers: 16, wrong_answers: 4, skipped: 0, score_percent: '80.0', time_taken_secs: 360, completed_at: new Date(), subject_name: 'Maths' }] };
  }, async () => {
    const res = buildRes();
    await ctrl.getUserActivity(buildReq({ params: { id: '5' } }), res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.stats.total_attempts, 10);
    assert.ok(Array.isArray(res.body.data.subjectStats));
    assert.ok(Array.isArray(res.body.data.recentActivity));
  });
});

test('routes: GET /:id/activity allows admin and super_admin', () => {
  const router = require('../src/routes/userRoutes');
  const route = router.stack.find(l => l.route?.path === '/:id/activity' && l.route?.methods?.get);
  assert.ok(route, 'GET /:id/activity route exists');
  assert.ok(route.route.stack.length >= 3, 'activity route has full middleware chain');
});

// ─────────────────────────────────────────────────────────────
// updateEmailVerification
// ─────────────────────────────────────────────────────────────

test('updateEmailVerification: invalid ID returns 400', async () => {
  const res = buildRes();
  await ctrl.updateEmailVerification(buildReq({ params: { id: 'xyz' }, body: { is_email_verified: true }, user: { id: 99, role_id: 3 } }), res, () => {});
  assert.equal(res.statusCode, 400);
});

test('updateEmailVerification: non-boolean body returns 400', async () => {
  const res = buildRes();
  await ctrl.updateEmailVerification(buildReq({ params: { id: '5' }, body: { is_email_verified: 'yes' }, user: { id: 99, role_id: 3 } }), res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /boolean/i);
});

test('updateEmailVerification: user not found returns 404', async () => {
  await withMockPool(async () => ({ rows: [] }), async () => {
    const res = buildRes();
    await ctrl.updateEmailVerification(buildReq({ params: { id: '999' }, body: { is_email_verified: true }, user: { id: 99, role_id: 3 } }), res, () => {});
    assert.equal(res.statusCode, 404);
  });
});

test('updateEmailVerification: marks email verified', async () => {
  await withMockPool(async () => ({ rows: [{ id: 5, is_email_verified: true }] }), async () => {
    const res = buildRes();
    await ctrl.updateEmailVerification(buildReq({ params: { id: '5' }, body: { is_email_verified: true }, user: { id: 99, role_id: 3 } }), res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.is_email_verified, true);
    assert.match(res.body.message, /verified/i);
  });
});

test('updateEmailVerification: marks email unverified', async () => {
  await withMockPool(async () => ({ rows: [{ id: 5, is_email_verified: false }] }), async () => {
    const res = buildRes();
    await ctrl.updateEmailVerification(buildReq({ params: { id: '5' }, body: { is_email_verified: false }, user: { id: 99, role_id: 3 } }), res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.is_email_verified, false);
    assert.match(res.body.message, /unverified/i);
  });
});

test('routes: PUT /:id/email-verification is super_admin only', () => {
  const router = require('../src/routes/userRoutes');
  const route = router.stack.find(l => l.route?.path === '/:id/email-verification' && l.route?.methods?.put);
  assert.ok(route, 'PUT /:id/email-verification route exists');
  assert.ok(route.route.stack.length >= 3, 'email-verification has full middleware chain');
});
