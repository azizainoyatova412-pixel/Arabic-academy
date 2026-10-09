function getValidGrades(lessonGrades) {
  if (!lessonGrades || typeof lessonGrades !== 'object' || Array.isArray(lessonGrades)) {
    return [];
  }

  return Object.values(lessonGrades)
    .filter((grade) => typeof grade === 'number' || (typeof grade === 'string' && grade.trim() !== ''))
    .map(Number)
    .filter((grade) => Number.isInteger(grade) && grade >= 0 && grade <= 5);
}

function getAverage(grades) {
  if (grades.length === 0) return null;
  return Number((grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(2));
}

function buildStudentProgress(rows = [], previousMonth = null) {
  const students = rows.map((row) => {
    const currentGrades = getValidGrades(row.current_lesson_grades);
    const previousGrades = getValidGrades(row.previous_lesson_grades);
    const currentAverage = getAverage(currentGrades);
    const previousAverage = getAverage(previousGrades);
    const rawDifference = currentAverage === null || previousAverage === null
      ? null
      : currentAverage - previousAverage;
    const difference = rawDifference === null ? null : Number(rawDifference.toFixed(2));

    return {
      telegram_id: row.telegram_id,
      full_name: row.full_name,
      currentAverage,
      previousAverage,
      currentGradedLessons: currentGrades.length,
      previousGradedLessons: previousGrades.length,
      difference,
      status: difference === null
        ? 'no-data'
        : rawDifference > 0
          ? 'improved'
          : rawDifference < 0
            ? 'declined'
            : 'unchanged',
    };
  });

  const statusOrder = { improved: 0, unchanged: 1, declined: 2, 'no-data': 3 };
  students.sort((a, b) => {
    if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
    if (a.difference !== null && b.difference !== null && a.difference !== b.difference) {
      return b.difference - a.difference;
    }
    return a.full_name.localeCompare(b.full_name);
  });

  return {
    previousMonth,
    totalStudents: students.length,
    improvedCount: students.filter((student) => student.status === 'improved').length,
    declinedCount: students.filter((student) => student.status === 'declined').length,
    unchangedCount: students.filter((student) => student.status === 'unchanged').length,
    noDataCount: students.filter((student) => student.status === 'no-data').length,
    students,
  };
}

module.exports = { buildStudentProgress };
