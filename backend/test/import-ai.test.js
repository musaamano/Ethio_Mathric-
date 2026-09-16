const test = require('node:test');
const assert = require('node:assert/strict');

const { validateQuestion, normalizeAIQuestions } = require('../src/services/ai/questionExtractor');
const { extractQuestionsWithAI, getQuestionNumberMatches } = require('../src/services/ai/aiEnhancer');

test('Gemini is selected when configured and OpenAI is not used for extraction', async () => {
    const aiModulePath = require.resolve('../src/services/ai/aiEnhancer');
    const googleModulePath = require.resolve('@google/genai');
    const openAiModulePath = require.resolve('openai');
    const originalAiModule = require.cache[aiModulePath];
    const originalGoogleModule = require.cache[googleModulePath];
    const originalOpenAiModule = require.cache[openAiModulePath];

    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.OPENAI_API_KEY;
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';

    const calls = { geminiConstructor: 0, generateContent: 0, openaiConstructor: 0, openaiRequest: 0 };

    require.cache[googleModulePath] = {
        exports: {
            GoogleGenAI: class {
                constructor() {
                    calls.geminiConstructor += 1;
                    this.models = {
                        generateContent: async () => {
                            calls.generateContent += 1;
                            return { text: JSON.stringify({ questions: [{ source_number: 1, question_text: 'Sample question?', type: 'multiple_choice', options: [{ label: 'A', text: 'A' }, { label: 'B', text: 'B' }, { label: 'C', text: 'C' }, { label: 'D', text: 'D' }], correct_option: 'A', difficulty: 'medium', has_explanation: false, explanation: null }] }) };
                        },
                    };
                }
            },
        },
    };

    require.cache[openAiModulePath] = {
        exports: {
            OpenAI: class {
                constructor() {
                    calls.openaiConstructor += 1;
                    this.responses = {
                        create: async () => {
                            calls.openaiRequest += 1;
                            throw new Error('OpenAI should not be selected when Gemini is configured');
                        },
                    };
                }
            },
        },
    };

    delete require.cache[aiModulePath];

    try {
        const { getPreferredProvider, getModel, callStructuredModel } = require('../src/services/ai/aiEnhancer');

        assert.equal(getPreferredProvider(), 'gemini');
        assert.equal(getModel(), 'gemini-3.6-flash');

        const raw = await callStructuredModel('Question 1: Which is correct?', { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'], additionalProperties: false }, 'provider_probe');
        assert.ok(raw.includes('questions'));
        assert.equal(calls.geminiConstructor, 1, 'Gemini client should be initialized once');
        assert.equal(calls.generateContent, 1, 'Gemini generateContent should be invoked');
        assert.equal(calls.openaiConstructor, 0, 'OpenAI client should not be initialized when Gemini is configured');
        assert.equal(calls.openaiRequest, 0, 'OpenAI request should not be sent when Gemini is configured');
    } finally {
        if (originalAiModule) {
            require.cache[aiModulePath] = originalAiModule;
        } else {
            delete require.cache[aiModulePath];
        }

        if (originalGoogleModule) {
            require.cache[googleModulePath] = originalGoogleModule;
        } else {
            delete require.cache[googleModulePath];
        }

        if (originalOpenAiModule) {
            require.cache[openAiModulePath] = originalOpenAiModule;
        } else {
            delete require.cache[openAiModulePath];
        }
    }
});

test('validateQuestion flags questions missing explanation', () => {
    const q = {
        question_text: 'What is the capital of Ethiopia?',
        type: 'multiple_choice',
        options: [
            { label: 'A', text: 'Addis Ababa' },
            { label: 'B', text: 'Nairobi' },
            { label: 'C', text: 'Khartoum' },
            { label: 'D', text: 'Djibouti' },
        ],
        correct_option: 'A',
        subject_id: 2,
        has_explanation: false,
        explanation: null,
    };

    const errors = validateQuestion(q);
    assert.ok(errors.some((err) => /missing explanation/i.test(err) || /explanation not found in source/i.test(err)), 'expected a missing explanation error');
});

test('normalizeAIQuestions strips numbering prefixes from question text', () => {
    const normalized = normalizeAIQuestions([
        {
            source_number: 12,
            question_text: 'Question 12: Which organ produces insulin?',
            type: 'multiple_choice',
            options: [
                { label: 'A', text: 'Liver' },
                { label: 'B', text: 'Pancreas' },
                { label: 'C', text: 'Kidney' },
                { label: 'D', text: 'Brain' },
            ],
            correct_option: 'B',
            has_explanation: true,
            explanation: { why_correct: 'Pancreas produces insulin.' },
        },
    ], {
        subject_id: 7,
        year: null,
        is_free: true,
    });

    assert.equal(normalized[0].question_text, 'Which organ produces insulin?');
    assert.equal(normalized[0].source_number, 12);
});

test('normalizeAIQuestions preserves admin subject and year metadata', () => {
    const normalized = normalizeAIQuestions([
        {
            source_number: 7,
            question_text: 'Which organ produces insulin?',
            type: 'multiple_choice',
            options: [
                { label: 'A', text: 'Liver' },
                { label: 'B', text: 'Pancreas' },
                { label: 'C', text: 'Kidney' },
                { label: 'D', text: 'Brain' },
            ],
            correct_option: 'B',
            has_explanation: true,
            explanation: { why_correct: 'Pancreas produces insulin.' },
        },
    ], {
        subject_id: 12,
        year: 2024,
        is_free: true,
    });

    assert.equal(normalized[0].subject_id, 12);
    assert.equal(normalized[0].year, 2024);
    assert.equal(normalized[0].source_number, 7);
    assert.equal(normalized[0].correct_option, 'B');
    assert.equal(normalized[0].errors.length, 0);
});

test('extractQuestionsWithAI reports missing source question 28 explicitly', async () => {
    const aiModulePath = require.resolve('../src/services/ai/aiEnhancer');
    const openAiModulePath = require.resolve('openai');
    const originalAiModule = require.cache[aiModulePath];
    const originalOpenAiModule = require.cache[openAiModulePath];

    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-5.6-luna';
    delete process.env.GEMINI_API_KEY;

    const questions = [];
    for (let i = 1; i <= 50; i++) {
        if (i === 28) continue;
        questions.push({
            source_number: i,
            question_text: `Question ${i} text`,
            type: 'multiple_choice',
            options: [
                { label: 'A', text: `Option A ${i}` },
                { label: 'B', text: `Option B ${i}` },
                { label: 'C', text: `Option C ${i}` },
                { label: 'D', text: `Option D ${i}` },
            ],
            correct_option: 'A',
            has_explanation: false,
            explanation: null,
        });
    }

    require.cache[openAiModulePath] = {
        exports: {
            OpenAI: class {
                constructor() {
                    this.responses = {
                        create: async () => ({
                            output_text: JSON.stringify({ questions }),
                        }),
                    };
                }
            },
        },
    };
    delete require.cache[aiModulePath];

    try {
        const { extractQuestionsWithAI } = require('../src/services/ai/aiEnhancer');
        const result = await extractQuestionsWithAI(
            Array.from({ length: 50 }, (_, index) => `Question ${index + 1}: sample question`).join('\n'),
            { batchSize: 50, maxRetries: 0 }
        );

        assert.deepEqual(result.missing, [28], 'expected question 28 to be reported as missing');
        assert.equal(result.questions.length, 49, 'expected the importer to detect the incomplete extraction');
        assert.ok(result.missing.includes(28), 'missing question 28 must be explicit in the result');
    } finally {
        if (originalAiModule) {
            require.cache[aiModulePath] = originalAiModule;
        } else {
            delete require.cache[aiModulePath];
        }

        if (originalOpenAiModule) {
            require.cache[openAiModulePath] = originalOpenAiModule;
        } else {
            delete require.cache[openAiModulePath];
        }
    }
});

test('detects PDF-style question numbers without punctuation and preserves all 25', () => {
    const text = Array.from({ length: 25 }, (_, idx) => {
        const n = idx + 1;
        return `Question ${n} Which of the following is the correct answer?\nA. Option A\nB. Option B\nC. Option C\nD. Option D\nAnswer: A`;
    }).join('\n\n');

    const numbers = getQuestionNumberMatches(text);
    assert.deepEqual(numbers, Array.from({ length: 25 }, (_, idx) => idx + 1));
    assert.equal(numbers.length, 25);
});

test('normalizeAIQuestions keeps valid explanations when has_explanation is true', () => {
    const normalized = normalizeAIQuestions([
        {
            source_number: 3,
            question_text: 'Which organ produces insulin?',
            type: 'multiple_choice',
            options: [
                { label: 'A', text: 'Liver' },
                { label: 'B', text: 'Pancreas' },
                { label: 'C', text: 'Kidney' },
                { label: 'D', text: 'Brain' },
            ],
            correct_option: 'B',
            has_explanation: true,
            explanation: { why_correct: 'The pancreas produces insulin.' },
        },
    ], {
        subject_id: 7,
        year: null,
        is_free: true,
    });

    assert.equal(normalized[0].has_explanation, true);
    assert.equal(normalized[0].explanation.why_correct, 'The pancreas produces insulin.');
});

test('extractQuestionsWithAI requires OPENAI_API_KEY for cloud extraction', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(
        () => extractQuestionsWithAI('Question 1: Which is correct?\nA. A\nB. B\nC. C\nD. D\nAnswer: A', { maxRetries: 0 }),
        /OPENAI_API_KEY/i,
    );
});

function backupQuestionPayload(overrides = {}) {
    return {
        questions: [{
            source_number: 1,
            question_text: 'Which option is correct?',
            type: 'multiple_choice',
            options: [
                { label: 'A', text: 'Correct' },
                { label: 'B', text: 'Wrong' },
                { label: 'C', text: 'Wrong' },
                { label: 'D', text: 'Wrong' },
            ],
            correct_option: 'A',
            difficulty: 'medium',
            has_explanation: false,
            explanation: null,
            ...overrides,
        }],
    };
}

async function withFreshAiModule(geminiError, hfResponse, callback) {
    const aiModulePath = require.resolve('../src/services/ai/aiEnhancer');
    const googleModulePath = require.resolve('@google/genai');
    const originalAiModule = require.cache[aiModulePath];
    const originalGoogleModule = require.cache[googleModulePath];
    const originalFetch = global.fetch;
    const originalEnv = {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL: process.env.GEMINI_MODEL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        HF_TOKEN: process.env.HF_TOKEN,
        HF_MODEL: process.env.HF_MODEL,
        HF_PROVIDER: process.env.HF_PROVIDER,
    };
    let fetchCalls = 0;

    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';
    delete process.env.OPENAI_API_KEY;
    process.env.HF_TOKEN = 'test-hf-token';
    process.env.HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
    process.env.HF_PROVIDER = 'auto';

    require.cache[googleModulePath] = {
        exports: {
            GoogleGenAI: class {
                constructor() {
                    this.models = {
                        generateContent: async () => {
                            if (geminiError) throw geminiError;
                            return { text: JSON.stringify(backupQuestionPayload()) };
                        },
                    };
                }
            },
        },
    };
    global.fetch = async () => {
        fetchCalls += 1;
        return hfResponse;
    };
    delete require.cache[aiModulePath];

    try {
        const ai = require('../src/services/ai/aiEnhancer');
        await callback(ai, () => fetchCalls);
    } finally {
        if (originalAiModule) require.cache[aiModulePath] = originalAiModule;
        else delete require.cache[aiModulePath];
        if (originalGoogleModule) require.cache[googleModulePath] = originalGoogleModule;
        else delete require.cache[googleModulePath];
        global.fetch = originalFetch;
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

test('Gemini success does not call Hugging Face and preserves source explanation absence', async () => {
    await withFreshAiModule(null, {}, async (ai, getFetchCalls) => {
        const result = await ai.extractQuestionsWithAI(
            'Question 1: Which option is correct?\nA. Correct\nB. Wrong\nC. Wrong\nD. Wrong\nAnswer: A',
            { batchSize: 1, maxRetries: 0 },
        );

        assert.equal(getFetchCalls(), 0);
        assert.equal(result.questions[0].has_explanation, false);
        assert.equal(result.questions[0].explanation, null);
    });
});

test('Gemini 429 uses Hugging Face structured JSON backup', async () => {
    const hfResponse = {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(backupQuestionPayload()) } }] }),
    };

    await withFreshAiModule(Object.assign(new Error('quota exceeded'), { status: 429 }), hfResponse, async (ai, getFetchCalls) => {
        const result = await ai.extractQuestionsWithAI('Question 1: Which option is correct?', { batchSize: 1, maxRetries: 0 });
        assert.equal(getFetchCalls(), 1);
        assert.equal(result.questions[0].correct_option, 'A');
        assert.equal(result.questions[0].explanation, null);
    });
});

test('Gemini 503 uses Hugging Face backup but authentication errors do not', async () => {
    const hfResponse = {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(backupQuestionPayload()) } }] }),
    };

    await withFreshAiModule(Object.assign(new Error('service unavailable'), { status: 503 }), hfResponse, async (ai, getFetchCalls) => {
        await ai.extractQuestionsWithAI('Question 1: Which option is correct?', { batchSize: 1, maxRetries: 0 });
        assert.equal(getFetchCalls(), 1);
    });

    await withFreshAiModule(new Error('API key not valid: authentication failed'), hfResponse, async (ai, getFetchCalls) => {
        await assert.rejects(
            () => ai.extractQuestionsWithAI('Question 1: Which option is correct?', { batchSize: 1, maxRetries: 0 }),
            /authentication/i,
        );
        assert.equal(getFetchCalls(), 0);
    });
});

test('Malformed Hugging Face JSON fails safely', async () => {
    const hfResponse = {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '{not-json' } }] }),
    };

    await withFreshAiModule(Object.assign(new Error('rate limit exceeded'), { status: 429 }), hfResponse, async (ai) => {
        await assert.rejects(
            () => ai.extractQuestionsWithAI('Question 1: Which option is correct?', { batchSize: 1, maxRetries: 0 }),
            /Malformed AI output/i,
        );
    });
});

test('Hugging Face invalid questions remain subject to existing validation', async () => {
    const invalidPayload = backupQuestionPayload({
        options: [
            { label: 'A', text: 'Correct' },
            { label: 'B', text: 'Wrong' },
            { label: 'C', text: '' },
            { label: 'D', text: 'Wrong' },
        ],
    });
    const hfResponse = {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(invalidPayload) } }] }),
    };

    await withFreshAiModule(Object.assign(new Error('quota exceeded'), { status: 429 }), hfResponse, async (ai) => {
        const result = await ai.extractQuestionsWithAI('Question 1: Which option is correct?', { batchSize: 1, maxRetries: 0 });
        assert.ok(result.questions[0].errors.some(error => /missing option C/i.test(error)));
    });
});

test('Missing HF_TOKEN fails the backup safely for the existing final fallback', async () => {
    const hfResponse = {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(backupQuestionPayload()) } }] }),
    };

    await withFreshAiModule(Object.assign(new Error('quota exceeded'), { status: 429 }), hfResponse, async (ai, getFetchCalls) => {
        delete process.env.HF_TOKEN;
        await assert.rejects(
            () => ai.extractQuestionsWithAI('Question 1: Which option is correct?', { batchSize: 1, maxRetries: 0 }),
            /HF_TOKEN is not configured/i,
        );
        assert.equal(getFetchCalls(), 0);
    });
});

test('Gemini and Hugging Face failures propagate to the existing controller fallback', async () => {
    const hfResponse = {
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'provider unavailable' } }),
    };

    await withFreshAiModule(Object.assign(new Error('quota exceeded'), { status: 429 }), hfResponse, async (ai) => {
        await assert.rejects(
            () => ai.extractQuestionsWithAI('Question 1: Which option is correct?', { batchSize: 1, maxRetries: 0 }),
            /provider unavailable/i,
        );
    });
});
