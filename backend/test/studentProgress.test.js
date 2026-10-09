const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStudentProgress } = require('../src/utils/studentProgress');

test('buildStudentProgress compares each student monthly average and classifies the change', () => {
  const progress = buildStudentProgress([
    {
      telegram_id: 1,
      full_name: 'Ali',
      previous_lesson_grades: { 1: 3, 2: 4 },
      current_lesson_grades: { 1: 4, 2: 5 },
    },
    {
      telegram_id: 2,
      full_name: 'Vali',
      previous_lesson_grades: { 1: 4 },
      current_lesson_grades: { 1: 2 },
    },
    {
      telegram_id: 3,
      full_name: 'Madina',
      previous_lesson_grades: { 1: 4 },
      current_lesson_grades: { 1: 4 },
    },
    {
      telegram_id: 4,
      full_name: 'Zarina',
      previous_lesson_grades: {},
      current_lesson_grades: { 1: 5 },
    },
  ], '2026-08');

  assert.equal(progress.previousMonth, '2026-08');
  assert.equal(progress.totalStudents, 4);
  assert.equal(progress.improvedCount, 1);
  assert.equal(progress.declinedCount, 1);
  assert.equal(progress.unchangedCount, 1);
  assert.equal(progress.noDataCount, 1);
  assert.deepEqual(progress.students.map((student) => student.status), [
    'improved',
    'unchanged',
    'declined',
    'no-data',
  ]);
  assert.equal(progress.students[0].difference, 1);
  assert.equal(progress.students[3].difference, null);
});

test('buildStudentProgress ignores invalid and missing lesson grades', () => {
  const progress = buildStudentProgress([
    {
      telegram_id: 5,
      full_name: 'No grades',
      previous_lesson_grades: { 1: null, 2: 'x', 3: 8 },
      current_lesson_grades: {},
    },
  ]);

  assert.equal(progress.students[0].status, 'no-data');
  assert.equal(progress.students[0].currentAverage, null);
  assert.equal(progress.students[0].previousAverage, null);
});
