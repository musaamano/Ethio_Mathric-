const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../src/controllers/questionController');
const { pool } = require('../src/config/db');

function buildRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('getQuestions without is_active defaults to active questions only', async () => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (sql, params = []) => {
    calls.push({ sql, params });

    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: 10 }] };
    }

    if (sql.includes('SELECT q.*')) {
      return {
        rows: [
          { id: 1, question_text: 'Active question', is_active: true, subject_id: 2 },
        ]
      };
    }

    return { rows: [] };
  };

  try {
    const res = buildRes();
    const req = {
      query: { subject_id: 2 },
      user: { id: 1, role_id: 2 },
    };

    await controller.getQuestions(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.ok(calls.length > 0);
    // Verify that the WHERE clause includes is_active = TRUE by default
    const selectQuery = calls.find(c => c.sql.includes('SELECT q.*'));
    assert.ok(selectQuery, 'Should have a SELECT query');
    assert.ok(selectQuery.sql.includes('is_active = TRUE'), 'Should filter by is_active = TRUE by default');
  } finally {
    pool.query = originalQuery;
  }
});

test('getQuestions with is_active=true filters active questions', async () => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (sql, params = []) => {
    calls.push({ sql, params });

    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: 5 }] };
    }

    if (sql.includes('SELECT q.*')) {
      return {
        rows: [
          { id: 1, question_text: 'Active question', is_active: true, subject_id: 2 },
        ]
      };
    }

    return { rows: [] };
  };

  try {
    const res = buildRes();
    const req = {
      query: { subject_id: 2, is_active: 'true' },
      user: { id: 1, role_id: 2 },
    };

    await controller.getQuestions(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.ok(calls.length > 0);
    const selectQuery = calls.find(c => c.sql.includes('SELECT q.*'));
    assert.ok(selectQuery);
    assert.ok(selectQuery.sql.includes('is_active = $'), 'Should use parameterized is_active filter');
    // The parameter should be true - check the params array contains true
    assert.ok(selectQuery.params.includes(true), 'is_active parameter should be true');
  } finally {
    pool.query = originalQuery;
  }
});

test('getQuestions with is_active=false filters inactive questions', async () => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (sql, params = []) => {
    calls.push({ sql, params });

    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: 3 }] };
    }

    if (sql.includes('SELECT q.*')) {
      return {
        rows: [
          { id: 2, question_text: 'Inactive question', is_active: false, subject_id: 2 },
        ]
      };
    }

    return { rows: [] };
  };

  try {
    const res = buildRes();
    const req = {
      query: { subject_id: 2, is_active: 'false' },
      user: { id: 1, role_id: 2 },
    };

    await controller.getQuestions(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.ok(calls.length > 0);
    const selectQuery = calls.find(c => c.sql.includes('SELECT q.*'));
    assert.ok(selectQuery);
    assert.ok(selectQuery.sql.includes('is_active = $'), 'Should use parameterized is_active filter');
    // The parameter should be false - check the params array contains false
    assert.ok(selectQuery.params.includes(false), 'is_active parameter should be false');
  } finally {
    pool.query = originalQuery;
  }
});

test('toggleQuestionStatus executes expected status update', async () => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (sql, params = []) => {
    calls.push({ sql, params });
    return { rows: [] };
  };

  try {
    const res = buildRes();
    const req = {
      params: { id: 1 },
      user: { id: 1, role_id: 2 },
    };

    await controller.toggleQuestionStatus(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.ok(calls.length > 0);
    const updateQuery = calls.find(c => c.sql.includes('UPDATE questions SET is_active'));
    assert.ok(updateQuery, 'Should have an UPDATE query');
    assert.ok(updateQuery.sql.includes('NOT is_active'), 'Should toggle using NOT is_active');
    assert.equal(updateQuery.params[0], 1, 'Should use question ID from params');
  } finally {
    pool.query = originalQuery;
  }
});

test('deleteQuestion soft-deletes by setting is_active to FALSE', async () => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (sql, params = []) => {
    calls.push({ sql, params });
    return { rows: [] };
  };

  try {
    const res = buildRes();
    const req = {
      params: { id: 1 },
      user: { id: 1, role_id: 2 },
    };

    await controller.deleteQuestion(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.ok(calls.length > 0);
    const updateQuery = calls.find(c => c.sql.includes('UPDATE questions SET is_active'));
    assert.ok(updateQuery, 'Should have an UPDATE query');
    assert.ok(updateQuery.sql.includes('is_active = FALSE'), 'Should set is_active to FALSE');
    assert.equal(updateQuery.params[0], 1, 'Should use question ID from params');
  } finally {
    pool.query = originalQuery;
  }
});
