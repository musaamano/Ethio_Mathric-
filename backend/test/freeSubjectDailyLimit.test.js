const test = require('node:test');
const assert = require('node:assert/strict');

const {
    FREE_SUBJECT_DAILY_LIMIT,
    computeSubmittedAnswerCount,
    getDailyLimitStatus,
    createSubmitAnswers,
} = require('../src/controllers/questionController');

class FakeClient {
    constructor(state) {
        this.state = state;
        this.queries = [];
        this.committed = false;
        this.rolledBack = false;
        this.released = false;
    }

    async query(sql, params = []) {
        this.queries.push({ sql, params });
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized === 'BEGIN') return { rows: [] };
        if (normalized === 'COMMIT') {
            this.committed = true;
            return { rows: [] };
        }
        if (normalized === 'ROLLBACK') {
            this.rolledBack = true;
            return { rows: [] };
        }
        if (normalized.startsWith('INSERT INTO free_subject_daily_usage')) {
            return { rows: [] };
        }
        if (normalized.includes('FROM free_subject_daily_usage')) {
            const subjectId = params[1];
            return { rows: [{ question_count: this.state.usageBySubject[subjectId] || 0 }] };
        }
        if (normalized.startsWith('UPDATE free_subject_daily_usage')) {
            const subjectId = params[2];
            this.state.usageBySubject[subjectId] = (this.state.usageBySubject[subjectId] || 0) + params[0];
            if (subjectId === this.state.defaultSubjectId) this.state.usage = this.state.usageBySubject[subjectId];
            return { rows: [] };
        }
        if (normalized.includes('FROM questions q')) {
            const ids = params[0];
            const subjectId = params[1];
            const isFreeValidation = normalized.includes('q.subject_id = $2');
            const valid = ids.filter(id => this.state.questionSubjects[id] !== undefined)
                .filter(id => !isFreeValidation || this.state.questionSubjects[id] === subjectId);
            return {
                rows: valid.map(id => ({
                    question_id: id,
                    option_label: this.state.correctOptions[id] || 'A',
                })),
            };
        }
        if (normalized.includes('FROM options o')) {
            const ids = params;
            return {
                rows: ids
                    .filter(id => this.state.questionSubjects[id] !== undefined)
                    .map(id => ({ question_id: id, option_label: this.state.correctOptions[id] || 'A' })),
            };
        }
        if (normalized.startsWith('UPDATE questions')) return { rows: [] };
        if (normalized.startsWith('INSERT INTO results')) return { rows: [{ id: 100 }] };
        if (normalized.startsWith('INSERT INTO result_answers')) return { rows: [] };

        throw new Error(`Unexpected fake query: ${normalized}`);
    }

    release() {
        this.released = true;
    }
}

function createState(usage = 0, subjectId = 7, count = 25) {
    const state = {
        usage,
        defaultSubjectId: subjectId,
        usageBySubject: { [subjectId]: usage },
        questionSubjects: {},
        correctOptions: {},
    };
    for (let id = 1; id <= count; id += 1) {
        state.questionSubjects[id] = subjectId;
        state.correctOptions[id] = 'A';
    }
    return state;
}

function answersFor(ids, selected = 'A') {
    return ids.map(question_id => ({ question_id, selected_option: selected }));
}

async function invokeSubmit(state, body, hasSubscription = false) {
    let client;
    const handler = createSubmitAnswers(async () => {
        client = new FakeClient(state);
        return client;
    });
    const response = {
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
    let nextError = null;
    await handler({ body, user: { id: 42 }, hasSubscription }, response, err => { nextError = err; });
    return { client, response, nextError };
}

test('free subject daily limit counts only successfully submitted answers', () => {
    const answers = [
        { question_id: 1, selected_option: 'A' },
        { question_id: 2, selected_option: null },
        { question_id: 3, selected_option: 'B' },
        { question_id: 4, selected_option: 'Z' },
        { question_id: 5, selected_option: '' },
    ];

    assert.equal(FREE_SUBJECT_DAILY_LIMIT, 20);
    assert.equal(computeSubmittedAnswerCount(answers), 2);
});

test('daily subject usage status marks a reached limit and remaining balance', () => {
    assert.deepEqual(getDailyLimitStatus(0, FREE_SUBJECT_DAILY_LIMIT), {
        used: 0,
        limit: 20,
        reached: false,
        remaining: 20,
        premium: false,
    });

    assert.deepEqual(getDailyLimitStatus(20, FREE_SUBJECT_DAILY_LIMIT), {
        used: 20,
        limit: 20,
        reached: true,
        remaining: 0,
        premium: false,
    });
});

test('controller accepts exactly 20 valid free answers and commits usage', async () => {
    const state = createState(0, 7, 20);
    const result = await invokeSubmit(state, {
        subject_id: 7,
        mode: 'practice',
        answers: answersFor(Array.from({ length: 20 }, (_, i) => i + 1)),
    });

    assert.equal(result.response.statusCode, 200);
    assert.equal(state.usage, 20);
    assert.equal(result.client.committed, true);
});

test('controller rejects the 21st free answer and preserves the quota', async () => {
    const state = createState(20, 7, 21);
    const result = await invokeSubmit(state, {
        subject_id: 7,
        answers: answersFor([21]),
    });

    assert.equal(result.response.statusCode, 403);
    assert.equal(result.response.body.code, 'FREE_DAILY_LIMIT_REACHED');
    assert.equal(state.usage, 20);
    assert.equal(result.client.rolledBack, true);
});

test('practice and past-year submissions share one subject counter', async () => {
    const state = createState(0, 7, 20);
    await invokeSubmit(state, { subject_id: 7, mode: 'practice', answers: answersFor(Array.from({ length: 12 }, (_, i) => i + 1)) });
    await invokeSubmit(state, { subject_id: 7, mode: 'past_year', answers: answersFor(Array.from({ length: 8 }, (_, i) => i + 13)) });
    assert.equal(state.usage, 20);
});

test('reaching one subject limit does not consume another subject quota', async () => {
    const state = createState(20, 7, 20);
    state.questionSubjects[30] = 8;
    state.correctOptions[30] = 'A';

    const locked = await invokeSubmit(state, { subject_id: 7, answers: answersFor([1]) });
    const other = await invokeSubmit(state, { subject_id: 8, answers: answersFor([30]) });

    assert.equal(locked.response.statusCode, 403);
    assert.equal(other.response.statusCode, 200);
    assert.equal(state.usage, 20);
    assert.equal(state.usageBySubject[8], 1);
});

test('premium submission bypasses the free usage table', async () => {
    const state = createState(20, 7, 1);
    const result = await invokeSubmit(state, { answers: answersFor([1]) }, true);
    assert.equal(result.response.statusCode, 200);
    assert.equal(state.usage, 20);
    assert.equal(result.client.queries.some(query => query.sql.includes('free_subject_daily_usage')), false);
});

test('a new calendar day is represented by a fresh usage state', () => {
    const today = getDailyLimitStatus(20);
    const nextDay = getDailyLimitStatus(0);
    assert.equal(today.reached, true);
    assert.equal(nextDay.remaining, 20);
});

test('free submission without subject_id is rejected without quota consumption', async () => {
    const state = createState(4, 7, 1);
    const result = await invokeSubmit(state, { answers: answersFor([1]) });
    assert.equal(result.response.statusCode, 400);
    assert.equal(state.usage, 4);
});

test('invalid question IDs cannot consume free quota', async () => {
    const state = createState(4, 7, 1);
    const result = await invokeSubmit(state, { subject_id: 7, answers: answersFor([999]) });
    assert.equal(result.response.statusCode, 400);
    assert.equal(state.usage, 4);
});

test('cross-subject question IDs cannot consume free quota', async () => {
    const state = createState(4, 7, 1);
    state.questionSubjects[2] = 8;
    const result = await invokeSubmit(state, { subject_id: 7, answers: answersFor([2]) });
    assert.equal(result.response.statusCode, 400);
    assert.equal(state.usage, 4);
});

test('failed submissions do not consume free quota', async () => {
    const state = createState(4, 7, 1);
    const result = await invokeSubmit(state, {
        subject_id: 7,
        answers: [{ question_id: 1, selected_option: 'Z' }],
    });
    assert.equal(result.response.statusCode, 400);
    assert.equal(state.usage, 4);
    assert.equal(result.client.rolledBack, true);
});

test('submission exceeding the remaining quota is rejected atomically', async () => {
    const state = createState(18, 7, 5);
    const result = await invokeSubmit(state, { subject_id: 7, answers: answersFor([1, 2, 3, 4, 5]) });
    assert.equal(result.response.statusCode, 403);
    assert.equal(state.usage, 18);
    assert.equal(result.client.rolledBack, true);
});

test('free submission locks the usage row inside a transaction', async () => {
    const state = createState(18, 7, 2);
    const result = await invokeSubmit(state, { subject_id: 7, answers: answersFor([1, 2]) });
    assert.equal(result.response.statusCode, 200);
    assert.equal(result.client.queries.some(query => query.sql.includes('FOR UPDATE')), true);
    assert.equal(state.usage, 20);
});
