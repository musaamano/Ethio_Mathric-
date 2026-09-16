/**
 * aiEnhancer.js
 * Centralized AI and extraction utilities for question imports.
 * Uses the OpenAI Responses API for structured extraction and keeps the
 * admin-selected subject/year authoritative.
 */
const logger = require('../../utils/logger');

let openai = null;
let gemini = null;

function getOpenAI() {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
  } catch (err) {
    logger.warn(`[AI Import] OpenAI client initialization failed: ${err.message}`);
    return null;
  }
}

function getGemini() {
  if (gemini) return gemini;
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { GoogleGenAI } = require('@google/genai');
    gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return gemini;
  } catch (err) {
    logger.warn(`[AI Import] Gemini client initialization failed: ${err.message}`);
    return null;
  }
}

function getPreferredProvider() {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}

function getModel() {
  const provider = getPreferredProvider();
  if (provider === 'gemini') return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  if (provider === 'openai') return process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable.');
}

async function callStructuredModel(prompt, schema, name) {
  const provider = getPreferredProvider();

  if (provider === 'gemini') {
    const geminiClient = getGemini();
    if (!geminiClient) {
      throw new Error('GEMINI_API_KEY is configured but the Gemini client could not be initialized.');
    }

    logger.info('[AI Import] Provider: Gemini');
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.AI_IMPORT_SIMULATE_GEMINI_429 === 'true'
    ) {
      const error = new Error('Simulated Gemini quota/rate-limit failure');
      error.status = 429;
      throw error;
    }

    const response = await geminiClient.models.generateContent({
      model: getModel(),
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const raw = response?.text || '{}';
    return raw;
  }

  if (provider === 'openai') {
    const ai = getOpenAI();
    if (!ai) {
      throw new Error('OPENAI_API_KEY is configured but the OpenAI client could not be initialized.');
    }

    logger.info('[AI Import] Provider: OpenAI');
    const response = await ai.responses.create({
      model: getModel(),
      input: [{ role: 'user', content: prompt }],
      text: {
        format: {
          type: 'json_schema',
          name,
          schema,
          strict: true,
        },
      },
    });

    return response.output_text || response.output?.map(block => (block.content || []).map(item => item.text || '').join('\n')).join('\n') || '{}';
  }

  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable.');
}

async function callHuggingFaceStructuredModel(prompt, schema, name) {
  if (!process.env.HF_TOKEN) {
    throw new Error('HF_TOKEN is not configured. Hugging Face backup is unavailable.');
  }

  const model = process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
  const provider = process.env.HF_PROVIDER || 'auto';
  const modelWithPolicy = `${model}:${provider === 'auto' ? 'fastest' : provider}`;

  logger.info(`[AI Import] Provider: Hugging Face (${modelWithPolicy})`);
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelWithPolicy,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: { name, schema, strict: true },
      },
    }),
    signal: AbortSignal.timeout(120000),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Hugging Face request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Hugging Face response did not contain choices[0].message.content.');
  }

  logger.info('[AI Import] Hugging Face response received');
  return content;
}

function buildQuestionSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            source_number: { type: 'integer' },
            question_text: { type: 'string' },
            type: { type: 'string', enum: ['multiple_choice'] },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  label: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                  text: { type: 'string' },
                },
                required: ['label', 'text'],
              },
            },
            correct_option: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
            difficulty: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            has_explanation: { type: 'boolean' },
            explanation: {
              anyOf: [
                { type: 'null' },
                {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    why_correct: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    why_a_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    why_b_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    why_c_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    why_d_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    memory_trick: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    common_mistake: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    reference: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  },
                  required: ['why_correct', 'why_a_wrong', 'why_b_wrong', 'why_c_wrong', 'why_d_wrong', 'memory_trick', 'common_mistake', 'reference'],
                },
              ],
            },
          },
          required: ['source_number', 'question_text', 'type', 'options', 'correct_option', 'difficulty', 'has_explanation', 'explanation'],
        },
      },
    },
    required: ['questions'],
  };
}

function normalizeExplanation(input) {
  if (!input || typeof input !== 'object') return null;

  const explanation = {
    why_correct: typeof input.why_correct === 'string' ? input.why_correct.trim() : null,
    why_a_wrong: typeof input.why_a_wrong === 'string' ? input.why_a_wrong.trim() : null,
    why_b_wrong: typeof input.why_b_wrong === 'string' ? input.why_b_wrong.trim() : null,
    why_c_wrong: typeof input.why_c_wrong === 'string' ? input.why_c_wrong.trim() : null,
    why_d_wrong: typeof input.why_d_wrong === 'string' ? input.why_d_wrong.trim() : null,
    memory_trick: typeof input.memory_trick === 'string' ? input.memory_trick.trim() : null,
    common_mistake: typeof input.common_mistake === 'string' ? input.common_mistake.trim() : null,
    reference: typeof input.reference === 'string' ? input.reference.trim() : null,
  };

  const hasText = Object.values(explanation).some(v => typeof v === 'string' && v.length > 0);
  return hasText ? explanation : null;
}

function normalizeOptionText(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  return String(raw).trim();
}

function stripQuestionNumbering(text) {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^(?:Question|QUESTION)\s*[:\-]?\s*\d+\s*[:\-]?\s*/i, '');
  cleaned = cleaned.replace(/^\d+[.)]\s*/i, '');
  cleaned = cleaned.replace(/^\(\s*\d+\s*\)\s*/i, '');
  cleaned = cleaned.replace(/^\s*[-•*]\s*/i, '');
  return cleaned.trim();
}

function coerceQuestionRecord(item, fallbackNumber) {
  const sourceNumber = Number.isInteger(item?.source_number) ? item.source_number : fallbackNumber;
  const questionText = stripQuestionNumbering(normalizeOptionText(item?.question_text || item?.question || ''));

  const optionList = Array.isArray(item?.options) ? item.options : [];
  const optionMap = {};
  for (const option of optionList) {
    const label = (option?.label || '').toString().trim().toUpperCase();
    const text = normalizeOptionText(option?.text);
    if (label && text) optionMap[label] = text;
  }

  const normalizedOptions = ['A', 'B', 'C', 'D'].map((label) => ({
    label,
    text: normalizeOptionText(optionMap[label] || optionList.find(o => (o?.label || '').toString().trim().toUpperCase() === label)?.text || ''),
  }));

  const correctOption = (item?.correct_option || '').toString().trim().toUpperCase();
  const hasExplanation = !!item?.has_explanation;
  const explanation = hasExplanation ? normalizeExplanation(item.explanation) : null;

  const errors = [];
  if (!questionText) errors.push('Missing question text');
  if (!correctOption || !['A', 'B', 'C', 'D'].includes(correctOption)) errors.push('Missing or invalid correct answer');
  if (normalizedOptions.filter(o => o.text).length < 4) {
    ['A', 'B', 'C', 'D'].forEach(label => {
      if (!normalizedOptions.find(o => o.label === label && o.text)) errors.push(`Missing option ${label}`);
    });
  }

  return {
    source_number: sourceNumber,
    question_text: questionText || `Question ${sourceNumber}`,
    type: 'multiple_choice',
    options: normalizedOptions,
    correct_option: correctOption || 'A',
    difficulty: item?.difficulty || null,
    has_explanation: hasExplanation && !!explanation,
    explanation: hasExplanation && !!explanation ? explanation : null,
    status: errors.length ? 'invalid' : 'pending',
    errors,
  };
}

async function generateExplanation(question) {
  const ai = getOpenAI();
  if (!ai) return generateRuleBasedExplanation(question);

  const correctOpt = question.options?.find(o => o.label === question.correct_option);
  const prompt = `You are an expert Ethiopian Grade 12 teacher.

For this exam question, generate a complete explanation.
Subject: ${question.subject || 'Unknown'}
Question: ${question.question_text}
Options:
${question.options?.map(o => `${o.label}. ${o.text}`).join('\n')}
Correct Answer: ${question.correct_option}. ${correctOpt?.text || ''}

Respond with strict JSON only using this exact schema:
{
  "why_correct": "...",
  "why_a_wrong": null,
  "why_b_wrong": null,
  "why_c_wrong": null,
  "why_d_wrong": null,
  "memory_trick": "...",
  "common_mistake": "...",
  "reference": "..."
}

Do not fabricate unsupported textbook references.`;

  try {
    const raw = await callStructuredModel(prompt, {
      type: 'object',
      properties: {
        why_correct: { type: 'string' },
        why_a_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        why_b_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        why_c_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        why_d_wrong: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        memory_trick: { type: 'string' },
        common_mistake: { type: 'string' },
        reference: { type: 'string' },
      },
      required: ['why_correct', 'why_a_wrong', 'why_b_wrong', 'why_c_wrong', 'why_d_wrong', 'memory_trick', 'common_mistake', 'reference'],
      additionalProperties: false,
    }, 'question_explanation');

    const json = JSON.parse(raw);
    if (question.correct_option === 'A') json.why_a_wrong = null;
    if (question.correct_option === 'B') json.why_b_wrong = null;
    if (question.correct_option === 'C') json.why_c_wrong = null;
    if (question.correct_option === 'D') json.why_d_wrong = null;
    return json;
  } catch (err) {
    logger.warn(`[AI Import] OpenAI explanation generation failed: ${err.message}`);
    return generateRuleBasedExplanation(question);
  }
}

function generateRuleBasedExplanation(question) {
  const correct = question.options?.find(o => o.label === question.correct_option);
  return {
    why_correct: `${question.correct_option}. "${correct?.text}" is the correct answer. Study this concept in your Grade 12 textbook.`,
    why_a_wrong: question.correct_option === 'A' ? null : 'Option A is not the correct answer for this question.',
    why_b_wrong: question.correct_option === 'B' ? null : 'Option B is incorrect. Check your textbook for the accurate statement.',
    why_c_wrong: question.correct_option === 'C' ? null : 'Option C contains a common misconception about this topic.',
    why_d_wrong: question.correct_option === 'D' ? null : 'Option D is a distractor. Focus on the key definitions in your notes.',
    memory_trick: 'Remember: connect this concept to something you already know to help recall it during exams.',
    common_mistake: 'Students often confuse this concept with a similar one. Read each option slowly and eliminate clearly wrong answers first.',
    reference: 'Ethiopian Grade 12 Curriculum',
  };
}

async function categoriseQuestion(questionText, subjects) {
  const ai = getOpenAI();
  if (!ai) return null;

  const subjectList = subjects.map(s => `${s.id}: ${s.name}`).join(', ');
  const prompt = `Given this Ethiopian Grade 12 exam question, identify the most likely subject (from: ${subjectList}).

Question: "${questionText}"

Respond with JSON: {"subject_id": number_or_null, "subject_hint": "string"}`;

  try {
    const raw = await callStructuredModel(prompt, {
      type: 'object',
      properties: {
        subject_id: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
        subject_hint: { type: 'string' },
      },
      required: ['subject_id', 'subject_hint'],
      additionalProperties: false,
    }, 'question_subject_guess');

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function extractQuestionsWithAI(text, options = {}) {
  const provider = getPreferredProvider();
  const ai = provider === 'openai' ? getOpenAI() : null;

  logger.info(`[AI Import] Provider: ${provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'None'}`);

  const safeText = (text || '').toString();
  const { batchSize = 30, maxRetries = 2 } = options;
  const expectedRange = getExpectedSourceRange(safeText);

  logger.info(`[AI Import] Starting extraction`);
  logger.info(`[AI Import] Source text length: ${safeText.length} chars`);
  logger.info(`[AI Import] Source question numbers: ${expectedRange ? `${expectedRange.min}-${expectedRange.max}` : 'unknown'}`);

  const estimatedCount = getQuestionNumberMatches(safeText).length;
  logger.info(`[AI Import] Estimated question count: ${estimatedCount}`);

  const chunks = splitTextIntoChunks(safeText, batchSize);
  logger.info(`[AI Import] Split into ${chunks.length} batches (batchSize=${batchSize})`);

  const allQuestions = [];
  const allMissing = [];
  const allErrors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const sourceRange = `${(i * batchSize) + 1}-${Math.min((i + 1) * batchSize, estimatedCount || (i + 1))}`;
    logger.info(`[AI Import] Processing batch ${i + 1}/${chunks.length}`);
    logger.info(`[AI Import] Batch ${i + 1} source range: ${sourceRange}`);

    try {
      const result = await extractChunkWithRetry(ai, chunk, sourceRange, maxRetries);
      allQuestions.push(...result.questions);
      allMissing.push(...result.missing);

      if (result.errors.length > 0) {
        logger.warn(`[AI Import] Batch ${i + 1} had ${result.errors.length} validation errors`);
        allErrors.push(...result.errors);
      }

      logger.info(`[AI Import] Batch ${i + 1} extracted: ${result.questions.length} questions`);
    } catch (err) {
      const error = {
        batch: i + 1,
        sourceRange,
        message: err.message,
      };
      logger.error(`[AI Import] Batch ${i + 1} failed. Source range: ${sourceRange}. Error: ${err.message}`);
      allErrors.push(error);

      if (allQuestions.length === 0) {
        throw new Error(`AI batch ${i + 1} failed (${sourceRange}): ${err.message}`);
      }
    }
  }

  let mergedQuestions = mergeQuestionRecords(allQuestions);
  let mergedMissing = detectMissingNumbers(mergedQuestions.map(q => q.source_number), expectedRange);

  if (mergedMissing.length > 0) {
    logger.warn(`[AI Import] Missing source questions after chunk merge: ${mergedMissing.join(', ')}`);
    const retryResult = await retryMissingQuestionRanges(ai, safeText, mergedMissing, maxRetries);
    mergedQuestions = mergeQuestionRecords([...mergedQuestions, ...retryResult.questions]);
    mergedMissing = detectMissingNumbers(mergedQuestions.map(q => q.source_number), expectedRange);
    logger.warn(`[AI Import] Missing source questions after retry: ${mergedMissing.length ? mergedMissing.join(', ') : 'none'}`);
    if (retryResult.errors.length) allErrors.push(...retryResult.errors);
  }

  const finalMissing = [...new Set(mergedMissing)].sort((a, b) => a - b);
  logger.info(`[AI Import] Combined extracted questions: ${mergedQuestions.length}`);
  logger.info(`[AI Import] Missing source questions: ${finalMissing.length ? finalMissing.join(', ') : 'none'}`);
  logger.info(`[AI Import] Validation complete`);
  logger.info(`[AI Import] Duplicate detection complete`);
  logger.info(`[AI Import] Preview ready`);

  return {
    questions: mergedQuestions,
    missing: finalMissing,
    errors: allErrors,
  };
}

function getExpectedSourceRange(text) {
  const numbers = getQuestionNumberMatches(text).map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (!numbers.length) return null;
  return { min: numbers[0], max: numbers[numbers.length - 1] };
}

function getQuestionNumberMatches(text) {
  const markers = [];
  const lines = (text || '').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(?:Question\s+)?(\d{1,3})(?=\s|[:.)-]|$)/i) || trimmed.match(/^(\d{1,3})(?=[.)]\s|\s|[:.)-]|$)/i);
    if (match) {
      const num = Number(match[1] || match[0].match(/\d+/)?.[0]);
      if (Number.isFinite(num) && num > 0) markers.push(num);
    }
  }

  return [...new Set(markers)].sort((a, b) => a - b);
}

function splitTextIntoChunks(text, batchSize) {
  const lines = (text || '').split(/\r?\n/);
  const batchStarts = [];
  let current = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isQuestionStart = /^(?:Question\s+)?\d{1,3}(?=\s|[:.)-]|$)/i.test(trimmed) || /^\d{1,3}(?=[.)]\s|\s|[:.)-]|$)/i.test(trimmed);
    if (isQuestionStart) {
      if (current.length) batchStarts.push(current.join('\n'));
      current = [lines[i]];
    } else if (current.length) {
      current.push(lines[i]);
    }
  }

  if (current.length) batchStarts.push(current.join('\n'));
  if (!batchStarts.length) return [text];

  const chunks = [];
  for (let i = 0; i < batchStarts.length; i += batchSize) {
    chunks.push(batchStarts.slice(i, i + batchSize).join('\n\n'));
  }

  return chunks;
}

function mergeQuestionRecords(questions) {
  const map = new Map();
  for (const question of questions || []) {
    if (!question || !Number.isInteger(question.source_number)) continue;
    map.set(question.source_number, question);
  }

  return [...map.values()].sort((a, b) => a.source_number - b.source_number);
}

async function retryMissingQuestionRanges(ai, text, missingNumbers, maxRetries) {
  if (!missingNumbers.length) return { questions: [], errors: [] };

  const sorted = [...new Set(missingNumbers.map(Number))].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current && current === end + 1) {
      end = current;
      continue;
    }

    ranges.push([start, end]);
    if (current) {
      start = current;
      end = current;
    }
  }

  const combined = [];
  const errors = [];

  for (const [rangeStart, rangeEnd] of ranges) {
    const rangeText = extractQuestionRangeText(text, rangeStart, rangeEnd);
    const sourceRange = `${rangeStart}-${rangeEnd}`;
    try {
      const result = await extractChunkWithRetry(ai, rangeText, sourceRange, maxRetries, rangeStart, rangeEnd);
      combined.push(...result.questions);
    } catch (err) {
      errors.push({ sourceRange, message: err.message });
    }
  }

  return { questions: mergeQuestionRecords(combined), errors };
}

function extractQuestionRangeText(text, start, end) {
  const lines = (text || '').split(/\r?\n/);
  const selected = [];
  let capture = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (capture) selected.push(line);
      continue;
    }

    const match = trimmed.match(/^(?:Question\s+)?(\d{1,3})(?=\s|[:.)-]|$)/i) || trimmed.match(/^(\d{1,3})(?=[.)]\s|\s|[:.)-]|$)/i);
    const number = match ? Number((match[1] || match[0].match(/\d+/)?.[0])) : null;

    if (typeof number === 'number' && Number.isFinite(number)) {
      if (number >= start && number <= end) {
        capture = true;
        selected.push(line);
        continue;
      }
      if (capture && number > end) {
        break;
      }
      if (capture && number < start) {
        continue;
      }
    }

    if (capture) selected.push(line);
  }

  return selected.join('\n').trim() || text;
}

function detectMissingNumbers(numbers, expectedRange = null) {
  const validNumbers = (numbers || [])
    .map(n => Number(n))
    .filter(n => Number.isFinite(n) && n > 0);

  if (!validNumbers.length) return [];

  const unique = [...new Set(validNumbers)].sort((a, b) => a - b);
  const min = expectedRange ? expectedRange.min : unique[0];
  const max = expectedRange ? expectedRange.max : unique[unique.length - 1];
  const missing = [];

  for (let i = min; i <= max; i++) {
    if (!unique.includes(i)) missing.push(i);
  }

  return missing;
}

async function extractChunkWithRetry(ai, chunk, sourceRange, maxRetries, start = null, end = null) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    logger.info(`[AI Import] Gemini attempt ${attempt + 1}/${maxRetries + 1} for range ${sourceRange}`);
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.info(`[AI Import] Retry attempt ${attempt}/${maxRetries} for range ${sourceRange} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return await extractChunk(ai, chunk, sourceRange, start, end);
    } catch (err) {
      lastError = err;
      logger.warn(`[AI Import] Attempt ${attempt + 1} failed for range ${sourceRange}: ${err.message}`);
      if (err.message.includes('API key') || err.message.includes('authentication')) {
        throw err;
      }
    }
  }

  if (isRetryableProviderError(lastError)) {
    try {
      logger.warn(`[AI Import] Gemini retries exhausted for ${sourceRange}; trying Hugging Face backup`);
      logger.info(`[AI Import] Hugging Face backup started for ${sourceRange}`);
      const backupResult = await extractChunk(ai, chunk, sourceRange, start, end, callHuggingFaceStructuredModel);
      logger.info(`[AI Import] Hugging Face result continuing into existing validation for ${sourceRange}`);
      return backupResult;
    } catch (backupError) {
      logger.error(`[AI Import] Hugging Face backup failed for ${sourceRange}: ${backupError.message}`);
      throw backupError;
    }
  }

  throw lastError;
}

function isRetryableProviderError(error) {
  if (!error) return false;

  const status = Number(error.status || error.statusCode || error.response?.status);
  const code = String(error.code || error.cause?.code || '').toLowerCase();
  const message = String(error.message || '').toLowerCase();

  return [429, 500, 502, 503].includes(status)
    || ['etimedout', 'econnreset', 'eai_again', 'econnrefused'].includes(code)
    || /quota|rate.?limit|temporar|unavailable|overloaded|timed? ?out|service.?unavailable/.test(message);
}

async function extractChunk(ai, chunk, sourceRange, start = null, end = null, modelCaller = callStructuredModel) {
  const targetInstruction = start && end ? `\nTarget source numbers: ${start}-${end}. Extract only questions in this range and preserve the original source_number values.` : '';
  const prompt = `Extract every question from the source text below. Preserve meaning exactly. Do not invent questions, options, answers, or explanations.

Critical rules:
1. Question numbers such as "Question 1", "1.", "1)", "Question 1:" are numbering markers only. They are NOT part of the actual question_text.
2. Put the numeric source index in source_number separately, e.g. source_number: 1.
3. question_text must contain only the actual question body, without the number prefix.
4. Preserve the original question meaning and answer.
5. If an explanation is present in the source, extract it exactly; do not generate a new one.
6. If the source has no explanation, set has_explanation: false and explanation: null.
7. Do not confuse "Answer: B" with an explanation. "Answer: B" is only the correct answer key.
8. Do not invent textbook references or generic educational explanations.
9. If a question is malformed or incomplete, still keep a record with status invalid later in processing; do not silently delete it.
10. Return JSON only.${targetInstruction}

TEXT:
${chunk}

Return a strict JSON object with this structure:
{
  "questions": [
    {
      "source_number": 1,
      "question_text": "actual question text only, without Question 1 prefix",
      "type": "multiple_choice",
      "options": [
        {"label": "A", "text": "..."},
        {"label": "B", "text": "..."},
        {"label": "C", "text": "..."},
        {"label": "D", "text": "..."}
      ],
      "correct_option": "A",
      "difficulty": "medium",
      "has_explanation": true,
      "explanation": {
        "why_correct": "source explanation text if present",
        "why_a_wrong": null,
        "why_b_wrong": null,
        "why_c_wrong": null,
        "why_d_wrong": null,
        "memory_trick": null,
        "common_mistake": null,
        "reference": null
      }
    }
  ]
}

When no explanation exists, set has_explanation to false and explanation to null.`;

  const raw = await modelCaller(prompt, buildQuestionSchema(), 'question_extraction_result');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Malformed AI output for ${sourceRange}: ${err.message}`);
  }

  if (!json.questions || !Array.isArray(json.questions)) {
    throw new Error(`Invalid AI response for ${sourceRange}: missing questions array`);
  }

  const preserved = json.questions.map((question, index) => {
    const normalizedQuestion = { ...question };
    if (typeof normalizedQuestion.question_text === 'string') {
      normalizedQuestion.question_text = stripQuestionNumbering(normalizedQuestion.question_text);
    }
    return coerceQuestionRecord(normalizedQuestion, Number(normalizedQuestion?.source_number) || (index + 1));
  });
  const extractedNumbers = preserved.map(q => q.source_number).filter(n => Number.isInteger(n));
  const missing = detectMissingNumbers(extractedNumbers, start && end ? { min: start, max: end } : null);

  return {
    questions: preserved,
    missing,
    errors: preserved.filter(q => q.errors.length).map(q => ({ source_number: q.source_number, errors: q.errors })),
  };
}

module.exports = {
  generateExplanation,
  categoriseQuestion,
  extractQuestionsWithAI,
  generateRuleBasedExplanation,
  getQuestionNumberMatches,
  getPreferredProvider,
  getModel,
  callStructuredModel,
  callHuggingFaceStructuredModel,
  isRetryableProviderError,
};
