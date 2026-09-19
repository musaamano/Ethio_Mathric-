const test = require('node:test');
const assert = require('node:assert/strict');

const { validateQuestion } = require('../src/services/ai/questionExtractor');

test('Question with valid answer + valid explanation is accepted', () => {
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
    has_explanation: true,
    explanation: { why_correct: 'Addis Ababa is the capital city of Ethiopia.' },
  };

  const errors = validateQuestion(q);
  assert.ok(!errors.some(err => /correct answer/i.test(err)), 'should not have correct answer error');
  assert.ok(!errors.some(err => /explanation/i.test(err)), 'should not have explanation error');
});

test('Question with missing explanation is rejected', () => {
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
  assert.ok(errors.some(err => /explanation/i.test(err)), 'should have explanation error');
});

test('Question with empty string explanation is rejected', () => {
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
    has_explanation: true,
    explanation: '',
  };

  const errors = validateQuestion(q);
  assert.ok(errors.some(err => /explanation/i.test(err)), 'should have explanation error for empty string');
});

test('Question with whitespace-only explanation is rejected', () => {
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
    has_explanation: true,
    explanation: '   ',
  };

  const errors = validateQuestion(q);
  assert.ok(errors.some(err => /explanation/i.test(err)), 'should have explanation error for whitespace');
});

test('Question with null explanation is rejected', () => {
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
    has_explanation: true,
    explanation: null,
  };

  const errors = validateQuestion(q);
  assert.ok(errors.some(err => /explanation/i.test(err)), 'should have explanation error for null');
});

test('Question with missing correct answer is rejected', () => {
  const q = {
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
  };

  const errors = validateQuestion(q);
  assert.ok(errors.some(err => /correct answer/i.test(err)), 'should have correct answer error');
});

test('Question with invalid correct answer is rejected', () => {
  const q = {
    question_text: 'What is the capital of Ethiopia?',
    type: 'multiple_choice',
    options: [
      { label: 'A', text: 'Addis Ababa' },
      { label: 'B', text: 'Nairobi' },
      { label: 'C', text: 'Khartoum' },
      { label: 'D', text: 'Djibouti' },
    ],
    correct_option: 'E',
    subject_id: 2,
    has_explanation: true,
    explanation: { why_correct: 'Addis Ababa is the capital.' },
  };

  const errors = validateQuestion(q);
  assert.ok(errors.some(err => /invalid correct answer/i.test(err)), 'should have invalid correct answer error');
});

test('Question with correct answer not in options is rejected', () => {
  const q = {
    question_text: 'What is the capital of Ethiopia?',
    type: 'multiple_choice',
    options: [
      { label: 'A', text: 'Addis Ababa' },
      { label: 'B', text: 'Nairobi' },
      { label: 'C', text: 'Khartoum' },
      { label: 'D', text: 'Djibouti' },
    ],
    correct_option: 'E',
    subject_id: 2,
    has_explanation: true,
    explanation: { why_correct: 'Addis Ababa is the capital.' },
  };

  const errors = validateQuestion(q);
  assert.ok(errors.some(err => /correct answer/i.test(err)), 'should have correct answer error');
});
