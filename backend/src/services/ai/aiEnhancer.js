/**
 * aiEnhancer.js
 * Uses OpenAI GPT to generate full explanations for questions.
 * Falls back gracefully when no API key is configured.
 */
const logger = require('../../utils/logger');

let openai = null;

// Lazy-load OpenAI only if API key is configured
function getOpenAI() {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
  } catch {
    return null;
  }
}

/**
 * Generate a complete explanation for a question using AI.
 * @param {Object} question - { question_text, options, correct_option, subject, topic }
 * @returns {Promise<Object>} - explanation object
 */
async function generateExplanation(question) {
  const ai = getOpenAI();

  if (!ai) {
    // Rule-based fallback when no OpenAI key
    return generateRuleBasedExplanation(question);
  }

  const correctOpt = question.options?.find(o => o.label === question.correct_option);
  const wrongOpts  = question.options?.filter(o => o.label !== question.correct_option);

  const prompt = `You are an expert Ethiopian Grade 12 teacher. 
  
For this exam question, generate a complete, clear explanation that helps students understand.

Subject: ${question.subject || 'Unknown'}
Question: ${question.question_text}
Options:
${question.options?.map(o => `${o.label}. ${o.text}`).join('\n')}
Correct Answer: ${question.correct_option}. ${correctOpt?.text || ''}

Generate a JSON response with exactly these fields:
{
  "why_correct": "Clear explanation of why ${question.correct_option} is correct (2-3 sentences)",
  "why_a_wrong": "Why option A is wrong (1 sentence)",
  "why_b_wrong": "Why option B is wrong (1 sentence)",
  "why_c_wrong": "Why option C is wrong (1 sentence)",
  "why_d_wrong": "Why option D is wrong (1 sentence)",
  "memory_trick": "A helpful memory trick or mnemonic",
  "common_mistake": "The most common mistake students make with this question",
  "reference": "Ethiopian Grade 12 textbook reference if known"
}

For the correct answer's "why_wrong" field, return null.
Response must be valid JSON only.`;

  try {
    const completion = await ai.chat.completions.create({
      model:       'gpt-3.5-turbo',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  600,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    const json = JSON.parse(raw);

    // Set correct option's why_wrong to null
    if (question.correct_option === 'A') json.why_a_wrong = null;
    if (question.correct_option === 'B') json.why_b_wrong = null;
    if (question.correct_option === 'C') json.why_c_wrong = null;
    if (question.correct_option === 'D') json.why_d_wrong = null;

    return json;
  } catch (err) {
    logger.warn(`OpenAI explanation generation failed: ${err.message}`);
    return generateRuleBasedExplanation(question);
  }
}

/**
 * Rule-based explanation generator (no API key needed)
 */
function generateRuleBasedExplanation(question) {
  const correct = question.options?.find(o => o.label === question.correct_option);

  return {
    why_correct:    `${question.correct_option}. "${correct?.text}" is the correct answer. Study this concept in your Grade 12 textbook.`,
    why_a_wrong:    question.correct_option === 'A' ? null : `Option A is not the correct answer for this question. Review the definition carefully.`,
    why_b_wrong:    question.correct_option === 'B' ? null : `Option B is incorrect. Check your textbook for the accurate statement.`,
    why_c_wrong:    question.correct_option === 'C' ? null : `Option C contains a common misconception about this topic.`,
    why_d_wrong:    question.correct_option === 'D' ? null : `Option D is a distractor. Focus on the key definitions in your notes.`,
    memory_trick:   `Remember: connect this concept to something you already know to help recall it during exams.`,
    common_mistake: `Students often confuse this concept with a similar one. Read each option slowly and eliminate clearly wrong answers first.`,
    reference:      `Ethiopian Grade 12 Curriculum`,
  };
}

/**
 * Auto-categorise a question using AI
 */
async function categoriseQuestion(questionText, subjects) {
  const ai = getOpenAI();
  if (!ai) return null;

  const subjectList = subjects.map(s => `${s.id}: ${s.name}`).join(', ');
  const prompt = `Given this Ethiopian Grade 12 exam question, identify the most likely subject (from: ${subjectList}).

Question: "${questionText}"

Respond with JSON: {"subject_id": number_or_null, "subject_hint": "string"}`;

  try {
    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.1,
    });
    return JSON.parse(completion.choices[0]?.message?.content?.trim());
  } catch {
    return null;
  }
}

module.exports = { generateExplanation, categoriseQuestion };
