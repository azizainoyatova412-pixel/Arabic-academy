const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStudentProgress } = require('../src/utils/studentProgress');

test('buildStudentProgress compares earlier and recent assigned lesson grades', () => {
  const progress = buildStudentProgress([
    {
      telegram_id: 1,
      full_name: 'Ali',
      current_lesson_grades: { 1: 2, 2: 3, 3: 4, 4: 5 },
    },
    {
      telegram_id: 2,
      full_name: 'Vali',
      current_lesson_grades: { 1: 5, 2: 4, 3: 2, 4: 1 },
    },
    {
      telegram_id: 3,
      full_name: 'Madina',
      current_lesson_grades: { 1: 4, 2: 4 },
    },
    {
      telegram_id: 4,
      full_name: 'Zarina',
      current_lesson_grades: { 1: 5 },
    },
  ]);

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
  assert.equal(progress.students[0].difference, 2);
  assert.equal(progress.students[0].currentAverage, 3.5);
  assert.equal(progress.students[0].gradedLessons, 4);
  assert.equal(progress.students[0].earlierAverage, 2.5);
  assert.equal(progress.students[0].recentAverage, 4.5);
  assert.equal(progress.students[3].difference, null);
});

test('buildStudentProgress ignores invalid and missing lesson grades', () => {
  const progress = buildStudentProgress([
    {
      telegram_id: 5,
      full_name: 'No grades',
      current_lesson_grades: { 1: null, 2: 'x', 3: 8, 4: 4 },
    },
  ]);

  assert.equal(progress.students[0].status, 'no-data');
  assert.equal(progress.students[0].currentAverage, 4);
  assert.equal(progress.students[0].earlierAverage, null);
  assert.equal(progress.students[0].recentAverage, 4);
});
