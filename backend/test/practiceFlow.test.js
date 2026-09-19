const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../src/controllers/questionController');
const questionRoutes = require('../src/routes/questionRoutes');
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

function questionRows(count, start = 1) {
    return Array.from({ length: count }, (_, index) => ({
        id: start + index,
        question_text: `Question ${start + index}`,
        type: 'multiple_choice',
        subject_id: 7,
    }));
}

async function invokePractice({ total, rows, query = {} }) {
    const originalQuery = pool.query;
    const calls = [];
    pool.query = async (sql, params = []) => {
        calls.push({ sql, params });
        if (sql.includes('COUNT(*)')) return { rows: [{ total }] };
        if (sql.includes('SELECT q.id')) return { rows };
        if (sql.includes('FROM options')) return { rows: [] };
        if (sql.includes('FROM explanations')) return { rows: [] };
        throw new Error(`Unexpected query: ${sql}`);
    };

    try {
        const res = buildRes();
        let nextError = null;
        await controller.getPracticeQuestions({
            query: { subject_id: '7', mode: 'practice', count: '100', ...query },
            user: { id: 42 },
            hasSubscription: true,
        }, res, error => { nextError = error; });
        assert.equal(nextError, null);
        return { res, calls };
    } finally {
        pool.query = originalQuery;
    }
}

test('Practice returns at most 100 questions when more are available', async () => {
    const { res, calls } = await invokePractice({ total: 500, rows: questionRows(100), query: { count: '1' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.length, 100);
    const select = calls.find(call => call.sql.includes('SELECT q.id'));
    assert.equal(select.params.at(-2), 100);
});

test('Practice returns every active question when fewer than 100 remain', async () => {
    const { res, calls } = await invokePractice({ total: 75, rows: questionRows(75) });
    assert.equal(res.body.data.length, 75);
    const select = calls.find(call => call.sql.includes('SELECT q.id'));
    assert.equal(select.sql.includes('LIMIT'), false);
});

test('Next Questions excludes questions already completed by the student', async () => {
    const { res, calls } = await invokePractice({
        total: 2,
        rows: questionRows(2, 101),
        query: { exclude_completed: 'true' },
    });
    assert.deepEqual(res.body.data.map(question => question.id), [101, 102]);
    const count = calls.find(call => call.sql.includes('COUNT(*)'));
    const select = calls.find(call => call.sql.includes('SELECT q.id'));
    assert.match(count.sql, /result_answers/);
    assert.match(select.sql, /result_answers/);
    assert.match(select.sql, /ORDER BY q\.id ASC/);
    assert.equal(select.params[1], 42);
});

test('Next Questions returns an empty session when no questions remain', async () => {
    const { res } = await invokePractice({ total: 0, rows: [], query: { exclude_completed: 'true' } });
    assert.deepEqual(res.body.data, []);
});

test('completed retries create another result while preserving the original history', async () => {
    let nextResultId = 100;
    const queries = [];
    const client = {
        async query(sql, params = []) {
            queries.push({ sql, params });
            const normalized = sql.replace(/\s+/g, ' ').trim();
            if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
            if (normalized.includes('FROM options')) return { rows: [{ question_id: 1, option_label: 'A' }] };
            if (normalized.startsWith('UPDATE questions')) return { rows: [] };
            if (normalized.startsWith('INSERT INTO results')) return { rows: [{ id: nextResultId++ }] };
            if (normalized.startsWith('INSERT INTO result_answers')) return { rows: [] };
            throw new Error(`Unexpected query: ${normalized}`);
        },
        release() { },
    };

    const submit = controller.createSubmitAnswers(async () => client);
    const invoke = async () => {
        const res = buildRes();
        await submit({
            body: { subject_id: 7, mode: 'practice', answers: [{ question_id: 1, selected_option: 'A' }] },
            user: { id: 42 },
            hasSubscription: true,
        }, res, error => { if (error) throw error; });
        return res;
    };

    await invoke();
    await invoke();
    assert.equal(queries.filter(query => query.sql.includes('INSERT INTO results')).length, 2);
    assert.equal(queries.filter(query => query.sql.includes('INSERT INTO result_answers')).length, 2);
});

test('Practice accepts correct and incorrect answers and persists the result details', async () => {
    const queries = [];
    const client = {
        async query(sql, params = []) {
            queries.push({ sql, params });
            const normalized = sql.replace(/\s+/g, ' ').trim();
            if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
            if (normalized.includes('FROM options')) {
                return {
                    rows: [
                        { question_id: 1, option_label: 'A.' },
                        { question_id: 2, option_label: 'B' },
                    ].filter(row => params.includes(row.question_id))
                };
            }
            if (normalized.startsWith('UPDATE questions')) return { rows: [] };
            if (normalized.startsWith('INSERT INTO results')) return { rows: [{ id: 501 }] };
            if (normalized.startsWith('INSERT INTO result_answers')) return { rows: [] };
            throw new Error(`Unexpected query: ${normalized}`);
        },
        release() { },
    };

    const submit = controller.createSubmitAnswers(async () => client);
    const res = buildRes();
    await submit({
        body: {
            subject_id: 7,
            mode: 'practice',
            answers: [
                { question_id: 1, selected_option: 'A.' },
                { question_id: 2, selected_option: 'D' },
            ],
        },
        user: { id: 42 },
        hasSubscription: true,
    }, res, error => { if (error) throw error; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.result_id, 501);
    assert.deepEqual(
        { total: res.body.data.total, correct: res.body.data.correct, wrong: res.body.data.wrong },
        { total: 2, correct: 1, wrong: 1 },
    );
    assert.equal(queries.filter(query => query.sql.includes('INSERT INTO results')).length, 1);
    assert.equal(queries.filter(query => query.sql.includes('INSERT INTO result_answers')).length, 1);
    const answerInsert = queries.find(query => query.sql.includes('INSERT INTO result_answers'));
    assert.deepEqual(answerInsert.params, [501, 1, 'A', true, 501, 2, 'D', false]);
});

test('Practice rejects malformed answers without creating a result', async () => {
    const queries = [];
    const client = {
        async query(sql, params = []) {
            queries.push({ sql, params });
            const normalized = sql.replace(/\s+/g, ' ').trim();
            if (normalized === 'BEGIN' || normalized === 'ROLLBACK') return { rows: [] };
            if (normalized.includes('FROM options')) return { rows: [{ question_id: 1, option_label: 'A' }] };
            throw new Error(`Unexpected query: ${normalized}`);
        },
        release() { },
    };

    const submit = controller.createSubmitAnswers(async () => client);
    const res = buildRes();
    await submit({
        body: { subject_id: 7, mode: 'practice', answers: [{ question_id: 1, selected_option: 'Z' }] },
        user: { id: 42 },
        hasSubscription: true,
    }, res, () => { });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'No valid answers provided');
    assert.equal(queries.some(query => query.sql.includes('INSERT INTO results')), false);
});

test('Practice persists unanswered questions as skipped results', async () => {
    const queries = [];
    const client = {
        async query(sql, params = []) {
            queries.push({ sql, params });
            const normalized = sql.replace(/\s+/g, ' ').trim();
            if (['BEGIN', 'COMMIT'].includes(normalized)) return { rows: [] };
            if (normalized.includes('FROM options')) return { rows: [{ question_id: 1, option_label: 'A' }] };
            if (normalized.startsWith('UPDATE questions')) return { rows: [] };
            if (normalized.startsWith('INSERT INTO results')) return { rows: [{ id: 502 }] };
            if (normalized.startsWith('INSERT INTO result_answers')) return { rows: [] };
            throw new Error(`Unexpected query: ${normalized}`);
        },
        release() { },
    };

    const submit = controller.createSubmitAnswers(async () => client);
    const res = buildRes();
    await submit({
        body: { subject_id: 7, mode: 'practice', answers: [{ question_id: 1, selected_option: null }] },
        user: { id: 42 },
        hasSubscription: true,
    }, res, error => { if (error) throw error; });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(
        { total: res.body.data.total, skipped: res.body.data.skipped, correct: res.body.data.correct },
        { total: 1, skipped: 1, correct: 0 },
    );
    assert.equal(queries.filter(query => query.sql.includes('INSERT INTO results')).length, 1);
    assert.equal(queries.filter(query => query.sql.includes('INSERT INTO result_answers')).length, 1);
});

test('Practice and submission routes remain subscription protected', () => {
    const protectedPaths = new Set(['/practice', '/submit']);
    for (const layer of questionRoutes.stack) {
        if (layer.route && protectedPaths.has(layer.route.path)) {
            const middlewareNames = layer.route.stack.map(handler => handler.name);
            assert.ok(middlewareNames.includes('requireSubscription'), `${layer.route.path} must require a subscription`);
        }
    }
});
