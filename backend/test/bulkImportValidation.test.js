const test = require('node:test');
const assert = require('node:assert/strict');

// Mock the dependencies
const { validateQuestion } = require('../src/services/ai/questionExtractor');

// Mock bulkImportController validation logic (extracted for testing)
function validateForImport(questions) {
  let missingAnswer = 0, missingExplanation = 0, formattingErrors = 0;
  const toImport = [];
  const skipped = [];

  for (const q of questions) {
    const errors = validateQuestion(q);
    q.errors = errors;
    if (q.duplicate?.action === 'skip') { skipped.push(q); continue; }

    if (!q.subject_id) {
      q.errors = [...errors, 'Missing subject — select a subject before importing or add a subject_id column to your file'];
      skipped.push(q);
      continue;
    }

    if (!q.correct_option) missingAnswer++;
    if (!q.has_explanation) missingExplanation++;
    if (errors.length > 0) formattingErrors++;

    // Reject questions with missing correct answer or explanation
    const hasMissingAnswerError = errors.some(err => /correct answer/i.test(err));
    const hasMissingExplanationError = errors.some(err => /explanation/i.test(err));

    if (hasMissingAnswerError || hasMissingExplanationError) {
      skipped.push(q);
      continue;
    }

    toImport.push(q);
  }

  return { toImport, skipped, missingAnswer, missingExplanation, formattingErrors };
}

test('Question with valid answer and explanation is added to toImport', () => {
  const questions = [{
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
    has_explanation: true,
    explanation: { why_correct: 'Addis Ababa is the capital.' },
  }];

  const result = validateForImport(questions);
  assert.equal(result.toImport.length, 1, 'valid question should be added to toImport');
  assert.equal(result.skipped.length, 0, 'valid question should not be skipped');
  assert.equal(result.missingAnswer, 0, 'should not count as missing answer');
  assert.equal(result.missingExplanation, 0, 'should not count as missing explanation');
});

test('Question with missing explanation is NOT added to toImport', () => {
  const questions = [{
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
  }];

  const result = validateForImport(questions);
  assert.equal(result.toImport.length, 0, 'question without explanation should NOT be added to toImport');
  assert.equal(result.skipped.length, 1, 'question without explanation should be skipped');
  assert.equal(result.missingExplanation, 1, 'should count as missing explanation');
});

test('Question with empty explanation is NOT added to toImport', () => {
  const questions = [{
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
    has_explanation: true,
    explanation: '',
  }];

  const result = validateForImport(questions);
  assert.equal(result.toImport.length, 0, 'question with empty explanation should NOT be added to toImport');
  assert.equal(result.skipped.length, 1, 'question with empty explanation should be skipped');
  assert.equal(result.formattingErrors, 1, 'should count as formatting error (explanation validation)');
});

test('Question with missing correct answer is NOT added to toImport', () => {
  const questions = [{
    question_text: 'What is the capital of Ethiopia?',
    type: 'multiple_choice',
    options: [
      { label: 'A', text: 'Addis Ababa' },
      { label: 'B', text: 'Nairobi' },
      { label: 'C', text: 'Khartoum' },
      { label: 'D', text: 'Djibouti' },
    ],
    correct_option: null,
    subject_id: 2,
    has_explanation: true,
    explanation: { why_correct: 'Addis Ababa is the capital.' },
  }];

  const result = validateForImport(questions);
  assert.equal(result.toImport.length, 0, 'question without correct answer should NOT be added to toImport');
  assert.equal(result.skipped.length, 1, 'question without correct answer should be skipped');
  assert.equal(result.missingAnswer, 1, 'should count as missing answer');
});

test('Mixed questions: only valid ones reach toImport', () => {
  const questions = [
    {
      question_text: 'Valid question',
      type: 'multiple_choice',
      options: [
        { label: 'A', text: 'Option A' },
        { label: 'B', text: 'Option B' },
        { label: 'C', text: 'Option C' },
        { label: 'D', text: 'Option D' },
      ],
      correct_option: 'A',
      subject_id: 2,
      has_explanation: true,
      explanation: { why_correct: 'Explanation.' },
    },
    {
      question_text: 'Missing explanation',
      type: 'multiple_choice',
      options: [
        { label: 'A', text: 'Option A' },
        { label: 'B', text: 'Option B' },
        { label: 'C', text: 'Option C' },
        { label: 'D', text: 'Option D' },
      ],
      correct_option: 'A',
      subject_id: 2,
      has_explanation: false,
      explanation: null,
    },
    {
      question_text: 'Missing correct answer',
      type: 'multiple_choice',
      options: [
        { label: 'A', text: 'Option A' },
        { label: 'B', text: 'Option B' },
        { label: 'C', text: 'Option C' },
        { label: 'D', text: 'Option D' },
      ],
      correct_option: null,
      subject_id: 2,
      has_explanation: true,
      explanation: { why_correct: 'Explanation.' },
    },
  ];

  const result = validateForImport(questions);
  assert.equal(result.toImport.length, 1, 'only valid question should be in toImport');
  assert.equal(result.skipped.length, 2, 'invalid questions should be skipped');
  assert.equal(result.missingAnswer, 1, 'should count one missing answer');
  assert.equal(result.missingExplanation, 1, 'should count one missing explanation');
});
