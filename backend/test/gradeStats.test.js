const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGradeChart } = require('../src/utils/gradeStats');

test('buildGradeChart summariszes scores by 5-point buckets and highest score', () => {
  const students = [
    { full_name: 'Ali', current_month_points: 5 },
    { full_name: 'Vali', current_month_points: 5 },
    { full_name: 'Madina', current_month_points: 3 },
    { full_name: 'Jasur', current_month_points: 1 },
    { full_name: 'Zarina', current_month_points: 0 },
  ];

  const chart = buildGradeChart(students);

  assert.deepEqual(chart.labels, ['0', '1', '2', '3', '4', '5']);
  assert.deepEqual(chart.values, [1, 1, 0, 1, 0, 2]);
  assert.equal(chart.highestScore, 5);
  assert.equal(chart.averageScore, 2.8);
});

test('buildGradeChart ignores invalid and missing scores', () => {
  const chart = buildGradeChart([
    { full_name: 'N', current_month_points: null },
    { full_name: 'M', current_month_points: Number.NaN },
    { full_name: 'K', current_month_points: '4' },
    { full_name: 'A', current_month_points: 5 },
  ]);

  assert.deepEqual(chart.values, [1, 0, 0, 0, 1, 1]);
  assert.equal(chart.averageScore, 3);
});
