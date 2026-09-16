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

test('admin createQuestion accepts JSON-string payloads from the form', async () => {
    const originalQuery = pool.query;
    const calls = [];

    pool.query = async (sql, params = []) => {
        calls.push({ sql, params });

        if (sql.startsWith('INSERT INTO questions')) {
            return { rows: [{ id: 42 }] };
        }

        if (sql.startsWith('INSERT INTO options')) {
            return { rows: [] };
        }

        if (sql.startsWith('INSERT INTO explanations')) {
            return { rows: [] };
        }

        return { rows: [] };
    };

    try {
        const res = buildRes();
        const req = {
            body: {
                subject_id: '7',
                type: 'multiple_choice',
                question_text: 'Who is the main character?',
                difficulty: 'medium',
                exam_importance: 'high',
                year: '2024',
                is_free: 'true',
                options: JSON.stringify([
                    { label: 'A', text: 'Alice', is_correct: true, sort_order: 0 },
                    { label: 'B', text: 'Bob', is_correct: false, sort_order: 1 },
                ]),
                explanation: JSON.stringify({
                    why_correct: 'Because Alice is the answer.',
                    common_mistake: 'Do not assume Bob.',
                }),
            },
            user: { id: 99 },
            file: null,
        };

        await controller.createQuestion(req, res, () => { });

        assert.equal(res.statusCode, 201);
        assert.equal(calls.some(c => c.sql.startsWith('INSERT INTO options')), true);
        assert.equal(calls.some(c => c.sql.startsWith('INSERT INTO explanations')), true);
        assert.deepEqual(calls.find(c => c.sql.startsWith('INSERT INTO options')).params.slice(0, 3), [42, 'A', 'Alice']);
        assert.equal(calls.find(c => c.sql.startsWith('INSERT INTO explanations')).params[1], 'Because Alice is the answer.');
    } finally {
        pool.query = originalQuery;
    }
});
