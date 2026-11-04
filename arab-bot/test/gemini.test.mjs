import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBookTopicExcerpt,
  getNextBookTopicIndex,
  getReviewBookTopicIndex,
  capCefrLevel,
  normalizeCefrLevel,
  sanitizeBookWritingEvaluation,
  sanitizeQuizQuestion,
} from '../dist/services/gemini.js';
import { containsReligiousMaterial } from '../dist/services/contentPolicy.js';

test('religious-content policy rejects religious material across languages but allows neutral Arabic', () => {
  assert.equal(containsReligiousMaterial('Qur’an matni va diniy izoh'), true);
  assert.equal(containsReligiousMaterial('Текст о молитве и церкви'), true);
  assert.equal(containsReligiousMaterial('درس عن القرآن الكريم'), true);
  assert.equal(containsReligiousMaterial('هَذَا كِتَابٌ جَدِيدٌ فِي الْمَدْرَسَةِ'), false);
  assert.equal(containsReligiousMaterial('This is a neutral language exercise.'), false);
});

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
  assert.equal(capCefrLevel('B2', 'A1'), 'A1');
  assert.equal(capCefrLevel('B1', 'B2'), 'B1');
  assert.equal(capCefrLevel('A1', 'B2'), 'A1');
});

test('book tests start at the first topic and advance one topic per completed test', () => {
  assert.equal(getNextBookTopicIndex(0, 10), 1);
  assert.equal(getNextBookTopicIndex(8, 10), 9);
  assert.equal(getNextBookTopicIndex(9, 10), 0);
  assert.equal(getNextBookTopicIndex(0, 1), 0);
  assert.equal(getNextBookTopicIndex(0, 0), 0);
  assert.equal(getReviewBookTopicIndex(1, 100, 0), undefined);
  assert.equal(getReviewBookTopicIndex(1, 50, 0), 0);
  assert.equal(getReviewBookTopicIndex(0, 50, 0), undefined);
});

test('book test excerpt stays within the selected sequential topic and low-score review', () => {
  const bookText = [
    'FIRST TOPIC: greeting words and simple phrases.',
    'SECOND TOPIC: family vocabulary and short sentences.',
    'THIRD TOPIC: school and classroom expressions.',
  ].join('\n');
  const topics = [
    {
      number: 1,
      title: 'Greetings',
      summary: 'Greeting phrases',
      rules: '',
      sourceQuote: 'FIRST TOPIC: greeting words',
    },
    {
      number: 2,
      title: 'Family',
      summary: 'Family words',
      rules: '',
      sourceQuote: 'SECOND TOPIC: family vocabulary',
    },
    {
      number: 3,
      title: 'School',
      summary: 'School words',
      rules: '',
      sourceQuote: 'THIRD TOPIC: school and classroom',
    },
  ];

  const firstTopic = getBookTopicExcerpt(bookText, topics, 0);
  assert.match(firstTopic, /first topic/);
  assert.doesNotMatch(firstTopic, /second topic/);

  const nextWithReview = getBookTopicExcerpt(bookText, topics, 1, 0);
  assert.match(nextWithReview, /first topic/);
  assert.match(nextWithReview, /second topic/);
  assert.doesNotMatch(nextWithReview, /third topic/);
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
