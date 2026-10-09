function getValidGrades(lessonGrades) {
  if (!lessonGrades || typeof lessonGrades !== 'object' || Array.isArray(lessonGrades)) {
    return [];
  }

  return Object.entries(lessonGrades)
    .map(([lesson, grade]) => ({ lesson: Number(lesson), grade }))
    .filter(({ lesson, grade }) =>
      Number.isInteger(lesson)
      && lesson >= 1
      && lesson <= 12
      && (typeof grade === 'number' || (typeof grade === 'string' && grade.trim() !== ''))
    )
    .map(({ lesson, grade }) => ({ lesson, grade: Number(grade) }))
    .filter(({ grade }) => Number.isInteger(grade) && grade >= 0 && grade <= 5)
    .sort((a, b) => a.lesson - b.lesson);
}

function getAverage(grades) {
  if (grades.length === 0) return null;
  return Number((grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(2));
}

function buildStudentProgress(rows = []) {
  const students = rows.map((row) => {
    const grades = getValidGrades(row.current_lesson_grades);
    const midpoint = Math.floor(grades.length / 2);
    const earlierGrades = grades.slice(0, midpoint).map(({ grade }) => grade);
    const recentGrades = grades.slice(midpoint).map(({ grade }) => grade);
    const currentAverage = getAverage(grades.map(({ grade }) => grade));
    const earlierAverage = getAverage(earlierGrades);
    const recentAverage = getAverage(recentGrades);
    const rawDifference = earlierAverage === null || recentAverage === null
      ? null
      : recentAverage - earlierAverage;
    const difference = rawDifference === null ? null : Number(rawDifference.toFixed(2));

    return {
      telegram_id: row.telegram_id,
      full_name: row.full_name,
      currentAverage,
      earlierAverage,
      recentAverage,
      gradedLessons: grades.length,
      earlierGradedLessons: earlierGrades.length,
      recentGradedLessons: recentGrades.length,
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
    totalStudents: students.length,
    improvedCount: students.filter((student) => student.status === 'improved').length,
    declinedCount: students.filter((student) => student.status === 'declined').length,
    unchangedCount: students.filter((student) => student.status === 'unchanged').length,
    noDataCount: students.filter((student) => student.status === 'no-data').length,
    students,
  };
}

module.exports = { buildStudentProgress };
