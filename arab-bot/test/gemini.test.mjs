import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeCefrLevel,
  sanitizeBookWritingEvaluation,
  sanitizeQuizQuestion,
} from '../dist/services/gemini.js';

test('sanitizes a valid question and removes option labels', () => {
  const question = sanitizeQuizQuestion({
    question: '  Arab tilida salomlashish qanday?  ',
    options: ['A) Marhaban', 'B. Shukran', '3. Afwan', 'D - Sabah al-khayr'],
    correctIndex: 0,
    explanation: 'To‘g‘ri javob',
    topic: 'Salomlashish',
  });

  assert.deepEqual(question, {
    question: 'Arab tilida salomlashish qanday?',
    options: ['Marhaban', 'Shukran', 'Afwan', 'Sabah al-khayr'],
    correctIndex: 0,
    explanation: 'To‘g‘ri javob',
    topic: 'Salomlashish',
  });
});

test('rejects malformed or ambiguous questions', () => {
  const valid = {
    question: 'Savol',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  };

  assert.equal(sanitizeQuizQuestion(null), null);
  assert.equal(sanitizeQuizQuestion({ ...valid, options: ['A', 'B', 'C'] }), null);
  assert.equal(sanitizeQuizQuestion({ ...valid, options: ['A', 'B', 'B', 'D'] }), null);
  assert.equal(sanitizeQuizQuestion({ ...valid, correctIndex: 4 }), null);
  assert.equal(sanitizeQuizQuestion({ ...valid, correctIndex: 1.5 }), null);
  assert.equal(sanitizeQuizQuestion({ ...valid, question: '   ' }), null);
});

test('normalizes CEFR results and safely defaults missing levels', () => {
  assert.equal(normalizeCefrLevel('B2 Yuqori Daraja'), 'B2');
  assert.equal(normalizeCefrLevel('C1'), 'C1');
  assert.equal(normalizeCefrLevel('Arab tili — A1 Guruhi'), 'A1');
  assert.equal(normalizeCefrLevel('A1-guruh'), 'A1');
  assert.equal(normalizeCefrLevel('unknown'), 'A1');
});

test('keeps precise writing corrections and drops malformed error entries', () => {
  const result = sanitizeBookWritingEvaluation({
    isCorrect: true,
    feedback: 'Mazmun tushunarli.',
    correctedText: 'أَنَا أَذْهَبُ إِلَى الْمَدْرَسَةِ.',
    strength: 'Gap tuzilishi tushunarli.',
    errors: [
      {
        original: 'أنا يذهب',
        correction: 'أنا أذهب',
        explanation: 'Fe’l birinchi shaxsga moslashadi.',
      },
      { original: 'broken entry' },
    ],
  });

  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].original, 'أنا يذهب');
  assert.equal(result.errors[0].correction, 'أنا أذهب');
  assert.equal(sanitizeBookWritingEvaluation({ isCorrect: true }), null);
});
